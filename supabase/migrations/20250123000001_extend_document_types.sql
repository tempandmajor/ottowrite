-- Migration: Extend Document Types for Industry-Standard Templates
-- TICKET-TMPL-001: Core Type System Enhancement
-- Adds support for Film, TV, Stage, Graphic Novel, and Alternative formats

-- ============================================================================
-- PART 1: Update document_templates table
-- ============================================================================

-- Drop existing constraint
ALTER TABLE document_templates DROP CONSTRAINT IF EXISTS document_templates_type_check;

-- Add new constraint with all document types
ALTER TABLE document_templates ADD CONSTRAINT document_templates_type_check
  CHECK (type IN (
    -- Existing prose formats
    'novel',
    'series',
    'short_story',

    -- Film formats
    'feature_film',
    'short_film',
    'documentary',
    'animation',

    -- TV formats
    'tv_drama',
    'tv_sitcom_multi',
    'tv_sitcom_single',
    'tv_pilot',
    'tv_movie',
    'limited_series',
    'web_series',

    -- Stage formats
    'stage_play',
    'one_act_play',
    'musical',
    'radio_play',

    -- Alternative formats
    'graphic_novel',
    'audio_drama',
    'video_game_script',
    'commercial',
    'treatment',
    'outline',

    -- Legacy types (for backwards compatibility)
    'screenplay',
    'play',
    'article',
    'blog'
  ));

-- ============================================================================
-- PART 2: Update documents table
-- ============================================================================

-- Drop existing constraint
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_type_check;

-- Add new constraint with all document types (same list)
ALTER TABLE documents ADD CONSTRAINT documents_type_check
  CHECK (type IN (
    -- Existing prose formats
    'novel',
    'series',
    'short_story',

    -- Film formats
    'feature_film',
    'short_film',
    'documentary',
    'animation',

    -- TV formats
    'tv_drama',
    'tv_sitcom_multi',
    'tv_sitcom_single',
    'tv_pilot',
    'tv_movie',
    'limited_series',
    'web_series',

    -- Stage formats
    'stage_play',
    'one_act_play',
    'musical',
    'radio_play',

    -- Alternative formats
    'graphic_novel',
    'audio_drama',
    'video_game_script',
    'commercial',
    'treatment',
    'outline',

    -- Legacy types (for backwards compatibility)
    'screenplay',
    'play',
    'article',
    'blog'
  ));

-- ============================================================================
-- PART 3: Migrate existing data
-- ============================================================================

-- Migrate generic 'screenplay' to 'feature_film' (most common use case)
UPDATE documents
SET type = 'feature_film'
WHERE type = 'screenplay';

UPDATE document_templates
SET type = 'feature_film'
WHERE type = 'screenplay';

-- Migrate generic 'play' to 'stage_play'
UPDATE documents
SET type = 'stage_play'
WHERE type = 'play';

UPDATE document_templates
SET type = 'stage_play'
WHERE type = 'play';

-- ============================================================================
-- PART 4: Create document type metadata table
-- ============================================================================

-- Store metadata about each document type (page ranges, industry standards, etc.)
CREATE TABLE IF NOT EXISTS public.document_type_metadata (
  type TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('prose', 'screenplay', 'tv', 'stage', 'other')),
  description TEXT,
  page_range_min INTEGER,
  page_range_max INTEGER,
  industry_standard TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for fast category lookups
CREATE INDEX IF NOT EXISTS idx_document_type_metadata_category
  ON public.document_type_metadata(category);

-- Create index for active types
CREATE INDEX IF NOT EXISTS idx_document_type_metadata_active
  ON public.document_type_metadata(is_active);

-- ============================================================================
-- PART 5: Populate document type metadata
-- ============================================================================

INSERT INTO public.document_type_metadata (type, label, category, description, page_range_min, page_range_max, industry_standard, icon, sort_order) VALUES
  -- Prose formats
  ('novel', 'Novel', 'prose', 'Full-length novel manuscript', 200, 400, 'Double-spaced, 12pt font', '📖', 1),
  ('series', 'Book Series', 'prose', 'Multi-book series with linked narratives', 200, 400, 'Double-spaced, 12pt font', '📚', 2),
  ('short_story', 'Short Story', 'prose', 'Short form fiction', 5, 50, 'Double-spaced, 12pt font', '📄', 3),

  -- Film formats
  ('feature_film', 'Feature Film', 'screenplay', 'Standard theatrical feature film screenplay', 90, 120, '1 page = 1 minute screen time, Courier 12pt', '🎬', 10),
  ('short_film', 'Short Film', 'screenplay', 'Short format film screenplay', 5, 30, '1 page = 1 minute screen time, Courier 12pt', '🎞️', 11),
  ('documentary', 'Documentary', 'screenplay', 'Documentary screenplay with interviews and narration', 60, 120, 'Flexible format, includes interview notes', '🎥', 12),
  ('animation', 'Animation Feature', 'screenplay', 'Animated feature film screenplay', 90, 120, 'Detailed action descriptions, timing notes', '✨', 13),

  -- TV formats
  ('tv_drama', 'TV Drama (1-Hour)', 'tv', 'One-hour drama with act breaks', 45, 60, 'Network: 42-44 min runtime, Cable/Streaming: flexible', '📺', 20),
  ('tv_sitcom_multi', 'TV Sitcom (Multi-Camera)', 'tv', 'Traditional multi-camera sitcom format', 22, 30, '22 minutes runtime, filmed before live audience', '📹', 21),
  ('tv_sitcom_single', 'TV Sitcom (Single-Camera)', 'tv', 'Single-camera comedy format', 25, 35, '22-30 minutes runtime, cinematic style', '🎭', 22),
  ('tv_pilot', 'TV Pilot', 'tv', 'Television pilot episode', 30, 65, 'Varies by format (drama vs. comedy)', '🌟', 23),
  ('tv_movie', 'TV Movie', 'tv', 'Made-for-television movie', 90, 120, 'Similar to feature film, with act breaks', '📡', 24),
  ('limited_series', 'Limited Series', 'tv', 'Limited/mini-series episode', 45, 60, 'Serialized storytelling, defined endpoint', '🎬', 25),
  ('web_series', 'Web Series', 'tv', 'Web-based episodic content', 5, 15, 'Compressed format, optimized for digital', '💻', 26),

  -- Stage formats
  ('stage_play', 'Stage Play', 'stage', 'Full-length stage play', 90, 120, 'Character list, stage directions in italics', '🎭', 30),
  ('one_act_play', 'One-Act Play', 'stage', 'Single-act stage play', 30, 45, 'Continuous action, no intermission', '🎪', 31),
  ('musical', 'Musical', 'stage', 'Stage musical with songs and dialogue', 90, 150, 'Includes lyrics, song cues, dance breaks', '🎵', 32),
  ('radio_play', 'Radio Play', 'stage', 'Radio drama script', 30, 60, 'Heavy emphasis on sound effects and dialogue', '📻', 33),

  -- Alternative formats
  ('graphic_novel', 'Graphic Novel', 'other', 'Panel-based graphic narrative', 50, 300, 'Panel descriptions, character dialogue, visual storytelling', '🎨', 40),
  ('audio_drama', 'Audio Drama', 'other', 'Audio-only dramatic production', 30, 60, 'Sound effects, music cues, voice direction', '🎧', 41),
  ('video_game_script', 'Video Game Script', 'other', 'Interactive video game narrative', 50, 200, 'Branching dialogue, player choice notation', '🎮', 42),
  ('commercial', 'Commercial', 'other', 'Advertisement script', 1, 3, '30-second or 60-second spots', '📢', 43),
  ('treatment', 'Treatment', 'other', 'Prose narrative summary', 5, 20, 'Story outline in prose format', '📝', 44),
  ('outline', 'Outline', 'other', 'Beat-by-beat story outline', 3, 15, 'Scene-by-scene breakdown', '📋', 45)
ON CONFLICT (type) DO UPDATE SET
  label = EXCLUDED.label,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  page_range_min = EXCLUDED.page_range_min,
  page_range_max = EXCLUDED.page_range_max,
  industry_standard = EXCLUDED.industry_standard,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- ============================================================================
-- PART 6: Create helper functions
-- ============================================================================

-- Function to get document type metadata
CREATE OR REPLACE FUNCTION get_document_type_info(doc_type TEXT)
RETURNS TABLE (
  type TEXT,
  label TEXT,
  category TEXT,
  description TEXT,
  page_range_min INTEGER,
  page_range_max INTEGER,
  industry_standard TEXT,
  icon TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    dtm.type,
    dtm.label,
    dtm.category,
    dtm.description,
    dtm.page_range_min,
    dtm.page_range_max,
    dtm.industry_standard,
    dtm.icon
  FROM document_type_metadata dtm
  WHERE dtm.type = doc_type AND dtm.is_active = true;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to check if document type is screenplay/script format
CREATE OR REPLACE FUNCTION is_script_type(doc_type TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN doc_type IN (
    'feature_film',
    'short_film',
    'documentary',
    'animation',
    'tv_drama',
    'tv_sitcom_multi',
    'tv_sitcom_single',
    'tv_pilot',
    'tv_movie',
    'limited_series',
    'web_series',
    'stage_play',
    'one_act_play',
    'musical',
    'radio_play',
    'audio_drama',
    'video_game_script',
    'commercial',
    -- Legacy
    'screenplay',
    'play'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get document category
CREATE OR REPLACE FUNCTION get_document_category(doc_type TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT category
    FROM document_type_metadata
    WHERE type = doc_type
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- PART 7: Add RLS policies (if not exists)
-- ============================================================================

-- Enable RLS on document_type_metadata
ALTER TABLE document_type_metadata ENABLE ROW LEVEL SECURITY;

-- Allow all users to read document type metadata (public information)
CREATE POLICY IF NOT EXISTS "Document type metadata is readable by everyone"
  ON document_type_metadata
  FOR SELECT
  USING (true);

-- ============================================================================
-- PART 8: Create indexes for performance
-- ============================================================================

-- Add index on documents.type for faster filtering
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);

-- Add index on document_templates.type for faster filtering
CREATE INDEX IF NOT EXISTS idx_document_templates_type ON document_templates(type);

-- ============================================================================
-- PART 9: Update updated_at trigger for document_type_metadata
-- ============================================================================

CREATE OR REPLACE FUNCTION update_document_type_metadata_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_document_type_metadata_updated_at ON document_type_metadata;

CREATE TRIGGER trigger_update_document_type_metadata_updated_at
  BEFORE UPDATE ON document_type_metadata
  FOR EACH ROW
  EXECUTE FUNCTION update_document_type_metadata_updated_at();

-- ============================================================================
-- VERIFICATION QUERIES (Run these to verify migration)
-- ============================================================================

-- Count documents by type
-- SELECT type, COUNT(*) FROM documents GROUP BY type ORDER BY type;

-- Count templates by type
-- SELECT type, COUNT(*) FROM document_templates GROUP BY type ORDER BY type;

-- Show all document type metadata
-- SELECT type, label, category, page_range_min, page_range_max FROM document_type_metadata ORDER BY sort_order;

-- Test helper functions
-- SELECT * FROM get_document_type_info('feature_film');
-- SELECT is_script_type('feature_film'), is_script_type('novel');
-- SELECT get_document_category('tv_drama');
