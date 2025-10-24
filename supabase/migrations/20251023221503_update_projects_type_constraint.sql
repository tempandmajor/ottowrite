-- Migration: Update projects.type constraint to support all 28 document types
-- Ticket: DB-002
-- Description: Extends the projects.type CHECK constraint from 5 legacy types to all 28 types
--              defined in lib/document-types.ts (lines 21-56)
--
-- Impact: Allows users to create projects with new types like feature_film, tv_pilot, etc.
-- Previously: Only novel, series, screenplay, play, short_story were allowed
-- After: All 28 document types can be created

BEGIN;

-- Drop the old constraint that only allows 5 legacy types
ALTER TABLE public.projects
DROP CONSTRAINT IF EXISTS projects_type_check;

-- Add new constraint with all 28 document types from lib/document-types.ts
ALTER TABLE public.projects
ADD CONSTRAINT projects_type_check
CHECK (type IN (
  -- Prose formats (lines 22-25)
  'novel',
  'series',
  'short_story',

  -- Film formats (lines 27-30)
  'feature_film',
  'short_film',
  'documentary',
  'animation',

  -- TV formats (lines 32-38)
  'tv_drama',
  'tv_sitcom_multi',
  'tv_sitcom_single',
  'tv_pilot',
  'tv_movie',
  'limited_series',
  'web_series',

  -- Stage formats (lines 40-43)
  'stage_play',
  'one_act_play',
  'musical',
  'radio_play',

  -- Alternative formats (lines 45-50)
  'graphic_novel',
  'audio_drama',
  'video_game_script',
  'commercial',
  'treatment',
  'outline',

  -- Legacy types (lines 52-55) - kept for backwards compatibility
  'screenplay',
  'play',
  'article',
  'blog'
));

-- Verify constraint was created successfully
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'projects_type_check'
      AND conrelid = 'public.projects'::regclass
  ) THEN
    RAISE EXCEPTION 'projects_type_check constraint was not created successfully';
  END IF;

  -- Log success
  RAISE NOTICE 'Successfully updated projects_type_check constraint to support 28 document types';
END $$;

COMMIT;
