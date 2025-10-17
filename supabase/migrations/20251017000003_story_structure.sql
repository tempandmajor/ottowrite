-- OTTOWRITE STORY STRUCTURE MIGRATION
-- Migration: 20251017000003_story_structure
-- Description: Add story beats and structure tools

-- Story Beats Table
CREATE TABLE IF NOT EXISTS public.story_beats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    beat_type TEXT NOT NULL, -- 'save_the_cat', 'heros_journey', 'three_act', 'five_act', 'custom'
    order_position INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    notes TEXT,
    target_page_count INTEGER,
    actual_page_count INTEGER,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'complete')),
    linked_document_ids UUID[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, beat_type, order_position)
);

-- Beat Templates Table (pre-built beat structures)
CREATE TABLE IF NOT EXISTS public.beat_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    total_beats INTEGER NOT NULL,
    structure JSONB NOT NULL, -- Array of beat definitions
    suitable_for TEXT[] DEFAULT '{}', -- 'novel', 'screenplay', 'short_story'
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_beats_project ON public.story_beats(project_id);
CREATE INDEX IF NOT EXISTS idx_beats_user ON public.story_beats(user_id);
CREATE INDEX IF NOT EXISTS idx_beats_type ON public.story_beats(beat_type);
CREATE INDEX IF NOT EXISTS idx_beats_status ON public.story_beats(status);
CREATE INDEX IF NOT EXISTS idx_beats_order ON public.story_beats(project_id, beat_type, order_position);

-- RLS Policies
ALTER TABLE public.story_beats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beat_templates ENABLE ROW LEVEL SECURITY;

-- Users can view their own beats
CREATE POLICY "Users can view their own story beats"
ON public.story_beats FOR SELECT
USING (user_id = auth.uid());

-- Users can create beats for their projects
CREATE POLICY "Users can create story beats"
ON public.story_beats FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can update their own beats
CREATE POLICY "Users can update their own story beats"
ON public.story_beats FOR UPDATE
USING (user_id = auth.uid());

-- Users can delete their own beats
CREATE POLICY "Users can delete their own story beats"
ON public.story_beats FOR DELETE
USING (user_id = auth.uid());

-- Everyone can view public templates
CREATE POLICY "Public beat templates are viewable by everyone"
ON public.beat_templates FOR SELECT
USING (is_public = true);

-- Insert standard beat templates
INSERT INTO public.beat_templates (name, display_name, description, total_beats, structure, suitable_for) VALUES
(
    'save_the_cat',
    'Save the Cat! (15 Beats)',
    'Blake Snyder''s 15-beat structure for screenplays and novels',
    15,
    '[
        {"order": 1, "name": "Opening Image", "description": "A snapshot of the protagonist''s life before the journey begins.", "target_percent": 1},
        {"order": 2, "name": "Theme Stated", "description": "The theme or lesson of the story is hinted at.", "target_percent": 5},
        {"order": 3, "name": "Setup", "description": "Introduce the protagonist''s world, their wants, and their flaws.", "target_percent": 10},
        {"order": 4, "name": "Catalyst", "description": "An event that disrupts the protagonist''s life.", "target_percent": 12},
        {"order": 5, "name": "Debate", "description": "The protagonist hesitates or debates whether to accept the call to adventure.", "target_percent": 20},
        {"order": 6, "name": "Break into Two", "description": "The protagonist makes a choice and enters a new world.", "target_percent": 25},
        {"order": 7, "name": "B Story", "description": "A subplot begins, often involving a relationship that teaches the theme.", "target_percent": 30},
        {"order": 8, "name": "Fun and Games", "description": "The promise of the premise - the core concept in action.", "target_percent": 50},
        {"order": 9, "name": "Midpoint", "description": "A false victory or false defeat that raises the stakes.", "target_percent": 50},
        {"order": 10, "name": "Bad Guys Close In", "description": "External and internal pressures mount against the protagonist.", "target_percent": 65},
        {"order": 11, "name": "All Is Lost", "description": "The protagonist hits rock bottom. The opposite of Midpoint.", "target_percent": 75},
        {"order": 12, "name": "Dark Night of the Soul", "description": "The protagonist wallows in despair before finding hope.", "target_percent": 80},
        {"order": 13, "name": "Break into Three", "description": "The protagonist discovers the solution by synthesizing A and B stories.", "target_percent": 85},
        {"order": 14, "name": "Finale", "description": "The protagonist confronts the main conflict and transforms.", "target_percent": 95},
        {"order": 15, "name": "Final Image", "description": "A mirror of the Opening Image showing how the protagonist has changed.", "target_percent": 100}
    ]',
    ARRAY['novel', 'screenplay', 'short_story']
),
(
    'heros_journey',
    'Hero''s Journey (12 Stages)',
    'Joseph Campbell''s monomyth structure',
    12,
    '[
        {"order": 1, "name": "Ordinary World", "description": "The hero''s normal life before the adventure.", "target_percent": 8},
        {"order": 2, "name": "Call to Adventure", "description": "The hero is presented with a challenge or quest.", "target_percent": 12},
        {"order": 3, "name": "Refusal of the Call", "description": "The hero hesitates or refuses initially.", "target_percent": 15},
        {"order": 4, "name": "Meeting the Mentor", "description": "The hero gains advice, equipment, or confidence.", "target_percent": 20},
        {"order": 5, "name": "Crossing the Threshold", "description": "The hero commits to the adventure and enters the special world.", "target_percent": 25},
        {"order": 6, "name": "Tests, Allies, and Enemies", "description": "The hero faces trials and makes friends and foes.", "target_percent": 40},
        {"order": 7, "name": "Approach to the Inmost Cave", "description": "The hero prepares for the major challenge.", "target_percent": 50},
        {"order": 8, "name": "Ordeal", "description": "The hero faces death or their greatest fear.", "target_percent": 60},
        {"order": 9, "name": "Reward", "description": "The hero seizes the treasure or achieves their goal.", "target_percent": 70},
        {"order": 10, "name": "The Road Back", "description": "The hero begins the journey home with consequences following.", "target_percent": 80},
        {"order": 11, "name": "Resurrection", "description": "The hero faces a final test where everything is at stake.", "target_percent": 90},
        {"order": 12, "name": "Return with the Elixir", "description": "The hero returns home transformed with something to share.", "target_percent": 100}
    ]',
    ARRAY['novel', 'screenplay']
),
(
    'three_act',
    'Three-Act Structure',
    'Classic three-act structure for screenplays and novels',
    8,
    '[
        {"order": 1, "name": "Setup", "description": "Introduce protagonist, their world, and their goal.", "target_percent": 10},
        {"order": 2, "name": "Inciting Incident", "description": "The event that sets the story in motion.", "target_percent": 15},
        {"order": 3, "name": "Plot Point 1", "description": "A major event that propels the protagonist into Act 2.", "target_percent": 25},
        {"order": 4, "name": "Rising Action", "description": "Escalating conflicts and obstacles.", "target_percent": 40},
        {"order": 5, "name": "Midpoint", "description": "A major twist or revelation that changes everything.", "target_percent": 50},
        {"order": 6, "name": "Plot Point 2", "description": "The lowest point that launches Act 3.", "target_percent": 75},
        {"order": 7, "name": "Climax", "description": "The final confrontation where the main conflict is resolved.", "target_percent": 90},
        {"order": 8, "name": "Resolution", "description": "Wrap up loose ends and show the new status quo.", "target_percent": 100}
    ]',
    ARRAY['novel', 'screenplay', 'short_story', 'play']
),
(
    'five_act',
    'Five-Act Structure (Freytag''s Pyramid)',
    'Traditional dramatic structure',
    5,
    '[
        {"order": 1, "name": "Exposition", "description": "Introduce setting, characters, and initial conflict.", "target_percent": 15},
        {"order": 2, "name": "Rising Action", "description": "Complications arise, tension builds.", "target_percent": 35},
        {"order": 3, "name": "Climax", "description": "The turning point and moment of highest tension.", "target_percent": 50},
        {"order": 4, "name": "Falling Action", "description": "Consequences of the climax unfold.", "target_percent": 75},
        {"order": 5, "name": "Denouement", "description": "Resolution and conclusion of the story.", "target_percent": 100}
    ]',
    ARRAY['play', 'novel', 'screenplay']
);

-- Function to initialize beats from template
CREATE OR REPLACE FUNCTION initialize_beats_from_template(
    p_project_id UUID,
    p_user_id UUID,
    p_template_name TEXT
)
RETURNS SETOF story_beats AS $$
DECLARE
    template_record RECORD;
    beat_record JSONB;
    new_beat story_beats;
BEGIN
    -- Get the template
    SELECT * INTO template_record
    FROM beat_templates
    WHERE name = p_template_name;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Template not found: %', p_template_name;
    END IF;

    -- Delete existing beats of this type for this project
    DELETE FROM story_beats
    WHERE project_id = p_project_id AND beat_type = p_template_name;

    -- Insert beats from template structure
    FOR beat_record IN SELECT * FROM jsonb_array_elements(template_record.structure)
    LOOP
        INSERT INTO story_beats (
            project_id,
            user_id,
            beat_type,
            order_position,
            title,
            description,
            target_page_count
        ) VALUES (
            p_project_id,
            p_user_id,
            p_template_name,
            (beat_record->>'order')::INTEGER,
            beat_record->>'name',
            beat_record->>'description',
            -- Estimate pages based on target_percent (assuming 300 pages for novel, 120 for screenplay)
            CASE
                WHEN EXISTS (SELECT 1 FROM projects WHERE id = p_project_id AND type = 'screenplay')
                THEN ((beat_record->>'target_percent')::NUMERIC * 120 / 100)::INTEGER
                ELSE ((beat_record->>'target_percent')::NUMERIC * 300 / 100)::INTEGER
            END
        )
        RETURNING * INTO new_beat;

        RETURN NEXT new_beat;
    END LOOP;

    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_beat_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_beat_timestamp
BEFORE UPDATE ON public.story_beats
FOR EACH ROW
EXECUTE FUNCTION update_beat_timestamp();
