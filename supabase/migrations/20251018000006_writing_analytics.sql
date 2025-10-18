-- Writing analytics tables for sessions and goals

CREATE TABLE IF NOT EXISTS public.writing_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,

    words_added INTEGER DEFAULT 0,
    words_deleted INTEGER DEFAULT 0,
    net_words INTEGER DEFAULT 0,
    session_duration_seconds INTEGER DEFAULT 0,
    session_start TIMESTAMPTZ,
    session_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.writing_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,

    goal_type TEXT NOT NULL CHECK (goal_type IN ('daily', 'weekly', 'monthly', 'project')),
    target_words INTEGER NOT NULL,
    deadline DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.writing_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.writing_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their writing sessions"
    ON public.writing_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their writing sessions"
    ON public.writing_sessions FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their writing goals"
    ON public.writing_goals FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their writing goals"
    ON public.writing_goals FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS writing_sessions_user_idx ON public.writing_sessions(user_id, session_start DESC);
CREATE INDEX IF NOT EXISTS writing_goals_user_idx ON public.writing_goals(user_id, created_at DESC);
