-- PARTNER VERIFICATION SYSTEM
-- Migration: 20250125000000_partner_verification
-- Description: Partner verification tracking and management
-- Ticket: MS-5.2
-- ============================================================================

-- ============================================================================
-- ADD VERIFICATION FIELDS TO SUBMISSION_PARTNERS
-- ============================================================================

-- Add verification columns to existing submission_partners table
ALTER TABLE public.submission_partners
ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'pending', 'rejected', 'verified')),
ADD COLUMN IF NOT EXISTS verification_level TEXT CHECK (verification_level IN ('basic', 'standard', 'premium', 'elite')),
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id);

-- Create index for verification status
CREATE INDEX IF NOT EXISTS idx_submission_partners_verification_status
ON public.submission_partners(verification_status);

-- Create index for verified partners
CREATE INDEX IF NOT EXISTS idx_submission_partners_verified
ON public.submission_partners(verification_status, verification_level)
WHERE verification_status = 'verified';

-- ============================================================================
-- PARTNER VERIFICATION REQUESTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.partner_verification_requests (
  -- Primary identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Partner reference
  partner_id UUID NOT NULL REFERENCES public.submission_partners(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Verification status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'more_info_needed')),
  level TEXT CHECK (level IN ('basic', 'standard', 'premium', 'elite')),

  -- Business information
  business_name TEXT NOT NULL,
  website TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,

  -- Professional credentials
  industry_associations TEXT[], -- Array of association IDs
  membership_proof TEXT[], -- URLs to membership verification
  sales_history TEXT, -- Notable sales or publications
  client_list TEXT, -- Anonymized list of represented authors

  -- Social proof
  linkedin TEXT,
  twitter TEXT,
  publishers_marketplace TEXT,
  query_tracker TEXT,
  manuscript_wish_list TEXT,

  -- Additional documentation
  documents JSONB DEFAULT '[]'::jsonb, -- Array of document metadata
  notes TEXT, -- Applicant notes

  -- Review data
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  rejection_reason TEXT,
  red_flags TEXT[], -- Array of identified red flags
  verification_score INTEGER DEFAULT 0, -- 0-100 score

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(partner_id, created_at) -- Allow multiple requests per partner over time
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Fast lookup by partner
CREATE INDEX idx_partner_verification_requests_partner_id
ON public.partner_verification_requests(partner_id);

-- Fast lookup by status
CREATE INDEX idx_partner_verification_requests_status
ON public.partner_verification_requests(status);

-- Fast lookup by requester
CREATE INDEX idx_partner_verification_requests_requested_by
ON public.partner_verification_requests(requested_by);

-- Fast lookup for pending reviews
CREATE INDEX idx_partner_verification_requests_pending
ON public.partner_verification_requests(status, created_at)
WHERE status = 'pending';

-- Fast lookup by reviewer
CREATE INDEX idx_partner_verification_requests_reviewed_by
ON public.partner_verification_requests(reviewed_by)
WHERE reviewed_by IS NOT NULL;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.partner_verification_requests ENABLE ROW LEVEL SECURITY;

-- Partners can view their own verification requests
CREATE POLICY partner_verification_requests_select_own
ON public.partner_verification_requests
FOR SELECT
USING (auth.uid() = requested_by);

-- Partners can create verification requests for their own partners
CREATE POLICY partner_verification_requests_insert_own
ON public.partner_verification_requests
FOR INSERT
WITH CHECK (auth.uid() = requested_by);

-- Partners can update their own pending requests
CREATE POLICY partner_verification_requests_update_own
ON public.partner_verification_requests
FOR UPDATE
USING (auth.uid() = requested_by AND status = 'pending')
WITH CHECK (auth.uid() = requested_by AND status = 'pending');

-- Admins can view all verification requests
CREATE POLICY partner_verification_requests_admin_select
ON public.partner_verification_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_settings
    WHERE user_settings.user_id = auth.uid()
    AND user_settings.role = 'admin'
  )
);

-- Admins can update verification requests (review them)
CREATE POLICY partner_verification_requests_admin_update
ON public.partner_verification_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_settings
    WHERE user_settings.user_id = auth.uid()
    AND user_settings.role = 'admin'
  )
);

-- ============================================================================
-- VERIFICATION AUDIT LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.partner_verification_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  verification_request_id UUID NOT NULL REFERENCES public.partner_verification_requests(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.submission_partners(id) ON DELETE CASCADE,

  -- Action details
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'approved', 'rejected', 'info_requested', 'resubmitted')),
  performed_by UUID NOT NULL REFERENCES auth.users(id),

  -- Change tracking
  old_status TEXT,
  new_status TEXT,
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_partner_verification_audit_log_request_id
ON public.partner_verification_audit_log(verification_request_id);

CREATE INDEX idx_partner_verification_audit_log_partner_id
ON public.partner_verification_audit_log(partner_id);

ALTER TABLE public.partner_verification_audit_log ENABLE ROW LEVEL SECURITY;

-- Anyone can view audit logs for their own verification requests
CREATE POLICY partner_verification_audit_log_select
ON public.partner_verification_audit_log
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.partner_verification_requests pvr
    WHERE pvr.id = verification_request_id
    AND (pvr.requested_by = auth.uid() OR EXISTS (
      SELECT 1 FROM public.user_settings
      WHERE user_settings.user_id = auth.uid()
      AND user_settings.role = 'admin'
    ))
  )
);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

/**
 * Approve partner verification
 */
CREATE OR REPLACE FUNCTION public.approve_partner_verification(
  p_request_id UUID,
  p_level TEXT,
  p_admin_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_partner_id UUID;
  v_old_status TEXT;
BEGIN
  -- Verify admin permissions
  IF NOT EXISTS (
    SELECT 1 FROM public.user_settings
    WHERE user_id = p_admin_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Get partner ID and old status
  SELECT partner_id, status INTO v_partner_id, v_old_status
  FROM public.partner_verification_requests
  WHERE id = p_request_id;

  IF v_partner_id IS NULL THEN
    RAISE EXCEPTION 'Verification request not found';
  END IF;

  -- Update verification request
  UPDATE public.partner_verification_requests
  SET
    status = 'approved',
    level = p_level,
    reviewed_by = p_admin_id,
    reviewed_at = NOW(),
    review_notes = p_notes,
    updated_at = NOW()
  WHERE id = p_request_id;

  -- Update partner verification status
  UPDATE public.submission_partners
  SET
    verification_status = 'verified',
    verification_level = p_level,
    verified_at = NOW(),
    verified_by = p_admin_id,
    updated_at = NOW()
  WHERE id = v_partner_id;

  -- Log the action
  INSERT INTO public.partner_verification_audit_log (
    verification_request_id,
    partner_id,
    action,
    performed_by,
    old_status,
    new_status,
    notes
  ) VALUES (
    p_request_id,
    v_partner_id,
    'approved',
    p_admin_id,
    v_old_status,
    'approved',
    p_notes
  );

  RETURN TRUE;
END;
$$;

/**
 * Reject partner verification
 */
CREATE OR REPLACE FUNCTION public.reject_partner_verification(
  p_request_id UUID,
  p_admin_id UUID,
  p_reason TEXT,
  p_red_flags TEXT[] DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_partner_id UUID;
  v_old_status TEXT;
BEGIN
  -- Verify admin permissions
  IF NOT EXISTS (
    SELECT 1 FROM public.user_settings
    WHERE user_id = p_admin_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Get partner ID and old status
  SELECT partner_id, status INTO v_partner_id, v_old_status
  FROM public.partner_verification_requests
  WHERE id = p_request_id;

  IF v_partner_id IS NULL THEN
    RAISE EXCEPTION 'Verification request not found';
  END IF;

  -- Update verification request
  UPDATE public.partner_verification_requests
  SET
    status = 'rejected',
    reviewed_by = p_admin_id,
    reviewed_at = NOW(),
    rejection_reason = p_reason,
    red_flags = p_red_flags,
    updated_at = NOW()
  WHERE id = p_request_id;

  -- Update partner verification status
  UPDATE public.submission_partners
  SET
    verification_status = 'rejected',
    updated_at = NOW()
  WHERE id = v_partner_id;

  -- Log the action
  INSERT INTO public.partner_verification_audit_log (
    verification_request_id,
    partner_id,
    action,
    performed_by,
    old_status,
    new_status,
    notes
  ) VALUES (
    p_request_id,
    v_partner_id,
    'rejected',
    p_admin_id,
    v_old_status,
    'rejected',
    p_reason
  );

  RETURN TRUE;
END;
$$;

/**
 * Request more information for verification
 */
CREATE OR REPLACE FUNCTION public.request_verification_info(
  p_request_id UUID,
  p_admin_id UUID,
  p_info_needed TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_partner_id UUID;
  v_old_status TEXT;
BEGIN
  -- Verify admin permissions
  IF NOT EXISTS (
    SELECT 1 FROM public.user_settings
    WHERE user_id = p_admin_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Get partner ID and old status
  SELECT partner_id, status INTO v_partner_id, v_old_status
  FROM public.partner_verification_requests
  WHERE id = p_request_id;

  IF v_partner_id IS NULL THEN
    RAISE EXCEPTION 'Verification request not found';
  END IF;

  -- Update verification request
  UPDATE public.partner_verification_requests
  SET
    status = 'more_info_needed',
    reviewed_by = p_admin_id,
    reviewed_at = NOW(),
    review_notes = p_info_needed,
    updated_at = NOW()
  WHERE id = p_request_id;

  -- Log the action
  INSERT INTO public.partner_verification_audit_log (
    verification_request_id,
    partner_id,
    action,
    performed_by,
    old_status,
    new_status,
    notes
  ) VALUES (
    p_request_id,
    v_partner_id,
    'info_requested',
    p_admin_id,
    v_old_status,
    'more_info_needed',
    p_info_needed
  );

  RETURN TRUE;
END;
$$;

/**
 * Get verification statistics
 */
CREATE OR REPLACE FUNCTION public.get_verification_stats()
RETURNS TABLE(
  total_partners BIGINT,
  verified_partners BIGINT,
  pending_requests BIGINT,
  basic_verified BIGINT,
  standard_verified BIGINT,
  premium_verified BIGINT,
  elite_verified BIGINT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    COUNT(*) as total_partners,
    COUNT(*) FILTER (WHERE verification_status = 'verified') as verified_partners,
    COUNT(*) FILTER (WHERE verification_status = 'pending') as pending_requests,
    COUNT(*) FILTER (WHERE verification_status = 'verified' AND verification_level = 'basic') as basic_verified,
    COUNT(*) FILTER (WHERE verification_status = 'verified' AND verification_level = 'standard') as standard_verified,
    COUNT(*) FILTER (WHERE verification_status = 'verified' AND verification_level = 'premium') as premium_verified,
    COUNT(*) FILTER (WHERE verification_status = 'verified' AND verification_level = 'elite') as elite_verified
  FROM public.submission_partners;
$$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_partner_verification_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER partner_verification_requests_updated_at
BEFORE UPDATE ON public.partner_verification_requests
FOR EACH ROW
EXECUTE FUNCTION update_partner_verification_requests_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.partner_verification_requests IS
'Tracks verification requests from literary agents and publishers';

COMMENT ON COLUMN public.partner_verification_requests.verification_score IS
'Calculated score (0-100) based on provided credentials and documentation';

COMMENT ON TABLE public.partner_verification_audit_log IS
'Audit trail of all verification-related actions';

COMMENT ON FUNCTION public.approve_partner_verification IS
'Approve a partner verification request and update partner status';

COMMENT ON FUNCTION public.reject_partner_verification IS
'Reject a partner verification request with reason';

COMMENT ON FUNCTION public.request_verification_info IS
'Request additional information from partner for verification';
