-- Migration: Add onboarding completion tracking
-- Ticket: UX-001 - New User Onboarding Flow
-- Date: 2025-01-21

-- Add onboarding flag to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS has_completed_onboarding BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;

-- Add onboarding checklist progress (JSONB for flexibility)
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS onboarding_checklist JSONB DEFAULT '{
  "created_first_project": false,
  "added_first_character": false,
  "wrote_first_100_words": false,
  "used_ai_assistant": false
}'::jsonb;

-- Create index for querying new users
CREATE INDEX IF NOT EXISTS idx_user_profiles_onboarding
ON user_profiles(has_completed_onboarding)
WHERE has_completed_onboarding = FALSE;

-- Comment on columns
COMMENT ON COLUMN user_profiles.has_completed_onboarding IS 'True if user has completed initial onboarding wizard';
COMMENT ON COLUMN user_profiles.onboarding_completed_at IS 'Timestamp when user completed onboarding';
COMMENT ON COLUMN user_profiles.onboarding_step IS 'Current step in onboarding wizard (0-4)';
COMMENT ON COLUMN user_profiles.onboarding_checklist IS 'Progress on getting started checklist tasks';
