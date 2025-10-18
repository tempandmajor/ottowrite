-- Background AI tasks for long-running analyses

CREATE TABLE IF NOT EXISTS public.ai_background_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,

    task_type TEXT NOT NULL,
    prompt TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'succeeded', 'failed')),
    provider TEXT DEFAULT 'openai',
    provider_response_id TEXT,
    result JSONB,
    error TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_background_tasks_user_idx
    ON public.ai_background_tasks (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ai_background_tasks_document_idx
    ON public.ai_background_tasks (document_id, created_at DESC);

ALTER TABLE public.ai_background_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their background tasks"
    ON public.ai_background_tasks FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert background tasks"
    ON public.ai_background_tasks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their background tasks"
    ON public.ai_background_tasks FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_ai_background_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_ai_background_tasks_timestamp ON public.ai_background_tasks;
CREATE TRIGGER update_ai_background_tasks_timestamp
    BEFORE UPDATE ON public.ai_background_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_background_tasks_updated_at();
