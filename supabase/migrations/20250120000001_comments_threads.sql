-- Comments and Threads Migration
-- Migration: 20250120000001_comments_threads
-- Description: Add comment threads with mentions and notifications

-- Comment Threads Table
CREATE TABLE IF NOT EXISTS public.comment_threads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Text selection anchoring
    start_position INTEGER NOT NULL,
    end_position INTEGER NOT NULL,
    quoted_text TEXT NOT NULL,

    -- Thread status
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comments Table
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_id UUID NOT NULL REFERENCES public.comment_threads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,

    -- Comment content
    content TEXT NOT NULL,

    -- Mentions (array of user IDs mentioned in this comment)
    mentioned_users UUID[],

    -- Editing tracking
    is_edited BOOLEAN DEFAULT FALSE,
    edited_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comment Notifications Table
CREATE TABLE IF NOT EXISTS public.comment_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
    thread_id UUID NOT NULL REFERENCES public.comment_threads(id) ON DELETE CASCADE,

    -- Notification type: 'mention', 'reply', 'thread_update', 'resolved'
    type TEXT NOT NULL CHECK (type IN ('mention', 'reply', 'thread_update', 'resolved')),

    -- Read status
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,

    -- Email notification tracking
    email_sent BOOLEAN DEFAULT FALSE,
    email_sent_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_comment_threads_document ON public.comment_threads(document_id);
CREATE INDEX IF NOT EXISTS idx_comment_threads_user ON public.comment_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_threads_resolved ON public.comment_threads(is_resolved);

CREATE INDEX IF NOT EXISTS idx_comments_thread ON public.comments(thread_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON public.comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_comments_mentions ON public.comments USING GIN(mentioned_users);

CREATE INDEX IF NOT EXISTS idx_comment_notifications_user ON public.comment_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_notifications_read ON public.comment_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_comment_notifications_type ON public.comment_notifications(type);

-- RLS Policies

-- Comment Threads Policies
ALTER TABLE public.comment_threads ENABLE ROW LEVEL SECURITY;

-- Users can view threads on documents they have access to
CREATE POLICY "Users can view comment threads on accessible documents"
    ON public.comment_threads FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.documents
            WHERE documents.id = comment_threads.document_id
            AND documents.user_id = auth.uid()
        )
    );

-- Users can create threads on their own documents
CREATE POLICY "Users can create comment threads on own documents"
    ON public.comment_threads FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.documents
            WHERE documents.id = comment_threads.document_id
            AND documents.user_id = auth.uid()
        )
        AND user_id = auth.uid()
    );

-- Users can update their own threads
CREATE POLICY "Users can update own comment threads"
    ON public.comment_threads FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Users can delete their own threads
CREATE POLICY "Users can delete own comment threads"
    ON public.comment_threads FOR DELETE
    USING (user_id = auth.uid());

-- Comments Policies
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Users can view comments on threads they have access to
CREATE POLICY "Users can view comments on accessible threads"
    ON public.comments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.comment_threads
            JOIN public.documents ON documents.id = comment_threads.document_id
            WHERE comment_threads.id = comments.thread_id
            AND documents.user_id = auth.uid()
        )
    );

-- Users can create comments on accessible threads
CREATE POLICY "Users can create comments on accessible threads"
    ON public.comments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.comment_threads
            JOIN public.documents ON documents.id = comment_threads.document_id
            WHERE comment_threads.id = comments.thread_id
            AND documents.user_id = auth.uid()
        )
        AND user_id = auth.uid()
    );

-- Users can update their own comments
CREATE POLICY "Users can update own comments"
    ON public.comments FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments"
    ON public.comments FOR DELETE
    USING (user_id = auth.uid());

-- Comment Notifications Policies
ALTER TABLE public.comment_notifications ENABLE ROW LEVEL SECURITY;

-- Users can only view their own notifications
CREATE POLICY "Users can view own notifications"
    ON public.comment_notifications FOR SELECT
    USING (user_id = auth.uid());

-- System can create notifications (handled by triggers/functions)
CREATE POLICY "System can create notifications"
    ON public.comment_notifications FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
    ON public.comment_notifications FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
    ON public.comment_notifications FOR DELETE
    USING (user_id = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_comment_threads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_comment_threads_timestamp
    BEFORE UPDATE ON public.comment_threads
    FOR EACH ROW
    EXECUTE FUNCTION update_comment_threads_updated_at();

CREATE TRIGGER update_comments_timestamp
    BEFORE UPDATE ON public.comments
    FOR EACH ROW
    EXECUTE FUNCTION update_comments_updated_at();

-- Function to create notifications for mentions
CREATE OR REPLACE FUNCTION create_mention_notifications()
RETURNS TRIGGER AS $$
DECLARE
    mentioned_user_id UUID;
BEGIN
    -- Create notification for each mentioned user
    IF NEW.mentioned_users IS NOT NULL THEN
        FOREACH mentioned_user_id IN ARRAY NEW.mentioned_users
        LOOP
            -- Don't notify the comment author about their own mentions
            IF mentioned_user_id != NEW.user_id THEN
                INSERT INTO public.comment_notifications (
                    user_id,
                    comment_id,
                    thread_id,
                    type
                ) VALUES (
                    mentioned_user_id,
                    NEW.id,
                    NEW.thread_id,
                    'mention'
                );
            END IF;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create mention notifications
CREATE TRIGGER create_mention_notifications_trigger
    AFTER INSERT ON public.comments
    FOR EACH ROW
    EXECUTE FUNCTION create_mention_notifications();

-- Function to create reply notifications
CREATE OR REPLACE FUNCTION create_reply_notifications()
RETURNS TRIGGER AS $$
DECLARE
    thread_author_id UUID;
    parent_comment_author_id UUID;
BEGIN
    -- Notify thread author of new comments (if not the comment author)
    SELECT user_id INTO thread_author_id
    FROM public.comment_threads
    WHERE id = NEW.thread_id;

    IF thread_author_id != NEW.user_id THEN
        INSERT INTO public.comment_notifications (
            user_id,
            comment_id,
            thread_id,
            type
        ) VALUES (
            thread_author_id,
            NEW.id,
            NEW.thread_id,
            'thread_update'
        );
    END IF;

    -- If this is a reply to a comment, notify the parent comment author
    IF NEW.parent_comment_id IS NOT NULL THEN
        SELECT user_id INTO parent_comment_author_id
        FROM public.comments
        WHERE id = NEW.parent_comment_id;

        IF parent_comment_author_id != NEW.user_id THEN
            INSERT INTO public.comment_notifications (
                user_id,
                comment_id,
                thread_id,
                type
            ) VALUES (
                parent_comment_author_id,
                NEW.id,
                NEW.thread_id,
                'reply'
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create reply notifications
CREATE TRIGGER create_reply_notifications_trigger
    AFTER INSERT ON public.comments
    FOR EACH ROW
    EXECUTE FUNCTION create_reply_notifications();

-- Function to create resolved notifications
CREATE OR REPLACE FUNCTION create_resolved_notifications()
RETURNS TRIGGER AS $$
DECLARE
    participant_id UUID;
BEGIN
    -- Only create notifications when thread is resolved
    IF NEW.is_resolved = TRUE AND (OLD.is_resolved IS NULL OR OLD.is_resolved = FALSE) THEN
        -- Notify all participants in the thread (excluding the resolver)
        FOR participant_id IN
            SELECT DISTINCT user_id
            FROM public.comments
            WHERE thread_id = NEW.id
            AND user_id != NEW.resolved_by
        LOOP
            INSERT INTO public.comment_notifications (
                user_id,
                comment_id,
                thread_id,
                type
            )
            SELECT
                participant_id,
                id,
                thread_id,
                'resolved'
            FROM public.comments
            WHERE thread_id = NEW.id
            ORDER BY created_at DESC
            LIMIT 1;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create resolved notifications
CREATE TRIGGER create_resolved_notifications_trigger
    AFTER UPDATE ON public.comment_threads
    FOR EACH ROW
    EXECUTE FUNCTION create_resolved_notifications();
