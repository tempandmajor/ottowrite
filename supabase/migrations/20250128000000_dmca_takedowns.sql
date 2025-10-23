-- DMCA TAKEDOWN PROCESS
-- Migration: 20250128000000_dmca_takedowns
-- Description: System for authors to report and track DMCA takedown requests
-- Ticket: MS-5.3
-- ============================================================================

-- ============================================================================
-- DMCA TAKEDOWN REQUESTS TABLE
-- ============================================================================

/**
 * Tracks DMCA takedown requests submitted by authors
 */
CREATE TABLE IF NOT EXISTS public.dmca_takedown_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Requester information
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  submission_id UUID REFERENCES public.manuscript_submissions(id) ON DELETE SET NULL,

  -- Work information
  work_title TEXT NOT NULL,
  work_description TEXT NOT NULL,
  copyright_registration_number TEXT, -- US Copyright Office registration number

  -- Infringement details
  infringing_url TEXT NOT NULL,
  infringing_platform TEXT NOT NULL, -- 'website', 'social_media', 'file_sharing', 'other'
  infringement_description TEXT NOT NULL,
  evidence_urls TEXT[], -- Screenshots, archives, etc.

  -- Contact information
  complainant_full_name TEXT NOT NULL,
  complainant_email TEXT NOT NULL,
  complainant_phone TEXT,
  complainant_address TEXT NOT NULL,

  -- Legal declarations
  good_faith_statement BOOLEAN NOT NULL DEFAULT false,
  accuracy_statement BOOLEAN NOT NULL DEFAULT false,
  penalty_of_perjury BOOLEAN NOT NULL DEFAULT false,
  electronic_signature TEXT NOT NULL,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Request status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',
    'submitted',
    'under_review',
    'notice_sent',
    'content_removed',
    'counter_notice_received',
    'rejected',
    'withdrawn',
    'completed'
  )),

  -- Processing information
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  notice_sent_at TIMESTAMPTZ,
  notice_sent_to TEXT, -- Email or platform contact
  response_received_at TIMESTAMPTZ,
  response_details TEXT,

  -- Attachments
  evidence_files JSONB, -- Array of file metadata
  notice_document_url TEXT, -- Generated DMCA notice document

  -- Timestamps
  submitted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- DMCA ACTIVITY LOG TABLE
-- ============================================================================

/**
 * Tracks all activity and status changes for DMCA requests
 */
CREATE TABLE IF NOT EXISTS public.dmca_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  dmca_request_id UUID NOT NULL REFERENCES public.dmca_takedown_requests(id) ON DELETE CASCADE,

  -- Activity details
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'request_created',
    'request_submitted',
    'status_changed',
    'notice_sent',
    'response_received',
    'evidence_added',
    'note_added',
    'request_withdrawn',
    'request_completed'
  )),

  old_status TEXT,
  new_status TEXT,

  description TEXT NOT NULL,
  metadata JSONB,

  -- Who performed the action
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  performed_by_role TEXT, -- 'author', 'admin', 'system'

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- DMCA TEMPLATES TABLE
-- ============================================================================

/**
 * Pre-defined DMCA notice templates for different platforms
 */
CREATE TABLE IF NOT EXISTS public.dmca_notice_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  platform_name TEXT NOT NULL UNIQUE, -- 'generic', 'amazon', 'google', 'facebook', etc.
  platform_type TEXT NOT NULL, -- 'website', 'social_media', 'file_sharing', 'marketplace'

  template_content TEXT NOT NULL, -- Markdown template with variables
  required_fields TEXT[], -- Fields required for this template

  contact_email TEXT,
  contact_url TEXT,
  submission_instructions TEXT,

  active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_dmca_requests_user
ON public.dmca_takedown_requests(user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dmca_requests_submission
ON public.dmca_takedown_requests(submission_id);

CREATE INDEX IF NOT EXISTS idx_dmca_requests_status
ON public.dmca_takedown_requests(status, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_dmca_activity_log_request
ON public.dmca_activity_log(dmca_request_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dmca_templates_platform
ON public.dmca_notice_templates(platform_name) WHERE active = true;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

/**
 * Submit a DMCA takedown request
 */
CREATE OR REPLACE FUNCTION public.submit_dmca_request(
  p_request_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_status TEXT;
BEGIN
  -- Get current status
  SELECT status INTO v_current_status
  FROM public.dmca_takedown_requests
  WHERE id = p_request_id
    AND user_id = p_user_id;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'DMCA request not found or access denied';
  END IF;

  IF v_current_status != 'draft' THEN
    RAISE EXCEPTION 'Only draft requests can be submitted';
  END IF;

  -- Update request status
  UPDATE public.dmca_takedown_requests
  SET
    status = 'submitted',
    submitted_at = NOW(),
    updated_at = NOW()
  WHERE id = p_request_id;

  -- Log the activity
  INSERT INTO public.dmca_activity_log (
    dmca_request_id,
    activity_type,
    old_status,
    new_status,
    description,
    performed_by,
    performed_by_role
  ) VALUES (
    p_request_id,
    'request_submitted',
    'draft',
    'submitted',
    'DMCA takedown request submitted for review',
    p_user_id,
    'author'
  );

  RETURN true;
END;
$$;

/**
 * Withdraw a DMCA takedown request
 */
CREATE OR REPLACE FUNCTION public.withdraw_dmca_request(
  p_request_id UUID,
  p_user_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_status TEXT;
BEGIN
  -- Get current status
  SELECT status INTO v_current_status
  FROM public.dmca_takedown_requests
  WHERE id = p_request_id
    AND user_id = p_user_id;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'DMCA request not found or access denied';
  END IF;

  IF v_current_status IN ('withdrawn', 'completed') THEN
    RAISE EXCEPTION 'Request cannot be withdrawn';
  END IF;

  -- Update request status
  UPDATE public.dmca_takedown_requests
  SET
    status = 'withdrawn',
    review_notes = COALESCE(review_notes || E'\n\n', '') || 'Withdrawn by author: ' || COALESCE(p_reason, 'No reason provided'),
    updated_at = NOW()
  WHERE id = p_request_id;

  -- Log the activity
  INSERT INTO public.dmca_activity_log (
    dmca_request_id,
    activity_type,
    old_status,
    new_status,
    description,
    performed_by,
    performed_by_role,
    metadata
  ) VALUES (
    p_request_id,
    'request_withdrawn',
    v_current_status,
    'withdrawn',
    'DMCA takedown request withdrawn by author',
    p_user_id,
    'author',
    jsonb_build_object('reason', p_reason)
  );

  RETURN true;
END;
$$;

/**
 * Get DMCA request summary statistics
 */
CREATE OR REPLACE FUNCTION public.get_dmca_statistics(
  p_user_id UUID
)
RETURNS TABLE(
  total_requests BIGINT,
  draft_requests BIGINT,
  submitted_requests BIGINT,
  active_requests BIGINT,
  completed_requests BIGINT,
  success_rate NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    COUNT(*) as total_requests,
    COUNT(*) FILTER (WHERE status = 'draft') as draft_requests,
    COUNT(*) FILTER (WHERE status = 'submitted') as submitted_requests,
    COUNT(*) FILTER (WHERE status IN ('submitted', 'under_review', 'notice_sent', 'counter_notice_received')) as active_requests,
    COUNT(*) FILTER (WHERE status IN ('content_removed', 'completed')) as completed_requests,
    CASE
      WHEN COUNT(*) FILTER (WHERE status NOT IN ('draft', 'withdrawn')) > 0
      THEN (COUNT(*) FILTER (WHERE status IN ('content_removed', 'completed'))::NUMERIC /
            COUNT(*) FILTER (WHERE status NOT IN ('draft', 'withdrawn'))::NUMERIC * 100)
      ELSE 0
    END as success_rate
  FROM public.dmca_takedown_requests
  WHERE user_id = p_user_id;
$$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update timestamp on dmca_takedown_requests
CREATE OR REPLACE FUNCTION update_dmca_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_dmca_requests_timestamp
BEFORE UPDATE ON public.dmca_takedown_requests
FOR EACH ROW
EXECUTE FUNCTION update_dmca_requests_updated_at();

-- Auto-log status changes
CREATE OR REPLACE FUNCTION log_dmca_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.dmca_activity_log (
      dmca_request_id,
      activity_type,
      old_status,
      new_status,
      description,
      performed_by_role
    ) VALUES (
      NEW.id,
      'status_changed',
      OLD.status,
      NEW.status,
      format('Status changed from %s to %s', OLD.status, NEW.status),
      'system'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_dmca_status_change
AFTER UPDATE ON public.dmca_takedown_requests
FOR EACH ROW
EXECUTE FUNCTION log_dmca_status_change();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS
ALTER TABLE public.dmca_takedown_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dmca_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dmca_notice_templates ENABLE ROW LEVEL SECURITY;

-- Authors can manage their own DMCA requests
CREATE POLICY "Authors can view their own DMCA requests"
ON public.dmca_takedown_requests
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Authors can create DMCA requests"
ON public.dmca_takedown_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authors can update their own draft requests"
ON public.dmca_takedown_requests
FOR UPDATE
USING (auth.uid() = user_id AND status = 'draft')
WITH CHECK (auth.uid() = user_id);

-- Authors can view activity log for their requests
CREATE POLICY "Authors can view activity log for their requests"
ON public.dmca_activity_log
FOR SELECT
USING (
  dmca_request_id IN (
    SELECT id FROM public.dmca_takedown_requests
    WHERE user_id = auth.uid()
  )
);

-- Everyone can view active templates
CREATE POLICY "Anyone can view active DMCA templates"
ON public.dmca_notice_templates
FOR SELECT
USING (active = true);

-- Service role full access
CREATE POLICY "Service role full access to DMCA requests"
ON public.dmca_takedown_requests
FOR ALL
USING (auth.jwt()->>'role' = 'service_role')
WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access to activity log"
ON public.dmca_activity_log
FOR ALL
USING (auth.jwt()->>'role' = 'service_role')
WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- SEED DATA - Common DMCA Templates
-- ============================================================================

INSERT INTO public.dmca_notice_templates (platform_name, platform_type, template_content, required_fields, contact_email, submission_instructions)
VALUES
  (
    'generic',
    'website',
    E'# DMCA Takedown Notice\n\n**To:** {{platform_contact}}\n**From:** {{complainant_name}}\n**Date:** {{current_date}}\n\n## Identification of Copyrighted Work\n\nI am the copyright owner of the following work:\n- **Title:** {{work_title}}\n- **Description:** {{work_description}}\n{{#if copyright_registration}}**Copyright Registration Number:** {{copyright_registration}}{{/if}}\n\n## Identification of Infringing Material\n\nThe following material on your platform infringes my copyright:\n- **URL:** {{infringing_url}}\n- **Description:** {{infringement_description}}\n\n## Evidence\n\n{{evidence_description}}\n\n## Contact Information\n\n**Name:** {{complainant_name}}\n**Email:** {{complainant_email}}\n**Phone:** {{complainant_phone}}\n**Address:** {{complainant_address}}\n\n## Legal Statements\n\nI have a good faith belief that use of the copyrighted materials described above as allegedly infringing is not authorized by the copyright owner, its agent, or the law.\n\nI swear, under penalty of perjury, that the information in this notification is accurate and that I am the copyright owner or am authorized to act on behalf of the owner of an exclusive right that is allegedly infringed.\n\n**Electronic Signature:** {{electronic_signature}}\n**Date:** {{signature_date}}',
    ARRAY['work_title', 'work_description', 'infringing_url', 'infringement_description', 'complainant_name', 'complainant_email', 'complainant_address', 'electronic_signature'],
    NULL,
    'Send the completed notice to the platform''s DMCA agent or abuse contact.'
  ),
  (
    'amazon',
    'marketplace',
    E'# Amazon DMCA Takedown Notice\n\n**Report Infringement to:** notice@amazon.com\n\n{{generic_template_content}}\n\n## Additional Information for Amazon\n\nPlease remove the infringing content and take appropriate action against the seller.',
    ARRAY['work_title', 'work_description', 'infringing_url', 'infringement_description', 'complainant_name', 'complainant_email', 'complainant_address', 'electronic_signature'],
    'notice@amazon.com',
    'Submit via Amazon''s Report Infringement form or email to notice@amazon.com'
  ),
  (
    'google',
    'file_sharing',
    E'# Google DMCA Takedown Notice\n\n**Submit to:** https://support.google.com/legal/answer/3110420\n\n{{generic_template_content}}',
    ARRAY['work_title', 'work_description', 'infringing_url', 'infringement_description', 'complainant_name', 'complainant_email', 'complainant_address', 'electronic_signature'],
    NULL,
    'Submit via Google''s DMCA Dashboard: https://support.google.com/legal/answer/3110420'
  )
ON CONFLICT (platform_name) DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.dmca_takedown_requests IS
'DMCA takedown requests submitted by authors to report copyright infringement';

COMMENT ON TABLE public.dmca_activity_log IS
'Activity log tracking all actions and status changes for DMCA requests';

COMMENT ON TABLE public.dmca_notice_templates IS
'Pre-defined DMCA notice templates for different platforms';

COMMENT ON FUNCTION public.submit_dmca_request IS
'Submits a draft DMCA request for processing';

COMMENT ON FUNCTION public.withdraw_dmca_request IS
'Withdraws an active DMCA request';

COMMENT ON FUNCTION public.get_dmca_statistics IS
'Returns summary statistics for user''s DMCA requests';
