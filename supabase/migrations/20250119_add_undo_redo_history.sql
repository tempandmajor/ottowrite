-- Create table for storing undo/redo history per document
CREATE TABLE IF NOT EXISTS public.document_undo_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  undo_stack jsonb NOT NULL DEFAULT '[]'::jsonb,
  redo_stack jsonb NOT NULL DEFAULT '[]'::jsonb,
  current_entry_id text,
  max_stack_size integer NOT NULL DEFAULT 100,
  last_action_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_document UNIQUE(user_id, document_id),
  CONSTRAINT valid_stack_size CHECK (max_stack_size > 0 AND max_stack_size <= 500)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_undo_history_document_id ON public.document_undo_history(document_id);
CREATE INDEX IF NOT EXISTS idx_undo_history_user_id ON public.document_undo_history(user_id);
CREATE INDEX IF NOT EXISTS idx_undo_history_last_action ON public.document_undo_history(last_action_at DESC);

-- Enable RLS
ALTER TABLE public.document_undo_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own undo history
CREATE POLICY "Users can view own undo history"
  ON public.document_undo_history
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own undo history"
  ON public.document_undo_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own undo history"
  ON public.document_undo_history
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own undo history"
  ON public.document_undo_history
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_undo_history_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.last_action_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update timestamps
CREATE TRIGGER update_undo_history_timestamp
  BEFORE UPDATE ON public.document_undo_history
  FOR EACH ROW
  EXECUTE FUNCTION update_undo_history_timestamp();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_undo_history TO authenticated;
