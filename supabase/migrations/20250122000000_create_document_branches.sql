-- Create document_branches table
CREATE TABLE IF NOT EXISTS document_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  branch_name TEXT NOT NULL,
  parent_branch_id UUID REFERENCES document_branches(id) ON DELETE SET NULL,
  base_commit_id UUID,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  word_count INTEGER NOT NULL DEFAULT 0,
  is_main BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT unique_branch_name_per_document UNIQUE(document_id, branch_name),
  CONSTRAINT valid_branch_name CHECK (branch_name ~ '^[a-zA-Z0-9_-]+$' AND length(branch_name) >= 1 AND length(branch_name) <= 100)
);

-- Create branch_commits table for tracking branch history
CREATE TABLE IF NOT EXISTS branch_commits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES document_branches(id) ON DELETE CASCADE,
  parent_commit_id UUID REFERENCES branch_commits(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  content JSONB NOT NULL,
  word_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT valid_commit_message CHECK (length(message) >= 1 AND length(message) <= 500)
);

-- Create branch_merges table for tracking merge history
CREATE TABLE IF NOT EXISTS branch_merges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_branch_id UUID NOT NULL REFERENCES document_branches(id) ON DELETE CASCADE,
  target_branch_id UUID NOT NULL REFERENCES document_branches(id) ON DELETE CASCADE,
  source_commit_id UUID REFERENCES branch_commits(id) ON DELETE SET NULL,
  target_commit_id UUID REFERENCES branch_commits(id) ON DELETE SET NULL,
  merge_commit_id UUID REFERENCES branch_commits(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  has_conflicts BOOLEAN NOT NULL DEFAULT false,
  conflicts_resolved BOOLEAN NOT NULL DEFAULT false,
  conflict_data JSONB,
  merged_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT no_self_merge CHECK (source_branch_id != target_branch_id)
);

-- Create indexes for performance
CREATE INDEX idx_document_branches_document_id ON document_branches(document_id);
CREATE INDEX idx_document_branches_user_id ON document_branches(user_id);
CREATE INDEX idx_document_branches_is_main ON document_branches(document_id, is_main) WHERE is_main = true;
CREATE INDEX idx_document_branches_is_active ON document_branches(document_id, is_active) WHERE is_active = true;

-- Create partial unique index to ensure only one main branch per document
CREATE UNIQUE INDEX unique_main_branch_per_document ON document_branches(document_id) WHERE is_main = true;
CREATE INDEX idx_branch_commits_branch_id ON branch_commits(branch_id);
CREATE INDEX idx_branch_commits_created_at ON branch_commits(branch_id, created_at DESC);
CREATE INDEX idx_branch_merges_source_branch ON branch_merges(source_branch_id);
CREATE INDEX idx_branch_merges_target_branch ON branch_merges(target_branch_id);
CREATE INDEX idx_branch_merges_merged_at ON branch_merges(merged_at DESC);

-- Enable RLS
ALTER TABLE document_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_commits ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_merges ENABLE ROW LEVEL SECURITY;

-- RLS Policies for document_branches
CREATE POLICY "Users can view their own document branches"
  ON document_branches FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create branches for their documents"
  ON document_branches FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = document_branches.document_id
      AND documents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own branches"
  ON document_branches FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own branches"
  ON document_branches FOR DELETE
  USING (user_id = auth.uid() AND is_main = false);

-- RLS Policies for branch_commits
CREATE POLICY "Users can view commits for their branches"
  ON branch_commits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM document_branches
      WHERE document_branches.id = branch_commits.branch_id
      AND document_branches.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create commits for their branches"
  ON branch_commits FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM document_branches
      WHERE document_branches.id = branch_commits.branch_id
      AND document_branches.user_id = auth.uid()
    )
  );

-- RLS Policies for branch_merges
CREATE POLICY "Users can view their branch merges"
  ON branch_merges FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create merges for their branches"
  ON branch_merges FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM document_branches
      WHERE document_branches.id = branch_merges.source_branch_id
      AND document_branches.user_id = auth.uid()
    ) AND
    EXISTS (
      SELECT 1 FROM document_branches
      WHERE document_branches.id = branch_merges.target_branch_id
      AND document_branches.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their branch merges"
  ON branch_merges FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Function to automatically create main branch for existing documents
CREATE OR REPLACE FUNCTION create_main_branch_for_document()
RETURNS TRIGGER AS $$
BEGIN
  -- Create main branch from document content
  INSERT INTO document_branches (
    document_id,
    user_id,
    branch_name,
    content,
    word_count,
    is_main,
    is_active
  ) VALUES (
    NEW.id,
    NEW.user_id,
    'main',
    NEW.content,
    NEW.word_count,
    true,
    true
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create main branch for new documents
CREATE TRIGGER on_document_created_create_main_branch
  AFTER INSERT ON documents
  FOR EACH ROW
  EXECUTE FUNCTION create_main_branch_for_document();

-- Function to update branch updated_at timestamp
CREATE OR REPLACE FUNCTION update_branch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER on_branch_update_timestamp
  BEFORE UPDATE ON document_branches
  FOR EACH ROW
  EXECUTE FUNCTION update_branch_updated_at();

-- Create initial main branches for existing documents
INSERT INTO document_branches (document_id, user_id, branch_name, content, word_count, is_main, is_active)
SELECT
  id,
  user_id,
  'main' as branch_name,
  content,
  word_count,
  true as is_main,
  true as is_active
FROM documents
WHERE NOT EXISTS (
  SELECT 1 FROM document_branches
  WHERE document_branches.document_id = documents.id
  AND document_branches.is_main = true
);
