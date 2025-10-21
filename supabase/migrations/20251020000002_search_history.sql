-- Add search history table for tracking web searches
CREATE TABLE IF NOT EXISTS public.search_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    research_request_id UUID REFERENCES public.research_requests(id) ON DELETE CASCADE,

    query TEXT NOT NULL,
    provider TEXT NOT NULL CHECK (provider IN ('brave', 'serpapi')),
    results JSONB NOT NULL DEFAULT '[]'::jsonb,
    result_count INTEGER DEFAULT 0,
    search_metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their search history"
    ON public.search_history FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their search history"
    ON public.search_history FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS search_history_user_idx ON public.search_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS search_history_project_idx ON public.search_history(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS search_history_query_idx ON public.search_history USING gin(to_tsvector('english', query));

-- Add provider column to research_requests if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'research_requests'
        AND column_name = 'search_provider'
    ) THEN
        ALTER TABLE public.research_requests
        ADD COLUMN search_provider TEXT DEFAULT 'brave'
        CHECK (search_provider IN ('brave', 'serpapi'));
    END IF;
END $$;
