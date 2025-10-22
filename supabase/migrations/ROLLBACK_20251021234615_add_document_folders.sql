-- ROLLBACK SCRIPT for 20251021234615_add_document_folders.sql
-- Run this script to undo the folder hierarchy changes
-- WARNING: This will remove all folder relationships!

-- ============================================================================
-- DROP HELPER FUNCTIONS
-- ============================================================================

DROP FUNCTION IF EXISTS get_folder_word_count(UUID);
DROP FUNCTION IF EXISTS get_folder_path(UUID);
DROP FUNCTION IF EXISTS get_folder_contents(UUID);

-- ============================================================================
-- DROP RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can delete own documents and folders" ON documents;
DROP POLICY IF EXISTS "Users can update own documents and folders" ON documents;
DROP POLICY IF EXISTS "Users can create folders" ON documents;
DROP POLICY IF EXISTS "Users can view own documents and folders" ON documents;

-- ============================================================================
-- DROP INDEXES
-- ============================================================================

DROP INDEX IF EXISTS idx_documents_folders_only;
DROP INDEX IF EXISTS idx_documents_root_level;
DROP INDEX IF EXISTS idx_documents_folder_hierarchy;

-- ============================================================================
-- DROP CONSTRAINTS
-- ============================================================================

ALTER TABLE documents DROP CONSTRAINT IF EXISTS folder_type_check;
ALTER TABLE documents DROP CONSTRAINT IF EXISTS folder_self_reference_check;
ALTER TABLE documents DROP CONSTRAINT IF EXISTS folder_content_check;

-- ============================================================================
-- DROP COLUMNS
-- ============================================================================

ALTER TABLE documents DROP COLUMN IF EXISTS folder_type;
ALTER TABLE documents DROP COLUMN IF EXISTS is_folder;
ALTER TABLE documents DROP COLUMN IF EXISTS parent_folder_id;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'parent_folder_id'
  ) THEN
    RAISE EXCEPTION 'Rollback failed: parent_folder_id column still exists';
  END IF;

  RAISE NOTICE 'Rollback successful: All folder hierarchy changes removed';
END $$;
