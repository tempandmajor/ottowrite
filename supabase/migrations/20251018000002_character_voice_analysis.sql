-- Character Voice Analysis storage

CREATE TABLE IF NOT EXISTS public.character_voice_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,

    dialogue_samples TEXT[] DEFAULT ARRAY[]::TEXT[],
    target_passage TEXT NOT NULL,
    analysis JSONB NOT NULL,
    model TEXT,
    confidence NUMERIC,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS character_voice_analyses_project_idx
    ON public.character_voice_analyses (project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS character_voice_analyses_character_idx
    ON public.character_voice_analyses (character_id, created_at DESC);

ALTER TABLE public.character_voice_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their dialogue analyses"
    ON public.character_voice_analyses FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert dialogue analyses"
    ON public.character_voice_analyses FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their dialogue analyses"
    ON public.character_voice_analyses FOR DELETE
    USING (auth.uid() = user_id);
