-- Change Tracking System
-- Tracks insertions, deletions, and modifications with author attribution
-- Supports accept/reject workflow and change history

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Document changes table - tracks all insertions, deletions, and modifications
CREATE TABLE IF NOT EXISTS document_changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Change type and content
  change_type TEXT NOT NULL CHECK (change_type IN ('insertion', 'deletion', 'modification')),
  content TEXT NOT NULL, -- The actual text content
  original_content TEXT, -- For modifications/deletions, stores the original text

  -- Position information
  start_position INTEGER NOT NULL,
  end_position INTEGER NOT NULL,

  -- Change status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  comment TEXT, -- Optional comment from author
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_positions CHECK (start_position >= 0 AND end_position >= start_position)
);

-- Create indexes for performance
CREATE INDEX idx_document_changes_document_id ON document_changes(document_id);
CREATE INDEX idx_document_changes_user_id ON document_changes(user_id);
CREATE INDEX idx_document_changes_status ON document_changes(status);
CREATE INDEX idx_document_changes_created_at ON document_changes(created_at DESC);
CREATE INDEX idx_document_changes_document_status ON document_changes(document_id, status);

-- Change history log - audit trail of all change actions
CREATE TABLE IF NOT EXISTS change_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  change_id UUID NOT NULL REFERENCES document_changes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Action tracking
  action TEXT NOT NULL CHECK (action IN ('created', 'accepted', 'rejected', 'commented')),
  comment TEXT,

  -- Snapshot of change state at this point
  snapshot JSONB,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_change_history_change_id ON change_history(change_id);
CREATE INDEX idx_change_history_created_at ON change_history(created_at DESC);

-- Change notifications table
CREATE TABLE IF NOT EXISTS change_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  change_id UUID NOT NULL REFERENCES document_changes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Notification type
  notification_type TEXT NOT NULL CHECK (notification_type IN ('change_created', 'change_reviewed', 'change_commented')),

  -- Status
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_change_notifications_user_id ON change_notifications(user_id);
CREATE INDEX idx_change_notifications_change_id ON change_notifications(change_id);
CREATE INDEX idx_change_notifications_is_read ON change_notifications(is_read);

-- Enable Row Level Security
ALTER TABLE document_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for document_changes

-- Users can view changes for documents they have access to
CREATE POLICY "Users can view changes for accessible documents"
  ON document_changes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = document_changes.document_id
      AND documents.user_id = auth.uid()
    )
  );

-- Users can create changes for documents they have access to
CREATE POLICY "Users can create changes for accessible documents"
  ON document_changes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = document_changes.document_id
      AND documents.user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

-- Users can update their own pending changes
CREATE POLICY "Users can update their own pending changes"
  ON document_changes FOR UPDATE
  USING (user_id = auth.uid() AND status = 'pending')
  WITH CHECK (user_id = auth.uid());

-- Document owners can review (accept/reject) changes
CREATE POLICY "Document owners can review changes"
  ON document_changes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = document_changes.document_id
      AND documents.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = document_changes.document_id
      AND documents.user_id = auth.uid()
    )
  );

-- Users can delete their own pending changes
CREATE POLICY "Users can delete their own pending changes"
  ON document_changes FOR DELETE
  USING (user_id = auth.uid() AND status = 'pending');

-- RLS Policies for change_history

-- Users can view history for changes they can access
CREATE POLICY "Users can view change history for accessible changes"
  ON change_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM document_changes
      JOIN documents ON documents.id = document_changes.document_id
      WHERE document_changes.id = change_history.change_id
      AND documents.user_id = auth.uid()
    )
  );

-- Users can create history entries for changes they make
CREATE POLICY "Users can create change history entries"
  ON change_history FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for change_notifications

-- Users can view their own notifications
CREATE POLICY "Users can view their own change notifications"
  ON change_notifications FOR SELECT
  USING (user_id = auth.uid());

-- System can create notifications
CREATE POLICY "System can create change notifications"
  ON change_notifications FOR INSERT
  WITH CHECK (TRUE);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own change notifications"
  ON change_notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own change notifications"
  ON change_notifications FOR DELETE
  USING (user_id = auth.uid());

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_document_changes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on changes
CREATE TRIGGER document_changes_updated_at
  BEFORE UPDATE ON document_changes
  FOR EACH ROW
  EXECUTE FUNCTION update_document_changes_updated_at();

-- Function to create change history entry
CREATE OR REPLACE FUNCTION create_change_history_entry()
RETURNS TRIGGER AS $$
BEGIN
  -- Create history entry for new changes
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO change_history (change_id, user_id, action, snapshot)
    VALUES (
      NEW.id,
      NEW.user_id,
      'created',
      jsonb_build_object(
        'change_type', NEW.change_type,
        'content', NEW.content,
        'start_position', NEW.start_position,
        'end_position', NEW.end_position,
        'status', NEW.status
      )
    );
  END IF;

  -- Create history entry for status changes
  IF (TG_OP = 'UPDATE' AND OLD.status != NEW.status) THEN
    INSERT INTO change_history (change_id, user_id, action, snapshot)
    VALUES (
      NEW.id,
      COALESCE(NEW.reviewed_by, NEW.user_id),
      CASE
        WHEN NEW.status = 'accepted' THEN 'accepted'
        WHEN NEW.status = 'rejected' THEN 'rejected'
        ELSE 'created'
      END,
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'reviewed_by', NEW.reviewed_by,
        'reviewed_at', NEW.reviewed_at
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create change history
CREATE TRIGGER create_change_history
  AFTER INSERT OR UPDATE ON document_changes
  FOR EACH ROW
  EXECUTE FUNCTION create_change_history_entry();

-- Function to notify document owner of new changes
CREATE OR REPLACE FUNCTION notify_document_owner_of_change()
RETURNS TRIGGER AS $$
DECLARE
  doc_owner_id UUID;
BEGIN
  -- Get document owner
  SELECT user_id INTO doc_owner_id
  FROM documents
  WHERE id = NEW.document_id;

  -- Only notify if change is from a different user
  IF doc_owner_id IS NOT NULL AND doc_owner_id != NEW.user_id THEN
    INSERT INTO change_notifications (change_id, user_id, notification_type)
    VALUES (NEW.id, doc_owner_id, 'change_created');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to notify document owner
CREATE TRIGGER notify_on_change_created
  AFTER INSERT ON document_changes
  FOR EACH ROW
  EXECUTE FUNCTION notify_document_owner_of_change();

-- Function to notify change author of review
CREATE OR REPLACE FUNCTION notify_change_author_of_review()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify on status change to accepted/rejected
  IF (TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status IN ('accepted', 'rejected')) THEN
    INSERT INTO change_notifications (change_id, user_id, notification_type)
    VALUES (NEW.id, NEW.user_id, 'change_reviewed');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to notify change author
CREATE TRIGGER notify_on_change_reviewed
  AFTER UPDATE ON document_changes
  FOR EACH ROW
  EXECUTE FUNCTION notify_change_author_of_review();

-- Comments
COMMENT ON TABLE document_changes IS 'Tracks all document changes with insertion/deletion/modification tracking';
COMMENT ON TABLE change_history IS 'Audit trail of all actions taken on changes';
COMMENT ON TABLE change_notifications IS 'Notifications for change-related events';

COMMENT ON COLUMN document_changes.change_type IS 'Type of change: insertion, deletion, or modification';
COMMENT ON COLUMN document_changes.content IS 'The text content being inserted or deleted';
COMMENT ON COLUMN document_changes.original_content IS 'Original text for modifications/deletions';
COMMENT ON COLUMN document_changes.status IS 'Review status: pending, accepted, or rejected';
COMMENT ON COLUMN document_changes.start_position IS 'Starting character position in document';
COMMENT ON COLUMN document_changes.end_position IS 'Ending character position in document';
