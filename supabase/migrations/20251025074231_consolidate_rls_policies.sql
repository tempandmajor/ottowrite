-- ============================================================================
-- Migration: Consolidate RLS Policies into FOR ALL (DB-001)
-- Created: 2025-10-25
-- Ticket: DB-001
--
-- Description:
--   Currently each table has 4 separate policies (SELECT, INSERT, UPDATE, DELETE).
--   This migration consolidates them into a single FOR ALL policy for simplicity.
--
-- Tables affected:
--   - project_folders
--   - project_tags
--   - project_tag_links
--
-- Changes:
--   - Drop 4 separate operation-specific policies per table
--   - Create 1 FOR ALL policy per table
--
-- Impact:
--   - Tables affected: 3
--   - Downtime required: No (policy changes are instant)
--   - Rollback available: Yes (see below)
--
-- Benefits:
--   - Cleaner schema (12 policies → 3 policies)
--   - Easier to maintain and audit
--   - Same security guarantees
--   - Same performance
--
-- Rollback:
--   See rollback section at end of file
-- ============================================================================

-- Pre-flight checks
DO $$
BEGIN
  -- Verify tables exist
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'project_folders' AND schemaname = 'public') THEN
    RAISE EXCEPTION 'Migration requires project_folders table to exist';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'project_tags' AND schemaname = 'public') THEN
    RAISE EXCEPTION 'Migration requires project_tags table to exist';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'project_tag_links' AND schemaname = 'public') THEN
    RAISE EXCEPTION 'Migration requires project_tag_links table to exist';
  END IF;

  RAISE NOTICE 'Pre-flight checks passed';
END $$;

-- ============================================================================
-- BEGIN MIGRATION
-- ============================================================================

-- ============================================================================
-- project_folders: Consolidate 4 policies into 1 FOR ALL policy
-- ============================================================================

-- Drop existing operation-specific policies
DROP POLICY IF EXISTS "Users can view own folders" ON public.project_folders;
DROP POLICY IF EXISTS "Users can insert their own folders" ON public.project_folders;
DROP POLICY IF EXISTS "Users can update their own folders" ON public.project_folders;
DROP POLICY IF EXISTS "Users can delete their own folders" ON public.project_folders;

-- Create consolidated FOR ALL policy
CREATE POLICY "Users can manage their own folders"
ON public.project_folders
FOR ALL
TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

RAISE NOTICE 'project_folders: Consolidated 4 policies into 1 FOR ALL policy';


-- ============================================================================
-- project_tags: Consolidate 4 policies into 1 FOR ALL policy
-- ============================================================================

-- Drop existing operation-specific policies
DROP POLICY IF EXISTS "Users can view own tags" ON public.project_tags;
DROP POLICY IF EXISTS "Users can insert their own tags" ON public.project_tags;
DROP POLICY IF EXISTS "Users can update their own tags" ON public.project_tags;
DROP POLICY IF EXISTS "Users can delete their own tags" ON public.project_tags;

-- Create consolidated FOR ALL policy
CREATE POLICY "Users can manage their own tags"
ON public.project_tags
FOR ALL
TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

RAISE NOTICE 'project_tags: Consolidated 4 policies into 1 FOR ALL policy';


-- ============================================================================
-- project_tag_links: Consolidate 4 policies into 1 FOR ALL policy
-- ============================================================================

-- Drop existing operation-specific policies
DROP POLICY IF EXISTS "Users can view own tag links" ON public.project_tag_links;
DROP POLICY IF EXISTS "Users can insert their own tag links" ON public.project_tag_links;
DROP POLICY IF EXISTS "Users can update project tag links" ON public.project_tag_links;
DROP POLICY IF EXISTS "Users can delete their own tag links" ON public.project_tag_links;

-- Create consolidated FOR ALL policy
CREATE POLICY "Users can manage their own tag links"
ON public.project_tag_links
FOR ALL
TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

RAISE NOTICE 'project_tag_links: Consolidated 4 policies into 1 FOR ALL policy';


-- ============================================================================
-- POST-MIGRATION VALIDATION
-- ============================================================================

DO $$
DECLARE
  policy_count INT;
BEGIN
  -- Verify project_folders has exactly 1 policy
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'project_folders' AND schemaname = 'public';

  IF policy_count != 1 THEN
    RAISE EXCEPTION 'Migration failed: project_folders should have exactly 1 policy, found %', policy_count;
  END IF;

  -- Verify project_tags has exactly 1 policy
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'project_tags' AND schemaname = 'public';

  IF policy_count != 1 THEN
    RAISE EXCEPTION 'Migration failed: project_tags should have exactly 1 policy, found %', policy_count;
  END IF;

  -- Verify project_tag_links has exactly 1 policy
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'project_tag_links' AND schemaname = 'public';

  IF policy_count != 1 THEN
    RAISE EXCEPTION 'Migration failed: project_tag_links should have exactly 1 policy, found %', policy_count;
  END IF;

  RAISE NOTICE 'Post-migration validation passed: All tables have exactly 1 RLS policy';
  RAISE NOTICE 'Migration completed successfully';
  RAISE NOTICE 'Reduced from 12 policies to 3 policies across 3 tables';
END $$;


-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
-- If you need to rollback this migration, run the following SQL:
--
-- -- Restore project_folders separate policies
-- DROP POLICY IF EXISTS "Users can manage their own folders" ON public.project_folders;
--
-- CREATE POLICY "Users can view own folders"
-- ON public.project_folders FOR SELECT
-- TO public
-- USING (auth.uid() = user_id);
--
-- CREATE POLICY "Users can insert their own folders"
-- ON public.project_folders FOR INSERT
-- TO public
-- WITH CHECK (auth.uid() = user_id);
--
-- CREATE POLICY "Users can update their own folders"
-- ON public.project_folders FOR UPDATE
-- TO public
-- USING (auth.uid() = user_id)
-- WITH CHECK (auth.uid() = user_id);
--
-- CREATE POLICY "Users can delete their own folders"
-- ON public.project_folders FOR DELETE
-- TO public
-- USING (auth.uid() = user_id);
--
-- -- Restore project_tags separate policies
-- DROP POLICY IF EXISTS "Users can manage their own tags" ON public.project_tags;
--
-- CREATE POLICY "Users can view own tags"
-- ON public.project_tags FOR SELECT
-- TO public
-- USING (auth.uid() = user_id);
--
-- CREATE POLICY "Users can insert their own tags"
-- ON public.project_tags FOR INSERT
-- TO public
-- WITH CHECK (auth.uid() = user_id);
--
-- CREATE POLICY "Users can update their own tags"
-- ON public.project_tags FOR UPDATE
-- TO public
-- USING (auth.uid() = user_id)
-- WITH CHECK (auth.uid() = user_id);
--
-- CREATE POLICY "Users can delete their own tags"
-- ON public.project_tags FOR DELETE
-- TO public
-- USING (auth.uid() = user_id);
--
-- -- Restore project_tag_links separate policies
-- DROP POLICY IF EXISTS "Users can manage their own tag links" ON public.project_tag_links;
--
-- CREATE POLICY "Users can view own tag links"
-- ON public.project_tag_links FOR SELECT
-- TO public
-- USING (auth.uid() = user_id);
--
-- CREATE POLICY "Users can insert their own tag links"
-- ON public.project_tag_links FOR INSERT
-- TO public
-- WITH CHECK (auth.uid() = user_id);
--
-- CREATE POLICY "Users can update project tag links"
-- ON public.project_tag_links FOR UPDATE
-- TO public
-- USING (auth.uid() = user_id)
-- WITH CHECK (auth.uid() = user_id);
--
-- CREATE POLICY "Users can delete their own tag links"
-- ON public.project_tag_links FOR DELETE
-- TO public
-- USING (auth.uid() = user_id);
-- ============================================================================
