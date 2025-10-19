BEGIN;

CREATE TABLE IF NOT EXISTS public.project_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    member_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('owner', 'editor', 'viewer')),
    status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'accepted', 'declined')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    UNIQUE (project_id, member_id),
    UNIQUE (project_id, email)
);

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view project membership" ON public.project_members
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM public.projects p
            WHERE p.id = project_id
              AND (p.user_id = auth.uid() OR member_id = auth.uid() OR inviter_id = auth.uid())
        )
    );

CREATE POLICY "Project owners manage membership" ON public.project_members
    FOR ALL
    USING (
        EXISTS (
            SELECT 1
            FROM public.projects p
            WHERE p.id = project_id
              AND p.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.projects p
            WHERE p.id = project_id
              AND p.user_id = auth.uid()
        )
    );

CREATE OR REPLACE FUNCTION public.enforce_collaborator_limit()
RETURNS trigger AS $$
DECLARE
    owner_id UUID;
    plan TEXT;
    limit_record public.subscription_plan_limits%ROWTYPE;
    collaborator_count INTEGER;
    new_status TEXT := COALESCE(NEW.status, 'invited');
    new_role TEXT := COALESCE(NEW.role, 'editor');
BEGIN
    IF new_role = 'owner' THEN
        RETURN NEW;
    END IF;

    SELECT user_id INTO owner_id FROM public.projects WHERE id = NEW.project_id;
    IF owner_id IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'Project owner not found.';
    END IF;

    IF NEW.member_id IS NOT NULL AND NEW.member_id = owner_id THEN
        RETURN NEW;
    END IF;

    plan := public.get_user_plan(owner_id);
    SELECT * INTO limit_record FROM public.subscription_plan_limits WHERE plan = plan;

    IF limit_record.collaborator_slots IS NULL THEN
        RETURN NEW;
    END IF;

    IF new_status NOT IN ('invited', 'accepted') THEN
        RETURN NEW;
    END IF;

    SELECT COUNT(*) INTO collaborator_count
    FROM public.project_members pm
    JOIN public.projects p ON p.id = pm.project_id
    WHERE p.user_id = owner_id
      AND pm.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000')
      AND COALESCE(pm.status, 'invited') IN ('invited', 'accepted')
      AND COALESCE(pm.role, 'editor') <> 'owner';

    IF collaborator_count >= limit_record.collaborator_slots THEN
        RAISE EXCEPTION USING MESSAGE = format('Plan %s allows %s collaborators. Upgrade to add more.', plan, limit_record.collaborator_slots);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_collaborator_limit ON public.project_members;
CREATE TRIGGER enforce_collaborator_limit
    BEFORE INSERT OR UPDATE ON public.project_members
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_collaborator_limit();

DROP TRIGGER IF EXISTS update_project_members_updated_at ON public.project_members;
CREATE TRIGGER update_project_members_updated_at
    BEFORE UPDATE ON public.project_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMIT;
