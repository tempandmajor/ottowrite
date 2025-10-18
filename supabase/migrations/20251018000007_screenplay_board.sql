CREATE TABLE IF NOT EXISTS public.beat_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

    title TEXT NOT NULL,
    description TEXT,
    beat_type TEXT DEFAULT 'A',
    position INTEGER NOT NULL,
    color TEXT DEFAULT 'neutral',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.beat_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their beat cards"
    ON public.beat_cards FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their beat cards"
    ON public.beat_cards FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS beat_cards_project_idx
    ON public.beat_cards (project_id, position);
