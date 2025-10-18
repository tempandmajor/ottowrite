-- World Elements table for the World Bible system

CREATE TABLE IF NOT EXISTS public.world_elements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

    type TEXT NOT NULL CHECK (type IN ('location', 'culture', 'faction', 'magic_system', 'technology', 'history', 'language', 'artifact', 'other')),
    name TEXT NOT NULL,
    summary TEXT,
    description TEXT,
    properties JSONB DEFAULT '{}'::jsonb,
    related_element_ids UUID[] DEFAULT ARRAY[]::UUID[],
    image_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    ai_metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS world_elements_project_idx
    ON public.world_elements (project_id, type, created_at DESC);

ALTER TABLE public.world_elements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their world elements"
    ON public.world_elements FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their world elements"
    ON public.world_elements FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their world elements"
    ON public.world_elements FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their world elements"
    ON public.world_elements FOR DELETE
    USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_world_elements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_world_elements_timestamp ON public.world_elements;
CREATE TRIGGER update_world_elements_timestamp
    BEFORE UPDATE ON public.world_elements
    FOR EACH ROW
    EXECUTE FUNCTION update_world_elements_updated_at();
