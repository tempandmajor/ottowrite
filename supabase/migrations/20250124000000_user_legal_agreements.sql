-- USER LEGAL AGREEMENTS TRACKING
-- Migration: 20250124000000_user_legal_agreements
-- Description: Track user agreements to legal documents
-- Ticket: MS-5.1
-- ============================================================================

-- ============================================================================
-- USER LEGAL AGREEMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_legal_agreements (
  -- Primary identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User reference
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Document identification
  document_id TEXT NOT NULL, -- e.g., 'submission-tos-v1', 'ip-protection-v1'
  document_type TEXT NOT NULL CHECK (document_type IN ('terms', 'privacy', 'ip-protection', 'partner-terms')),
  document_version TEXT NOT NULL, -- e.g., '1.0', '1.1'

  -- Agreement details
  agreed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET, -- IP address when agreement was made
  user_agent TEXT, -- Browser/device information

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(user_id, document_id, document_version)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Fast lookup by user
CREATE INDEX idx_user_legal_agreements_user_id
ON public.user_legal_agreements(user_id);

-- Fast lookup by document type
CREATE INDEX idx_user_legal_agreements_document_type
ON public.user_legal_agreements(document_type);

-- Fast lookup by user and document
CREATE INDEX idx_user_legal_agreements_user_document
ON public.user_legal_agreements(user_id, document_id);

-- Fast lookup by agreement date
CREATE INDEX idx_user_legal_agreements_agreed_at
ON public.user_legal_agreements(agreed_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.user_legal_agreements ENABLE ROW LEVEL SECURITY;

-- Users can view their own agreements
CREATE POLICY user_legal_agreements_select_own
ON public.user_legal_agreements
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own agreements
CREATE POLICY user_legal_agreements_insert_own
ON public.user_legal_agreements
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users cannot update or delete agreements (immutable audit trail)
-- No UPDATE or DELETE policies

-- Admins can view all agreements
CREATE POLICY user_legal_agreements_admin_select
ON public.user_legal_agreements
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_settings
    WHERE user_settings.user_id = auth.uid()
    AND user_settings.role = 'admin'
  )
);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

/**
 * Check if user has agreed to required documents for submissions
 */
CREATE OR REPLACE FUNCTION public.has_submission_agreements(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  required_docs TEXT[] := ARRAY['submission-tos-v1', 'ip-protection-v1'];
  doc TEXT;
  has_agreement BOOLEAN;
BEGIN
  -- Check each required document
  FOREACH doc IN ARRAY required_docs
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM public.user_legal_agreements
      WHERE user_id = check_user_id
      AND document_id = doc
    ) INTO has_agreement;

    -- If any required document is missing, return false
    IF NOT has_agreement THEN
      RETURN FALSE;
    END IF;
  END LOOP;

  -- All required documents are present
  RETURN TRUE;
END;
$$;

/**
 * Get missing required agreements for user
 */
CREATE OR REPLACE FUNCTION public.get_missing_agreements(check_user_id UUID)
RETURNS TABLE(document_id TEXT, document_type TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH required_docs AS (
    SELECT 'submission-tos-v1' as doc_id, 'terms' as doc_type
    UNION ALL
    SELECT 'ip-protection-v1', 'ip-protection'
  )
  SELECT rd.doc_id, rd.doc_type
  FROM required_docs rd
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_legal_agreements ula
    WHERE ula.user_id = check_user_id
    AND ula.document_id = rd.doc_id
  );
END;
$$;

/**
 * Record user agreement to legal document
 */
CREATE OR REPLACE FUNCTION public.record_legal_agreement(
  p_user_id UUID,
  p_document_id TEXT,
  p_document_type TEXT,
  p_document_version TEXT,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  agreement_id UUID;
BEGIN
  -- Verify user is recording their own agreement
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Cannot record agreement for another user';
  END IF;

  -- Insert agreement (ON CONFLICT DO NOTHING to handle duplicates)
  INSERT INTO public.user_legal_agreements (
    user_id,
    document_id,
    document_type,
    document_version,
    ip_address,
    user_agent
  )
  VALUES (
    p_user_id,
    p_document_id,
    p_document_type,
    p_document_version,
    p_ip_address,
    p_user_agent
  )
  ON CONFLICT (user_id, document_id, document_version) DO NOTHING
  RETURNING id INTO agreement_id;

  -- If no ID was returned, the agreement already existed
  IF agreement_id IS NULL THEN
    SELECT id INTO agreement_id
    FROM public.user_legal_agreements
    WHERE user_id = p_user_id
    AND document_id = p_document_id
    AND document_version = p_document_version;
  END IF;

  RETURN agreement_id;
END;
$$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.user_legal_agreements IS
'Tracks user agreements to legal documents (Terms, Privacy Policy, IP Protection, etc.)';

COMMENT ON COLUMN public.user_legal_agreements.document_id IS
'Unique identifier for the document (e.g., submission-tos-v1)';

COMMENT ON COLUMN public.user_legal_agreements.document_version IS
'Version of the document agreed to (e.g., 1.0, 1.1)';

COMMENT ON COLUMN public.user_legal_agreements.ip_address IS
'IP address of the user when agreement was made (for audit purposes)';

COMMENT ON COLUMN public.user_legal_agreements.user_agent IS
'Browser/device information when agreement was made (for audit purposes)';

COMMENT ON FUNCTION public.has_submission_agreements IS
'Check if user has agreed to all required documents for manuscript submissions';

COMMENT ON FUNCTION public.get_missing_agreements IS
'Get list of required agreements that user has not yet accepted';

COMMENT ON FUNCTION public.record_legal_agreement IS
'Record a user agreement to a legal document with audit information';
