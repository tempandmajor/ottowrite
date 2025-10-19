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
    ai_prompt_tokens BIGINT;
    ai_completion_tokens BIGINT;
    ai_cost NUMERIC;
    ai_requests INTEGER;
BEGIN
    SELECT COUNT(*) INTO projects_count FROM public.projects WHERE user_id = p_user_id;
    SELECT COUNT(*) INTO documents_count FROM public.documents WHERE user_id = p_user_id;
    SELECT COUNT(*) INTO snapshots_count FROM public.document_snapshots WHERE user_id = p_user_id;
    SELECT COUNT(*) INTO templates_count FROM public.document_templates WHERE created_by = p_user_id;

    SELECT COALESCE(SUM(words_generated),0), COALESCE(SUM(prompt_tokens),0), COALESCE(SUM(completion_tokens),0), COALESCE(SUM(total_cost),0)
    INTO ai_words, ai_prompt_tokens, ai_completion_tokens, ai_cost
    FROM public.ai_usage
    WHERE user_id = p_user_id
      AND created_at >= period_start
      AND created_at < period_end;

    SELECT COUNT(*) INTO ai_requests
    FROM public.ai_usage
    WHERE user_id = p_user_id
      AND created_at >= period_start
      AND created_at < period_end;

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
        now()
    )
    ON CONFLICT (user_id, period_start) DO UPDATE SET
        projects_count = EXCLUDED.projects_count,
        documents_count = EXCLUDED.documents_count,
        document_snapshots_count = EXCLUDED.document_snapshots_count,
        templates_created = EXCLUDED.templates_created,
        ai_words_used = EXCLUDED.ai_words_used,
        ai_requests_count = EXCLUDED.ai_requests_count,
        period_end = EXCLUDED.period_end,
        created_at = EXCLUDED.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.refresh_user_plan_usage(UUID) TO authenticated;
