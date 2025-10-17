-- Ensure plot issue stats function respects RLS by removing SECURITY DEFINER
CREATE OR REPLACE FUNCTION get_plot_issue_stats(p_document_id UUID)
RETURNS TABLE (
    total_issues BIGINT,
    critical_count BIGINT,
    major_count BIGINT,
    minor_count BIGINT,
    suggestion_count BIGINT,
    resolved_count BIGINT,
    timeline_count BIGINT,
    character_count BIGINT,
    logic_count BIGINT,
    setup_payoff_count BIGINT
)
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as total_issues,
        COUNT(*) FILTER (WHERE severity = 'critical')::BIGINT as critical_count,
        COUNT(*) FILTER (WHERE severity = 'major')::BIGINT as major_count,
        COUNT(*) FILTER (WHERE severity = 'minor')::BIGINT as minor_count,
        COUNT(*) FILTER (WHERE severity = 'suggestion')::BIGINT as suggestion_count,
        COUNT(*) FILTER (WHERE is_resolved = true)::BIGINT as resolved_count,
        COUNT(*) FILTER (WHERE category = 'timeline')::BIGINT as timeline_count,
        COUNT(*) FILTER (WHERE category = 'character_continuity')::BIGINT as character_count,
        COUNT(*) FILTER (WHERE category = 'logic')::BIGINT as logic_count,
        COUNT(*) FILTER (WHERE category = 'setup_payoff')::BIGINT as setup_payoff_count
    FROM public.plot_issues
    WHERE analysis_id IN (
        SELECT id FROM public.plot_analyses
        WHERE document_id = p_document_id
    );
END;
$$ LANGUAGE plpgsql;
