-- ============================================================================
-- Migration: Add Schema Documentation via PostgreSQL Comments (DB-008)
-- Description: Add table and column comments to document the core schema
-- Author: System
-- Date: 2025-10-25
-- ============================================================================

-- Migration Metadata
-- Purpose: Schema Documentation
-- Impact: No schema changes, only adds documentation comments
-- Dependencies: 20251018000009_phase3_foundations.sql
-- Rollback: See rollback section at bottom

-- =============================================================================
-- TABLES: Add table-level comments describing purpose and usage
-- =============================================================================

-- User Profiles
COMMENT ON TABLE public.user_profiles IS
'User profile data extending Supabase Auth with subscription and billing information. One-to-one with auth.users.';

-- Projects
COMMENT ON TABLE public.projects IS
'Writing projects (novels, screenplays, etc.) owned by users. Serves as container for documents and organizational metadata.';

-- Documents
COMMENT ON TABLE public.documents IS
'Individual document files within projects. Contains rich-text content stored as ProseMirror JSON.';

-- Project Folders
COMMENT ON TABLE public.project_folders IS
'Hierarchical folder system for organizing projects. Supports unlimited nesting via self-referencing parent_id.';

-- Project Tags
COMMENT ON TABLE public.project_tags IS
'User-defined tags for flexible project categorization. Tag names are case-insensitive unique per user.';

-- Project Tag Links
COMMENT ON TABLE public.project_tag_links IS
'Junction table implementing many-to-many relationship between projects and tags. Includes denormalized user_id for RLS performance.';

-- AI Usage
COMMENT ON TABLE public.ai_usage IS
'Tracks all AI-powered content generation for billing, analytics, and usage limit enforcement.';

-- User Plan Usage
COMMENT ON TABLE public.user_plan_usage IS
'Aggregated usage snapshots per billing period for enforcing subscription limits and analytics.';

-- Subscription Plan Limits
COMMENT ON TABLE public.subscription_plan_limits IS
'Reference table defining feature limits for each subscription tier (free, hobbyist, professional, studio).';

-- =============================================================================
-- COLUMNS: user_profiles
-- =============================================================================

COMMENT ON COLUMN public.user_profiles.id IS
'User identifier (FK to auth.users.id). One-to-one relationship with Supabase Auth.';

COMMENT ON COLUMN public.user_profiles.email IS
'User email address (denormalized from auth.users for convenience).';

COMMENT ON COLUMN public.user_profiles.stripe_customer_id IS
'Stripe customer ID for billing integration. Unique per user.';

COMMENT ON COLUMN public.user_profiles.stripe_subscription_id IS
'Active Stripe subscription ID. Unique per user, NULL if no active subscription.';

COMMENT ON COLUMN public.user_profiles.stripe_price_id IS
'Stripe price ID for current subscription plan.';

COMMENT ON COLUMN public.user_profiles.subscription_status IS
'Subscription status: active, canceled, past_due, trialing, incomplete, incomplete_expired, unpaid';

COMMENT ON COLUMN public.user_profiles.subscription_tier IS
'Plan tier: free, hobbyist, professional, studio. Determines feature limits.';

COMMENT ON COLUMN public.user_profiles.subscription_current_period_start IS
'Start of current billing period. Used for monthly usage resets.';

COMMENT ON COLUMN public.user_profiles.subscription_current_period_end IS
'End of current billing period. Subscription renews at this date.';

COMMENT ON COLUMN public.user_profiles.ai_words_used_this_month IS
'AI word count for current billing period. Resets monthly at ai_words_reset_date.';

COMMENT ON COLUMN public.user_profiles.ai_words_reset_date IS
'When AI usage counter resets (typically start of billing period).';

-- =============================================================================
-- COLUMNS: projects
-- =============================================================================

COMMENT ON COLUMN public.projects.id IS
'Unique project identifier (UUID v4).';

COMMENT ON COLUMN public.projects.user_id IS
'Project owner (FK to auth.users). CASCADE delete when user deleted.';

COMMENT ON COLUMN public.projects.folder_id IS
'Optional folder for organization (FK to project_folders). SET NULL when folder deleted.';

COMMENT ON COLUMN public.projects.name IS
'Project title (max 500 characters). Required field.';

COMMENT ON COLUMN public.projects.type IS
'Project type: novel, series, screenplay, play, short_story. Enforced via CHECK constraint.';

COMMENT ON COLUMN public.projects.genre IS
'Array of genre tags (e.g., [''fantasy'', ''adventure'']). User-defined, not enforced by constraint.';

COMMENT ON COLUMN public.projects.description IS
'Optional project description. Used for full-text search along with name.';

COMMENT ON COLUMN public.projects.search_vector IS
'Full-text search index (tsvector). Auto-generated from name and description. Indexed with GIN.';

COMMENT ON COLUMN public.projects.created_at IS
'Timestamp when project was created. Immutable after insert.';

COMMENT ON COLUMN public.projects.updated_at IS
'Timestamp of last modification. Updated automatically via trigger or application.';

-- =============================================================================
-- COLUMNS: documents
-- =============================================================================

COMMENT ON COLUMN public.documents.id IS
'Unique document identifier (UUID v4).';

COMMENT ON COLUMN public.documents.user_id IS
'Document owner (FK to auth.users). CASCADE delete when user deleted.';

COMMENT ON COLUMN public.documents.project_id IS
'Parent project (FK to projects). CASCADE delete when project deleted.';

COMMENT ON COLUMN public.documents.title IS
'Document title. Required field.';

COMMENT ON COLUMN public.documents.type IS
'Document type (matches project types): novel, screenplay, play, short_story. CHECK constraint enforced.';

COMMENT ON COLUMN public.documents.content IS
'ProseMirror document structure stored as JSONB. Default: empty document {}.';

COMMENT ON COLUMN public.documents.word_count IS
'Cached word count. Calculated client-side and updated on save for performance.';

COMMENT ON COLUMN public.documents.position IS
'Display order within project. Used for sorting documents in chapter/scene order.';

COMMENT ON COLUMN public.documents.created_at IS
'Timestamp when document was created.';

COMMENT ON COLUMN public.documents.updated_at IS
'Timestamp of last modification. Updated on every content change.';

-- =============================================================================
-- COLUMNS: project_folders
-- =============================================================================

COMMENT ON COLUMN public.project_folders.id IS
'Unique folder identifier (UUID v4).';

COMMENT ON COLUMN public.project_folders.user_id IS
'Folder owner (FK to auth.users). CASCADE delete when user deleted.';

COMMENT ON COLUMN public.project_folders.parent_id IS
'Parent folder for nesting (FK to self). NULL for root folders. CASCADE delete propagates to children.';

COMMENT ON COLUMN public.project_folders.name IS
'Folder name. Required field.';

COMMENT ON COLUMN public.project_folders.color IS
'Optional hex color code for UI (e.g., #FF5733). NULL uses default color.';

COMMENT ON COLUMN public.project_folders.created_at IS
'Timestamp when folder was created.';

COMMENT ON COLUMN public.project_folders.updated_at IS
'Timestamp of last modification (name or color change).';

-- =============================================================================
-- COLUMNS: project_tags
-- =============================================================================

COMMENT ON COLUMN public.project_tags.id IS
'Unique tag identifier (UUID v4).';

COMMENT ON COLUMN public.project_tags.user_id IS
'Tag owner (FK to auth.users). CASCADE delete when user deleted.';

COMMENT ON COLUMN public.project_tags.name IS
'Tag name. UNIQUE per user with case-insensitive constraint: UNIQUE(user_id, LOWER(name)).';

COMMENT ON COLUMN public.project_tags.color IS
'Optional hex color code for UI. NULL uses default color.';

COMMENT ON COLUMN public.project_tags.description IS
'Optional tag description for documentation purposes.';

COMMENT ON COLUMN public.project_tags.created_at IS
'Timestamp when tag was created.';

COMMENT ON COLUMN public.project_tags.updated_at IS
'Timestamp of last modification.';

-- =============================================================================
-- COLUMNS: project_tag_links
-- =============================================================================

COMMENT ON COLUMN public.project_tag_links.id IS
'Unique link identifier (UUID v4). Stable ID for junction table row.';

COMMENT ON COLUMN public.project_tag_links.user_id IS
'Denormalized owner for RLS performance (FK to auth.users). Avoids JOIN in RLS policy.';

COMMENT ON COLUMN public.project_tag_links.project_id IS
'Project being tagged (FK to projects). CASCADE delete when project deleted.';

COMMENT ON COLUMN public.project_tag_links.tag_id IS
'Tag being applied (FK to project_tags). CASCADE delete when tag deleted.';

COMMENT ON COLUMN public.project_tag_links.created_at IS
'Timestamp when tag was applied to project. Provides audit trail.';

-- =============================================================================
-- COLUMNS: ai_usage
-- =============================================================================

COMMENT ON COLUMN public.ai_usage.id IS
'Unique usage record identifier (UUID v4).';

COMMENT ON COLUMN public.ai_usage.user_id IS
'User who triggered AI generation (FK to auth.users). CASCADE delete when user deleted.';

COMMENT ON COLUMN public.ai_usage.document_id IS
'Associated document (FK to documents, nullable). SET NULL when document deleted to preserve billing data.';

COMMENT ON COLUMN public.ai_usage.model IS
'AI model used (e.g., ''gpt-4'', ''claude-3''). Required for cost tracking.';

COMMENT ON COLUMN public.ai_usage.words_generated IS
'Number of words generated. Used for quota enforcement and billing.';

COMMENT ON COLUMN public.ai_usage.prompt_tokens IS
'Input tokens consumed. Used for cost calculation.';

COMMENT ON COLUMN public.ai_usage.completion_tokens IS
'Output tokens generated. Used for cost calculation.';

COMMENT ON COLUMN public.ai_usage.total_cost IS
'Cost in USD with 6 decimal precision (NUMERIC(10,6)). Supports fractional cent billing.';

COMMENT ON COLUMN public.ai_usage.prompt_preview IS
'First 200 characters of prompt for debugging and analytics.';

COMMENT ON COLUMN public.ai_usage.created_at IS
'Timestamp when AI generation occurred. Used for monthly aggregation.';

-- =============================================================================
-- COLUMNS: user_plan_usage
-- =============================================================================

COMMENT ON COLUMN public.user_plan_usage.id IS
'Unique usage record identifier (UUID v4).';

COMMENT ON COLUMN public.user_plan_usage.user_id IS
'User being tracked (FK to auth.users). CASCADE delete when user deleted.';

COMMENT ON COLUMN public.user_plan_usage.period_start IS
'Billing period start date. UNIQUE per user prevents duplicate records.';

COMMENT ON COLUMN public.user_plan_usage.period_end IS
'Billing period end date. Used for time-range queries.';

COMMENT ON COLUMN public.user_plan_usage.projects_count IS
'Number of active projects during period. Snapshot for historical tracking.';

COMMENT ON COLUMN public.user_plan_usage.documents_count IS
'Number of documents created during period.';

COMMENT ON COLUMN public.user_plan_usage.document_snapshots_count IS
'Number of version snapshots created during period.';

COMMENT ON COLUMN public.user_plan_usage.templates_created IS
'Number of templates created during period.';

COMMENT ON COLUMN public.user_plan_usage.ai_words_used IS
'Total AI words generated during period. Aggregated from ai_usage table.';

COMMENT ON COLUMN public.user_plan_usage.ai_requests_count IS
'Total AI requests made during period. Distinct from words for quota tracking.';

COMMENT ON COLUMN public.user_plan_usage.created_at IS
'Timestamp when usage record was created (typically at period start).';

-- =============================================================================
-- COLUMNS: subscription_plan_limits
-- =============================================================================

COMMENT ON COLUMN public.subscription_plan_limits.plan IS
'Plan identifier (PRIMARY KEY): free, hobbyist, professional, studio.';

COMMENT ON COLUMN public.subscription_plan_limits.max_projects IS
'Maximum active projects allowed. NULL = unlimited (studio plan).';

COMMENT ON COLUMN public.subscription_plan_limits.max_documents IS
'Maximum documents allowed. NULL = unlimited (studio plan).';

COMMENT ON COLUMN public.subscription_plan_limits.max_document_snapshots IS
'Maximum version snapshots allowed. NULL = unlimited (studio plan).';

COMMENT ON COLUMN public.subscription_plan_limits.max_templates IS
'Maximum custom templates allowed. NULL = unlimited (studio plan).';

COMMENT ON COLUMN public.subscription_plan_limits.ai_words_per_month IS
'Monthly AI word allowance. NULL = unlimited (studio plan).';

COMMENT ON COLUMN public.subscription_plan_limits.ai_requests_per_month IS
'Monthly AI request limit. NULL = unlimited (studio plan).';

COMMENT ON COLUMN public.subscription_plan_limits.collaborator_slots IS
'Number of collaborators allowed per project. 0 for free plan, 10 for studio.';

COMMENT ON COLUMN public.subscription_plan_limits.created_at IS
'Timestamp when plan limits were defined. Immutable reference data.';

-- =============================================================================
-- Post-Migration Validation
-- =============================================================================

-- Verify comments were added
DO $$
DECLARE
    v_table_comments INTEGER;
    v_column_comments INTEGER;
BEGIN
    -- Count table comments
    SELECT COUNT(*)
    INTO v_table_comments
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relname IN (
          'user_profiles', 'projects', 'documents',
          'project_folders', 'project_tags', 'project_tag_links',
          'ai_usage', 'user_plan_usage', 'subscription_plan_limits'
      )
      AND obj_description(c.oid) IS NOT NULL;

    -- Count column comments
    SELECT COUNT(*)
    INTO v_column_comments
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_catalog.pg_attribute a ON a.attrelid = c.oid
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relname IN (
          'user_profiles', 'projects', 'documents',
          'project_folders', 'project_tags', 'project_tag_links',
          'ai_usage', 'user_plan_usage', 'subscription_plan_limits'
      )
      AND a.attnum > 0
      AND NOT a.attisdropped
      AND col_description(c.oid, a.attnum) IS NOT NULL;

    RAISE NOTICE 'Schema comments added successfully:';
    RAISE NOTICE '  - % table comments', v_table_comments;
    RAISE NOTICE '  - % column comments', v_column_comments;

    -- Verify we have at least 9 table comments (all core tables)
    IF v_table_comments < 9 THEN
        RAISE EXCEPTION 'Expected at least 9 table comments, got %', v_table_comments;
    END IF;
END $$;

-- =============================================================================
-- Rollback Instructions
-- =============================================================================

-- To remove all comments added by this migration:
/*
COMMENT ON TABLE public.user_profiles IS NULL;
COMMENT ON TABLE public.projects IS NULL;
COMMENT ON TABLE public.documents IS NULL;
COMMENT ON TABLE public.project_folders IS NULL;
COMMENT ON TABLE public.project_tags IS NULL;
COMMENT ON TABLE public.project_tag_links IS NULL;
COMMENT ON TABLE public.ai_usage IS NULL;
COMMENT ON TABLE public.user_plan_usage IS NULL;
COMMENT ON TABLE public.subscription_plan_limits IS NULL;

-- Remove all column comments
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT c.relname AS table_name, a.attname AS column_name
        FROM pg_catalog.pg_class c
        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_catalog.pg_attribute a ON a.attrelid = c.oid
        WHERE n.nspname = 'public'
          AND c.relkind = 'r'
          AND c.relname IN (
              'user_profiles', 'projects', 'documents',
              'project_folders', 'project_tags', 'project_tag_links',
              'ai_usage', 'user_plan_usage', 'subscription_plan_limits'
          )
          AND a.attnum > 0
          AND NOT a.attisdropped
    LOOP
        EXECUTE format('COMMENT ON COLUMN public.%I.%I IS NULL', r.table_name, r.column_name);
    END LOOP;
END $$;
*/
