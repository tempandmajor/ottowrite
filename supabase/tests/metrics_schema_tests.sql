-- Metrics schema validation tests
-- Each block raises if the expected structure is missing.

-- Test 1: document_metrics table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'document_metrics'
  ) THEN
    RAISE EXCEPTION 'Test 1 failed: document_metrics table missing';
  END IF;
END;
$$;

-- Test 2: metrics column is JSONB
DO $$
DECLARE data_type text;
BEGIN
  SELECT data_type INTO data_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'document_metrics'
    AND column_name = 'metrics';

  IF data_type IS DISTINCT FROM 'jsonb' THEN
    RAISE EXCEPTION 'Test 2 failed: metrics column is not JSONB';
  END IF;
END;
$$;

-- Test 3: valid_period constraint exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'valid_period'
  ) THEN
    RAISE EXCEPTION 'Test 3 failed: valid_period constraint missing';
  END IF;
END;
$$;

-- Test 4: valid_snapshot_refs constraint exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'valid_snapshot_refs'
  ) THEN
    RAISE EXCEPTION 'Test 4 failed: valid_snapshot_refs constraint missing';
  END IF;
END;
$$;

-- Test 5: idx_doc_metrics_document_id index exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'document_metrics'
      AND indexname = 'idx_doc_metrics_document_id'
  ) THEN
    RAISE EXCEPTION 'Test 5 failed: idx_doc_metrics_document_id index missing';
  END IF;
END;
$$;

-- Test 6: idx_doc_metrics_jsonb index exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'document_metrics'
      AND indexname = 'idx_doc_metrics_jsonb'
  ) THEN
    RAISE EXCEPTION 'Test 6 failed: idx_doc_metrics_jsonb index missing';
  END IF;
END;
$$;

-- Test 7: idx_doc_metrics_job_id index exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'document_metrics'
      AND indexname = 'idx_doc_metrics_job_id'
  ) THEN
    RAISE EXCEPTION 'Test 7 failed: idx_doc_metrics_job_id index missing';
  END IF;
END;
$$;

-- Test 8: idx_doc_metrics_version index exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'document_metrics'
      AND indexname = 'idx_doc_metrics_version'
  ) THEN
    RAISE EXCEPTION 'Test 8 failed: idx_doc_metrics_version index missing';
  END IF;
END;
$$;

-- Test 9: idx_doc_metrics_user_latest index exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'document_metrics'
      AND indexname = 'idx_doc_metrics_user_latest'
  ) THEN
    RAISE EXCEPTION 'Test 9 failed: idx_doc_metrics_user_latest index missing';
  END IF;
END;
$$;

-- Test 10: get_latest_metrics function exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'get_latest_metrics'
      AND pg_function_is_visible(oid)
  ) THEN
    RAISE EXCEPTION 'Test 10 failed: get_latest_metrics function missing';
  END IF;
END;
$$;

-- Test 11: get_metric_history function exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'get_metric_history'
      AND pg_function_is_visible(oid)
  ) THEN
    RAISE EXCEPTION 'Test 11 failed: get_metric_history function missing';
  END IF;
END;
$$;

-- Test 12: metric_events notifications index exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'metric_events'
      AND indexname = 'idx_metric_events_notifications'
  ) THEN
    RAISE EXCEPTION 'Test 12 failed: idx_metric_events_notifications index missing';
  END IF;
END;
$$;

-- Test 13: metric_events JSONB index exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'metric_events'
      AND indexname = 'idx_metric_events_jsonb'
  ) THEN
    RAISE EXCEPTION 'Test 13 failed: idx_metric_events_jsonb index missing';
  END IF;
END;
$$;

-- Test 14: metric_events read_timestamp constraint exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'read_timestamp'
  ) THEN
    RAISE EXCEPTION 'Test 14 failed: read_timestamp constraint missing';
  END IF;
END;
$$;

-- Test 15: metric_events dismissed_timestamp constraint exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'dismissed_timestamp'
  ) THEN
    RAISE EXCEPTION 'Test 15 failed: dismissed_timestamp constraint missing';
  END IF;
END;
$$;

-- Test 16: RLS enabled for document_metrics
DO $$
DECLARE enabled boolean;
BEGIN
  SELECT relrowsecurity INTO enabled
  FROM pg_class
  WHERE oid = 'public.document_metrics'::regclass;

  IF enabled IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Test 16 failed: RLS not enabled on document_metrics';
  END IF;
END;
$$;
