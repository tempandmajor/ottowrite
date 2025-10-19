BEGIN;

CREATE TABLE IF NOT EXISTS public.autosave_failures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    document_id UUID REFERENCES public.documents (id) ON DELETE SET NULL,
    failure_type TEXT NOT NULL,
    error_message TEXT,
    client_hash TEXT,
    server_hash TEXT,
    content_preview TEXT,
    retry_count INTEGER DEFAULT 0,
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.autosave_failures ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_autosave_failures_user_created_at
    ON public.autosave_failures (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_autosave_failures_document_unresolved
    ON public.autosave_failures (document_id, is_resolved)
    WHERE is_resolved = FALSE;

CREATE POLICY "Users can view their autosave failures"
    ON public.autosave_failures
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their autosave failures"
    ON public.autosave_failures
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their autosave failures"
    ON public.autosave_failures
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

COMMIT;
