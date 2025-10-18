-- Document snapshots for autosave v2

CREATE TABLE IF NOT EXISTS public.document_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    autosave_hash TEXT,
    payload JSONB NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_document_snapshots_document_created
    ON public.document_snapshots (document_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_document_snapshots_user_created
    ON public.document_snapshots (user_id, created_at DESC);

ALTER TABLE public.document_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their document snapshots"
    ON public.document_snapshots
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can create document snapshots"
    ON public.document_snapshots
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their document snapshots"
    ON public.document_snapshots
    FOR DELETE
    USING (user_id = auth.uid());

GRANT SELECT, INSERT, DELETE ON public.document_snapshots TO authenticated;
