-- OTTOWRITE VERSION HISTORY MIGRATION
-- Migration: 20251017000001_version_history
-- Description: Add version history tracking for documents

-- Document Versions Table
CREATE TABLE IF NOT EXISTS public.document_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    content JSONB NOT NULL,
    word_count INTEGER DEFAULT 0,
    change_summary TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for version history
CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON public.document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_created_at ON public.document_versions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_versions_document_created ON public.document_versions(document_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_versions_user_id ON public.document_versions(user_id);

-- Add is_template flag to documents table
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS template_category TEXT;

-- Row level security for document versions
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their document versions"
ON public.document_versions
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can add their document versions"
ON public.document_versions
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their document versions"
ON public.document_versions
FOR DELETE
USING (user_id = auth.uid());

-- Function to automatically create version on document update
CREATE OR REPLACE FUNCTION create_document_version()
RETURNS TRIGGER AS $$
DECLARE
    latest_version_number INTEGER;
    retention_days INTEGER;
    cutoff_date TIMESTAMPTZ;
BEGIN
    -- Get the user's subscription tier to determine retention period
    SELECT
        CASE
            WHEN up.subscription_tier = 'free' THEN 30
            ELSE -1 -- Unlimited for paid tiers
        END INTO retention_days
    FROM public.user_profiles up
    WHERE up.id = NEW.user_id;

    -- Get the latest version number for this document
    SELECT COALESCE(MAX(version_number), 0) INTO latest_version_number
    FROM public.document_versions
    WHERE document_id = NEW.id;

    -- Create new version (only if content changed)
    IF OLD.content IS DISTINCT FROM NEW.content THEN
        INSERT INTO public.document_versions (
            document_id,
            user_id,
            version_number,
            title,
            content,
            word_count,
            created_at
        ) VALUES (
            NEW.id,
            NEW.user_id,
            latest_version_number + 1,
            NEW.title,
            NEW.content,
            NEW.word_count,
            NOW()
        );

        -- Clean up old versions for free tier users
        IF retention_days > 0 THEN
            cutoff_date := NOW() - INTERVAL '1 day' * retention_days;

            DELETE FROM public.document_versions
            WHERE document_id = NEW.id
            AND created_at < cutoff_date;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply version trigger to documents
DROP TRIGGER IF EXISTS create_version_on_document_update ON public.documents;
CREATE TRIGGER create_version_on_document_update
    AFTER UPDATE ON public.documents
    FOR EACH ROW
    EXECUTE FUNCTION create_document_version();

-- Apply updated_at trigger to templates
DROP TRIGGER IF EXISTS update_document_templates_updated_at ON public.document_templates;
CREATE TRIGGER update_document_templates_updated_at
    BEFORE UPDATE ON public.document_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
