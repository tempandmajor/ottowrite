/**
 * Submission Analytics
 *
 * Ticket: MS-4.3
 *
 * Creates views and functions for submission analytics and insights.
 */

-- ============================================================================
-- MATERIALIZED VIEWS FOR ANALYTICS
-- ============================================================================

/**
 * submission_analytics_summary
 *
 * Aggregated analytics per user for quick dashboard loading.
 */
CREATE MATERIALIZED VIEW submission_analytics_summary AS
SELECT
  ms.user_id,
  COUNT(DISTINCT ms.id) AS total_submissions,
  COUNT(DISTINCT CASE WHEN ms.status = 'active' THEN ms.id END) AS active_submissions,
  COUNT(DISTINCT CASE WHEN ms.status = 'draft' THEN ms.id END) AS draft_submissions,
  COUNT(DISTINCT CASE WHEN ms.status = 'paused' THEN ms.id END) AS paused_submissions,
  COUNT(DISTINCT CASE WHEN ms.status = 'closed' THEN ms.id END) AS closed_submissions,
  COUNT(DISTINCT ps.partner_id) AS total_partners_contacted,
  COUNT(DISTINCT CASE WHEN ps.viewed_by_partner THEN ps.id END) AS total_views,
  COUNT(DISTINCT CASE WHEN ps.status IN ('sample_requested', 'full_requested') THEN ps.id END) AS total_requests,
  COUNT(DISTINCT CASE WHEN ps.status = 'accepted' THEN ps.id END) AS total_acceptances,
  COUNT(DISTINCT CASE WHEN ps.status = 'rejected' THEN ps.id END) AS total_rejections,
  COALESCE(
    ROUND(
      COUNT(DISTINCT CASE WHEN ps.status = 'accepted' THEN ps.id END)::NUMERIC /
      NULLIF(COUNT(DISTINCT CASE WHEN ps.status IN ('accepted', 'rejected') THEN ps.id END), 0) * 100,
      2
    ),
    0
  ) AS acceptance_rate,
  COALESCE(
    ROUND(
      COUNT(DISTINCT CASE WHEN ps.viewed_by_partner THEN ps.id END)::NUMERIC /
      NULLIF(COUNT(DISTINCT ps.id), 0) * 100,
      2
    ),
    0
  ) AS view_rate,
  COALESCE(
    ROUND(
      COUNT(DISTINCT CASE WHEN ps.status IN ('sample_requested', 'full_requested') THEN ps.id END)::NUMERIC /
      NULLIF(COUNT(DISTINCT CASE WHEN ps.viewed_by_partner THEN ps.id END), 0) * 100,
      2
    ),
    0
  ) AS request_rate,
  MIN(ms.created_at) AS first_submission_date,
  MAX(ms.created_at) AS latest_submission_date,
  NOW() AS calculated_at
FROM manuscript_submissions ms
LEFT JOIN partner_submissions ps ON ps.submission_id = ms.id
GROUP BY ms.user_id;

CREATE UNIQUE INDEX idx_submission_analytics_summary_user_id
  ON submission_analytics_summary(user_id);

COMMENT ON MATERIALIZED VIEW submission_analytics_summary IS 'Aggregated submission analytics per user';

/**
 * partner_performance_analytics
 *
 * Performance metrics for partners.
 */
CREATE MATERIALIZED VIEW partner_performance_analytics AS
SELECT
  sp.id AS partner_id,
  sp.name AS partner_name,
  sp.type AS partner_type,
  sp.company,
  COUNT(DISTINCT ps.id) AS total_submissions_received,
  COUNT(DISTINCT CASE WHEN ps.viewed_by_partner THEN ps.id END) AS total_views,
  COUNT(DISTINCT CASE WHEN ps.status IN ('sample_requested', 'full_requested') THEN ps.id END) AS total_requests,
  COUNT(DISTINCT CASE WHEN ps.status = 'accepted' THEN ps.id END) AS total_acceptances,
  COUNT(DISTINCT CASE WHEN ps.status = 'rejected' THEN ps.id END) AS total_rejections,
  COALESCE(
    ROUND(
      AVG(EXTRACT(EPOCH FROM (ps.partner_response_date - ps.submitted_at)) / 86400)::NUMERIC,
      1
    ),
    0
  ) AS avg_response_time_days,
  COALESCE(
    ROUND(
      COUNT(DISTINCT CASE WHEN ps.status = 'accepted' THEN ps.id END)::NUMERIC /
      NULLIF(COUNT(DISTINCT CASE WHEN ps.status IN ('accepted', 'rejected') THEN ps.id END), 0) * 100,
      2
    ),
    0
  ) AS acceptance_rate,
  NOW() AS calculated_at
FROM submission_partners sp
LEFT JOIN partner_submissions ps ON ps.partner_id = sp.id
GROUP BY sp.id, sp.name, sp.type, sp.company;

CREATE UNIQUE INDEX idx_partner_performance_analytics_partner_id
  ON partner_performance_analytics(partner_id);

COMMENT ON MATERIALIZED VIEW partner_performance_analytics IS 'Performance analytics for submission partners';

/**
 * genre_performance_analytics
 *
 * Performance metrics by genre.
 */
CREATE MATERIALIZED VIEW genre_performance_analytics AS
SELECT
  ms.user_id,
  ms.genre,
  COUNT(DISTINCT ms.id) AS total_submissions,
  COUNT(DISTINCT ps.partner_id) AS partners_contacted,
  COUNT(DISTINCT CASE WHEN ps.viewed_by_partner THEN ps.id END) AS total_views,
  COUNT(DISTINCT CASE WHEN ps.status IN ('sample_requested', 'full_requested') THEN ps.id END) AS total_requests,
  COUNT(DISTINCT CASE WHEN ps.status = 'accepted' THEN ps.id END) AS total_acceptances,
  COUNT(DISTINCT CASE WHEN ps.status = 'rejected' THEN ps.id END) AS total_rejections,
  COALESCE(
    ROUND(
      COUNT(DISTINCT CASE WHEN ps.status = 'accepted' THEN ps.id END)::NUMERIC /
      NULLIF(COUNT(DISTINCT CASE WHEN ps.status IN ('accepted', 'rejected') THEN ps.id END), 0) * 100,
      2
    ),
    0
  ) AS acceptance_rate,
  NOW() AS calculated_at
FROM manuscript_submissions ms
LEFT JOIN partner_submissions ps ON ps.submission_id = ms.id
WHERE ms.genre IS NOT NULL
GROUP BY ms.user_id, ms.genre;

CREATE INDEX idx_genre_performance_analytics_user_id
  ON genre_performance_analytics(user_id);

CREATE INDEX idx_genre_performance_analytics_genre
  ON genre_performance_analytics(genre);

COMMENT ON MATERIALIZED VIEW genre_performance_analytics IS 'Performance analytics by genre';

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

/**
 * refresh_submission_analytics
 *
 * Refreshes all analytics materialized views.
 */
CREATE OR REPLACE FUNCTION refresh_submission_analytics()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY submission_analytics_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY partner_performance_analytics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY genre_performance_analytics;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION refresh_submission_analytics IS 'Refreshes all submission analytics materialized views';

/**
 * get_submission_timeline
 *
 * Returns submission activity timeline for a user.
 */
CREATE OR REPLACE FUNCTION get_submission_timeline(
  p_user_id UUID,
  p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  date DATE,
  submissions_created INTEGER,
  partners_contacted INTEGER,
  views_received INTEGER,
  requests_received INTEGER,
  responses_received INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(
      CURRENT_DATE - p_days_back,
      CURRENT_DATE,
      '1 day'::interval
    )::DATE AS date
  )
  SELECT
    ds.date,
    COUNT(DISTINCT CASE WHEN DATE(ms.created_at) = ds.date THEN ms.id END)::INTEGER AS submissions_created,
    COUNT(DISTINCT CASE WHEN DATE(ps.submitted_at) = ds.date THEN ps.id END)::INTEGER AS partners_contacted,
    COUNT(DISTINCT CASE WHEN DATE(ps.first_viewed_at) = ds.date AND ps.viewed_by_partner THEN ps.id END)::INTEGER AS views_received,
    COUNT(DISTINCT CASE
      WHEN DATE(ps.updated_at) = ds.date
        AND ps.status IN ('sample_requested', 'full_requested')
      THEN ps.id
    END)::INTEGER AS requests_received,
    COUNT(DISTINCT CASE WHEN DATE(ps.partner_response_date) = ds.date THEN ps.id END)::INTEGER AS responses_received
  FROM date_series ds
  LEFT JOIN manuscript_submissions ms ON DATE(ms.created_at) = ds.date AND ms.user_id = p_user_id
  LEFT JOIN partner_submissions ps ON ps.submission_id = ms.id
  GROUP BY ds.date
  ORDER BY ds.date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_submission_timeline IS 'Returns submission activity timeline for visualization';

/**
 * get_conversion_funnel
 *
 * Returns conversion funnel metrics for a user.
 */
CREATE OR REPLACE FUNCTION get_conversion_funnel(p_user_id UUID)
RETURNS TABLE (
  stage TEXT,
  count INTEGER,
  percentage NUMERIC
) AS $$
DECLARE
  v_total_partners INTEGER;
BEGIN
  -- Get total partners contacted
  SELECT COUNT(DISTINCT ps.id) INTO v_total_partners
  FROM manuscript_submissions ms
  INNER JOIN partner_submissions ps ON ps.submission_id = ms.id
  WHERE ms.user_id = p_user_id;

  RETURN QUERY
  WITH funnel_data AS (
    SELECT
      'Partners Contacted' AS stage,
      1 AS stage_order,
      COUNT(DISTINCT ps.id)::INTEGER AS count
    FROM manuscript_submissions ms
    INNER JOIN partner_submissions ps ON ps.submission_id = ms.id
    WHERE ms.user_id = p_user_id

    UNION ALL

    SELECT
      'Viewed by Partner',
      2,
      COUNT(DISTINCT ps.id)::INTEGER
    FROM manuscript_submissions ms
    INNER JOIN partner_submissions ps ON ps.submission_id = ms.id
    WHERE ms.user_id = p_user_id
      AND ps.viewed_by_partner = true

    UNION ALL

    SELECT
      'Material Requested',
      3,
      COUNT(DISTINCT ps.id)::INTEGER
    FROM manuscript_submissions ms
    INNER JOIN partner_submissions ps ON ps.submission_id = ms.id
    WHERE ms.user_id = p_user_id
      AND ps.status IN ('sample_requested', 'full_requested')

    UNION ALL

    SELECT
      'Response Received',
      4,
      COUNT(DISTINCT ps.id)::INTEGER
    FROM manuscript_submissions ms
    INNER JOIN partner_submissions ps ON ps.submission_id = ms.id
    WHERE ms.user_id = p_user_id
      AND ps.partner_response_date IS NOT NULL

    UNION ALL

    SELECT
      'Accepted',
      5,
      COUNT(DISTINCT ps.id)::INTEGER
    FROM manuscript_submissions ms
    INNER JOIN partner_submissions ps ON ps.submission_id = ms.id
    WHERE ms.user_id = p_user_id
      AND ps.status = 'accepted'
  )
  SELECT
    fd.stage,
    fd.count,
    CASE
      WHEN v_total_partners > 0 THEN ROUND((fd.count::NUMERIC / v_total_partners * 100), 2)
      ELSE 0
    END AS percentage
  FROM funnel_data fd
  ORDER BY fd.stage_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_conversion_funnel IS 'Returns conversion funnel metrics from submission to acceptance';

/**
 * get_top_performing_partners
 *
 * Returns top performing partners by acceptance rate.
 */
CREATE OR REPLACE FUNCTION get_top_performing_partners(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  partner_id UUID,
  partner_name TEXT,
  partner_type TEXT,
  submissions_sent INTEGER,
  acceptances INTEGER,
  acceptance_rate NUMERIC,
  avg_response_days NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sp.id,
    sp.name,
    sp.type,
    COUNT(DISTINCT ps.id)::INTEGER AS submissions_sent,
    COUNT(DISTINCT CASE WHEN ps.status = 'accepted' THEN ps.id END)::INTEGER AS acceptances,
    COALESCE(
      ROUND(
        COUNT(DISTINCT CASE WHEN ps.status = 'accepted' THEN ps.id END)::NUMERIC /
        NULLIF(COUNT(DISTINCT CASE WHEN ps.status IN ('accepted', 'rejected') THEN ps.id END), 0) * 100,
        2
      ),
      0
    ) AS acceptance_rate,
    COALESCE(
      ROUND(
        AVG(EXTRACT(EPOCH FROM (ps.partner_response_date - ps.submitted_at)) / 86400)::NUMERIC,
        1
      ),
      0
    ) AS avg_response_days
  FROM manuscript_submissions ms
  INNER JOIN partner_submissions ps ON ps.submission_id = ms.id
  INNER JOIN submission_partners sp ON sp.id = ps.partner_id
  WHERE ms.user_id = p_user_id
    AND ps.status IN ('accepted', 'rejected')
  GROUP BY sp.id, sp.name, sp.type
  HAVING COUNT(DISTINCT ps.id) >= 3  -- Minimum 3 submissions for statistical relevance
  ORDER BY acceptance_rate DESC, submissions_sent DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_top_performing_partners IS 'Returns top performing partners by acceptance rate';

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT ON submission_analytics_summary TO authenticated;
GRANT SELECT ON partner_performance_analytics TO authenticated;
GRANT SELECT ON genre_performance_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_submission_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION get_submission_timeline TO authenticated;
GRANT EXECUTE ON FUNCTION get_conversion_funnel TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_performing_partners TO authenticated;
