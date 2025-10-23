-- PARTNER SUBMISSIONS JUNCTION TABLE
-- Migration: 20250123000000_partner_submissions_junction
-- Description: Add junction table to support multiple partners per submission
-- Ticket: MS-2.3

-- ============================================================================
-- PARTNER SUBMISSIONS TABLE
-- ============================================================================
-- Junction table for many-to-many relationship between submissions and partners

CREATE TABLE IF NOT EXISTS public.partner_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    submission_id UUID NOT NULL REFERENCES public.manuscript_submissions(id) ON DELETE CASCADE,
    partner_id UUID NOT NULL REFERENCES public.submission_partners(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Submission Status (per-partner)
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

    -- Partner Response
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

    -- Watermarking (partner-specific)
    watermark_data JSONB,
    access_token TEXT UNIQUE,
    access_expires_at TIMESTAMPTZ,
    access_revoked_at TIMESTAMPTZ,

    -- Timestamps
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure unique submission-partner combination
    UNIQUE(submission_id, partner_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_partner_submissions_submission_id
    ON public.partner_submissions(submission_id);

CREATE INDEX IF NOT EXISTS idx_partner_submissions_partner_id
    ON public.partner_submissions(partner_id);

CREATE INDEX IF NOT EXISTS idx_partner_submissions_user_id
    ON public.partner_submissions(user_id);

CREATE INDEX IF NOT EXISTS idx_partner_submissions_status
    ON public.partner_submissions(status);

CREATE INDEX IF NOT EXISTS idx_partner_submissions_access_token
    ON public.partner_submissions(access_token);

CREATE INDEX IF NOT EXISTS idx_partner_submissions_submitted_at
    ON public.partner_submissions(submitted_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.partner_submissions ENABLE ROW LEVEL SECURITY;

-- Users can view their own partner submissions
CREATE POLICY "Users can view their own partner submissions"
    ON public.partner_submissions
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own partner submissions
CREATE POLICY "Users can insert their own partner submissions"
    ON public.partner_submissions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own partner submissions (e.g., withdraw)
CREATE POLICY "Users can update their own partner submissions"
    ON public.partner_submissions
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Partners can view submissions sent to them (requires partner auth - to be implemented)
-- This will be added in MS-2.4 when we implement the partner portal

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_partner_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER partner_submissions_updated_at
    BEFORE UPDATE ON public.partner_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_partner_submissions_updated_at();

-- Update submission stats when partner submissions change
CREATE OR REPLACE FUNCTION update_partner_submission_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update partner stats
    UPDATE public.submission_partners
    SET
        total_submissions = (
            SELECT COUNT(*)
            FROM public.partner_submissions
            WHERE partner_id = COALESCE(NEW.partner_id, OLD.partner_id)
        ),
        total_accepted = (
            SELECT COUNT(*)
            FROM public.partner_submissions
            WHERE partner_id = COALESCE(NEW.partner_id, OLD.partner_id)
            AND status = 'accepted'
        ),
        total_rejected = (
            SELECT COUNT(*)
            FROM public.partner_submissions
            WHERE partner_id = COALESCE(NEW.partner_id, OLD.partner_id)
            AND status = 'rejected'
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.partner_id, OLD.partner_id);

    -- Calculate and update acceptance rate
    UPDATE public.submission_partners
    SET acceptance_rate = CASE
        WHEN total_submissions > 0
        THEN (total_accepted::NUMERIC / total_submissions::NUMERIC * 100)
        ELSE NULL
    END
    WHERE id = COALESCE(NEW.partner_id, OLD.partner_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER partner_submissions_stats_insert
    AFTER INSERT ON public.partner_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_partner_submission_stats();

CREATE TRIGGER partner_submissions_stats_update
    AFTER UPDATE OF status ON public.partner_submissions
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION update_partner_submission_stats();

CREATE TRIGGER partner_submissions_stats_delete
    AFTER DELETE ON public.partner_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_partner_submission_stats();

-- ============================================================================
-- ADDITIONAL TABLES FOR PARTNER PROFILE DATA
-- ============================================================================

-- Partner Sales/Deals (for profile pages)
CREATE TABLE IF NOT EXISTS public.partner_sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID NOT NULL REFERENCES public.submission_partners(id) ON DELETE CASCADE,

    title TEXT NOT NULL,
    author TEXT NOT NULL,
    genre TEXT,
    sale_date DATE NOT NULL,
    deal_type TEXT NOT NULL, -- e.g., "Two-book deal", "Film rights", etc.
    publisher TEXT,

    -- Visibility
    is_public BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_sales_partner_id
    ON public.partner_sales(partner_id);

CREATE INDEX IF NOT EXISTS idx_partner_sales_sale_date
    ON public.partner_sales(sale_date DESC);

ALTER TABLE public.partner_sales ENABLE ROW LEVEL SECURITY;

-- Anyone can view public partner sales
CREATE POLICY "Anyone can view public partner sales"
    ON public.partner_sales
    FOR SELECT
    USING (is_public = true);

-- Partner Submission Stats (for profile pages)
CREATE TABLE IF NOT EXISTS public.partner_submission_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID NOT NULL UNIQUE REFERENCES public.submission_partners(id) ON DELETE CASCADE,

    -- Aggregate stats
    total_submissions INTEGER DEFAULT 0,
    total_acceptances INTEGER DEFAULT 0,
    acceptance_rate NUMERIC(5,2),
    avg_response_time_days INTEGER,

    -- Genre breakdown
    genre_breakdown JSONB DEFAULT '{}'::jsonb,

    -- Last calculated
    last_calculated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_submission_stats_partner_id
    ON public.partner_submission_stats(partner_id);

ALTER TABLE public.partner_submission_stats ENABLE ROW LEVEL SECURITY;

-- Anyone can view partner stats
CREATE POLICY "Anyone can view partner stats"
    ON public.partner_submission_stats
    FOR SELECT
    USING (true);
