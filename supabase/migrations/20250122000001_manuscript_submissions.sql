-- MANUSCRIPT SUBMISSIONS SCHEMA
-- Migration: 20250122000001_manuscript_submissions
-- Description: Database schema for Studio-exclusive manuscript submission feature
-- Ticket: MS-1.1

-- ============================================================================
-- PARTNERS TABLE
-- ============================================================================
-- Literary agents and publishers who can receive submissions

CREATE TABLE IF NOT EXISTS public.submission_partners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Basic Information
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('agent', 'publisher', 'manager')),
    company TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    website TEXT,

    -- Verification
    verified BOOLEAN DEFAULT false,
    verification_date TIMESTAMPTZ,
    verification_notes TEXT,
    aar_member BOOLEAN DEFAULT false, -- Association of Authors' Representatives

    -- Preferences
    genres TEXT[] DEFAULT '{}',
    accepting_submissions BOOLEAN DEFAULT true,
    submission_guidelines TEXT,
    response_time_days INTEGER, -- average response time

    -- Stats
    total_submissions INTEGER DEFAULT 0,
    total_accepted INTEGER DEFAULT 0,
    total_rejected INTEGER DEFAULT 0,
    acceptance_rate NUMERIC(5,2), -- calculated field

    -- Contact & Bio
    bio TEXT,
    linkedin_url TEXT,
    twitter_handle TEXT,

    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- MANUSCRIPT SUBMISSIONS TABLE
-- ============================================================================
-- Main submissions table tracking all manuscript submissions

CREATE TABLE IF NOT EXISTS public.manuscript_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    partner_id UUID NOT NULL REFERENCES public.submission_partners(id) ON DELETE RESTRICT,

    -- Submission Details
    title TEXT NOT NULL,
    genre TEXT NOT NULL,
    word_count INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('novel', 'novella', 'short_story', 'screenplay', 'memoir', 'non_fiction')),

    -- Query Materials
    query_letter TEXT NOT NULL,
    synopsis TEXT NOT NULL,
    author_bio TEXT,

    -- Sample Content
    sample_pages_count INTEGER DEFAULT 0,
    sample_pages_content TEXT,
    full_manuscript_available BOOLEAN DEFAULT false,

    -- File Storage (Supabase Storage bucket references)
    query_letter_file_path TEXT,
    synopsis_file_path TEXT,
    sample_pages_file_path TEXT,
    full_manuscript_file_path TEXT,

    -- IP Protection
    watermark_applied BOOLEAN DEFAULT false,
    watermark_data JSONB, -- { partnerId, timestamp, format }
    access_token TEXT UNIQUE, -- JWT for view-only access
    access_expires_at TIMESTAMPTZ,
    access_revoked_at TIMESTAMPTZ,

    -- Status Tracking
    status TEXT DEFAULT 'submitted' CHECK (status IN (
        'draft',
        'submitted',
        'under_review',
        'sample_requested',
        'full_requested',
        'accepted',
        'rejected',
        'withdrawn'
    )),

    -- Priority (Studio feature)
    priority_review BOOLEAN DEFAULT false,

    -- Response
    partner_response TEXT,
    partner_response_date TIMESTAMPTZ,
    rejection_reason TEXT,
    rejection_category TEXT CHECK (rejection_category IN (
        'not_fit_for_list',
        'writing_needs_work',
        'story_not_ready',
        'market_reasons',
        'other'
    )),

    -- Tracking
    viewed_by_partner BOOLEAN DEFAULT false,
    first_viewed_at TIMESTAMPTZ,
    last_viewed_at TIMESTAMPTZ,
    view_count INTEGER DEFAULT 0,

    -- Metadata
    submission_metadata JSONB DEFAULT '{}'::jsonb, -- additional flexible data

    -- Timestamps
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SUBMISSION ACCESS LOGS TABLE
-- ============================================================================
-- Audit trail for all access to submitted manuscripts

CREATE TABLE IF NOT EXISTS public.submission_access_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    submission_id UUID NOT NULL REFERENCES public.manuscript_submissions(id) ON DELETE CASCADE,
    partner_id UUID REFERENCES public.submission_partners(id) ON DELETE SET NULL,

    -- Access Details
    access_type TEXT NOT NULL CHECK (access_type IN ('view', 'download', 'print', 'copy_attempt')),
    ip_address INET,
    user_agent TEXT,

    -- Session
    session_id TEXT,
    session_start TIMESTAMPTZ,
    session_end TIMESTAMPTZ,
    session_duration_seconds INTEGER,

    -- Content Access
    pages_viewed INTEGER[],
    download_successful BOOLEAN,

    -- Location (optional)
    country_code TEXT,
    city TEXT,

    -- Timestamps
    accessed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SUBMISSION NOTIFICATIONS TABLE
-- ============================================================================
-- Track notifications sent about submissions

CREATE TABLE IF NOT EXISTS public.submission_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    submission_id UUID NOT NULL REFERENCES public.manuscript_submissions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Notification Details
    type TEXT NOT NULL CHECK (type IN (
        'submission_received',
        'submission_viewed',
        'sample_requested',
        'full_requested',
        'accepted',
        'rejected',
        'access_expires_soon',
        'access_revoked'
    )),

    -- Delivery
    channel TEXT NOT NULL CHECK (channel IN ('email', 'in_app', 'both')),
    email_sent BOOLEAN DEFAULT false,
    email_sent_at TIMESTAMPTZ,
    email_opened BOOLEAN DEFAULT false,
    email_opened_at TIMESTAMPTZ,

    -- In-app
    read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,

    -- Content
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    action_url TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Partners
CREATE INDEX IF NOT EXISTS idx_submission_partners_verified ON public.submission_partners(verified);
CREATE INDEX IF NOT EXISTS idx_submission_partners_type ON public.submission_partners(type);
CREATE INDEX IF NOT EXISTS idx_submission_partners_status ON public.submission_partners(status);
CREATE INDEX IF NOT EXISTS idx_submission_partners_accepting ON public.submission_partners(accepting_submissions);
CREATE INDEX IF NOT EXISTS idx_submission_partners_genres ON public.submission_partners USING GIN(genres);

-- Submissions
CREATE INDEX IF NOT EXISTS idx_manuscript_submissions_user_id ON public.manuscript_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_manuscript_submissions_partner_id ON public.manuscript_submissions(partner_id);
CREATE INDEX IF NOT EXISTS idx_manuscript_submissions_project_id ON public.manuscript_submissions(project_id);
CREATE INDEX IF NOT EXISTS idx_manuscript_submissions_status ON public.manuscript_submissions(status);
CREATE INDEX IF NOT EXISTS idx_manuscript_submissions_priority ON public.manuscript_submissions(priority_review);
CREATE INDEX IF NOT EXISTS idx_manuscript_submissions_access_token ON public.manuscript_submissions(access_token);
CREATE INDEX IF NOT EXISTS idx_manuscript_submissions_submitted_at ON public.manuscript_submissions(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_manuscript_submissions_user_status ON public.manuscript_submissions(user_id, status);

-- Access Logs
CREATE INDEX IF NOT EXISTS idx_submission_access_logs_submission_id ON public.submission_access_logs(submission_id);
CREATE INDEX IF NOT EXISTS idx_submission_access_logs_partner_id ON public.submission_access_logs(partner_id);
CREATE INDEX IF NOT EXISTS idx_submission_access_logs_accessed_at ON public.submission_access_logs(accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_submission_access_logs_submission_partner ON public.submission_access_logs(submission_id, partner_id);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_submission_notifications_user_id ON public.submission_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_submission_notifications_submission_id ON public.submission_notifications(submission_id);
CREATE INDEX IF NOT EXISTS idx_submission_notifications_read ON public.submission_notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_submission_notifications_created_at ON public.submission_notifications(created_at DESC);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated_at triggers
DROP TRIGGER IF EXISTS update_submission_partners_updated_at ON public.submission_partners;
CREATE TRIGGER update_submission_partners_updated_at
    BEFORE UPDATE ON public.submission_partners
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_manuscript_submissions_updated_at ON public.manuscript_submissions;
CREATE TRIGGER update_manuscript_submissions_updated_at
    BEFORE UPDATE ON public.manuscript_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-calculate acceptance rate
CREATE OR REPLACE FUNCTION calculate_partner_acceptance_rate()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.total_submissions > 0 THEN
        NEW.acceptance_rate := (NEW.total_accepted::NUMERIC / NEW.total_submissions::NUMERIC) * 100;
    ELSE
        NEW.acceptance_rate := 0;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_acceptance_rate ON public.submission_partners;
CREATE TRIGGER trigger_calculate_acceptance_rate
    BEFORE INSERT OR UPDATE OF total_submissions, total_accepted
    ON public.submission_partners
    FOR EACH ROW
    EXECUTE FUNCTION calculate_partner_acceptance_rate();

-- Auto-set submitted_at timestamp
CREATE OR REPLACE FUNCTION set_submission_submitted_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'submitted' AND OLD.status = 'draft' AND NEW.submitted_at IS NULL THEN
        NEW.submitted_at := NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_submitted_at ON public.manuscript_submissions;
CREATE TRIGGER trigger_set_submitted_at
    BEFORE UPDATE ON public.manuscript_submissions
    FOR EACH ROW
    EXECUTE FUNCTION set_submission_submitted_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE public.submission_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manuscript_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_notifications ENABLE ROW LEVEL SECURITY;

-- Partners: Public read for verified partners
DROP POLICY IF EXISTS "Anyone can view verified partners" ON public.submission_partners;
CREATE POLICY "Anyone can view verified partners"
    ON public.submission_partners
    FOR SELECT
    USING (verified = true AND status = 'active');

-- Submissions: Users can only see their own
DROP POLICY IF EXISTS "Users can view own submissions" ON public.manuscript_submissions;
CREATE POLICY "Users can view own submissions"
    ON public.manuscript_submissions
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own submissions" ON public.manuscript_submissions;
CREATE POLICY "Users can create own submissions"
    ON public.manuscript_submissions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own submissions" ON public.manuscript_submissions;
CREATE POLICY "Users can update own submissions"
    ON public.manuscript_submissions
    FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own submissions" ON public.manuscript_submissions;
CREATE POLICY "Users can delete own submissions"
    ON public.manuscript_submissions
    FOR DELETE
    USING (auth.uid() = user_id);

-- Access Logs: Users can view logs for their submissions
DROP POLICY IF EXISTS "Users can view access logs for their submissions" ON public.submission_access_logs;
CREATE POLICY "Users can view access logs for their submissions"
    ON public.submission_access_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.manuscript_submissions
            WHERE manuscript_submissions.id = submission_access_logs.submission_id
            AND manuscript_submissions.user_id = auth.uid()
        )
    );

-- Notifications: Users can only see their own
DROP POLICY IF EXISTS "Users can view own notifications" ON public.submission_notifications;
CREATE POLICY "Users can view own notifications"
    ON public.submission_notifications
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.submission_notifications;
CREATE POLICY "Users can update own notifications"
    ON public.submission_notifications
    FOR UPDATE
    USING (auth.uid() = user_id);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.submission_partners IS 'Literary agents and publishers who can receive manuscript submissions (Studio feature)';
COMMENT ON TABLE public.manuscript_submissions IS 'Manuscript submissions from writers to agents/publishers (Studio-exclusive)';
COMMENT ON TABLE public.submission_access_logs IS 'Audit trail for all access to submitted manuscripts';
COMMENT ON TABLE public.submission_notifications IS 'Notifications about submission status changes and partner activity';

COMMENT ON COLUMN public.manuscript_submissions.priority_review IS 'Studio users get priority review flag';
COMMENT ON COLUMN public.manuscript_submissions.access_token IS 'JWT token for time-limited view-only access';
COMMENT ON COLUMN public.manuscript_submissions.watermark_data IS 'JSON data about applied watermarks for IP protection';
COMMENT ON COLUMN public.submission_partners.aar_member IS 'Member of Association of Authors Representatives (verification trust signal)';
COMMENT ON COLUMN public.submission_access_logs.access_type IS 'Type of access: view, download, print, or copy attempt';
