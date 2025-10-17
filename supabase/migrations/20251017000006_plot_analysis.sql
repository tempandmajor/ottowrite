-- Plot Hole Detection System
-- Stores AI-powered analysis of documents for plot inconsistencies

-- Create plot_analyses table
CREATE TABLE IF NOT EXISTS public.plot_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    analysis_type TEXT NOT NULL CHECK (analysis_type IN ('full', 'timeline', 'character', 'logic', 'quick')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'analyzing', 'completed', 'failed')),
    content_snapshot JSONB,
    issues JSONB NOT NULL DEFAULT '[]'::jsonb,
    summary TEXT,
    word_count INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create plot_issues table for individual detected issues
CREATE TABLE IF NOT EXISTS public.plot_issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    analysis_id UUID NOT NULL REFERENCES public.plot_analyses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    severity TEXT NOT NULL CHECK (severity IN ('critical', 'major', 'minor', 'suggestion')),
    category TEXT NOT NULL CHECK (category IN ('timeline', 'character_continuity', 'logic', 'setup_payoff', 'consistency', 'other')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    location TEXT,
    line_reference TEXT,
    suggestion TEXT,
    is_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.plot_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plot_issues ENABLE ROW LEVEL SECURITY;

-- RLS Policies for plot_analyses
CREATE POLICY "Users can view their own plot analyses"
    ON public.plot_analyses FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own plot analyses"
    ON public.plot_analyses FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own plot analyses"
    ON public.plot_analyses FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own plot analyses"
    ON public.plot_analyses FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for plot_issues
CREATE POLICY "Users can view their own plot issues"
    ON public.plot_issues FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own plot issues"
    ON public.plot_issues FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own plot issues"
    ON public.plot_issues FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own plot issues"
    ON public.plot_issues FOR DELETE
    USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_plot_analyses_user_id ON public.plot_analyses(user_id);
CREATE INDEX idx_plot_analyses_document_id ON public.plot_analyses(document_id);
CREATE INDEX idx_plot_analyses_project_id ON public.plot_analyses(project_id);
CREATE INDEX idx_plot_analyses_status ON public.plot_analyses(status);
CREATE INDEX idx_plot_analyses_created_at ON public.plot_analyses(created_at DESC);

CREATE INDEX idx_plot_issues_analysis_id ON public.plot_issues(analysis_id);
CREATE INDEX idx_plot_issues_user_id ON public.plot_issues(user_id);
CREATE INDEX idx_plot_issues_severity ON public.plot_issues(severity);
CREATE INDEX idx_plot_issues_category ON public.plot_issues(category);
CREATE INDEX idx_plot_issues_resolved ON public.plot_issues(is_resolved);

-- Trigger to update updated_at on plot_analyses
CREATE OR REPLACE FUNCTION update_plot_analyses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_plot_analyses_timestamp
    BEFORE UPDATE ON public.plot_analyses
    FOR EACH ROW
    EXECUTE FUNCTION update_plot_analyses_updated_at();

-- Trigger to update updated_at on plot_issues
CREATE OR REPLACE FUNCTION update_plot_issues_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_plot_issues_timestamp
    BEFORE UPDATE ON public.plot_issues
    FOR EACH ROW
    EXECUTE FUNCTION update_plot_issues_updated_at();

-- Function to get issue statistics for a document
CREATE OR REPLACE FUNCTION get_plot_issue_stats(p_document_id UUID)
RETURNS TABLE (
    total_issues BIGINT,
    critical_count BIGINT,
    major_count BIGINT,
    minor_count BIGINT,
    suggestion_count BIGINT,
    resolved_count BIGINT,
    timeline_count BIGINT,
    character_count BIGINT,
    logic_count BIGINT,
    setup_payoff_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as total_issues,
        COUNT(*) FILTER (WHERE severity = 'critical')::BIGINT as critical_count,
        COUNT(*) FILTER (WHERE severity = 'major')::BIGINT as major_count,
        COUNT(*) FILTER (WHERE severity = 'minor')::BIGINT as minor_count,
        COUNT(*) FILTER (WHERE severity = 'suggestion')::BIGINT as suggestion_count,
        COUNT(*) FILTER (WHERE is_resolved = true)::BIGINT as resolved_count,
        COUNT(*) FILTER (WHERE category = 'timeline')::BIGINT as timeline_count,
        COUNT(*) FILTER (WHERE category = 'character_continuity')::BIGINT as character_count,
        COUNT(*) FILTER (WHERE category = 'logic')::BIGINT as logic_count,
        COUNT(*) FILTER (WHERE category = 'setup_payoff')::BIGINT as setup_payoff_count
    FROM public.plot_issues
    WHERE analysis_id IN (
        SELECT id FROM public.plot_analyses
        WHERE document_id = p_document_id
    );
END;
$$ LANGUAGE plpgsql;

-- Function to mark issue as resolved
CREATE OR REPLACE FUNCTION resolve_plot_issue(
    p_issue_id UUID,
    p_user_id UUID,
    p_resolution_notes TEXT DEFAULT NULL
)
RETURNS public.plot_issues AS $$
DECLARE
    v_issue public.plot_issues;
BEGIN
    UPDATE public.plot_issues
    SET
        is_resolved = true,
        resolved_at = NOW(),
        resolution_notes = p_resolution_notes,
        updated_at = NOW()
    WHERE id = p_issue_id
        AND user_id = p_user_id
    RETURNING * INTO v_issue;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Issue not found or access denied';
    END IF;

    RETURN v_issue;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
