-- Performance Optimization: Add indexes for common query patterns
-- Generated: 2025-01-19
-- Purpose: Improve query performance for frequently accessed tables

-- ============================================================================
-- DOCUMENTS TABLE INDEXES
-- ============================================================================
-- Most common query: SELECT * FROM documents WHERE user_id = ? AND project_id = ?
CREATE INDEX IF NOT EXISTS idx_documents_user_project
  ON documents(user_id, project_id);

-- Common query: SELECT * FROM documents WHERE user_id = ? ORDER BY updated_at DESC
CREATE INDEX IF NOT EXISTS idx_documents_updated_at
  ON documents(updated_at DESC);

-- Common query: Folder hierarchy lookups
CREATE INDEX IF NOT EXISTS idx_documents_parent_folder
  ON documents(parent_folder_id)
  WHERE parent_folder_id IS NOT NULL;

-- Full-text search on document titles and content
CREATE INDEX IF NOT EXISTS idx_documents_title_search
  ON documents USING GIN (to_tsvector('english', title));

-- ============================================================================
-- AI_USAGE TABLE INDEXES
-- ============================================================================
-- Common query: SELECT * FROM ai_usage WHERE user_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_created
  ON ai_usage(user_id, created_at DESC);

-- Common query: AI usage by document
CREATE INDEX IF NOT EXISTS idx_ai_usage_document
  ON ai_usage(document_id)
  WHERE document_id IS NOT NULL;

-- Common query: AI usage by model for cost tracking
CREATE INDEX IF NOT EXISTS idx_ai_usage_model_created
  ON ai_usage(model, created_at DESC);

-- ============================================================================
-- AI_REQUESTS TABLE INDEXES
-- ============================================================================
-- Common query: SELECT * FROM ai_requests WHERE user_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_ai_requests_user_created
  ON ai_requests(user_id, created_at DESC);

-- Common query: AI requests by project (telemetry dashboard)
CREATE INDEX IF NOT EXISTS idx_ai_requests_project
  ON ai_requests(project_id)
  WHERE project_id IS NOT NULL;

-- Common query: Filter by status and sort by created_at
CREATE INDEX IF NOT EXISTS idx_ai_requests_status_created
  ON ai_requests(status, created_at DESC);

-- Common query: Filter by command type
CREATE INDEX IF NOT EXISTS idx_ai_requests_command
  ON ai_requests(command)
  WHERE command IS NOT NULL;

-- ============================================================================
-- WRITING_SESSIONS TABLE INDEXES
-- ============================================================================
-- Common query: SELECT * FROM writing_sessions WHERE user_id = ? ORDER BY session_start DESC
CREATE INDEX IF NOT EXISTS idx_writing_sessions_user_start
  ON writing_sessions(user_id, session_start DESC);

-- Common query: Sessions by project for analytics
CREATE INDEX IF NOT EXISTS idx_writing_sessions_project
  ON writing_sessions(project_id)
  WHERE project_id IS NOT NULL;

-- Common query: Sessions by document
CREATE INDEX IF NOT EXISTS idx_writing_sessions_document
  ON writing_sessions(document_id)
  WHERE document_id IS NOT NULL;

-- ============================================================================
-- USER_PROFILES TABLE INDEXES
-- ============================================================================
-- Common query: Lookup by subscription tier (for usage queries)
CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription
  ON user_profiles(subscription_tier);

-- Common query: Stripe customer lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe
  ON user_profiles(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- ============================================================================
-- PROJECTS TABLE INDEXES
-- ============================================================================
-- Common query: SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC
CREATE INDEX IF NOT EXISTS idx_projects_user_updated
  ON projects(user_id, updated_at DESC);

-- Common query: Projects by type
CREATE INDEX IF NOT EXISTS idx_projects_type
  ON projects(type);

-- ============================================================================
-- CHARACTERS TABLE INDEXES
-- ============================================================================
-- Common query: SELECT * FROM characters WHERE project_id = ?
CREATE INDEX IF NOT EXISTS idx_characters_project
  ON characters(project_id);

-- Common query: Characters with images (for gallery views)
CREATE INDEX IF NOT EXISTS idx_characters_with_images
  ON characters(image_url)
  WHERE image_url IS NOT NULL;

-- ============================================================================
-- CHARACTER_RELATIONSHIPS TABLE INDEXES
-- ============================================================================
-- Common query: Get all relationships for a character
CREATE INDEX IF NOT EXISTS idx_character_relationships_from
  ON character_relationships(from_character_id);

CREATE INDEX IF NOT EXISTS idx_character_relationships_to
  ON character_relationships(to_character_id);

-- Common query: Relationships by project
CREATE INDEX IF NOT EXISTS idx_character_relationships_project
  ON character_relationships(project_id);

-- ============================================================================
-- STORY_BEATS TABLE INDEXES
-- ============================================================================
-- Common query: SELECT * FROM story_beats WHERE project_id = ? ORDER BY sequence
CREATE INDEX IF NOT EXISTS idx_story_beats_project_sequence
  ON story_beats(project_id, sequence);

-- ============================================================================
-- OUTLINES TABLE INDEXES
-- ============================================================================
-- Common query: SELECT * FROM outlines WHERE project_id = ?
CREATE INDEX IF NOT EXISTS idx_outlines_project
  ON outlines(project_id);

-- ============================================================================
-- RESEARCH_SOURCES TABLE INDEXES
-- ============================================================================
-- Common query: SELECT * FROM research_sources WHERE document_id = ?
CREATE INDEX IF NOT EXISTS idx_research_sources_document
  ON research_sources(document_id);

-- Common query: Research by project
CREATE INDEX IF NOT EXISTS idx_research_sources_project
  ON research_sources(project_id)
  WHERE project_id IS NOT NULL;

-- ============================================================================
-- DOCUMENT_VERSIONS TABLE INDEXES
-- ============================================================================
-- Common query: SELECT * FROM document_versions WHERE document_id = ? ORDER BY created_at DESC LIMIT 20
CREATE INDEX IF NOT EXISTS idx_document_versions_doc_created
  ON document_versions(document_id, created_at DESC);

-- ============================================================================
-- ANALYZE TABLES
-- ============================================================================
-- Update table statistics for the query planner
ANALYZE documents;
ANALYZE ai_usage;
ANALYZE ai_requests;
ANALYZE writing_sessions;
ANALYZE user_profiles;
ANALYZE projects;
ANALYZE characters;
ANALYZE character_relationships;
ANALYZE story_beats;
ANALYZE outlines;
ANALYZE research_sources;
ANALYZE document_versions;
