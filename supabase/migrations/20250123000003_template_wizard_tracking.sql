-- ============================================================================
-- TICKET-TMPL-007: Template Wizard Tracking
-- ============================================================================
-- Track wizard usage, recent templates, and user preferences
-- ============================================================================

-- Template Wizard Sessions (track completion rates)
CREATE TABLE IF NOT EXISTS template_wizard_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Wizard data
  path TEXT NOT NULL CHECK (path IN ('browse', 'ai')),
  template_type TEXT,
  project_name TEXT,
  logline TEXT,
  genre TEXT,
  ai_model TEXT CHECK (ai_model IN ('claude-sonnet-4.5', 'gpt-5', 'deepseek-chat')),

  -- Completion tracking
  completed_step INTEGER NOT NULL DEFAULT 1 CHECK (completed_step BETWEEN 1 AND 5),
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,

  -- AI recommendation (if used)
  ai_recommendation JSONB,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Recent Templates (for quick access)
CREATE TABLE IF NOT EXISTS user_recent_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Template info
  template_type TEXT NOT NULL,
  template_name TEXT NOT NULL,

  -- Usage stats
  projects_count INTEGER NOT NULL DEFAULT 1,
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, template_type)
);

-- Template Gallery Views (track which templates users view)
CREATE TABLE IF NOT EXISTS template_gallery_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_type TEXT NOT NULL,

  -- View metadata
  view_duration_seconds INTEGER,
  converted_to_project BOOLEAN NOT NULL DEFAULT FALSE,

  -- Timestamps
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_wizard_sessions_user_created ON template_wizard_sessions(user_id, created_at DESC);
CREATE INDEX idx_wizard_sessions_completed ON template_wizard_sessions(is_completed, completed_at DESC);
CREATE INDEX idx_wizard_sessions_path ON template_wizard_sessions(path);

CREATE INDEX idx_recent_templates_user_last_used ON user_recent_templates(user_id, last_used_at DESC);
CREATE INDEX idx_recent_templates_type ON user_recent_templates(template_type);

CREATE INDEX idx_gallery_views_user_viewed ON template_gallery_views(user_id, viewed_at DESC);
CREATE INDEX idx_gallery_views_template ON template_gallery_views(template_type, viewed_at DESC);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE template_wizard_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_recent_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_gallery_views ENABLE ROW LEVEL SECURITY;

-- Wizard Sessions Policies
CREATE POLICY "Users can view own wizard sessions"
  ON template_wizard_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own wizard sessions"
  ON template_wizard_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own wizard sessions"
  ON template_wizard_sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Recent Templates Policies
CREATE POLICY "Users can view own recent templates"
  ON user_recent_templates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own recent templates"
  ON user_recent_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recent templates"
  ON user_recent_templates FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Gallery Views Policies
CREATE POLICY "Users can view own gallery views"
  ON template_gallery_views FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create gallery views"
  ON template_gallery_views FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update wizard sessions updated_at
CREATE OR REPLACE FUNCTION update_wizard_session_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_wizard_session_updated_at
  BEFORE UPDATE ON template_wizard_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_wizard_session_updated_at();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get user's recent templates (for wizard step 2)
CREATE OR REPLACE FUNCTION get_user_recent_templates(p_user_id UUID, p_limit INTEGER DEFAULT 4)
RETURNS TABLE (
  id UUID,
  template_type TEXT,
  template_name TEXT,
  projects_count INTEGER,
  last_used TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    rt.id,
    rt.template_type,
    rt.template_name,
    rt.projects_count,
    to_char(rt.last_used_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as last_used
  FROM user_recent_templates rt
  WHERE rt.user_id = p_user_id
  ORDER BY rt.last_used_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update or insert recent template
CREATE OR REPLACE FUNCTION upsert_recent_template(
  p_user_id UUID,
  p_template_type TEXT,
  p_template_name TEXT
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_recent_templates (user_id, template_type, template_name, projects_count, last_used_at)
  VALUES (p_user_id, p_template_type, p_template_name, 1, NOW())
  ON CONFLICT (user_id, template_type)
  DO UPDATE SET
    projects_count = user_recent_templates.projects_count + 1,
    last_used_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Track wizard completion rate
CREATE OR REPLACE FUNCTION get_wizard_completion_stats(p_days INTEGER DEFAULT 30)
RETURNS TABLE (
  total_sessions BIGINT,
  completed_sessions BIGINT,
  completion_rate NUMERIC,
  avg_completed_step NUMERIC,
  ai_path_count BIGINT,
  browse_path_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_sessions,
    COUNT(*) FILTER (WHERE is_completed)::BIGINT as completed_sessions,
    ROUND(
      (COUNT(*) FILTER (WHERE is_completed)::NUMERIC / NULLIF(COUNT(*), 0) * 100),
      2
    ) as completion_rate,
    ROUND(AVG(completed_step), 2) as avg_completed_step,
    COUNT(*) FILTER (WHERE path = 'ai')::BIGINT as ai_path_count,
    COUNT(*) FILTER (WHERE path = 'browse')::BIGINT as browse_path_count
  FROM template_wizard_sessions
  WHERE created_at >= NOW() - (p_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get most popular templates (for analytics)
CREATE OR REPLACE FUNCTION get_popular_templates(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  template_type TEXT,
  usage_count BIGINT,
  unique_users BIGINT,
  avg_projects_per_user NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    rt.template_type,
    COUNT(*)::BIGINT as usage_count,
    COUNT(DISTINCT rt.user_id)::BIGINT as unique_users,
    ROUND(AVG(rt.projects_count), 2) as avg_projects_per_user
  FROM user_recent_templates rt
  GROUP BY rt.template_type
  ORDER BY usage_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SEED DATA (Example wizard session)
-- ============================================================================

COMMENT ON TABLE template_wizard_sessions IS 'Tracks user progress through the template wizard';
COMMENT ON TABLE user_recent_templates IS 'Stores users recently used templates for quick access';
COMMENT ON TABLE template_gallery_views IS 'Analytics for template gallery browsing behavior';

-- ============================================================================
-- END TICKET-TMPL-007
-- ============================================================================
