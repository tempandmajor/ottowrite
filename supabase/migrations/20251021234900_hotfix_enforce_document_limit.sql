-- HOTFIX: Fix enforce_document_limit function
-- Issue: Variable name conflict (plan = plan) causing SQL error
-- Root cause: Line 56 in 20251018000010_plan_enforcement.sql

CREATE OR REPLACE FUNCTION public.enforce_document_limit()
RETURNS trigger AS $$
DECLARE
    user_plan TEXT;
    limit_record public.subscription_plan_limits%ROWTYPE;
    doc_count INTEGER;
BEGIN
    -- Get user's subscription plan
    user_plan := public.get_user_plan(NEW.user_id);

    -- Get plan limits (fixed: use user_plan instead of plan)
    SELECT * INTO limit_record
    FROM public.subscription_plan_limits
    WHERE subscription_plan_limits.plan = user_plan;

    -- If no document limit, allow creation
    IF limit_record.max_documents IS NULL THEN
        RETURN NEW;
    END IF;

    -- Count existing documents for user (exclude folders to not double-count)
    SELECT COUNT(*) INTO doc_count
    FROM public.documents
    WHERE user_id = NEW.user_id
    AND is_folder = FALSE;

    -- Enforce limit
    IF doc_count >= limit_record.max_documents THEN
        RAISE EXCEPTION
            'Plan % allows % documents. Please upgrade to add more.',
            user_plan,
            limit_record.max_documents;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also fix enforce_project_limit for consistency
CREATE OR REPLACE FUNCTION public.enforce_project_limit()
RETURNS trigger AS $$
DECLARE
    user_plan TEXT;
    limit_record public.subscription_plan_limits%ROWTYPE;
    project_count INTEGER;
BEGIN
    user_plan := public.get_user_plan(NEW.user_id);

    SELECT * INTO limit_record
    FROM public.subscription_plan_limits
    WHERE subscription_plan_limits.plan = user_plan;

    IF limit_record.max_projects IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT COUNT(*) INTO project_count
    FROM public.projects
    WHERE user_id = NEW.user_id;

    IF project_count >= limit_record.max_projects THEN
        RAISE EXCEPTION
            'Plan % allows % projects. Please upgrade to add more.',
            user_plan,
            limit_record.max_projects;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
