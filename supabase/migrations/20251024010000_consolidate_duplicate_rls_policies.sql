-- Migration: Consolidate Duplicate RLS Policies
-- Generated: 2025-10-24
--
-- Fixes performance issues caused by multiple permissive policies for the same
-- table, role, and action. PostgreSQL must evaluate each permissive policy separately
-- and OR the results, which is slower than a single combined policy.
--
-- Performance Impact:
-- - Before: Multiple policies evaluated separately and ORed together
-- - After: Single policy with combined logic evaluated once
--
-- Affects 9 groups of duplicate policies across 6 tables
--
-- Reference: https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies

-- ============================================================================
-- TABLE: beat_sheets
-- Consolidate 2 SELECT policies with different logic
-- ============================================================================

DROP POLICY IF EXISTS "Public beat sheets are readable by everyone" ON beat_sheets;
DROP POLICY IF EXISTS "Users can read their own beat sheets" ON beat_sheets;

CREATE POLICY "Users can read beat sheets"
ON beat_sheets FOR SELECT TO public
USING (
  (is_public = true)  -- Public beat sheets
  OR
  ((select auth.uid()) = created_by)  -- Own beat sheets
);

-- ============================================================================
-- TABLE: document_changes
-- Consolidate 2 UPDATE policies with different logic
-- ============================================================================

DROP POLICY IF EXISTS "Document owners can review changes" ON document_changes;
DROP POLICY IF EXISTS "Users can update their own pending changes" ON document_changes;

CREATE POLICY "Users can update document changes"
ON document_changes FOR UPDATE TO public
USING (
  -- Document owner can review any changes
  (EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = document_changes.document_id
      AND documents.user_id = (select auth.uid())
  ))
  OR
  -- Change author can update own pending changes
  (user_id = (select auth.uid()) AND status = 'pending')
)
WITH CHECK (
  -- Document owner can set any status
  (EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = document_changes.document_id
      AND documents.user_id = (select auth.uid())
  ))
  OR
  -- Change author can only update own changes
  (user_id = (select auth.uid()))
);

-- ============================================================================
-- TABLE: documents
-- Consolidate 2 DELETE policies (TRUE DUPLICATES)
-- ============================================================================

DROP POLICY IF EXISTS "Users can delete own documents and folders" ON documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON documents;

CREATE POLICY "Users can delete own documents"
ON documents FOR DELETE TO public
USING ((select auth.uid()) = user_id);

-- ============================================================================
-- TABLE: documents
-- Consolidate 2 INSERT policies with different with_check logic
-- ============================================================================

DROP POLICY IF EXISTS "Users can create folders" ON documents;
DROP POLICY IF EXISTS "Users can create their own documents" ON documents;

CREATE POLICY "Users can create documents"
ON documents FOR INSERT TO public
WITH CHECK (
  (select auth.uid()) = user_id
  AND (
    -- No parent (top-level document/folder)
    parent_folder_id IS NULL
    OR
    -- Parent folder exists and belongs to user
    EXISTS (
      SELECT 1 FROM documents parent
      WHERE parent.id = documents.parent_folder_id
        AND parent.user_id = (select auth.uid())
    )
  )
);

-- ============================================================================
-- TABLE: documents
-- Consolidate 2 SELECT policies (TRUE DUPLICATES)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own documents and folders" ON documents;
DROP POLICY IF EXISTS "Users can view their own documents" ON documents;

CREATE POLICY "Users can view own documents"
ON documents FOR SELECT TO public
USING ((select auth.uid()) = user_id);

-- ============================================================================
-- TABLE: documents
-- Consolidate 2 UPDATE policies with different with_check logic
-- ============================================================================

DROP POLICY IF EXISTS "Users can update own documents and folders" ON documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON documents;

CREATE POLICY "Users can update own documents"
ON documents FOR UPDATE TO public
USING ((select auth.uid()) = user_id)
WITH CHECK (
  (select auth.uid()) = user_id
  AND (
    -- No parent change or moving to top level
    parent_folder_id IS NULL
    OR
    -- Moving to a folder that belongs to user
    EXISTS (
      SELECT 1 FROM documents parent
      WHERE parent.id = documents.parent_folder_id
        AND parent.user_id = (select auth.uid())
    )
  )
);

-- ============================================================================
-- TABLE: project_folders
-- Consolidate 2 SELECT policies (TRUE DUPLICATES)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their folders" ON project_folders;
DROP POLICY IF EXISTS "Users can view their own folders" ON project_folders;

CREATE POLICY "Users can view own folders"
ON project_folders FOR SELECT TO public
USING ((select auth.uid()) = user_id);

-- ============================================================================
-- TABLE: project_tag_links
-- Consolidate 2 SELECT policies (TRUE DUPLICATES)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own tag links" ON project_tag_links;
DROP POLICY IF EXISTS "Users can view their project tags" ON project_tag_links;

CREATE POLICY "Users can view own tag links"
ON project_tag_links FOR SELECT TO public
USING ((select auth.uid()) = user_id);

-- ============================================================================
-- TABLE: project_tags
-- Consolidate 2 SELECT policies (TRUE DUPLICATES)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own tags" ON project_tags;
DROP POLICY IF EXISTS "Users can view their tags" ON project_tags;

CREATE POLICY "Users can view own tags"
ON project_tags FOR SELECT TO public
USING ((select auth.uid()) = user_id);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  duplicate_groups integer;
BEGIN
  SELECT COUNT(*) INTO duplicate_groups
  FROM (
    SELECT tablename, cmd, roles::text
    FROM pg_policies
    WHERE schemaname = 'public'
      AND permissive = 'PERMISSIVE'
    GROUP BY tablename, cmd, roles::text
    HAVING COUNT(*) > 1
  ) subquery;

  IF duplicate_groups > 0 THEN
    RAISE WARNING '% groups still have multiple permissive policies', duplicate_groups;
  ELSE
    RAISE NOTICE '✓ All duplicate policies consolidated!';
  END IF;

  -- Show summary
  RAISE NOTICE '';
  RAISE NOTICE 'Policy consolidation summary:';
  RAISE NOTICE '  - beat_sheets: 2 → 1 policy';
  RAISE NOTICE '  - document_changes: 2 → 1 policy';
  RAISE NOTICE '  - documents: 8 → 4 policies (2 DELETE, 2 INSERT, 2 SELECT, 2 UPDATE → 1 each)';
  RAISE NOTICE '  - project_folders: 2 → 1 policy';
  RAISE NOTICE '  - project_tag_links: 2 → 1 policy';
  RAISE NOTICE '  - project_tags: 2 → 1 policy';
  RAISE NOTICE '  - Total: 18 → 9 policies (50% reduction)';
END $$;
