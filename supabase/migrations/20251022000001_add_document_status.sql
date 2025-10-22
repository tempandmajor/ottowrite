-- Add status column to documents table for visual metadata badges
-- Part of TICKET-007: Visual Metadata Badges in Binder

-- Add status column with enum constraint
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' CHECK (
    status IN ('complete', 'draft', 'todo', 'ai_generated')
  );

-- Add index for filtering by status
CREATE INDEX IF NOT EXISTS idx_documents_status
  ON documents(project_id, status)
  WHERE status IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN documents.status IS 'Document completion status: complete, draft, todo, ai_generated';
