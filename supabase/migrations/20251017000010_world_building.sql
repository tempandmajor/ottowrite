-- World Building module: locations and timeline events

-- Create locations table
CREATE TABLE IF NOT EXISTS public.locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('settlement', 'region', 'landmark', 'realm', 'other')),
    summary TEXT,
    history TEXT,
    culture TEXT,
    climate TEXT,
    key_features TEXT[],
    tags TEXT[],
    image_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT locations_name_length CHECK (char_length(name) BETWEEN 1 AND 150)
);

-- Create location_events table for timeline entries
CREATE TABLE IF NOT EXISTS public.location_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,

    title TEXT NOT NULL,
    occurs_at TEXT,
    description TEXT,
    importance INTEGER DEFAULT 5 CHECK (importance BETWEEN 1 AND 10),
    key_characters TEXT[],
    tags TEXT[],
    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT location_events_title_length CHECK (char_length(title) BETWEEN 1 AND 200)
);

-- Enable RLS
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_events ENABLE ROW LEVEL SECURITY;

-- RLS for locations
CREATE POLICY "Users can view their locations"
    ON public.locations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their locations"
    ON public.locations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their locations"
    ON public.locations FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their locations"
    ON public.locations FOR DELETE
    USING (auth.uid() = user_id);

-- RLS for location_events
CREATE POLICY "Users can view their location events"
    ON public.location_events FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their location events"
    ON public.location_events FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their location events"
    ON public.location_events FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their location events"
    ON public.location_events FOR DELETE
    USING (auth.uid() = user_id);

-- Indexes for quick lookups
CREATE INDEX idx_locations_user_project ON public.locations (user_id, project_id);
CREATE INDEX idx_locations_category ON public.locations (category);
CREATE INDEX idx_locations_tags ON public.locations USING gin (tags);

CREATE INDEX idx_location_events_project ON public.location_events (project_id);
CREATE INDEX idx_location_events_location ON public.location_events (location_id);
CREATE INDEX idx_location_events_occurs_at ON public.location_events (occurs_at);

-- Update triggers
CREATE OR REPLACE FUNCTION update_locations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_locations_timestamp
    BEFORE UPDATE ON public.locations
    FOR EACH ROW
    EXECUTE FUNCTION update_locations_updated_at();

CREATE OR REPLACE FUNCTION update_location_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_location_events_timestamp
    BEFORE UPDATE ON public.location_events
    FOR EACH ROW
    EXECUTE FUNCTION update_location_events_updated_at();
