-- Enhance research_notes table with tags, categories, and metadata
ALTER TABLE public.research_notes
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add check constraint for category
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'research_notes_category_check'
    ) THEN
        ALTER TABLE public.research_notes
        ADD CONSTRAINT research_notes_category_check
        CHECK (category IS NULL OR category IN ('reference', 'character', 'worldbuilding', 'plot', 'setting', 'research', 'other'));
    END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS research_notes_tags_idx ON public.research_notes USING gin(tags);
CREATE INDEX IF NOT EXISTS research_notes_category_idx ON public.research_notes(category) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS research_notes_pinned_idx ON public.research_notes(user_id, is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX IF NOT EXISTS research_notes_project_idx ON public.research_notes(project_id, created_at DESC) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS research_notes_full_text_idx ON public.research_notes USING gin(to_tsvector('english', title || ' ' || content));

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_research_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS research_notes_updated_at_trigger ON public.research_notes;
CREATE TRIGGER research_notes_updated_at_trigger
    BEFORE UPDATE ON public.research_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_research_notes_updated_at();

-- Add note_metadata column for flexible extensibility
ALTER TABLE public.research_notes
ADD COLUMN IF NOT EXISTS note_metadata JSONB DEFAULT '{}'::jsonb;

-- Add index for metadata queries
CREATE INDEX IF NOT EXISTS research_notes_metadata_idx ON public.research_notes USING gin(note_metadata);
