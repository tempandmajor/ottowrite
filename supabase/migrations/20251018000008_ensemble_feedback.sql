-- Ensemble feedback tracking for multi-model suggestions

BEGIN;

CREATE TABLE IF NOT EXISTS public.ensemble_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    selected_model TEXT NOT NULL CHECK (selected_model IN ('claude-sonnet-4.5', 'gpt-5', 'deepseek-v3', 'blend')),
    selection_reason TEXT,
    inserted_text TEXT,
    suggestions JSONB NOT NULL,
    usage JSONB,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS ensemble_feedback_user_idx ON public.ensemble_feedback(user_id);
CREATE INDEX IF NOT EXISTS ensemble_feedback_document_idx ON public.ensemble_feedback(document_id);
CREATE INDEX IF NOT EXISTS ensemble_feedback_project_idx ON public.ensemble_feedback(project_id);
CREATE INDEX IF NOT EXISTS ensemble_feedback_model_idx ON public.ensemble_feedback(selected_model);

ALTER TABLE public.ensemble_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own ensemble feedback" ON public.ensemble_feedback
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own ensemble feedback" ON public.ensemble_feedback
    FOR SELECT USING (auth.uid() = user_id);

COMMIT;
