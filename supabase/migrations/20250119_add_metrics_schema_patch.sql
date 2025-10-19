-- Metrics schema enhancements: additional indexes and history helper

-- ============================================================================
-- ADDITIONAL INDEXES FOR DOCUMENT METRICS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_doc_metrics_job_id
  ON public.document_metrics(job_id)
  WHERE job_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_doc_metrics_version
  ON public.document_metrics(document_id, metric_type, version DESC);

CREATE INDEX IF NOT EXISTS idx_doc_metrics_user_latest
  ON public.document_metrics(user_id, metric_type)
  WHERE is_latest = true;

-- ============================================================================
-- METRIC HISTORY FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION get_metric_history(
  p_document_id uuid,
  p_metric_type text,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS SETOF public.document_metrics AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.document_metrics
  WHERE document_id = p_document_id
    AND metric_type = p_metric_type
  ORDER BY calculated_at DESC, created_at DESC
  OFFSET GREATEST(p_offset, 0)
  LIMIT LEAST(p_limit, 200);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_metric_history(uuid, text, integer, integer) TO authenticated;
