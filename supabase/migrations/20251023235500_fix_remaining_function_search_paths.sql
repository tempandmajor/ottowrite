-- Migration: Fix Remaining Function Search Paths
-- Generated: 2025-10-23
--
-- Fixes the remaining 52 functions without search_path set
-- These are trigger functions and utility functions that didn't have SECURITY DEFINER
-- but still need search_path for security best practices
--
-- This completes the fix for all 103 Supabase security warnings

-- ============================================================================
-- Batch 1: Trigger Functions (15 functions)
-- ============================================================================
ALTER FUNCTION public.update_locations_updated_at() SET search_path = '';
ALTER FUNCTION public.update_location_events_updated_at() SET search_path = '';
ALTER FUNCTION public.update_world_elements_updated_at() SET search_path = '';
ALTER FUNCTION public.update_ai_background_tasks_updated_at() SET search_path = '';
ALTER FUNCTION public.update_branch_updated_at() SET search_path = '';
ALTER FUNCTION public.update_template_timestamp() SET search_path = '';
ALTER FUNCTION public.update_beat_timestamp() SET search_path = '';
ALTER FUNCTION public.update_outlines_updated_at() SET search_path = '';
ALTER FUNCTION public.update_outline_sections_updated_at() SET search_path = '';
ALTER FUNCTION public.update_suspicious_alerts_updated_at() SET search_path = '';
ALTER FUNCTION public.update_plot_analyses_updated_at() SET search_path = '';
ALTER FUNCTION public.update_plot_issues_updated_at() SET search_path = '';
ALTER FUNCTION public.update_characters_updated_at() SET search_path = '';
ALTER FUNCTION public.update_character_relationships_updated_at() SET search_path = '';
ALTER FUNCTION public.update_character_arcs_updated_at() SET search_path = '';

-- ============================================================================
-- Batch 2: More Trigger and Utility Functions (15 functions)
-- ============================================================================
ALTER FUNCTION public.update_dialogue_samples_updated_at() SET search_path = '';
ALTER FUNCTION public.update_undo_history_timestamp() SET search_path = '';
ALTER FUNCTION public.update_voice_analyses_updated_at() SET search_path = '';
ALTER FUNCTION public.update_dmca_requests_updated_at() SET search_path = '';
ALTER FUNCTION public.update_analytics_jobs_timestamp() SET search_path = '';
ALTER FUNCTION public.update_document_changes_updated_at() SET search_path = '';
ALTER FUNCTION public.update_document_type_metadata_updated_at() SET search_path = '';
ALTER FUNCTION public.update_document_metrics_timestamp() SET search_path = '';
ALTER FUNCTION public.update_latest_metric() SET search_path = '';
ALTER FUNCTION public.update_partner_submissions_updated_at() SET search_path = '';
ALTER FUNCTION public.update_partner_submission_stats() SET search_path = '';
ALTER FUNCTION public.update_updated_at_column() SET search_path = '';
ALTER FUNCTION public.set_submission_submitted_at() SET search_path = '';
ALTER FUNCTION public.calculate_partner_acceptance_rate() SET search_path = '';
ALTER FUNCTION public.log_dmca_status_change() SET search_path = '';

-- ============================================================================
-- Batch 3: Utility and Helper Functions (15 functions)
-- ============================================================================
ALTER FUNCTION public.get_user_plan(p_user_id uuid) SET search_path = '';
ALTER FUNCTION public.get_document_type_info(doc_type text) SET search_path = '';
ALTER FUNCTION public.is_script_type(doc_type text) SET search_path = '';
ALTER FUNCTION public.get_document_category(doc_type text) SET search_path = '';
ALTER FUNCTION public.get_folder_contents(folder_id uuid) SET search_path = '';
ALTER FUNCTION public.get_folder_path(document_id uuid) SET search_path = '';
ALTER FUNCTION public.get_folder_word_count(folder_id uuid) SET search_path = '';
ALTER FUNCTION public.get_character_stats(p_project_id uuid) SET search_path = '';
ALTER FUNCTION public.get_character_relationships(p_character_id uuid) SET search_path = '';
ALTER FUNCTION public.get_plot_issue_stats(p_document_id uuid) SET search_path = '';
ALTER FUNCTION public.get_latest_voice_analysis(p_character_id uuid) SET search_path = '';
ALTER FUNCTION public.get_active_session_count(p_user_id uuid) SET search_path = '';
ALTER FUNCTION public.sum_ai_usage(p_user_id uuid, p_period_start timestamp with time zone, p_period_end timestamp with time zone) SET search_path = '';
ALTER FUNCTION public.cleanup_old_session_fingerprints() SET search_path = '';
ALTER FUNCTION public.enforce_template_limit() SET search_path = '';

-- ============================================================================
-- Batch 4: Final Functions (7 functions)
-- ============================================================================
ALTER FUNCTION public.enforce_snapshot_limit() SET search_path = '';
ALTER FUNCTION public.enforce_collaborator_limit() SET search_path = '';
ALTER FUNCTION public.log_session_activity(p_user_id uuid, p_session_id uuid, p_activity_type text, p_ip_address inet, p_user_agent text, p_metadata jsonb) SET search_path = '';
ALTER FUNCTION public.invalidate_all_user_sessions(p_user_id uuid, p_reason text) SET search_path = '';
ALTER FUNCTION public.create_change_history_entry() SET search_path = '';
ALTER FUNCTION public.notify_document_owner_of_change() SET search_path = '';
ALTER FUNCTION public.notify_change_author_of_review() SET search_path = '';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify NO functions remain without search_path
DO $$
DECLARE
  remaining_count integer;
BEGIN
  SELECT COUNT(*) INTO remaining_count
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND NOT EXISTS (
      SELECT 1
      FROM unnest(p.proconfig) AS config
      WHERE config LIKE 'search_path=%'
    );

  IF remaining_count > 0 THEN
    RAISE WARNING '% functions still without search_path', remaining_count;
  ELSE
    RAISE NOTICE 'SUCCESS: All functions now have search_path set! ✓';
  END IF;
END $$;
