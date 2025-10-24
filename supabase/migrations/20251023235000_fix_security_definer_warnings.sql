-- Migration: Fix SECURITY DEFINER Warnings
-- Generated: 2025-10-23
--
-- Fixes:
-- 1. Add security_invoker option to views (1 view)
-- 2. Add SET search_path to SECURITY DEFINER functions (103 functions)
--
-- These changes improve security by preventing search_path injection attacks
-- and ensuring views run with the permissions of the querying user.

-- ============================================================================
-- PART 1: FIX VIEW SECURITY (1 view)
-- ============================================================================

-- Add security_invoker option to manuscript_access_summary view
-- This ensures the view runs with the permissions of the querying user,
-- not the view creator
DROP VIEW IF EXISTS public.manuscript_access_summary CASCADE;

CREATE VIEW public.manuscript_access_summary
WITH (security_invoker = true) AS
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

-- Grant access
GRANT SELECT ON public.manuscript_access_summary TO authenticated;
GRANT SELECT ON public.manuscript_access_summary TO anon;

-- ============================================================================
-- PART 2: ADD search_path TO FUNCTIONS (53 functions)
-- ============================================================================
-- Note: Functions with SECURITY DEFINER must have search_path set to prevent
-- search_path injection attacks where a malicious user could create a schema
-- and override built-in functions.
-- ============================================================================

-- These are the EXACT function signatures from the database
ALTER FUNCTION public.approve_partner_verification(p_request_id uuid, p_level text, p_admin_id uuid, p_notes text) SET search_path = '';
ALTER FUNCTION public.cancel_analytics_job(job_id uuid) SET search_path = '';
ALTER FUNCTION public.check_ghostwriter_word_quota(p_user_id uuid, p_words_to_generate integer) SET search_path = '';
ALTER FUNCTION public.cleanup_old_analytics_jobs(days_to_keep integer) SET search_path = '';
ALTER FUNCTION public.cleanup_old_metrics(p_days_to_keep integer, p_keep_latest boolean) SET search_path = '';
ALTER FUNCTION public.complete_analytics_job(job_id uuid, job_output jsonb) SET search_path = '';
ALTER FUNCTION public.create_document_version() SET search_path = '';
ALTER FUNCTION public.create_main_branch_for_document() SET search_path = '';
ALTER FUNCTION public.create_metric_event(p_document_id uuid, p_user_id uuid, p_event_type text, p_category text, p_title text, p_description text, p_event_data jsonb, p_metric_id uuid, p_severity text) SET search_path = '';
ALTER FUNCTION public.create_submission_notification(p_user_id uuid, p_submission_id uuid, p_type text, p_title text, p_message text, p_action_url text) SET search_path = '';
ALTER FUNCTION public.dequeue_analytics_job() SET search_path = '';
ALTER FUNCTION public.dismiss_event(p_event_id uuid) SET search_path = '';
ALTER FUNCTION public.enforce_document_limit() SET search_path = '';
ALTER FUNCTION public.enforce_project_limit() SET search_path = '';
ALTER FUNCTION public.fail_analytics_job(job_id uuid, error_message text, should_retry boolean) SET search_path = '';
ALTER FUNCTION public.generate_ai_outline(p_project_id uuid, p_user_id uuid, p_premise text, p_format text, p_additional_context text) SET search_path = '';
ALTER FUNCTION public.get_api_request_count_today(p_user_id uuid) SET search_path = '';
ALTER FUNCTION public.get_conversion_funnel(p_user_id uuid) SET search_path = '';
ALTER FUNCTION public.get_dmca_statistics(p_user_id uuid) SET search_path = '';
ALTER FUNCTION public.get_document_version_count(doc_id uuid) SET search_path = '';
ALTER FUNCTION public.get_latest_metrics(p_document_id uuid, p_metric_type text) SET search_path = '';
ALTER FUNCTION public.get_metric_history(p_document_id uuid, p_metric_type text, p_limit integer, p_offset integer) SET search_path = '';
ALTER FUNCTION public.get_metrics_for_period(p_document_id uuid, p_start timestamp with time zone, p_end timestamp with time zone, p_metric_types text[]) SET search_path = '';
ALTER FUNCTION public.get_missing_agreements(check_user_id uuid) SET search_path = '';
ALTER FUNCTION public.get_notification_preferences(p_user_id uuid) SET search_path = '';
ALTER FUNCTION public.get_partner_submission_stats(p_partner_id uuid) SET search_path = '';
ALTER FUNCTION public.get_submission_access_history(p_submission_id uuid, p_limit integer) SET search_path = '';
ALTER FUNCTION public.get_submission_alerts(p_submission_id uuid, p_status text) SET search_path = '';
ALTER FUNCTION public.get_submission_timeline(p_user_id uuid, p_days_back integer) SET search_path = '';
ALTER FUNCTION public.get_top_performing_partners(p_user_id uuid, p_limit integer) SET search_path = '';
ALTER FUNCTION public.get_unread_events(p_user_id uuid, p_limit integer) SET search_path = '';
ALTER FUNCTION public.get_unread_notification_count(p_user_id uuid) SET search_path = '';
ALTER FUNCTION public.has_submission_agreements(check_user_id uuid) SET search_path = '';
ALTER FUNCTION public.increment_ghostwriter_word_usage(p_user_id uuid, p_word_count integer) SET search_path = '';
ALTER FUNCTION public.increment_template_usage(template_id uuid) SET search_path = '';
ALTER FUNCTION public.increment_template_usage(p_template_type text, p_genre text, p_completed boolean) SET search_path = '';
ALTER FUNCTION public.initialize_beats_from_template(p_project_id uuid, p_user_id uuid, p_template_name text) SET search_path = '';
ALTER FUNCTION public.log_api_request(p_user_id uuid, p_endpoint text, p_method text, p_status_code integer, p_response_time_ms integer, p_api_key_id uuid) SET search_path = '';
ALTER FUNCTION public.log_manuscript_access(p_submission_id uuid, p_access_token_id text, p_partner_id uuid, p_action text, p_ip_address inet, p_user_agent text, p_device_fingerprint text, p_watermark_id text, p_drm_flags jsonb) SET search_path = '';
ALTER FUNCTION public.mark_all_notifications_as_read(p_user_id uuid) SET search_path = '';
ALTER FUNCTION public.mark_event_read(p_event_id uuid) SET search_path = '';
ALTER FUNCTION public.mark_notification_as_read(p_notification_id uuid, p_user_id uuid) SET search_path = '';
ALTER FUNCTION public.record_legal_agreement(p_user_id uuid, p_document_id text, p_document_type text, p_document_version text, p_ip_address inet, p_user_agent text) SET search_path = '';
ALTER FUNCTION public.refresh_submission_analytics() SET search_path = '';
ALTER FUNCTION public.refresh_user_plan_usage(p_user_id uuid) SET search_path = '';
ALTER FUNCTION public.reject_partner_verification(p_request_id uuid, p_admin_id uuid, p_reason text, p_red_flags text[]) SET search_path = '';
ALTER FUNCTION public.request_verification_info(p_request_id uuid, p_admin_id uuid, p_info_needed text) SET search_path = '';
ALTER FUNCTION public.restore_document_version(version_id uuid) SET search_path = '';
ALTER FUNCTION public.store_metric_from_job(p_job_id uuid, p_metric_type text, p_metrics jsonb, p_snapshot_id text, p_from_snapshot_id text, p_to_snapshot_id text) SET search_path = '';
ALTER FUNCTION public.submit_dmca_request(p_request_id uuid, p_user_id uuid) SET search_path = '';
ALTER FUNCTION public.update_alert_status(p_alert_id uuid, p_status text, p_reviewer_id uuid, p_notes text) SET search_path = '';
ALTER FUNCTION public.update_user_writing_profile(p_user_id uuid, p_template_type text, p_genre text, p_project_completed boolean) SET search_path = '';
ALTER FUNCTION public.withdraw_dmca_request(p_request_id uuid, p_user_id uuid, p_reason text) SET search_path = '';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify the view has security_invoker
DO $$
DECLARE
  view_options text;
BEGIN
  SELECT reloptions::text INTO view_options
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'manuscript_access_summary'
    AND c.relkind = 'v';

  IF view_options IS NULL OR view_options NOT LIKE '%security_invoker%' THEN
    RAISE WARNING 'manuscript_access_summary does not have security_invoker option';
  ELSE
    RAISE NOTICE 'manuscript_access_summary correctly configured with security_invoker';
  END IF;
END $$;

-- Count remaining functions with SECURITY DEFINER but no search_path
DO $$
DECLARE
  remaining_count integer;
BEGIN
  SELECT COUNT(*) INTO remaining_count
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prosecdef = true
    AND NOT EXISTS (
      SELECT 1
      FROM unnest(p.proconfig) AS config
      WHERE config LIKE 'search_path=%'
    );

  IF remaining_count > 0 THEN
    RAISE WARNING '% functions still have SECURITY DEFINER without search_path', remaining_count;
  ELSE
    RAISE NOTICE 'All SECURITY DEFINER functions now have search_path set ✓';
  END IF;
END $$;
