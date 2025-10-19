BEGIN;

CREATE TABLE IF NOT EXISTS public.ai_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects (id) ON DELETE SET NULL,
    document_id UUID REFERENCES public.documents (id) ON DELETE SET NULL,
    command TEXT,
    intent TEXT,
    requested_model TEXT,
    selected_model TEXT NOT NULL,
    words_generated INTEGER DEFAULT 0,
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    latency_ms INTEGER,
    status TEXT DEFAULT 'succeeded',
    error TEXT,
    prompt_preview TEXT,
    selection_preview TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ai_requests ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_ai_requests_user_created_at
    ON public.ai_requests (user_id, created_at DESC);

CREATE POLICY "Users can view their AI requests"
    ON public.ai_requests
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their AI requests"
    ON public.ai_requests
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

COMMIT;
