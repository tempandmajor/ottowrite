-- Phase 3 foundational schema: project organization, tagging, and usage limits

BEGIN;

-- Project folders allow hierarchical organisation per user
CREATE TABLE IF NOT EXISTS public.project_folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT,
    parent_id UUID REFERENCES public.project_folders(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS project_folders_user_idx
    ON public.project_folders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS project_folders_parent_idx
    ON public.project_folders(parent_id);

ALTER TABLE public.project_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their folders" ON public.project_folders
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their folders" ON public.project_folders
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Attach projects to folders
ALTER TABLE public.projects
    ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.project_folders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS projects_folder_idx
    ON public.projects(folder_id);

-- Project tags and assignments
CREATE TABLE IF NOT EXISTS public.project_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, lower(name))
);

CREATE INDEX IF NOT EXISTS project_tags_user_idx
    ON public.project_tags(user_id, name);

ALTER TABLE public.project_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tags" ON public.project_tags
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their tags" ON public.project_tags
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- NOTE: Schema Drift Documentation (DB-004)
-- This migration originally defined PRIMARY KEY (project_id, tag_id) [composite PK]
-- Production schema has evolved to: PRIMARY KEY (id) + UNIQUE (project_id, tag_id)
-- The production schema is better (stable row identifier, ORM-friendly)
-- See: docs/architecture/adr-002-project-tag-links-schema.md for full rationale
-- See: migration 20251025080531_reconcile_project_tag_links_schema.sql for reconciliation
-- Fresh deployments will get the production schema automatically via reconciliation migration
CREATE TABLE IF NOT EXISTS public.project_tag_links (
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES public.project_tags(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (project_id, tag_id)  -- See NOTE above: production uses PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS project_tag_links_user_idx
    ON public.project_tag_links(user_id);

ALTER TABLE public.project_tag_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their project tags" ON public.project_tag_links
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their project tags" ON public.project_tag_links
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Generate a search vector for projects (name + description)
ALTER TABLE public.projects
    ADD COLUMN IF NOT EXISTS search_vector tsvector GENERATED ALWAYS AS (
        to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))
    ) STORED;

CREATE INDEX IF NOT EXISTS projects_search_idx
    ON public.projects USING GIN (search_vector);

-- Subscription plan limits metadata
CREATE TABLE IF NOT EXISTS public.subscription_plan_limits (
    plan TEXT PRIMARY KEY,
    max_projects INTEGER,
    max_documents INTEGER,
    max_document_snapshots INTEGER,
    max_templates INTEGER,
    ai_words_per_month INTEGER,
    ai_requests_per_month INTEGER,
    collaborator_slots INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.subscription_plan_limits (plan, max_projects, max_documents, max_document_snapshots, max_templates, ai_words_per_month, ai_requests_per_month, collaborator_slots)
VALUES
    ('free', 5, 20, 200, 10, 25000, 300, 0),
    ('hobbyist', 15, 100, 1000, 25, 120000, 1500, 1),
    ('professional', 40, 300, 4000, 100, 400000, 5000, 3),
    ('studio', NULL, NULL, NULL, NULL, NULL, NULL, 10)
ON CONFLICT (plan) DO UPDATE SET
    max_projects = EXCLUDED.max_projects,
    max_documents = EXCLUDED.max_documents,
    max_document_snapshots = EXCLUDED.max_document_snapshots,
    max_templates = EXCLUDED.max_templates,
    ai_words_per_month = EXCLUDED.ai_words_per_month,
    ai_requests_per_month = EXCLUDED.ai_requests_per_month,
    collaborator_slots = EXCLUDED.collaborator_slots;

-- Usage tracking snapshots (per user/period)
CREATE TABLE IF NOT EXISTS public.user_plan_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    projects_count INTEGER DEFAULT 0,
    documents_count INTEGER DEFAULT 0,
    document_snapshots_count INTEGER DEFAULT 0,
    templates_created INTEGER DEFAULT 0,
    ai_words_used INTEGER DEFAULT 0,
    ai_requests_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, period_start)
);

CREATE INDEX IF NOT EXISTS user_plan_usage_user_idx
    ON public.user_plan_usage(user_id, period_start DESC);

ALTER TABLE public.user_plan_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their usage" ON public.user_plan_usage
    FOR SELECT
    USING (auth.uid() = user_id);

-- Updated-at triggers for new tables
DROP TRIGGER IF EXISTS update_project_folders_updated_at ON public.project_folders;
CREATE TRIGGER update_project_folders_updated_at
    BEFORE UPDATE ON public.project_folders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_tags_updated_at ON public.project_tags;
CREATE TRIGGER update_project_tags_updated_at
    BEFORE UPDATE ON public.project_tags
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Helper function to aggregate AI usage within a window
CREATE OR REPLACE FUNCTION public.sum_ai_usage(
    p_user_id UUID,
    p_period_start TIMESTAMPTZ,
    p_period_end TIMESTAMPTZ
)
RETURNS TABLE (
    words_generated BIGINT,
    prompt_tokens BIGINT,
    completion_tokens BIGINT,
    total_cost NUMERIC
) AS $$
    SELECT
        COALESCE(SUM(words_generated), 0)::BIGINT AS words_generated,
        COALESCE(SUM(prompt_tokens), 0)::BIGINT AS prompt_tokens,
        COALESCE(SUM(completion_tokens), 0)::BIGINT AS completion_tokens,
        COALESCE(SUM(total_cost), 0)::NUMERIC AS total_cost
    FROM public.ai_usage
    WHERE user_id = p_user_id
      AND created_at >= p_period_start
      AND created_at < p_period_end;
$$ LANGUAGE sql STABLE;

GRANT EXECUTE ON FUNCTION public.sum_ai_usage(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

COMMIT;
