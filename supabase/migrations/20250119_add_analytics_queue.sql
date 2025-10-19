-- Analytics Job Queue System
-- Manages asynchronous analytics jobs processed by edge functions

-- Create analytics_jobs table
CREATE TABLE IF NOT EXISTS public.analytics_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,

  -- Job configuration
  job_type text NOT NULL CHECK (job_type IN (
    'snapshot_analysis',
    'snapshot_comparison',
    'writing_velocity',
    'structure_analysis',
    'session_summary',
    'daily_summary',
    'weekly_summary'
  )),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'processing',
    'completed',
    'failed',
    'cancelled'
  )),
  priority integer NOT NULL DEFAULT 1 CHECK (priority >= 0 AND priority <= 3),

  -- Job data (JSONB for flexibility)
  input jsonb NOT NULL,
  output jsonb,

  -- Error tracking
  error text,
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 3,

  -- Scheduling
  scheduled_for timestamptz DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Indexes
  CONSTRAINT valid_attempts CHECK (attempts <= max_attempts)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_analytics_jobs_user_id ON public.analytics_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_jobs_document_id ON public.analytics_jobs(document_id);
CREATE INDEX IF NOT EXISTS idx_analytics_jobs_status ON public.analytics_jobs(status);
CREATE INDEX IF NOT EXISTS idx_analytics_jobs_priority ON public.analytics_jobs(priority DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_jobs_scheduled ON public.analytics_jobs(scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_analytics_jobs_created_at ON public.analytics_jobs(created_at DESC);

-- Composite index for queue processing
CREATE INDEX IF NOT EXISTS idx_analytics_jobs_queue ON public.analytics_jobs(status, priority DESC, scheduled_for)
  WHERE status = 'pending';

-- Enable RLS
ALTER TABLE public.analytics_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own jobs
CREATE POLICY "Users can view own analytics jobs"
  ON public.analytics_jobs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analytics jobs"
  ON public.analytics_jobs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analytics jobs"
  ON public.analytics_jobs
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own analytics jobs"
  ON public.analytics_jobs
  FOR DELETE
  USING (auth.uid() = user_id);

-- Service role policy for edge function processing
CREATE POLICY "Service role can process any job"
  ON public.analytics_jobs
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_analytics_jobs_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update timestamps
CREATE TRIGGER update_analytics_jobs_timestamp
  BEFORE UPDATE ON public.analytics_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_analytics_jobs_timestamp();

-- Function to dequeue next job (atomic operation)
CREATE OR REPLACE FUNCTION dequeue_analytics_job()
RETURNS public.analytics_jobs AS $$
DECLARE
  job public.analytics_jobs;
BEGIN
  -- Find and lock the next pending job
  SELECT * INTO job
  FROM public.analytics_jobs
  WHERE status = 'pending'
    AND scheduled_for <= now()
    AND attempts < max_attempts
  ORDER BY priority DESC, scheduled_for ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  -- If job found, mark as processing
  IF job.id IS NOT NULL THEN
    UPDATE public.analytics_jobs
    SET
      status = 'processing',
      started_at = now(),
      attempts = attempts + 1
    WHERE id = job.id;

    -- Return updated job
    SELECT * INTO job
    FROM public.analytics_jobs
    WHERE id = job.id;
  END IF;

  RETURN job;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark job as completed
CREATE OR REPLACE FUNCTION complete_analytics_job(
  job_id uuid,
  job_output jsonb
)
RETURNS void AS $$
BEGIN
  UPDATE public.analytics_jobs
  SET
    status = 'completed',
    output = job_output,
    completed_at = now(),
    error = NULL
  WHERE id = job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark job as failed
CREATE OR REPLACE FUNCTION fail_analytics_job(
  job_id uuid,
  error_message text,
  should_retry boolean DEFAULT true
)
RETURNS void AS $$
DECLARE
  current_attempts integer;
  max_retries integer;
BEGIN
  SELECT attempts, max_attempts INTO current_attempts, max_retries
  FROM public.analytics_jobs
  WHERE id = job_id;

  -- If we should retry and haven't exceeded max attempts, mark as pending
  IF should_retry AND current_attempts < max_retries THEN
    UPDATE public.analytics_jobs
    SET
      status = 'pending',
      error = error_message,
      started_at = NULL,
      scheduled_for = now() + interval '5 seconds' * attempts -- Exponential backoff
    WHERE id = job_id;
  ELSE
    -- Otherwise mark as failed
    UPDATE public.analytics_jobs
    SET
      status = 'failed',
      error = error_message,
      completed_at = now()
    WHERE id = job_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cancel a job
CREATE OR REPLACE FUNCTION cancel_analytics_job(job_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.analytics_jobs
  SET
    status = 'cancelled',
    completed_at = now()
  WHERE id = job_id
    AND status IN ('pending', 'processing');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old completed jobs (run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_analytics_jobs(days_to_keep integer DEFAULT 30)
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.analytics_jobs
  WHERE status IN ('completed', 'failed', 'cancelled')
    AND completed_at < now() - (days_to_keep || ' days')::interval;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.analytics_jobs TO authenticated;
GRANT EXECUTE ON FUNCTION dequeue_analytics_job() TO service_role;
GRANT EXECUTE ON FUNCTION complete_analytics_job(uuid, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION fail_analytics_job(uuid, text, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION cancel_analytics_job(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_analytics_jobs(integer) TO service_role;
