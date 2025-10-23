-- Migration: Ghostwriter Usage Tracking Schema
-- Ticket: 1.2 - Create Ghostwriter Usage Tracking Schema
-- Description: Add Ghostwriter-specific usage tracking, chunks, and feedback tables

-- =====================================================================================
-- PART 1: Add Ghostwriter word tracking to existing usage tables
-- =====================================================================================

-- Add ghostwriter_words_used_month to user_plan_usage (current usage)
ALTER TABLE user_plan_usage
ADD COLUMN IF NOT EXISTS ghostwriter_words_used_month INTEGER DEFAULT 0 NOT NULL;

COMMENT ON COLUMN user_plan_usage.ghostwriter_words_used_month IS 'Ghostwriter AI words generated this month';

-- Add ghostwriter_words_per_month to subscription_tier_limits (limits)
ALTER TABLE subscription_tier_limits
ADD COLUMN IF NOT EXISTS ghostwriter_words_per_month INTEGER;

COMMENT ON COLUMN subscription_tier_limits.ghostwriter_words_per_month IS 'Monthly limit for Ghostwriter AI word generation. NULL = unlimited';

-- =====================================================================================
-- PART 2: Set Ghostwriter word limits per tier
-- =====================================================================================

-- Free tier: 1,000 words/month
UPDATE subscription_tier_limits
SET ghostwriter_words_per_month = 1000
WHERE tier = 'free';

-- Hobbyist tier: 1,000 words/month
UPDATE subscription_tier_limits
SET ghostwriter_words_per_month = 1000
WHERE tier = 'hobbyist';

-- Professional tier: 1,000 words/month
UPDATE subscription_tier_limits
SET ghostwriter_words_per_month = 1000
WHERE tier = 'professional';

-- Studio tier: Unlimited (NULL)
UPDATE subscription_tier_limits
SET ghostwriter_words_per_month = NULL
WHERE tier = 'studio';

-- =====================================================================================
-- PART 3: Create ghostwriter_chunks table
-- =====================================================================================

CREATE TABLE IF NOT EXISTS ghostwriter_chunks (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,

  -- Chunk metadata
  title TEXT NOT NULL,
  chunk_type TEXT NOT NULL CHECK (chunk_type IN ('scene', 'chapter', 'section', 'custom')),
  chunk_order INTEGER,

  -- Context for generation
  story_context TEXT,
  character_context JSONB DEFAULT '[]'::jsonb,
  previous_chunk_id UUID REFERENCES ghostwriter_chunks(id) ON DELETE SET NULL,

  -- Generation parameters
  target_word_count INTEGER,
  style_preferences JSONB DEFAULT '{}'::jsonb,
  constraints JSONB DEFAULT '[]'::jsonb,

  -- Generated content
  generated_content TEXT,
  word_count INTEGER DEFAULT 0 NOT NULL,

  -- Quality metrics
  consistency_score DECIMAL(3,2),
  pacing_score DECIMAL(3,2),
  character_voice_score DECIMAL(3,2),
  overall_quality_score DECIMAL(3,2),

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'reviewed', 'accepted', 'rejected', 'refined')),
  generation_model TEXT,
  generation_tokens INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  generated_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ
);

-- Add comments for documentation
COMMENT ON TABLE ghostwriter_chunks IS 'Stores Ghostwriter AI-generated story chunks';
COMMENT ON COLUMN ghostwriter_chunks.chunk_type IS 'Type of chunk: scene, chapter, section, or custom';
COMMENT ON COLUMN ghostwriter_chunks.story_context IS 'Story context provided for generation';
COMMENT ON COLUMN ghostwriter_chunks.character_context IS 'Array of character data relevant to this chunk';
COMMENT ON COLUMN ghostwriter_chunks.previous_chunk_id IS 'Reference to previous chunk for continuity';
COMMENT ON COLUMN ghostwriter_chunks.style_preferences IS 'User style preferences for generation';
COMMENT ON COLUMN ghostwriter_chunks.constraints IS 'Generation constraints (must include, must avoid, etc.)';
COMMENT ON COLUMN ghostwriter_chunks.consistency_score IS 'Consistency with story context (0-10)';
COMMENT ON COLUMN ghostwriter_chunks.pacing_score IS 'Pacing quality score (0-10)';
COMMENT ON COLUMN ghostwriter_chunks.character_voice_score IS 'Character voice authenticity (0-10)';
COMMENT ON COLUMN ghostwriter_chunks.overall_quality_score IS 'Overall quality score (0-10)';

-- =====================================================================================
-- PART 4: Create ghostwriter_feedback table
-- =====================================================================================

CREATE TABLE IF NOT EXISTS ghostwriter_feedback (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  chunk_id UUID NOT NULL REFERENCES ghostwriter_chunks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Feedback type
  feedback_type TEXT NOT NULL CHECK (feedback_type IN (
    'thumbs_up',
    'thumbs_down',
    'regenerate_request',
    'refinement_request',
    'quality_issue',
    'consistency_issue',
    'style_issue'
  )),

  -- Feedback details
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  specific_issues JSONB DEFAULT '[]'::jsonb,

  -- Context for refinement
  refinement_instructions TEXT,
  refinement_applied BOOLEAN DEFAULT FALSE,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add comments for documentation
COMMENT ON TABLE ghostwriter_feedback IS 'User feedback on Ghostwriter AI generations';
COMMENT ON COLUMN ghostwriter_feedback.feedback_type IS 'Type of feedback provided';
COMMENT ON COLUMN ghostwriter_feedback.specific_issues IS 'Array of specific issues identified';
COMMENT ON COLUMN ghostwriter_feedback.refinement_instructions IS 'Instructions for refining the generation';
COMMENT ON COLUMN ghostwriter_feedback.refinement_applied IS 'Whether refinement was applied';

-- =====================================================================================
-- PART 5: Create indexes for performance
-- =====================================================================================

-- Ghostwriter chunks indexes
CREATE INDEX IF NOT EXISTS idx_ghostwriter_chunks_user_id
  ON ghostwriter_chunks(user_id);

CREATE INDEX IF NOT EXISTS idx_ghostwriter_chunks_project_id
  ON ghostwriter_chunks(project_id)
  WHERE project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ghostwriter_chunks_document_id
  ON ghostwriter_chunks(document_id)
  WHERE document_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ghostwriter_chunks_status
  ON ghostwriter_chunks(status);

CREATE INDEX IF NOT EXISTS idx_ghostwriter_chunks_created_at
  ON ghostwriter_chunks(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ghostwriter_chunks_user_created
  ON ghostwriter_chunks(user_id, created_at DESC);

-- Ghostwriter feedback indexes
CREATE INDEX IF NOT EXISTS idx_ghostwriter_feedback_chunk_id
  ON ghostwriter_feedback(chunk_id);

CREATE INDEX IF NOT EXISTS idx_ghostwriter_feedback_user_id
  ON ghostwriter_feedback(user_id);

CREATE INDEX IF NOT EXISTS idx_ghostwriter_feedback_type
  ON ghostwriter_feedback(feedback_type);

CREATE INDEX IF NOT EXISTS idx_ghostwriter_feedback_created_at
  ON ghostwriter_feedback(created_at DESC);

-- =====================================================================================
-- PART 6: Add RLS policies for ghostwriter_chunks
-- =====================================================================================

-- Enable RLS
ALTER TABLE ghostwriter_chunks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own chunks
CREATE POLICY "Users can view their own ghostwriter chunks"
  ON ghostwriter_chunks
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own chunks
CREATE POLICY "Users can create their own ghostwriter chunks"
  ON ghostwriter_chunks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own chunks
CREATE POLICY "Users can update their own ghostwriter chunks"
  ON ghostwriter_chunks
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own chunks
CREATE POLICY "Users can delete their own ghostwriter chunks"
  ON ghostwriter_chunks
  FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================================================
-- PART 7: Add RLS policies for ghostwriter_feedback
-- =====================================================================================

-- Enable RLS
ALTER TABLE ghostwriter_feedback ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own feedback
CREATE POLICY "Users can view their own ghostwriter feedback"
  ON ghostwriter_feedback
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own feedback
CREATE POLICY "Users can create their own ghostwriter feedback"
  ON ghostwriter_feedback
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own feedback
CREATE POLICY "Users can update their own ghostwriter feedback"
  ON ghostwriter_feedback
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own feedback
CREATE POLICY "Users can delete their own ghostwriter feedback"
  ON ghostwriter_feedback
  FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================================================
-- PART 8: Create trigger for updated_at timestamp
-- =====================================================================================

-- Trigger function already exists (update_updated_at_column)
-- Just create the trigger for ghostwriter_chunks
CREATE TRIGGER update_ghostwriter_chunks_updated_at
  BEFORE UPDATE ON ghostwriter_chunks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================================
-- PART 9: Helper function to check Ghostwriter word quota
-- =====================================================================================

CREATE OR REPLACE FUNCTION check_ghostwriter_word_quota(
  p_user_id UUID,
  p_words_to_generate INTEGER
) RETURNS JSONB AS $$
DECLARE
  v_tier TEXT;
  v_limit INTEGER;
  v_used INTEGER;
  v_available INTEGER;
BEGIN
  -- Get user's subscription tier
  SELECT subscription_tier INTO v_tier
  FROM user_profiles
  WHERE id = p_user_id;

  -- Get tier limit (NULL = unlimited for Studio)
  SELECT ghostwriter_words_per_month INTO v_limit
  FROM subscription_tier_limits
  WHERE tier = v_tier;

  -- Get current usage
  SELECT ghostwriter_words_used_month INTO v_used
  FROM user_plan_usage
  WHERE user_id = p_user_id;

  -- If limit is NULL (Studio), allow unlimited
  IF v_limit IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', TRUE,
      'tier', v_tier,
      'used', v_used,
      'limit', NULL,
      'available', NULL,
      'requested', p_words_to_generate
    );
  END IF;

  -- Calculate available words
  v_available := v_limit - v_used;

  -- Check if request exceeds available quota
  IF p_words_to_generate > v_available THEN
    RETURN jsonb_build_object(
      'allowed', FALSE,
      'tier', v_tier,
      'used', v_used,
      'limit', v_limit,
      'available', v_available,
      'requested', p_words_to_generate,
      'reason', 'quota_exceeded'
    );
  END IF;

  -- Allow the request
  RETURN jsonb_build_object(
    'allowed', TRUE,
    'tier', v_tier,
    'used', v_used,
    'limit', v_limit,
    'available', v_available,
    'requested', p_words_to_generate
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_ghostwriter_word_quota IS 'Check if user can generate specified number of Ghostwriter words';

-- =====================================================================================
-- PART 10: Helper function to increment Ghostwriter word usage
-- =====================================================================================

CREATE OR REPLACE FUNCTION increment_ghostwriter_word_usage(
  p_user_id UUID,
  p_word_count INTEGER
) RETURNS VOID AS $$
BEGIN
  -- Increment ghostwriter words used
  UPDATE user_plan_usage
  SET
    ghostwriter_words_used_month = ghostwriter_words_used_month + p_word_count,
    ai_words_used_month = ai_words_used_month + p_word_count,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- If no row exists, create it
  IF NOT FOUND THEN
    INSERT INTO user_plan_usage (user_id, ghostwriter_words_used_month, ai_words_used_month)
    VALUES (p_user_id, p_word_count, p_word_count);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION increment_ghostwriter_word_usage IS 'Increment Ghostwriter word usage for a user';

-- =====================================================================================
-- Verification queries (for testing)
-- =====================================================================================

-- Verify columns exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_plan_usage'
    AND column_name = 'ghostwriter_words_used_month'
  ) THEN
    RAISE EXCEPTION 'Column ghostwriter_words_used_month not created';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscription_tier_limits'
    AND column_name = 'ghostwriter_words_per_month'
  ) THEN
    RAISE EXCEPTION 'Column ghostwriter_words_per_month not created';
  END IF;

  RAISE NOTICE 'Ghostwriter schema migration completed successfully';
END $$;
