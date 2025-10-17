-- Character Management System
-- Comprehensive character profiles with relationships and arcs

-- Create characters table
CREATE TABLE IF NOT EXISTS public.characters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

    -- Basic Information
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('protagonist', 'antagonist', 'supporting', 'minor', 'other')),
    importance INTEGER DEFAULT 5 CHECK (importance >= 1 AND importance <= 10),

    -- Physical Attributes
    age INTEGER,
    gender TEXT,
    appearance TEXT,
    physical_description TEXT,

    -- Personality & Background
    personality_traits TEXT[],
    strengths TEXT[],
    weaknesses TEXT[],
    fears TEXT[],
    desires TEXT[],
    backstory TEXT,

    -- Character Arc
    arc_type TEXT CHECK (arc_type IN ('positive', 'negative', 'flat', 'transformative', 'none')),
    character_arc TEXT,
    internal_conflict TEXT,
    external_conflict TEXT,

    -- Story Elements
    first_appearance TEXT,
    last_appearance TEXT,
    story_function TEXT,

    -- Visual & Media
    image_url TEXT,
    voice_description TEXT,

    -- Metadata
    tags TEXT[],
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT characters_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 200)
);

-- Create character_relationships table
CREATE TABLE IF NOT EXISTS public.character_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

    -- Relationship Parties
    character_a_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
    character_b_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,

    -- Relationship Details
    relationship_type TEXT NOT NULL CHECK (relationship_type IN (
        'family', 'romantic', 'friendship', 'rivalry', 'mentor_mentee',
        'colleague', 'enemy', 'ally', 'acquaintance', 'other'
    )),
    description TEXT,

    -- Relationship Dynamics
    strength INTEGER DEFAULT 5 CHECK (strength >= 1 AND strength <= 10),
    is_positive BOOLEAN DEFAULT true,
    status TEXT CHECK (status IN ('current', 'past', 'developing', 'ending', 'complicated')),

    -- Timeline
    starts_at TEXT,
    ends_at TEXT,
    key_moments TEXT[],

    -- Notes & Metadata
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT no_self_relationship CHECK (character_a_id != character_b_id),
    CONSTRAINT unique_relationship UNIQUE (character_a_id, character_b_id, project_id)
);

-- Create character_arcs table for detailed arc tracking
CREATE TABLE IF NOT EXISTS public.character_arcs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,

    -- Arc Stage
    stage_name TEXT NOT NULL,
    stage_order INTEGER NOT NULL,

    -- Stage Details
    description TEXT,
    location TEXT,
    chapter_scene TEXT,
    page_number INTEGER,

    -- Character State
    emotional_state TEXT,
    beliefs TEXT,
    relationships_status TEXT,

    -- Status
    is_completed BOOLEAN DEFAULT false,

    -- Metadata
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_arc_stage UNIQUE (character_id, stage_order)
);

-- Enable Row Level Security
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.character_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.character_arcs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for characters
CREATE POLICY "Users can view their own characters"
    ON public.characters FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own characters"
    ON public.characters FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own characters"
    ON public.characters FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own characters"
    ON public.characters FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for character_relationships
CREATE POLICY "Users can view their own character relationships"
    ON public.character_relationships FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own character relationships"
    ON public.character_relationships FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own character relationships"
    ON public.character_relationships FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own character relationships"
    ON public.character_relationships FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for character_arcs
CREATE POLICY "Users can view their own character arcs"
    ON public.character_arcs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own character arcs"
    ON public.character_arcs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own character arcs"
    ON public.character_arcs FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own character arcs"
    ON public.character_arcs FOR DELETE
    USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_characters_user_id ON public.characters(user_id);
CREATE INDEX idx_characters_project_id ON public.characters(project_id);
CREATE INDEX idx_characters_role ON public.characters(role);
CREATE INDEX idx_characters_importance ON public.characters(importance DESC);
CREATE INDEX idx_characters_name ON public.characters(name);
CREATE INDEX idx_characters_created_at ON public.characters(created_at DESC);

CREATE INDEX idx_relationships_user_id ON public.character_relationships(user_id);
CREATE INDEX idx_relationships_project_id ON public.character_relationships(project_id);
CREATE INDEX idx_relationships_character_a ON public.character_relationships(character_a_id);
CREATE INDEX idx_relationships_character_b ON public.character_relationships(character_b_id);
CREATE INDEX idx_relationships_type ON public.character_relationships(relationship_type);
CREATE INDEX idx_relationships_strength ON public.character_relationships(strength DESC);

CREATE INDEX idx_arcs_user_id ON public.character_arcs(user_id);
CREATE INDEX idx_arcs_character_id ON public.character_arcs(character_id);
CREATE INDEX idx_arcs_stage_order ON public.character_arcs(stage_order);
CREATE INDEX idx_arcs_completed ON public.character_arcs(is_completed);

-- Triggers to update updated_at
CREATE OR REPLACE FUNCTION update_characters_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_characters_timestamp
    BEFORE UPDATE ON public.characters
    FOR EACH ROW
    EXECUTE FUNCTION update_characters_updated_at();

CREATE OR REPLACE FUNCTION update_character_relationships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_character_relationships_timestamp
    BEFORE UPDATE ON public.character_relationships
    FOR EACH ROW
    EXECUTE FUNCTION update_character_relationships_updated_at();

CREATE OR REPLACE FUNCTION update_character_arcs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_character_arcs_timestamp
    BEFORE UPDATE ON public.character_arcs
    FOR EACH ROW
    EXECUTE FUNCTION update_character_arcs_updated_at();

-- Function to get character statistics for a project
CREATE OR REPLACE FUNCTION get_character_stats(p_project_id UUID)
RETURNS TABLE (
    total_characters BIGINT,
    protagonists BIGINT,
    antagonists BIGINT,
    supporting BIGINT,
    total_relationships BIGINT,
    avg_importance NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::bigint as total_characters,
        COUNT(*) FILTER (WHERE role = 'protagonist')::bigint as protagonists,
        COUNT(*) FILTER (WHERE role = 'antagonist')::bigint as antagonists,
        COUNT(*) FILTER (WHERE role = 'supporting')::bigint as supporting,
        (SELECT COUNT(*)::bigint FROM public.character_relationships
         WHERE project_id = p_project_id AND user_id = auth.uid()) as total_relationships,
        AVG(importance)::numeric(10,2) as avg_importance
    FROM public.characters
    WHERE project_id = p_project_id
        AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql;

-- Function to get all relationships for a character
CREATE OR REPLACE FUNCTION get_character_relationships(p_character_id UUID)
RETURNS TABLE (
    relationship_id UUID,
    other_character_id UUID,
    other_character_name TEXT,
    relationship_type TEXT,
    description TEXT,
    strength INTEGER,
    is_positive BOOLEAN,
    status TEXT
) AS $$
BEGIN
    -- Get relationships where character is character_a
    RETURN QUERY
    SELECT
        cr.id as relationship_id,
        cr.character_b_id as other_character_id,
        c.name as other_character_name,
        cr.relationship_type,
        cr.description,
        cr.strength,
        cr.is_positive,
        cr.status
    FROM public.character_relationships cr
    INNER JOIN public.characters c ON cr.character_b_id = c.id
    WHERE cr.character_a_id = p_character_id
        AND cr.user_id = auth.uid()

    UNION ALL

    -- Get relationships where character is character_b
    SELECT
        cr.id as relationship_id,
        cr.character_a_id as other_character_id,
        c.name as other_character_name,
        cr.relationship_type,
        cr.description,
        cr.strength,
        cr.is_positive,
        cr.status
    FROM public.character_relationships cr
    INNER JOIN public.characters c ON cr.character_a_id = c.id
    WHERE cr.character_b_id = p_character_id
        AND cr.user_id = auth.uid();
END;
$$ LANGUAGE plpgsql;
