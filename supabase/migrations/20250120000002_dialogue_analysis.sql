-- Dialogue Voice Analysis Migration
-- Stores dialogue samples and voice analysis results for characters

-- Dialogue samples table for tracking character dialogue
CREATE TABLE IF NOT EXISTS dialogue_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  context TEXT,
  scene_description TEXT,
  emotional_state TEXT,
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  source_location TEXT, -- Page/scene reference
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Voice analysis results table
CREATE TABLE IF NOT EXISTS voice_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Analysis scores
  overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  uniqueness_score INTEGER NOT NULL CHECK (uniqueness_score >= 0 AND uniqueness_score <= 100),
  consistency_score INTEGER NOT NULL CHECK (consistency_score >= 0 AND consistency_score <= 100),

  -- Voice pattern (JSONB for flexibility)
  voice_pattern JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Analysis results
  issues JSONB DEFAULT '[]'::jsonb,
  strengths TEXT[] DEFAULT ARRAY[]::TEXT[],
  characterization TEXT,
  recommendations TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Metadata
  sample_count INTEGER NOT NULL DEFAULT 0,
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Dialogue validation results (for checking new dialogue against established voice)
CREATE TABLE IF NOT EXISTS dialogue_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voice_analysis_id UUID NOT NULL REFERENCES voice_analyses(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Dialogue being validated
  dialogue_text TEXT NOT NULL,
  context TEXT,

  -- Validation results
  match_score INTEGER NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
  verdict TEXT NOT NULL CHECK (verdict IN ('perfect', 'good', 'needs-work', 'off-voice')),
  explanation TEXT,
  issues JSONB DEFAULT '[]'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_dialogue_samples_character ON dialogue_samples(character_id);
CREATE INDEX IF NOT EXISTS idx_dialogue_samples_user ON dialogue_samples(user_id);
CREATE INDEX IF NOT EXISTS idx_dialogue_samples_document ON dialogue_samples(source_document_id);
CREATE INDEX IF NOT EXISTS idx_dialogue_samples_created ON dialogue_samples(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_voice_analyses_character ON voice_analyses(character_id);
CREATE INDEX IF NOT EXISTS idx_voice_analyses_user ON voice_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_analyses_created ON voice_analyses(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dialogue_validations_analysis ON dialogue_validations(voice_analysis_id);
CREATE INDEX IF NOT EXISTS idx_dialogue_validations_character ON dialogue_validations(character_id);
CREATE INDEX IF NOT EXISTS idx_dialogue_validations_user ON dialogue_validations(user_id);

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_dialogue_samples_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER dialogue_samples_updated_at
  BEFORE UPDATE ON dialogue_samples
  FOR EACH ROW
  EXECUTE FUNCTION update_dialogue_samples_updated_at();

CREATE OR REPLACE FUNCTION update_voice_analyses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER voice_analyses_updated_at
  BEFORE UPDATE ON voice_analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_voice_analyses_updated_at();

-- RLS Policies
ALTER TABLE dialogue_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE dialogue_validations ENABLE ROW LEVEL SECURITY;

-- Users can only view/modify their own dialogue samples
CREATE POLICY "Users can view their own dialogue samples"
  ON dialogue_samples
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own dialogue samples"
  ON dialogue_samples
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own dialogue samples"
  ON dialogue_samples
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own dialogue samples"
  ON dialogue_samples
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can only view/modify their own voice analyses
CREATE POLICY "Users can view their own voice analyses"
  ON voice_analyses
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own voice analyses"
  ON voice_analyses
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own voice analyses"
  ON voice_analyses
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own voice analyses"
  ON voice_analyses
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can only view/modify their own dialogue validations
CREATE POLICY "Users can view their own dialogue validations"
  ON dialogue_validations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own dialogue validations"
  ON dialogue_validations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own dialogue validations"
  ON dialogue_validations
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Helper function to get latest voice analysis for a character
CREATE OR REPLACE FUNCTION get_latest_voice_analysis(p_character_id UUID)
RETURNS TABLE (
  id UUID,
  overall_score INTEGER,
  uniqueness_score INTEGER,
  consistency_score INTEGER,
  voice_pattern JSONB,
  issues JSONB,
  characterization TEXT,
  analyzed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    va.id,
    va.overall_score,
    va.uniqueness_score,
    va.consistency_score,
    va.voice_pattern,
    va.issues,
    va.characterization,
    va.analyzed_at
  FROM voice_analyses va
  WHERE va.character_id = p_character_id
    AND va.user_id = auth.uid()
  ORDER BY va.analyzed_at DESC
  LIMIT 1;
END;
$$;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON dialogue_samples TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON voice_analyses TO authenticated;
GRANT SELECT, INSERT, DELETE ON dialogue_validations TO authenticated;
GRANT EXECUTE ON FUNCTION get_latest_voice_analysis TO authenticated;

-- Comments
COMMENT ON TABLE dialogue_samples IS 'Stores dialogue excerpts from documents for character voice analysis';
COMMENT ON TABLE voice_analyses IS 'AI-generated analysis of character dialogue voice and speech patterns';
COMMENT ON TABLE dialogue_validations IS 'Validation results for new dialogue against established voice patterns';
COMMENT ON FUNCTION get_latest_voice_analysis(UUID) IS 'Returns the most recent voice analysis for a character';
