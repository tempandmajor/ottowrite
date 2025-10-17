-- Fix outline RLS policies to prevent privilege escalation
-- Ensures updates/inserts cannot change ownership columns

-- Outlines table policy updates
DROP POLICY IF EXISTS "Users can create their own outlines" ON public.outlines;
DROP POLICY IF EXISTS "Users can update their own outlines" ON public.outlines;

CREATE POLICY "Users can create their own outlines"
    ON public.outlines FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own outlines"
    ON public.outlines FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Outline sections policy updates
DROP POLICY IF EXISTS "Users can create their own outline sections" ON public.outline_sections;
DROP POLICY IF EXISTS "Users can update their own outline sections" ON public.outline_sections;

CREATE POLICY "Users can create their own outline sections"
    ON public.outline_sections FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own outline sections"
    ON public.outline_sections FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
