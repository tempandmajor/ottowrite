-- Migration: Fix ALL Policy Conflicts
-- Generated: 2025-10-24
--
-- Fixes performance warnings caused by ALL policies conflicting with specific action policies
-- PostgreSQL treats "FOR ALL" as covering SELECT, INSERT, UPDATE, DELETE, causing multiple
-- permissive policies for the same role and action.
--
-- Strategy:
-- 1. Expand ALL policies into specific SELECT, INSERT, UPDATE, DELETE policies
-- 2. Combine with existing specific policies using OR logic
-- 3. Remove redundant ALL policies
--
-- Affects 16 tables with 156 policy conflicts

-- ============================================================================
-- STRATEGY 1: Service Role ALL Policies
-- These need to be expanded into specific actions and combined with user policies
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TABLE: analytics_jobs
-- Expand service_role ALL policy + keep user-specific policies
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Service role can process any job" ON analytics_jobs;
DROP POLICY IF EXISTS "Users can view own analytics jobs" ON analytics_jobs;
DROP POLICY IF EXISTS "Users can insert own analytics jobs" ON analytics_jobs;
DROP POLICY IF EXISTS "Users can update own analytics jobs" ON analytics_jobs;
DROP POLICY IF EXISTS "Users can delete own analytics jobs" ON analytics_jobs;

-- Combined SELECT policy
CREATE POLICY "View analytics jobs"
ON analytics_jobs FOR SELECT TO public
USING (
  ((select auth.jwt()) ->> 'role' = 'service_role')  -- Service role sees all
  OR
  ((select auth.uid()) = user_id)  -- Users see own
);

-- Combined INSERT policy
CREATE POLICY "Insert analytics jobs"
ON analytics_jobs FOR INSERT TO public
WITH CHECK (
  ((select auth.jwt()) ->> 'role' = 'service_role')  -- Service role inserts any
  OR
  ((select auth.uid()) = user_id)  -- Users insert own
);

-- Combined UPDATE policy
CREATE POLICY "Update analytics jobs"
ON analytics_jobs FOR UPDATE TO public
USING (
  ((select auth.jwt()) ->> 'role' = 'service_role')
  OR
  ((select auth.uid()) = user_id)
)
WITH CHECK (
  ((select auth.jwt()) ->> 'role' = 'service_role')
  OR
  ((select auth.uid()) = user_id)
);

-- Combined DELETE policy
CREATE POLICY "Delete analytics jobs"
ON analytics_jobs FOR DELETE TO public
USING (
  ((select auth.jwt()) ->> 'role' = 'service_role')
  OR
  ((select auth.uid()) = user_id)
);

-- ----------------------------------------------------------------------------
-- TABLE: document_metrics
-- Expand service_role ALL policy + keep user-specific policies
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Service role can manage all document metrics" ON document_metrics;
DROP POLICY IF EXISTS "Users can view own document metrics" ON document_metrics;
DROP POLICY IF EXISTS "Users can insert own document metrics" ON document_metrics;
DROP POLICY IF EXISTS "Users can update own document metrics" ON document_metrics;
DROP POLICY IF EXISTS "Users can delete own document metrics" ON document_metrics;

CREATE POLICY "View document metrics"
ON document_metrics FOR SELECT TO public
USING (
  ((select auth.jwt()) ->> 'role' = 'service_role')
  OR
  ((select auth.uid()) = user_id)
);

CREATE POLICY "Insert document metrics"
ON document_metrics FOR INSERT TO public
WITH CHECK (
  ((select auth.jwt()) ->> 'role' = 'service_role')
  OR
  ((select auth.uid()) = user_id)
);

CREATE POLICY "Update document metrics"
ON document_metrics FOR UPDATE TO public
USING (
  ((select auth.jwt()) ->> 'role' = 'service_role')
  OR
  ((select auth.uid()) = user_id)
)
WITH CHECK (
  ((select auth.jwt()) ->> 'role' = 'service_role')
  OR
  ((select auth.uid()) = user_id)
);

CREATE POLICY "Delete document metrics"
ON document_metrics FOR DELETE TO public
USING (
  ((select auth.jwt()) ->> 'role' = 'service_role')
  OR
  ((select auth.uid()) = user_id)
);

-- ----------------------------------------------------------------------------
-- TABLE: metric_events
-- Expand service_role ALL policy + keep user-specific policies
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Service role can manage all metric events" ON metric_events;
DROP POLICY IF EXISTS "Users can view own metric events" ON metric_events;
DROP POLICY IF EXISTS "Users can insert own metric events" ON metric_events;
DROP POLICY IF EXISTS "Users can update own metric events" ON metric_events;
DROP POLICY IF EXISTS "Users can delete own metric events" ON metric_events;

CREATE POLICY "View metric events"
ON metric_events FOR SELECT TO public
USING (
  ((select auth.jwt()) ->> 'role' = 'service_role')
  OR
  ((select auth.uid()) = user_id)
);

CREATE POLICY "Insert metric events"
ON metric_events FOR INSERT TO public
WITH CHECK (
  ((select auth.jwt()) ->> 'role' = 'service_role')
  OR
  ((select auth.uid()) = user_id)
);

CREATE POLICY "Update metric events"
ON metric_events FOR UPDATE TO public
USING (
  ((select auth.jwt()) ->> 'role' = 'service_role')
  OR
  ((select auth.uid()) = user_id)
)
WITH CHECK (
  ((select auth.jwt()) ->> 'role' = 'service_role')
  OR
  ((select auth.uid()) = user_id)
);

CREATE POLICY "Delete metric events"
ON metric_events FOR DELETE TO public
USING (
  ((select auth.jwt()) ->> 'role' = 'service_role')
  OR
  ((select auth.uid()) = user_id)
);

-- ----------------------------------------------------------------------------
-- TABLE: dmca_takedown_requests
-- Expand service_role ALL + user-specific policies
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Service role full access to DMCA requests" ON dmca_takedown_requests;
DROP POLICY IF EXISTS "Authors can create DMCA requests" ON dmca_takedown_requests;
DROP POLICY IF EXISTS "Authors can view own DMCA requests" ON dmca_takedown_requests;
DROP POLICY IF EXISTS "Authors can update own DMCA requests" ON dmca_takedown_requests;

CREATE POLICY "View DMCA requests"
ON dmca_takedown_requests FOR SELECT TO public
USING (
  ((select auth.jwt()) ->> 'role' = 'service_role')
  OR
  ((select auth.uid()) = user_id)
);

CREATE POLICY "Insert DMCA requests"
ON dmca_takedown_requests FOR INSERT TO public
WITH CHECK (
  ((select auth.jwt()) ->> 'role' = 'service_role')
  OR
  ((select auth.uid()) = user_id)
);

CREATE POLICY "Update DMCA requests"
ON dmca_takedown_requests FOR UPDATE TO public
USING (
  ((select auth.jwt()) ->> 'role' = 'service_role')
  OR
  ((select auth.uid()) = user_id)
)
WITH CHECK (
  ((select auth.jwt()) ->> 'role' = 'service_role')
  OR
  ((select auth.uid()) = user_id)
);

CREATE POLICY "Delete DMCA requests"
ON dmca_takedown_requests FOR DELETE TO public
USING (
  ((select auth.jwt()) ->> 'role' = 'service_role')
  OR
  ((select auth.uid()) = user_id)
);

-- ============================================================================
-- STRATEGY 2: User ALL Policies
-- Replace ALL with specific actions (these don't have service_role conflicts)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TABLE: project_folders - Replace ALL with specific actions
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can manage their folders" ON project_folders;
DROP POLICY IF EXISTS "Users can view own folders" ON project_folders;
DROP POLICY IF EXISTS "Users can insert their own folders" ON project_folders;
DROP POLICY IF EXISTS "Users can update their folders" ON project_folders;
DROP POLICY IF EXISTS "Users can delete their own folders" ON project_folders;

CREATE POLICY "View folders" ON project_folders FOR SELECT TO public
USING ((select auth.uid()) = user_id);

CREATE POLICY "Insert folders" ON project_folders FOR INSERT TO public
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Update folders" ON project_folders FOR UPDATE TO public
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Delete folders" ON project_folders FOR DELETE TO public
USING ((select auth.uid()) = user_id);

-- ----------------------------------------------------------------------------
-- TABLE: project_tags - Replace ALL with specific actions
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can manage their tags" ON project_tags;
DROP POLICY IF EXISTS "Users can view own tags" ON project_tags;
DROP POLICY IF EXISTS "Users can insert their own tags" ON project_tags;
DROP POLICY IF EXISTS "Users can update their own tags" ON project_tags;
DROP POLICY IF EXISTS "Users can delete their own tags" ON project_tags;

CREATE POLICY "View tags" ON project_tags FOR SELECT TO public
USING ((select auth.uid()) = user_id);

CREATE POLICY "Insert tags" ON project_tags FOR INSERT TO public
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Update tags" ON project_tags FOR UPDATE TO public
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Delete tags" ON project_tags FOR DELETE TO public
USING ((select auth.uid()) = user_id);

-- ----------------------------------------------------------------------------
-- TABLE: project_tag_links - Replace ALL with specific actions
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can manage their project tags" ON project_tag_links;
DROP POLICY IF EXISTS "Users can view own tag links" ON project_tag_links;
DROP POLICY IF EXISTS "Users can insert their own tag links" ON project_tag_links;
DROP POLICY IF EXISTS "Users can delete their own tag links" ON project_tag_links;

CREATE POLICY "View tag links" ON project_tag_links FOR SELECT TO public
USING ((select auth.uid()) = user_id);

CREATE POLICY "Insert tag links" ON project_tag_links FOR INSERT TO public
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Update tag links" ON project_tag_links FOR UPDATE TO public
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Delete tag links" ON project_tag_links FOR DELETE TO public
USING ((select auth.uid()) = user_id);

-- ----------------------------------------------------------------------------
-- TABLE: beat_cards - Replace ALL with specific actions
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can manage their beat cards" ON beat_cards;
DROP POLICY IF EXISTS "Users can view their beat cards" ON beat_cards;

CREATE POLICY "View beat cards" ON beat_cards FOR SELECT TO public
USING ((select auth.uid()) = user_id);

CREATE POLICY "Insert beat cards" ON beat_cards FOR INSERT TO public
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Update beat cards" ON beat_cards FOR UPDATE TO public
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Delete beat cards" ON beat_cards FOR DELETE TO public
USING ((select auth.uid()) = user_id);

-- Continue with remaining tables in next file part...
-- (dmca_activity_log, manuscript_access_logs, project_members, research_notes,
--  research_requests, suspicious_activity_alerts, writing_goals, writing_sessions)
