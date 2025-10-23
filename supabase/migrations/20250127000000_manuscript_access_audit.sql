-- MANUSCRIPT ACCESS AUDIT TRAIL
-- Migration: 20250127000000_manuscript_access_audit
-- Description: Comprehensive audit logging for manuscript access and suspicious activity detection
-- Ticket: MS-3.3
-- ============================================================================

-- ============================================================================
-- AUDIT LOG TABLE
-- ============================================================================

/**
 * Tracks every access to manuscripts with detailed metadata
 */
CREATE TABLE IF NOT EXISTS public.manuscript_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What was accessed
  submission_id UUID NOT NULL REFERENCES public.manuscript_submissions(id) ON DELETE CASCADE,
  access_token_id TEXT, -- Reference to the access token used

  -- Who accessed it
  partner_id UUID REFERENCES public.submission_partners(id) ON DELETE SET NULL,
  partner_email TEXT,
  partner_name TEXT,

  -- When
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  session_duration_seconds INTEGER, -- How long they viewed it

  -- Where/How
  ip_address INET,
  user_agent TEXT,
  device_fingerprint TEXT,
  location_country TEXT,
  location_city TEXT,

  -- What they did
  action TEXT NOT NULL CHECK (action IN (
    'view_query',
    'view_synopsis',
    'view_samples',
    'download_attempted',
    'print_attempted',
    'copy_attempted',
    'share_attempted'
  )),

  -- Security metadata
  access_granted BOOLEAN DEFAULT true,
  denial_reason TEXT,

  -- Tracking metadata
  watermark_id TEXT,
  drm_flags JSONB, -- DRM security headers and restrictions

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- SUSPICIOUS ACTIVITY TABLE
-- ============================================================================

/**
 * Flags and tracks suspicious access patterns
 */
CREATE TABLE IF NOT EXISTS public.suspicious_activity_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What triggered the alert
  submission_id UUID NOT NULL REFERENCES public.manuscript_submissions(id) ON DELETE CASCADE,
  partner_id UUID REFERENCES public.submission_partners(id) ON DELETE SET NULL,

  -- Alert details
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'rapid_access', -- Multiple accesses in short time
    'unusual_location', -- Access from unexpected location
    'multiple_devices', -- Access from many different devices
    'access_after_expiry', -- Attempted access with expired token
    'unauthorized_action', -- Attempted download/print when not allowed
    'ip_mismatch', -- Different IP than initial access
    'suspicious_user_agent', -- Automated tools detected
    'excessive_duration', -- Unusually long viewing session
    'concurrent_sessions' -- Multiple simultaneous sessions
  )),

  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),

  -- Context
  description TEXT NOT NULL,
  metadata JSONB, -- Additional context about the alert
  related_log_ids UUID[], -- References to manuscript_access_logs

  -- Status
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN (
    'new',
    'investigating',
    'confirmed',
    'false_positive',
    'resolved'
  )),

  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,

  -- Timestamps
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- ACCESS SUMMARY VIEW
-- ============================================================================

/**
 * Summary view of access statistics per submission
 */
CREATE OR REPLACE VIEW public.manuscript_access_summary AS
SELECT
  submission_id,
  COUNT(*) as total_accesses,
  COUNT(DISTINCT partner_id) as unique_partners,
  COUNT(DISTINCT ip_address) as unique_ips,
  COUNT(DISTINCT device_fingerprint) as unique_devices,
  MAX(accessed_at) as last_accessed,
  MIN(accessed_at) as first_accessed,
  COUNT(*) FILTER (WHERE action = 'view_query') as query_views,
  COUNT(*) FILTER (WHERE action = 'view_synopsis') as synopsis_views,
  COUNT(*) FILTER (WHERE action = 'view_samples') as sample_views,
  COUNT(*) FILTER (WHERE action = 'download_attempted') as download_attempts,
  COUNT(*) FILTER (WHERE action = 'print_attempted') as print_attempts,
  COUNT(*) FILTER (WHERE action = 'copy_attempted') as copy_attempts,
  COUNT(*) FILTER (WHERE access_granted = false) as denied_accesses,
  AVG(session_duration_seconds) as avg_session_duration
FROM public.manuscript_access_logs
GROUP BY submission_id;

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_access_logs_submission
ON public.manuscript_access_logs(submission_id, accessed_at DESC);

CREATE INDEX IF NOT EXISTS idx_access_logs_partner
ON public.manuscript_access_logs(partner_id, accessed_at DESC);

CREATE INDEX IF NOT EXISTS idx_access_logs_ip
ON public.manuscript_access_logs(ip_address);

CREATE INDEX IF NOT EXISTS idx_access_logs_accessed_at
ON public.manuscript_access_logs(accessed_at DESC);

CREATE INDEX IF NOT EXISTS idx_suspicious_alerts_submission
ON public.suspicious_activity_alerts(submission_id, status, severity);

CREATE INDEX IF NOT EXISTS idx_suspicious_alerts_status
ON public.suspicious_activity_alerts(status, detected_at DESC);

-- GIN index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_access_logs_drm_flags
ON public.manuscript_access_logs USING GIN(drm_flags);

CREATE INDEX IF NOT EXISTS idx_suspicious_alerts_metadata
ON public.suspicious_activity_alerts USING GIN(metadata);

-- ============================================================================
-- AUDIT LOGGING FUNCTION
-- ============================================================================

/**
 * Log manuscript access with automatic suspicious activity detection
 */
CREATE OR REPLACE FUNCTION public.log_manuscript_access(
  p_submission_id UUID,
  p_access_token_id TEXT,
  p_partner_id UUID,
  p_action TEXT,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_device_fingerprint TEXT DEFAULT NULL,
  p_watermark_id TEXT DEFAULT NULL,
  p_drm_flags JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id UUID;
  v_partner_email TEXT;
  v_partner_name TEXT;
  v_recent_count INTEGER;
  v_device_count INTEGER;
  v_ip_count INTEGER;
BEGIN
  -- Get partner details
  SELECT email, name INTO v_partner_email, v_partner_name
  FROM public.submission_partners
  WHERE id = p_partner_id;

  -- Insert access log
  INSERT INTO public.manuscript_access_logs (
    submission_id,
    access_token_id,
    partner_id,
    partner_email,
    partner_name,
    accessed_at,
    ip_address,
    user_agent,
    device_fingerprint,
    action,
    watermark_id,
    drm_flags
  ) VALUES (
    p_submission_id,
    p_access_token_id,
    p_partner_id,
    v_partner_email,
    v_partner_name,
    NOW(),
    p_ip_address,
    p_user_agent,
    p_device_fingerprint,
    p_action,
    p_watermark_id,
    p_drm_flags
  )
  RETURNING id INTO v_log_id;

  -- Check for suspicious activity: Rapid access (more than 10 accesses in 1 hour)
  SELECT COUNT(*) INTO v_recent_count
  FROM public.manuscript_access_logs
  WHERE submission_id = p_submission_id
    AND partner_id = p_partner_id
    AND accessed_at > NOW() - INTERVAL '1 hour';

  IF v_recent_count > 10 THEN
    INSERT INTO public.suspicious_activity_alerts (
      submission_id,
      partner_id,
      alert_type,
      severity,
      description,
      metadata,
      related_log_ids
    ) VALUES (
      p_submission_id,
      p_partner_id,
      'rapid_access',
      'medium',
      format('Partner accessed manuscript %s times in the last hour', v_recent_count),
      jsonb_build_object(
        'access_count', v_recent_count,
        'time_window', '1 hour'
      ),
      ARRAY[v_log_id]
    );
  END IF;

  -- Check for multiple devices (more than 3 unique devices)
  SELECT COUNT(DISTINCT device_fingerprint) INTO v_device_count
  FROM public.manuscript_access_logs
  WHERE submission_id = p_submission_id
    AND partner_id = p_partner_id
    AND device_fingerprint IS NOT NULL;

  IF v_device_count > 3 THEN
    INSERT INTO public.suspicious_activity_alerts (
      submission_id,
      partner_id,
      alert_type,
      severity,
      description,
      metadata,
      related_log_ids
    ) VALUES (
      p_submission_id,
      p_partner_id,
      'multiple_devices',
      'high',
      format('Manuscript accessed from %s different devices', v_device_count),
      jsonb_build_object(
        'device_count', v_device_count
      ),
      ARRAY[v_log_id]
    )
    ON CONFLICT DO NOTHING; -- Avoid duplicate alerts
  END IF;

  -- Check for multiple IPs (more than 5 unique IPs)
  SELECT COUNT(DISTINCT ip_address) INTO v_ip_count
  FROM public.manuscript_access_logs
  WHERE submission_id = p_submission_id
    AND partner_id = p_partner_id
    AND ip_address IS NOT NULL;

  IF v_ip_count > 5 THEN
    INSERT INTO public.suspicious_activity_alerts (
      submission_id,
      partner_id,
      alert_type,
      severity,
      description,
      metadata,
      related_log_ids
    ) VALUES (
      p_submission_id,
      p_partner_id,
      'ip_mismatch',
      'medium',
      format('Manuscript accessed from %s different IP addresses', v_ip_count),
      jsonb_build_object(
        'ip_count', v_ip_count
      ),
      ARRAY[v_log_id]
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN v_log_id;
END;
$$;

-- ============================================================================
-- GET SUBMISSION ACCESS HISTORY
-- ============================================================================

/**
 * Get access history for a submission (for authors to view)
 */
CREATE OR REPLACE FUNCTION public.get_submission_access_history(
  p_submission_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE(
  id UUID,
  partner_name TEXT,
  partner_email TEXT,
  action TEXT,
  accessed_at TIMESTAMPTZ,
  ip_address INET,
  location_country TEXT,
  session_duration_seconds INTEGER
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    id,
    partner_name,
    partner_email,
    action,
    accessed_at,
    ip_address,
    location_country,
    session_duration_seconds
  FROM public.manuscript_access_logs
  WHERE submission_id = p_submission_id
  ORDER BY accessed_at DESC
  LIMIT p_limit;
$$;

-- ============================================================================
-- GET SUSPICIOUS ACTIVITY ALERTS
-- ============================================================================

/**
 * Get suspicious activity alerts for a submission
 */
CREATE OR REPLACE FUNCTION public.get_submission_alerts(
  p_submission_id UUID,
  p_status TEXT DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  alert_type TEXT,
  severity TEXT,
  description TEXT,
  status TEXT,
  detected_at TIMESTAMPTZ,
  metadata JSONB
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    id,
    alert_type,
    severity,
    description,
    status,
    detected_at,
    metadata
  FROM public.suspicious_activity_alerts
  WHERE submission_id = p_submission_id
    AND (p_status IS NULL OR status = p_status)
  ORDER BY detected_at DESC;
$$;

-- ============================================================================
-- UPDATE ALERT STATUS
-- ============================================================================

/**
 * Update the status of a suspicious activity alert
 */
CREATE OR REPLACE FUNCTION public.update_alert_status(
  p_alert_id UUID,
  p_status TEXT,
  p_reviewer_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.suspicious_activity_alerts
  SET
    status = p_status,
    reviewed_by = p_reviewer_id,
    reviewed_at = NOW(),
    review_notes = p_notes,
    updated_at = NOW()
  WHERE id = p_alert_id;
END;
$$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update timestamp on suspicious_activity_alerts
CREATE OR REPLACE FUNCTION update_suspicious_alerts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_suspicious_alerts_timestamp
BEFORE UPDATE ON public.suspicious_activity_alerts
FOR EACH ROW
EXECUTE FUNCTION update_suspicious_alerts_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS
ALTER TABLE public.manuscript_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suspicious_activity_alerts ENABLE ROW LEVEL SECURITY;

-- Authors can view access logs for their own submissions
CREATE POLICY "Authors can view their submission access logs"
ON public.manuscript_access_logs
FOR SELECT
USING (
  submission_id IN (
    SELECT id FROM public.manuscript_submissions
    WHERE user_id = auth.uid()
  )
);

-- Authors can view alerts for their own submissions
CREATE POLICY "Authors can view their submission alerts"
ON public.suspicious_activity_alerts
FOR SELECT
USING (
  submission_id IN (
    SELECT id FROM public.manuscript_submissions
    WHERE user_id = auth.uid()
  )
);

-- Service role can do everything (for logging from API)
CREATE POLICY "Service role full access to access logs"
ON public.manuscript_access_logs
FOR ALL
USING (auth.jwt()->>'role' = 'service_role')
WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access to alerts"
ON public.suspicious_activity_alerts
FOR ALL
USING (auth.jwt()->>'role' = 'service_role')
WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.manuscript_access_logs IS
'Comprehensive audit trail of all manuscript access for security and analytics';

COMMENT ON TABLE public.suspicious_activity_alerts IS
'Automated detection and tracking of suspicious manuscript access patterns';

COMMENT ON FUNCTION public.log_manuscript_access IS
'Logs manuscript access and automatically detects suspicious patterns';

COMMENT ON FUNCTION public.get_submission_access_history IS
'Retrieves access history for a submission (for authors to view who accessed their work)';

COMMENT ON FUNCTION public.get_submission_alerts IS
'Retrieves suspicious activity alerts for a submission';

COMMENT ON VIEW public.manuscript_access_summary IS
'Aggregated statistics about manuscript access patterns';
