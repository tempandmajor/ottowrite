-- PARTNER PORTAL FUNCTIONS
-- Migration: 20250126000000_partner_portal_functions
-- Description: Database functions for partner portal statistics and queries
-- Ticket: MS-2.4
-- ============================================================================

-- ============================================================================
-- PARTNER SUBMISSION STATISTICS FUNCTION
-- ============================================================================

/**
 * Get submission statistics for a partner
 */
CREATE OR REPLACE FUNCTION public.get_partner_submission_stats(
  p_partner_id UUID
)
RETURNS TABLE(
  total_submissions BIGINT,
  new_submissions BIGINT,
  reviewed_submissions BIGINT,
  accepted_submissions BIGINT,
  rejected_submissions BIGINT,
  acceptance_rate NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    COUNT(*) as total_submissions,
    COUNT(*) FILTER (WHERE status = 'submitted') as new_submissions,
    COUNT(*) FILTER (WHERE status IN ('viewed', 'requested_more')) as reviewed_submissions,
    COUNT(*) FILTER (WHERE status = 'accepted') as accepted_submissions,
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected_submissions,
    CASE
      WHEN COUNT(*) FILTER (WHERE status IN ('accepted', 'rejected')) > 0
      THEN (COUNT(*) FILTER (WHERE status = 'accepted')::NUMERIC /
            COUNT(*) FILTER (WHERE status IN ('accepted', 'rejected'))::NUMERIC * 100)
      ELSE 0
    END as acceptance_rate
  FROM public.partner_submissions
  WHERE partner_id = p_partner_id;
$$;

-- ============================================================================
-- ADD RESPONSE TRACKING FIELDS
-- ============================================================================

-- Add responded_at field to partner_submissions if it doesn't exist
ALTER TABLE public.partner_submissions
ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;

-- Add index for responded_at
CREATE INDEX IF NOT EXISTS idx_partner_submissions_responded_at
ON public.partner_submissions(responded_at)
WHERE responded_at IS NOT NULL;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION public.get_partner_submission_stats IS
'Get submission statistics for a specific partner including totals, status counts, and acceptance rate';

COMMENT ON COLUMN public.partner_submissions.responded_at IS
'Timestamp when partner submitted their response (accept/reject/request more)';
