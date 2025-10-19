-- Metrics Schema for Analytics System
-- Stores calculated metrics from analytics jobs and tracks metric events

-- ============================================================================
-- DOCUMENT METRICS TABLE
-- ============================================================================
-- Stores aggregated metrics calculated by analytics workers
CREATE TABLE IF NOT EXISTS public.document_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Metric type and source
  metric_type text NOT NULL CHECK (metric_type IN (
    'snapshot_analysis',
    'snapshot_comparison',
    'writing_velocity',
    'structure_analysis',
    'session_summary',
    'daily_summary',
    'weekly_summary'
  )),
  source text NOT NULL CHECK (source IN ('worker', 'manual', 'scheduled')),

  -- Metric data (stored as JSONB for flexibility)
  metrics jsonb NOT NULL,

  -- Time period (for time-based metrics)
  period_start timestamptz,
  period_end timestamptz,

  -- Snapshot references (for snapshot-based metrics)
  snapshot_id text,
  from_snapshot_id text,
  to_snapshot_id text,

  -- Metadata
  job_id uuid REFERENCES public.analytics_jobs(id) ON DELETE SET NULL,
  version integer NOT NULL DEFAULT 1,
  is_latest boolean NOT NULL DEFAULT true,

  -- Timestamps
  calculated_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT valid_period CHECK (
    (period_start IS NULL AND period_end IS NULL) OR
    (period_start IS NOT NULL AND period_end IS NOT NULL AND period_start <= period_end)
  ),
  CONSTRAINT valid_snapshot_refs CHECK (
    (metric_type = 'snapshot_analysis' AND snapshot_id IS NOT NULL) OR
    (metric_type = 'snapshot_comparison' AND from_snapshot_id IS NOT NULL AND to_snapshot_id IS NOT NULL) OR
    (metric_type IN ('writing_velocity', 'structure_analysis', 'session_summary', 'daily_summary', 'weekly_summary'))
  )
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_doc_metrics_document_id ON public.document_metrics(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_metrics_user_id ON public.document_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_doc_metrics_type ON public.document_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_doc_metrics_calculated_at ON public.document_metrics(calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_doc_metrics_period ON public.document_metrics(period_start, period_end) WHERE period_start IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_doc_metrics_snapshot ON public.document_metrics(snapshot_id) WHERE snapshot_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_doc_metrics_latest ON public.document_metrics(document_id, metric_type, is_latest) WHERE is_latest = true;

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_doc_metrics_lookup ON public.document_metrics(document_id, metric_type, calculated_at DESC);

-- GIN index for JSONB querying
CREATE INDEX IF NOT EXISTS idx_doc_metrics_jsonb ON public.document_metrics USING GIN(metrics);

-- ============================================================================
-- METRIC EVENTS TABLE
-- ============================================================================
-- Tracks significant metric events (milestones, achievements, anomalies)
CREATE TABLE IF NOT EXISTS public.metric_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Event type and category
  event_type text NOT NULL CHECK (event_type IN (
    'milestone',        -- Word count milestone, chapter completion, etc.
    'achievement',      -- Writing streak, productivity record, etc.
    'anomaly',          -- Unusual pattern detected
    'goal_reached',     -- Daily/weekly goal achieved
    'goal_missed',      -- Goal not met
    'quality_change',   -- Significant quality metric change
    'velocity_change',  -- Writing speed change
    'structure_change'  -- Major structural reorganization
  )),
  category text NOT NULL CHECK (category IN (
    'productivity',
    'quality',
    'consistency',
    'structure',
    'progress'
  )),
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'success', 'error')),

  -- Event details
  title text NOT NULL,
  description text,
  event_data jsonb,

  -- References
  metric_id uuid REFERENCES public.document_metrics(id) ON DELETE SET NULL,
  snapshot_id text,

  -- User interaction
  is_read boolean NOT NULL DEFAULT false,
  is_dismissed boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  dismissed_at timestamptz,

  -- Timestamps
  event_time timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT read_timestamp CHECK (
    (is_read = false AND read_at IS NULL) OR
    (is_read = true AND read_at IS NOT NULL)
  ),
  CONSTRAINT dismissed_timestamp CHECK (
    (is_dismissed = false AND dismissed_at IS NULL) OR
    (is_dismissed = true AND dismissed_at IS NOT NULL)
  )
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_metric_events_document_id ON public.metric_events(document_id);
CREATE INDEX IF NOT EXISTS idx_metric_events_user_id ON public.metric_events(user_id);
CREATE INDEX IF NOT EXISTS idx_metric_events_type ON public.metric_events(event_type);
CREATE INDEX IF NOT EXISTS idx_metric_events_category ON public.metric_events(category);
CREATE INDEX IF NOT EXISTS idx_metric_events_time ON public.metric_events(event_time DESC);
CREATE INDEX IF NOT EXISTS idx_metric_events_unread ON public.metric_events(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_metric_events_undismissed ON public.metric_events(user_id, is_dismissed) WHERE is_dismissed = false;

-- Composite index for user notifications
CREATE INDEX IF NOT EXISTS idx_metric_events_notifications ON public.metric_events(user_id, event_time DESC) WHERE is_read = false AND is_dismissed = false;

-- GIN index for JSONB querying
CREATE INDEX IF NOT EXISTS idx_metric_events_jsonb ON public.metric_events USING GIN(event_data);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE public.document_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metric_events ENABLE ROW LEVEL SECURITY;

-- Document Metrics Policies
CREATE POLICY "Users can view own document metrics"
  ON public.document_metrics
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own document metrics"
  ON public.document_metrics
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own document metrics"
  ON public.document_metrics
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own document metrics"
  ON public.document_metrics
  FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can manage all metrics (for workers)
CREATE POLICY "Service role can manage all document metrics"
  ON public.document_metrics
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Metric Events Policies
CREATE POLICY "Users can view own metric events"
  ON public.metric_events
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own metric events"
  ON public.metric_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own metric events"
  ON public.metric_events
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own metric events"
  ON public.metric_events
  FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can manage all events (for workers)
CREATE POLICY "Service role can manage all metric events"
  ON public.metric_events
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at timestamp for document_metrics
CREATE OR REPLACE FUNCTION update_document_metrics_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_document_metrics_timestamp
  BEFORE UPDATE ON public.document_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_document_metrics_timestamp();

-- Trigger to mark old metrics as not latest when new version is inserted
CREATE OR REPLACE FUNCTION update_latest_metric()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark all previous metrics of same type for same document as not latest
  UPDATE public.document_metrics
  SET is_latest = false
  WHERE document_id = NEW.document_id
    AND metric_type = NEW.metric_type
    AND id != NEW.id
    AND is_latest = true;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_latest_metric
  AFTER INSERT ON public.document_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_latest_metric();

-- ============================================================================
-- DATABASE FUNCTIONS
-- ============================================================================

-- Get latest metrics for a document
CREATE OR REPLACE FUNCTION get_latest_metrics(
  p_document_id uuid,
  p_metric_type text DEFAULT NULL
)
RETURNS SETOF public.document_metrics AS $$
BEGIN
  IF p_metric_type IS NULL THEN
    RETURN QUERY
    SELECT * FROM public.document_metrics
    WHERE document_id = p_document_id
      AND is_latest = true
    ORDER BY metric_type, calculated_at DESC;
  ELSE
    RETURN QUERY
    SELECT * FROM public.document_metrics
    WHERE document_id = p_document_id
      AND metric_type = p_metric_type
      AND is_latest = true
    ORDER BY calculated_at DESC
    LIMIT 1;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get metrics for a time period
CREATE OR REPLACE FUNCTION get_metrics_for_period(
  p_document_id uuid,
  p_start timestamptz,
  p_end timestamptz,
  p_metric_types text[] DEFAULT NULL
)
RETURNS SETOF public.document_metrics AS $$
BEGIN
  IF p_metric_types IS NULL THEN
    RETURN QUERY
    SELECT * FROM public.document_metrics
    WHERE document_id = p_document_id
      AND calculated_at BETWEEN p_start AND p_end
    ORDER BY calculated_at DESC;
  ELSE
    RETURN QUERY
    SELECT * FROM public.document_metrics
    WHERE document_id = p_document_id
      AND calculated_at BETWEEN p_start AND p_end
      AND metric_type = ANY(p_metric_types)
    ORDER BY calculated_at DESC;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Store metric from analytics job
CREATE OR REPLACE FUNCTION store_metric_from_job(
  p_job_id uuid,
  p_metric_type text,
  p_metrics jsonb,
  p_snapshot_id text DEFAULT NULL,
  p_from_snapshot_id text DEFAULT NULL,
  p_to_snapshot_id text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_metric_id uuid;
  v_document_id uuid;
  v_user_id uuid;
  v_calculated_at timestamptz;
BEGIN
  -- Get job details
  SELECT document_id, user_id, completed_at
  INTO v_document_id, v_user_id, v_calculated_at
  FROM public.analytics_jobs
  WHERE id = p_job_id;

  IF v_document_id IS NULL THEN
    RAISE EXCEPTION 'Job not found: %', p_job_id;
  END IF;

  -- Insert metric
  INSERT INTO public.document_metrics (
    document_id,
    user_id,
    metric_type,
    source,
    metrics,
    snapshot_id,
    from_snapshot_id,
    to_snapshot_id,
    job_id,
    calculated_at
  ) VALUES (
    v_document_id,
    v_user_id,
    p_metric_type,
    'worker',
    p_metrics,
    p_snapshot_id,
    p_from_snapshot_id,
    p_to_snapshot_id,
    p_job_id,
    COALESCE(v_calculated_at, now())
  )
  RETURNING id INTO v_metric_id;

  RETURN v_metric_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create metric event
CREATE OR REPLACE FUNCTION create_metric_event(
  p_document_id uuid,
  p_user_id uuid,
  p_event_type text,
  p_category text,
  p_title text,
  p_description text DEFAULT NULL,
  p_event_data jsonb DEFAULT NULL,
  p_metric_id uuid DEFAULT NULL,
  p_severity text DEFAULT 'info'
)
RETURNS uuid AS $$
DECLARE
  v_event_id uuid;
BEGIN
  INSERT INTO public.metric_events (
    document_id,
    user_id,
    event_type,
    category,
    severity,
    title,
    description,
    event_data,
    metric_id
  ) VALUES (
    p_document_id,
    p_user_id,
    p_event_type,
    p_category,
    p_severity,
    p_title,
    p_description,
    p_event_data,
    p_metric_id
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark event as read
CREATE OR REPLACE FUNCTION mark_event_read(p_event_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.metric_events
  SET
    is_read = true,
    read_at = now()
  WHERE id = p_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark event as dismissed
CREATE OR REPLACE FUNCTION dismiss_event(p_event_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.metric_events
  SET
    is_dismissed = true,
    dismissed_at = now()
  WHERE id = p_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get unread events for user
CREATE OR REPLACE FUNCTION get_unread_events(
  p_user_id uuid,
  p_limit integer DEFAULT 50
)
RETURNS SETOF public.metric_events AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.metric_events
  WHERE user_id = p_user_id
    AND is_read = false
    AND is_dismissed = false
  ORDER BY event_time DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup old metrics (keep latest + recent history)
CREATE OR REPLACE FUNCTION cleanup_old_metrics(
  p_days_to_keep integer DEFAULT 90,
  p_keep_latest boolean DEFAULT true
)
RETURNS integer AS $$
DECLARE
  v_deleted_count integer;
BEGIN
  DELETE FROM public.document_metrics
  WHERE created_at < now() - (p_days_to_keep || ' days')::interval
    AND (NOT p_keep_latest OR is_latest = false);

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_metrics TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.metric_events TO authenticated;

GRANT EXECUTE ON FUNCTION get_latest_metrics(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_metrics_for_period(uuid, timestamptz, timestamptz, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION store_metric_from_job(uuid, text, jsonb, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION create_metric_event(uuid, uuid, text, text, text, text, jsonb, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_event_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION dismiss_event(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_events(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_metrics(integer, boolean) TO service_role;
