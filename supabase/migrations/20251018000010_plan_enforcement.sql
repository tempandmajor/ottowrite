-- Phase 3 plan enforcement triggers

BEGIN;

CREATE OR REPLACE FUNCTION public.get_user_plan(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    plan TEXT;
BEGIN
    SELECT subscription_tier INTO plan FROM public.user_profiles WHERE id = p_user_id;
    IF plan IS NULL THEN
        RETURN 'free';
    END IF;
    RETURN plan;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.enforce_project_limit()
RETURNS trigger AS $$
DECLARE
    plan TEXT;
    limit_record public.subscription_plan_limits%ROWTYPE;
    project_count INTEGER;
BEGIN
    plan := public.get_user_plan(NEW.user_id);
    SELECT * INTO limit_record FROM public.subscription_plan_limits WHERE plan = plan;

    IF limit_record.max_projects IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT COUNT(*) INTO project_count FROM public.projects WHERE user_id = NEW.user_id;

    IF project_count >= limit_record.max_projects THEN
        RAISE EXCEPTION USING MESSAGE = format('Plan %s allows %s projects. Please upgrade to add more.', plan, limit_record.max_projects);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_project_limit ON public.projects;
CREATE TRIGGER enforce_project_limit
    BEFORE INSERT ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_project_limit();

CREATE OR REPLACE FUNCTION public.enforce_document_limit()
RETURNS trigger AS $$
DECLARE
    plan TEXT;
    limit_record public.subscription_plan_limits%ROWTYPE;
    doc_count INTEGER;
BEGIN
    plan := public.get_user_plan(NEW.user_id);
    SELECT * INTO limit_record FROM public.subscription_plan_limits WHERE plan = plan;

    IF limit_record.max_documents IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT COUNT(*) INTO doc_count FROM public.documents WHERE user_id = NEW.user_id;

    IF doc_count >= limit_record.max_documents THEN
        RAISE EXCEPTION USING MESSAGE = format('Plan %s allows %s documents. Please upgrade to add more.', plan, limit_record.max_documents);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_document_limit ON public.documents;
CREATE TRIGGER enforce_document_limit
    BEFORE INSERT ON public.documents
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_document_limit();

COMMIT;
