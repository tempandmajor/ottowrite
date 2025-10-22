-- ============================================================================
-- TICKET-TMPL-006: AI-Native Features
-- ============================================================================
-- Competitive advantage over Final Draft:
-- 1. Smart Template Recommendations (with confidence scores)
-- 2. Template Health Checks (structure analysis)
-- 3. Auto-Tagging (genre, tone, influences)
-- 4. Collaborative Filtering (usage patterns)
-- 5. Context-Aware Placeholders (AI-generated suggestions)
-- ============================================================================

-- ============================================================================
-- 1. SMART TEMPLATE RECOMMENDATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS template_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

  -- Input context
  logline TEXT NOT NULL,
  additional_context JSONB DEFAULT '{}'::jsonb,

  -- AI Analysis
  detected_genre TEXT NOT NULL,
  detected_tone TEXT NOT NULL,
  confidence NUMERIC(3, 2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),

  -- Primary recommendation
  recommended_template_type TEXT NOT NULL,
  match_percentage INTEGER NOT NULL CHECK (match_percentage >= 0 AND match_percentage <= 100),
  reasons TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],

  -- Alternative recommendations (JSONB array)
  alternatives JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Tracking
  user_accepted BOOLEAN DEFAULT NULL,
  accepted_template_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Indexes
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Indexes for template_recommendations
CREATE INDEX idx_template_recommendations_user_id ON template_recommendations(user_id);
CREATE INDEX idx_template_recommendations_project_id ON template_recommendations(project_id);
CREATE INDEX idx_template_recommendations_created_at ON template_recommendations(created_at DESC);
CREATE INDEX idx_template_recommendations_genre ON template_recommendations(detected_genre);

-- RLS for template_recommendations
ALTER TABLE template_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own recommendations"
  ON template_recommendations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recommendations"
  ON template_recommendations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recommendations"
  ON template_recommendations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 2. TEMPLATE HEALTH CHECKS
-- ============================================================================

CREATE TABLE IF NOT EXISTS template_health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,

  -- Analysis metadata
  template_type TEXT NOT NULL,
  total_pages INTEGER,
  genre TEXT,

  -- Health score
  overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),

  -- Issues and strengths (JSONB for flexibility)
  issues JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of HealthCheckIssue objects
  strengths TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],

  -- Detailed analysis
  act_breakdown JSONB DEFAULT '[]'::jsonb, -- Act pacing analysis
  beat_presence JSONB DEFAULT '[]'::jsonb, -- Story beat detection

  -- Version tracking
  content_hash TEXT, -- Hash of content analyzed (to avoid re-analyzing same content)
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Tracking
  user_viewed BOOLEAN DEFAULT false,
  user_dismissed BOOLEAN DEFAULT false,

  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- Indexes for template_health_checks
CREATE INDEX idx_health_checks_user_id ON template_health_checks(user_id);
CREATE INDEX idx_health_checks_project_id ON template_health_checks(project_id);
CREATE INDEX idx_health_checks_document_id ON template_health_checks(document_id);
CREATE INDEX idx_health_checks_analyzed_at ON template_health_checks(analyzed_at DESC);
CREATE INDEX idx_health_checks_score ON template_health_checks(overall_score);

-- RLS for template_health_checks
ALTER TABLE template_health_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read health checks for their projects"
  ON template_health_checks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = template_health_checks.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert health checks for their projects"
  ON template_health_checks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = template_health_checks.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update health checks for their projects"
  ON template_health_checks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = template_health_checks.project_id
      AND projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = template_health_checks.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 3. AUTO-TAGGING
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_auto_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- AI-generated tags
  genres JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of {name, confidence}
  tones JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of {name, confidence}
  themes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  influences TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], -- "Similar to Blade Runner"
  target_audience TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  content_warnings TEXT[] DEFAULT ARRAY[]::TEXT[],
  market_comparisons TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], -- "Inception meets Ex Machina"

  -- Tracking
  analyzed_content_hash TEXT, -- Avoid re-analyzing same content
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_modified BOOLEAN DEFAULT false, -- Did user edit the tags?

  -- User can override tags
  user_added_tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  user_removed_tags TEXT[] DEFAULT ARRAY[]::TEXT[],

  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT unique_project_tags UNIQUE(project_id) -- One tag set per project
);

-- Indexes for project_auto_tags
CREATE INDEX idx_auto_tags_user_id ON project_auto_tags(user_id);
CREATE INDEX idx_auto_tags_project_id ON project_auto_tags(project_id);
CREATE INDEX idx_auto_tags_themes ON project_auto_tags USING GIN(themes);
CREATE INDEX idx_auto_tags_influences ON project_auto_tags USING GIN(influences);

-- RLS for project_auto_tags
ALTER TABLE project_auto_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read tags for their projects"
  ON project_auto_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_auto_tags.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert tags for their projects"
  ON project_auto_tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_auto_tags.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update tags for their projects"
  ON project_auto_tags FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_auto_tags.project_id
      AND projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_auto_tags.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete tags for their projects"
  ON project_auto_tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_auto_tags.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 4. COLLABORATIVE FILTERING - TEMPLATE USAGE TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS template_usage_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type TEXT NOT NULL,

  -- Aggregated statistics
  total_uses INTEGER NOT NULL DEFAULT 0,
  successful_completions INTEGER NOT NULL DEFAULT 0,
  average_rating NUMERIC(3, 2) DEFAULT NULL CHECK (average_rating IS NULL OR (average_rating >= 0 AND average_rating <= 5)),

  -- Genre breakdown (JSONB for flexibility)
  genre_usage JSONB NOT NULL DEFAULT '{}'::jsonb, -- {"Sci-Fi": 45, "Drama": 23}

  -- Updated tracking
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_template_type UNIQUE(template_type)
);

-- Index for template_usage_stats
CREATE INDEX idx_usage_stats_template_type ON template_usage_stats(template_type);
CREATE INDEX idx_usage_stats_total_uses ON template_usage_stats(total_uses DESC);

-- RLS for template_usage_stats (public read for recommendations)
ALTER TABLE template_usage_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read usage stats"
  ON template_usage_stats FOR SELECT
  USING (true); -- Public data for recommendations

-- Only system can write (we'll use service role for updates)

-- ============================================================================
-- User writing profile for collaborative filtering
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_writing_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Preferences
  preferred_genres TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  preferred_templates TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  writing_style TEXT, -- "character-driven", "plot-driven", "visual", etc.

  -- Completed projects tracking
  completed_projects JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of {template_type, genre, success_metric}

  -- Usage patterns
  total_projects INTEGER NOT NULL DEFAULT 0,
  total_completions INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_user_profile UNIQUE(user_id),
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Indexes for user_writing_profiles
CREATE INDEX idx_writing_profiles_user_id ON user_writing_profiles(user_id);
CREATE INDEX idx_writing_profiles_genres ON user_writing_profiles USING GIN(preferred_genres);
CREATE INDEX idx_writing_profiles_templates ON user_writing_profiles USING GIN(preferred_templates);

-- RLS for user_writing_profiles
ALTER TABLE user_writing_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own profile"
  ON user_writing_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON user_writing_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON user_writing_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 5. CONTEXT-AWARE PLACEHOLDERS CACHE
-- ============================================================================

CREATE TABLE IF NOT EXISTS placeholder_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Context
  element_type TEXT NOT NULL CHECK (element_type IN ('scene_heading', 'action', 'character', 'dialogue', 'transition')),
  context_hash TEXT NOT NULL, -- Hash of logline + previous content for caching

  -- Suggestion
  suggestion TEXT NOT NULL,
  alternatives TEXT[] DEFAULT ARRAY[]::TEXT[],
  reasoning TEXT,

  -- Usage tracking
  times_used INTEGER NOT NULL DEFAULT 0,
  times_accepted INTEGER NOT NULL DEFAULT 0,
  acceptance_rate NUMERIC(3, 2) GENERATED ALWAYS AS (
    CASE
      WHEN times_used > 0 THEN times_accepted::NUMERIC / times_used::NUMERIC
      ELSE NULL
    END
  ) STORED,

  -- Timestamps
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,

  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Indexes for placeholder_suggestions
CREATE INDEX idx_placeholder_user_id ON placeholder_suggestions(user_id);
CREATE INDEX idx_placeholder_project_id ON placeholder_suggestions(project_id);
CREATE INDEX idx_placeholder_context_hash ON placeholder_suggestions(context_hash);
CREATE INDEX idx_placeholder_element_type ON placeholder_suggestions(element_type);
CREATE INDEX idx_placeholder_acceptance_rate ON placeholder_suggestions(acceptance_rate DESC NULLS LAST);

-- RLS for placeholder_suggestions
ALTER TABLE placeholder_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read placeholders for their projects"
  ON placeholder_suggestions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = placeholder_suggestions.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert placeholders for their projects"
  ON placeholder_suggestions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = placeholder_suggestions.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update placeholders for their projects"
  ON placeholder_suggestions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = placeholder_suggestions.project_id
      AND projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = placeholder_suggestions.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update timestamps
CREATE TRIGGER update_user_writing_profiles_updated_at
  BEFORE UPDATE ON user_writing_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to update template usage stats (called after project completion)
CREATE OR REPLACE FUNCTION increment_template_usage(
  p_template_type TEXT,
  p_genre TEXT DEFAULT NULL,
  p_completed BOOLEAN DEFAULT FALSE
) RETURNS VOID AS $$
BEGIN
  INSERT INTO template_usage_stats (template_type, total_uses, successful_completions, genre_usage)
  VALUES (
    p_template_type,
    1,
    CASE WHEN p_completed THEN 1 ELSE 0 END,
    CASE WHEN p_genre IS NOT NULL THEN jsonb_build_object(p_genre, 1) ELSE '{}'::jsonb END
  )
  ON CONFLICT (template_type) DO UPDATE SET
    total_uses = template_usage_stats.total_uses + 1,
    successful_completions = template_usage_stats.successful_completions + CASE WHEN p_completed THEN 1 ELSE 0 END,
    genre_usage = CASE
      WHEN p_genre IS NOT NULL THEN
        jsonb_set(
          template_usage_stats.genre_usage,
          ARRAY[p_genre],
          to_jsonb(COALESCE((template_usage_stats.genre_usage->>p_genre)::INTEGER, 0) + 1)
        )
      ELSE template_usage_stats.genre_usage
    END,
    last_updated = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user writing profile (called after project actions)
CREATE OR REPLACE FUNCTION update_user_writing_profile(
  p_user_id UUID,
  p_template_type TEXT DEFAULT NULL,
  p_genre TEXT DEFAULT NULL,
  p_project_completed BOOLEAN DEFAULT FALSE
) RETURNS VOID AS $$
BEGIN
  INSERT INTO user_writing_profiles (user_id, preferred_templates, preferred_genres, total_projects, total_completions)
  VALUES (
    p_user_id,
    CASE WHEN p_template_type IS NOT NULL THEN ARRAY[p_template_type] ELSE ARRAY[]::TEXT[] END,
    CASE WHEN p_genre IS NOT NULL THEN ARRAY[p_genre] ELSE ARRAY[]::TEXT[] END,
    1,
    CASE WHEN p_project_completed THEN 1 ELSE 0 END
  )
  ON CONFLICT (user_id) DO UPDATE SET
    preferred_templates = CASE
      WHEN p_template_type IS NOT NULL AND NOT (p_template_type = ANY(user_writing_profiles.preferred_templates))
      THEN array_append(user_writing_profiles.preferred_templates, p_template_type)
      ELSE user_writing_profiles.preferred_templates
    END,
    preferred_genres = CASE
      WHEN p_genre IS NOT NULL AND NOT (p_genre = ANY(user_writing_profiles.preferred_genres))
      THEN array_append(user_writing_profiles.preferred_genres, p_genre)
      ELSE user_writing_profiles.preferred_genres
    END,
    total_projects = user_writing_profiles.total_projects + 1,
    total_completions = user_writing_profiles.total_completions + CASE WHEN p_project_completed THEN 1 ELSE 0 END,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE template_recommendations IS 'AI-powered template recommendations based on logline analysis';
COMMENT ON TABLE template_health_checks IS 'Story structure and pacing analysis for screenplays';
COMMENT ON TABLE project_auto_tags IS 'AI-generated genre, tone, and influence tags for projects';
COMMENT ON TABLE template_usage_stats IS 'Aggregated usage statistics for collaborative filtering';
COMMENT ON TABLE user_writing_profiles IS 'User writing preferences and project history for recommendations';
COMMENT ON TABLE placeholder_suggestions IS 'Cached AI-generated placeholder suggestions for screenplay elements';

COMMENT ON FUNCTION increment_template_usage IS 'Updates template usage statistics for collaborative filtering';
COMMENT ON FUNCTION update_user_writing_profile IS 'Updates user writing profile based on project activity';
