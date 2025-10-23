-- API Rate Limiting Infrastructure
-- Ticket: FIX-5 - Add API Rate Limiting for Professional/Studio Plans
-- Professional: 50 requests/day, Studio: 1000 requests/day

BEGIN;

-- Table to track individual API requests
CREATE TABLE IF NOT EXISTS public.api_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    status_code INTEGER,
    response_time_ms INTEGER,
    api_key_id UUID, -- For future API key authentication
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS api_requests_user_created_idx
    ON public.api_requests(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS api_requests_created_idx
    ON public.api_requests(created_at DESC);

ALTER TABLE public.api_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their API requests" ON public.api_requests
    FOR SELECT
    USING (auth.uid() = user_id);

-- Add API requests per day column to user_plan_usage
ALTER TABLE public.user_plan_usage
    ADD COLUMN IF NOT EXISTS api_requests_count_day INTEGER DEFAULT 0;

-- Function to get API request count for current day
CREATE OR REPLACE FUNCTION public.get_api_request_count_today(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    today_start TIMESTAMPTZ;
    today_end TIMESTAMPTZ;
    request_count INTEGER;
BEGIN
    -- Get today's date range in UTC
    today_start := date_trunc('day', timezone('UTC', now()));
    today_end := today_start + INTERVAL '1 day';

    -- Count requests for today
    SELECT COUNT(*)
    INTO request_count
    FROM public.api_requests
    WHERE user_id = p_user_id
      AND created_at >= today_start
      AND created_at < today_end;

    RETURN COALESCE(request_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_api_request_count_today(UUID) TO authenticated;

-- Function to log API request
CREATE OR REPLACE FUNCTION public.log_api_request(
    p_user_id UUID,
    p_endpoint TEXT,
    p_method TEXT,
    p_status_code INTEGER,
    p_response_time_ms INTEGER DEFAULT NULL,
    p_api_key_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    request_id UUID;
BEGIN
    INSERT INTO public.api_requests (
        user_id,
        endpoint,
        method,
        status_code,
        response_time_ms,
        api_key_id,
        created_at
    ) VALUES (
        p_user_id,
        p_endpoint,
        p_method,
        p_status_code,
        p_response_time_ms,
        p_api_key_id,
        NOW()
    )
    RETURNING id INTO request_id;

    RETURN request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.log_api_request(UUID, TEXT, TEXT, INTEGER, INTEGER, UUID) TO authenticated;

-- Update refresh_user_plan_usage to include API requests count
-- Note: This updates the monthly count, not daily. Daily count is handled separately.
CREATE OR REPLACE FUNCTION public.refresh_user_plan_usage(p_user_id UUID)
RETURNS void AS $$
DECLARE
    period_start DATE := date_trunc('month', timezone('UTC', now()))::date;
    period_end DATE := (period_start + INTERVAL '1 month')::date;
    projects_count INTEGER;
    documents_count INTEGER;
    snapshots_count INTEGER;
    templates_count INTEGER;
    ai_words BIGINT;
    ai_requests INTEGER;
    collaborators_count INTEGER;
    api_requests_count_day INTEGER;
BEGIN
    SELECT COUNT(*) INTO projects_count FROM public.projects WHERE user_id = p_user_id;
    SELECT COUNT(*) INTO documents_count FROM public.documents WHERE user_id = p_user_id;
    SELECT COUNT(*) INTO snapshots_count FROM public.document_snapshots WHERE user_id = p_user_id;
    SELECT COUNT(*) INTO templates_count FROM public.document_templates WHERE created_by = p_user_id;
    SELECT COUNT(*) INTO collaborators_count
    FROM public.project_members pm
    JOIN public.projects p ON p.id = pm.project_id
    WHERE p.user_id = p_user_id
      AND COALESCE(pm.status, 'invited') IN ('invited', 'accepted')
      AND COALESCE(pm.role, 'editor') <> 'owner';

    SELECT COALESCE(SUM(words_generated),0)
    INTO ai_words
    FROM public.ai_usage
    WHERE user_id = p_user_id
      AND created_at >= period_start
      AND created_at < period_end;

    SELECT COUNT(*) INTO ai_requests
    FROM public.ai_usage
    WHERE user_id = p_user_id
      AND created_at >= period_start
      AND created_at < period_end;

    -- Get API requests for current day
    api_requests_count_day := public.get_api_request_count_today(p_user_id);

    INSERT INTO public.user_plan_usage (
        user_id,
        period_start,
        period_end,
        projects_count,
        documents_count,
        document_snapshots_count,
        templates_created,
        ai_words_used,
        ai_requests_count,
        collaborators_count,
        api_requests_count_day,
        created_at
    ) VALUES (
        p_user_id,
        period_start,
        period_end,
        projects_count,
        documents_count,
        snapshots_count,
        templates_count,
        ai_words,
        ai_requests,
        collaborators_count,
        api_requests_count_day,
        now()
    )
    ON CONFLICT (user_id, period_start) DO UPDATE SET
        projects_count = EXCLUDED.projects_count,
        documents_count = EXCLUDED.documents_count,
        document_snapshots_count = EXCLUDED.document_snapshots_count,
        templates_created = EXCLUDED.templates_created,
        ai_words_used = EXCLUDED.ai_words_used,
        ai_requests_count = EXCLUDED.ai_requests_count,
        collaborators_count = EXCLUDED.collaborators_count,
        api_requests_count_day = EXCLUDED.api_requests_count_day,
        period_end = EXCLUDED.period_end,
        created_at = EXCLUDED.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
