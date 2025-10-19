BEGIN;

CREATE OR REPLACE FUNCTION public.enforce_template_limit()
RETURNS trigger AS $$
DECLARE
    plan TEXT;
    limit_record public.subscription_plan_limits%ROWTYPE;
    template_count INTEGER;
BEGIN
    plan := public.get_user_plan(NEW.created_by);
    SELECT * INTO limit_record FROM public.subscription_plan_limits WHERE plan = plan;

    IF limit_record.max_templates IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT COUNT(*) INTO template_count FROM public.document_templates WHERE created_by = NEW.created_by;

    IF template_count >= limit_record.max_templates THEN
        RAISE EXCEPTION USING MESSAGE = format('Plan %s allows %s custom templates. Upgrade to add more.', plan, limit_record.max_templates);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_template_limit ON public.document_templates;
CREATE TRIGGER enforce_template_limit
    BEFORE INSERT ON public.document_templates
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_template_limit();

CREATE OR REPLACE FUNCTION public.enforce_snapshot_limit()
RETURNS trigger AS $$
DECLARE
    plan TEXT;
    limit_record public.subscription_plan_limits%ROWTYPE;
    snapshot_count INTEGER;
BEGIN
    plan := public.get_user_plan(NEW.user_id);
    SELECT * INTO limit_record FROM public.subscription_plan_limits WHERE plan = plan;

    IF limit_record.max_document_snapshots IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT COUNT(*) INTO snapshot_count FROM public.document_snapshots WHERE user_id = NEW.user_id;

    IF snapshot_count >= limit_record.max_document_snapshots THEN
        RAISE EXCEPTION USING MESSAGE = format('Plan %s allows %s snapshots across all documents. Upgrade to save more.', plan, limit_record.max_document_snapshots);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_snapshot_limit ON public.document_snapshots;
CREATE TRIGGER enforce_snapshot_limit
    BEFORE INSERT ON public.document_snapshots
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_snapshot_limit();

COMMIT;
