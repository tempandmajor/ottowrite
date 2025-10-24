-- Migration: Remove Duplicate Indexes
-- Generated: 2025-10-24
--
-- Fixes performance warnings caused by duplicate indexes on the same columns
-- Duplicate indexes waste storage space and slow down write operations
--
-- Strategy:
-- 1. When UNIQUE + regular index exist → Keep UNIQUE (provides both constraint + index)
-- 2. When multiple regular indexes exist → Keep one with clearest name
-- 3. Total: 30 redundant indexes to drop
--
-- Performance Impact:
-- - Reduced storage usage
-- - Faster INSERT/UPDATE/DELETE operations
-- - Simplified index maintenance
--
-- Reference: https://supabase.com/docs/guides/database/database-linter?lint=0009_duplicate_index

-- ============================================================================
-- CATEGORY 1: Drop regular indexes where UNIQUE index exists (8 indexes)
-- ============================================================================

-- beat_sheets: Keep UNIQUE constraint, drop redundant regular index
DROP INDEX IF EXISTS idx_beat_sheets_structure_id;

-- manuscript_submissions: Keep UNIQUE constraint, drop redundant regular index
DROP INDEX IF EXISTS idx_manuscript_submissions_access_token;

-- partner_submission_stats: Keep UNIQUE constraint, drop redundant regular index
DROP INDEX IF EXISTS idx_partner_submission_stats_partner_id;

-- partner_submissions: Keep UNIQUE constraint, drop redundant regular index
DROP INDEX IF EXISTS idx_partner_submissions_access_token;

-- project_auto_tags: Keep UNIQUE constraint, drop redundant regular index
DROP INDEX IF EXISTS idx_auto_tags_project_id;

-- story_beats: Keep UNIQUE constraint, drop redundant regular index
DROP INDEX IF EXISTS idx_beats_order;

-- template_usage_stats: Keep UNIQUE constraint, drop redundant regular index
DROP INDEX IF EXISTS idx_usage_stats_template_type;

-- user_writing_profiles: Keep UNIQUE constraint, drop redundant regular index
DROP INDEX IF EXISTS idx_writing_profiles_user_id;

-- ============================================================================
-- CATEGORY 2: Drop one of two identical UNIQUE indexes (1 index)
-- ============================================================================

-- project_tags: Both are identical UNIQUE indexes on (user_id, lower(name))
DROP INDEX IF EXISTS project_tags_user_name_lower_idx;

-- ============================================================================
-- CATEGORY 3: Drop redundant regular indexes (21 indexes)
-- ============================================================================

-- project_folders: 3 indexes on parent_id → Keep idx_project_folders_parent
DROP INDEX IF EXISTS project_folders_parent_id_idx;
DROP INDEX IF EXISTS project_folders_parent_idx;

-- projects (search_vector): 3 indexes → Keep idx_projects_search_vector
DROP INDEX IF EXISTS projects_search_idx;
DROP INDEX IF EXISTS projects_search_vector_idx;

-- writing_sessions: 3 indexes on (user_id, session_start DESC) → Keep idx_writing_sessions_user_start
DROP INDEX IF EXISTS idx_writing_sessions_user_date;
DROP INDEX IF EXISTS writing_sessions_user_idx;

-- ai_requests: 2 identical indexes on (user_id, created_at DESC)
DROP INDEX IF EXISTS idx_ai_requests_user_created_at;

-- character_relationships: Multiple duplicate indexes
DROP INDEX IF EXISTS idx_relationships_character_a;
DROP INDEX IF EXISTS idx_relationships_character_b;
DROP INDEX IF EXISTS idx_relationships_project_id;

-- characters: 2 identical indexes on project_id
DROP INDEX IF EXISTS idx_characters_project_id;

-- document_snapshots: 2 identical indexes
DROP INDEX IF EXISTS idx_document_snapshots_created;

-- document_templates: 2 identical indexes on type
DROP INDEX IF EXISTS idx_templates_type;

-- outline_sections: 2 identical indexes on parent_id
DROP INDEX IF EXISTS idx_outline_sections_parent_id;

-- outlines: 2 identical indexes on project_id
DROP INDEX IF EXISTS idx_outlines_project_id;

-- project_tag_links: 2 identical indexes on user_id
DROP INDEX IF EXISTS project_tag_links_user_idx;

-- project_tags: 2 identical indexes on (user_id, name)
DROP INDEX IF EXISTS project_tags_user_idx;

-- projects: 2 identical indexes on folder_id
DROP INDEX IF EXISTS projects_folder_idx;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  remaining_duplicates integer;
BEGIN
  -- Count remaining duplicate index groups
  SELECT COUNT(*) INTO remaining_duplicates
  FROM (
    SELECT
      tablename,
      substring(indexdef from 'USING [a-z]+ \((.*)\)') as columns
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname NOT LIKE '%_pkey'
    GROUP BY tablename, substring(indexdef from 'USING [a-z]+ \((.*)\)')
    HAVING COUNT(*) > 1
  ) subquery;

  IF remaining_duplicates > 0 THEN
    RAISE WARNING '% duplicate index groups still remain', remaining_duplicates;
  ELSE
    RAISE NOTICE '✓ All duplicate indexes removed! Database optimized.';
  END IF;
END $$;
