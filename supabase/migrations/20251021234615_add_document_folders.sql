-- TICKET-001: Database Schema for Folder Hierarchy
-- Migration: 20251021234615_add_document_folders
-- Description: Add support for hierarchical document organization with folders
-- Priority: P0 (Critical - Foundation)
-- Author: Claude Code
-- Date: 2025-01-21

-- ============================================================================
-- SCHEMA CHANGES
-- ============================================================================

-- Add folder hierarchy columns to documents table
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS parent_folder_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_folder BOOLEAN DEFAULT FALSE NOT NULL,
  ADD COLUMN IF NOT EXISTS folder_type TEXT CHECK (
    folder_type IS NULL OR
    folder_type IN ('manuscript', 'research', 'characters', 'deleted', 'notes', 'custom')
  );

-- Add check constraint: folders cannot have content or word_count
-- Only non-folder documents can have content
-- Note: content can be NULL or empty JSONB object '{}'
ALTER TABLE documents
  ADD CONSTRAINT folder_content_check CHECK (
    (is_folder = FALSE) OR
    (is_folder = TRUE AND (content IS NULL OR content = '{}'::jsonb) AND (word_count IS NULL OR word_count = 0))
  );

-- Add check constraint: prevent circular references
-- A folder cannot be its own parent (direct or indirect)
-- Note: This is a basic check. Deep circular references would need triggers.
ALTER TABLE documents
  ADD CONSTRAINT folder_self_reference_check CHECK (
    parent_folder_id IS NULL OR
    parent_folder_id != id
  );

-- Add check constraint: folder_type should be set for folders
ALTER TABLE documents
  ADD CONSTRAINT folder_type_check CHECK (
    (is_folder = FALSE AND folder_type IS NULL) OR
    (is_folder = TRUE AND folder_type IS NOT NULL)
  );

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for querying document tree hierarchy
-- Common query: SELECT * FROM documents WHERE project_id = ? AND parent_folder_id = ? ORDER BY position
CREATE INDEX IF NOT EXISTS idx_documents_folder_hierarchy
  ON documents(project_id, parent_folder_id, position)
  WHERE parent_folder_id IS NOT NULL;

-- Index for finding root-level documents (no parent)
CREATE INDEX IF NOT EXISTS idx_documents_root_level
  ON documents(project_id, position)
  WHERE parent_folder_id IS NULL;

-- Index for finding all folders in a project
CREATE INDEX IF NOT EXISTS idx_documents_folders_only
  ON documents(project_id, folder_type)
  WHERE is_folder = TRUE;

-- Remove the orphaned index that referenced non-existent column
-- This was created in 20250119_performance_indexes.sql but the column didn't exist
DROP INDEX IF EXISTS idx_documents_parent_folder;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- The existing RLS policies on documents table should already cover folders
-- since folders are just documents with is_folder = TRUE.
-- Let's verify and add explicit policies for clarity.

-- Policy: Users can view their own documents and folders
-- This should already be covered by existing policies, but we'll add it for explicitness
DO $$
BEGIN
  -- Check if policy exists before creating
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'documents'
    AND policyname = 'Users can view own documents and folders'
  ) THEN
    CREATE POLICY "Users can view own documents and folders"
      ON documents
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Policy: Users can create folders in their own projects
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'documents'
    AND policyname = 'Users can create folders'
  ) THEN
    CREATE POLICY "Users can create folders"
      ON documents
      FOR INSERT
      WITH CHECK (
        auth.uid() = user_id AND
        -- Ensure the parent folder (if specified) belongs to the user
        (parent_folder_id IS NULL OR
         EXISTS (
           SELECT 1 FROM documents parent
           WHERE parent.id = parent_folder_id
           AND parent.user_id = auth.uid()
         ))
      );
  END IF;
END $$;

-- Policy: Users can update their own documents and folders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'documents'
    AND policyname = 'Users can update own documents and folders'
  ) THEN
    CREATE POLICY "Users can update own documents and folders"
      ON documents
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (
        auth.uid() = user_id AND
        -- Prevent moving to another user's folder
        (parent_folder_id IS NULL OR
         EXISTS (
           SELECT 1 FROM documents parent
           WHERE parent.id = parent_folder_id
           AND parent.user_id = auth.uid()
         ))
      );
  END IF;
END $$;

-- Policy: Users can delete their own documents and folders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'documents'
    AND policyname = 'Users can delete own documents and folders'
  ) THEN
    CREATE POLICY "Users can delete own documents and folders"
      ON documents
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get all documents in a folder (recursive)
CREATE OR REPLACE FUNCTION get_folder_contents(folder_id UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  is_folder BOOLEAN,
  folder_type TEXT,
  word_count INTEGER,
  level INTEGER
) AS $$
  WITH RECURSIVE folder_tree AS (
    -- Base case: direct children of the folder
    SELECT
      d.id,
      d.title,
      d.is_folder,
      d.folder_type,
      d.word_count,
      1 as level
    FROM documents d
    WHERE d.parent_folder_id = folder_id

    UNION ALL

    -- Recursive case: children of children
    SELECT
      d.id,
      d.title,
      d.is_folder,
      d.folder_type,
      d.word_count,
      ft.level + 1
    FROM documents d
    INNER JOIN folder_tree ft ON d.parent_folder_id = ft.id
  )
  SELECT * FROM folder_tree
  ORDER BY level, title;
$$ LANGUAGE SQL STABLE;

-- Function to get folder path (breadcrumb)
CREATE OR REPLACE FUNCTION get_folder_path(document_id UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  level INTEGER
) AS $$
  WITH RECURSIVE folder_path AS (
    -- Base case: the document itself
    SELECT
      d.id,
      d.title,
      d.parent_folder_id,
      0 as level
    FROM documents d
    WHERE d.id = document_id

    UNION ALL

    -- Recursive case: parent folders
    SELECT
      d.id,
      d.title,
      d.parent_folder_id,
      fp.level + 1
    FROM documents d
    INNER JOIN folder_path fp ON d.id = fp.parent_folder_id
  )
  SELECT id, title, level FROM folder_path
  ORDER BY level DESC;
$$ LANGUAGE SQL STABLE;

-- Function to calculate total word count in a folder (including subfolders)
CREATE OR REPLACE FUNCTION get_folder_word_count(folder_id UUID)
RETURNS INTEGER AS $$
  WITH RECURSIVE folder_tree AS (
    -- Base case: the folder itself
    SELECT
      d.id,
      d.word_count,
      d.is_folder
    FROM documents d
    WHERE d.id = folder_id

    UNION ALL

    -- Recursive case: all descendants
    SELECT
      d.id,
      d.word_count,
      d.is_folder
    FROM documents d
    INNER JOIN folder_tree ft ON d.parent_folder_id = ft.id
  )
  SELECT COALESCE(SUM(word_count), 0)::INTEGER
  FROM folder_tree
  WHERE is_folder = FALSE;
$$ LANGUAGE SQL STABLE;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN documents.parent_folder_id IS 'UUID of parent folder (NULL for root-level documents). Self-referential foreign key to documents.id';
COMMENT ON COLUMN documents.is_folder IS 'TRUE if this is a folder container, FALSE if it is an actual document';
COMMENT ON COLUMN documents.folder_type IS 'Category of folder: manuscript, research, characters, deleted, notes, or custom. NULL for documents (is_folder=FALSE)';

COMMENT ON FUNCTION get_folder_contents(UUID) IS 'Recursively retrieves all documents and subfolders within a folder, with depth level';
COMMENT ON FUNCTION get_folder_path(UUID) IS 'Returns the folder breadcrumb path from root to the specified document';
COMMENT ON FUNCTION get_folder_word_count(UUID) IS 'Calculates total word count of all documents within a folder and its subfolders';

-- ============================================================================
-- MIGRATION VERIFICATION
-- ============================================================================

-- Verify columns were added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'parent_folder_id'
  ) THEN
    RAISE EXCEPTION 'Migration failed: parent_folder_id column not created';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'is_folder'
  ) THEN
    RAISE EXCEPTION 'Migration failed: is_folder column not created';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'folder_type'
  ) THEN
    RAISE EXCEPTION 'Migration failed: folder_type column not created';
  END IF;

  RAISE NOTICE 'Migration successful: All columns and constraints created';
END $$;
