-- Session Security Enhancement Migration
-- Adds tables and functions for session fingerprinting, activity monitoring, and security

-- Session fingerprints table for tracking session security metadata
CREATE TABLE IF NOT EXISTS session_fingerprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fingerprint_hash TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  device_info JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  invalidated_at TIMESTAMPTZ,
  invalidation_reason TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_session_fingerprints_user_id ON session_fingerprints(user_id);
CREATE INDEX IF NOT EXISTS idx_session_fingerprints_fingerprint_hash ON session_fingerprints(fingerprint_hash);
CREATE INDEX IF NOT EXISTS idx_session_fingerprints_active ON session_fingerprints(user_id, is_active) WHERE is_active = true;

-- Session activity log for monitoring suspicious behavior
CREATE TABLE IF NOT EXISTS session_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES session_fingerprints(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL, -- login, logout, token_refresh, privilege_change, suspicious_activity
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for activity log
CREATE INDEX IF NOT EXISTS idx_session_activity_user_id ON session_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_session_activity_session_id ON session_activity_log(session_id);
CREATE INDEX IF NOT EXISTS idx_session_activity_type ON session_activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_session_activity_created_at ON session_activity_log(created_at DESC);

-- RLS policies for session_fingerprints
ALTER TABLE session_fingerprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own session fingerprints"
  ON session_fingerprints
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can invalidate their own sessions"
  ON session_fingerprints
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS policies for session_activity_log
ALTER TABLE session_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own activity logs"
  ON session_activity_log
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to clean up old session fingerprints (older than 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_session_fingerprints()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE session_fingerprints
  SET is_active = false,
      invalidated_at = now(),
      invalidation_reason = 'expired'
  WHERE last_seen_at < now() - INTERVAL '90 days'
    AND is_active = true;
END;
$$;

-- Function to log session activity
CREATE OR REPLACE FUNCTION log_session_activity(
  p_user_id UUID,
  p_session_id UUID,
  p_activity_type TEXT,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_activity_id UUID;
BEGIN
  INSERT INTO session_activity_log (
    user_id,
    session_id,
    activity_type,
    ip_address,
    user_agent,
    metadata
  ) VALUES (
    p_user_id,
    p_session_id,
    p_activity_type,
    p_ip_address,
    p_user_agent,
    p_metadata
  )
  RETURNING id INTO v_activity_id;

  RETURN v_activity_id;
END;
$$;

-- Function to get active session count for a user
CREATE OR REPLACE FUNCTION get_active_session_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_count
  FROM session_fingerprints
  WHERE user_id = p_user_id
    AND is_active = true
    AND last_seen_at > now() - INTERVAL '14 days'; -- Match session max age

  RETURN v_count;
END;
$$;

-- Function to invalidate all sessions for a user (useful for password changes)
CREATE OR REPLACE FUNCTION invalidate_all_user_sessions(
  p_user_id UUID,
  p_reason TEXT DEFAULT 'manual_invalidation'
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE session_fingerprints
  SET is_active = false,
      invalidated_at = now(),
      invalidation_reason = p_reason
  WHERE user_id = p_user_id
    AND is_active = true;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Log the invalidation
  PERFORM log_session_activity(
    p_user_id,
    NULL,
    'sessions_invalidated',
    NULL,
    NULL,
    jsonb_build_object('reason', p_reason, 'count', v_count)
  );

  RETURN v_count;
END;
$$;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON session_fingerprints TO authenticated;
GRANT SELECT, INSERT ON session_activity_log TO authenticated;
GRANT EXECUTE ON FUNCTION log_session_activity TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_session_count TO authenticated;
GRANT EXECUTE ON FUNCTION invalidate_all_user_sessions TO authenticated;

-- Add helpful comment
COMMENT ON TABLE session_fingerprints IS 'Stores session security metadata including device fingerprints for detecting session hijacking';
COMMENT ON TABLE session_activity_log IS 'Audit log of all session-related activities for security monitoring';
COMMENT ON FUNCTION cleanup_old_session_fingerprints() IS 'Scheduled function to clean up sessions older than 90 days';
COMMENT ON FUNCTION get_active_session_count(UUID) IS 'Returns the count of active sessions for a given user';
COMMENT ON FUNCTION invalidate_all_user_sessions(UUID, TEXT) IS 'Invalidates all active sessions for a user (e.g., after password change)';
