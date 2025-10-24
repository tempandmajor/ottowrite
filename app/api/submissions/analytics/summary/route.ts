/**
 * Submission Analytics Summary API Endpoint
 *
 * GET: Returns aggregated analytics summary for authenticated user
 *
 * Ticket: MS-4.3
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponses } from '@/lib/api/error-response'
import {requireAuth, handleAuthError} from '@/lib/api/auth-helpers'

export async function GET(request: Request) {
  try {
    const { user, supabase } = await requireAuth(request)

    // Get summary from materialized view
    const { data: summary, error: summaryError } = await supabase
      .from('submission_analytics_summary')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (summaryError && summaryError.code !== 'PGRST116') {
      return errorResponses.internalError('Failed to fetch analytics summary', {
        details: summaryError,
      })
    }

    // If no data, return zeros
    if (!summary) {
      return NextResponse.json({
        summary: {
          totalSubmissions: 0,
          activeSubmissions: 0,
          draftSubmissions: 0,
          pausedSubmissions: 0,
          closedSubmissions: 0,
          totalPartnersContacted: 0,
          totalViews: 0,
          totalRequests: 0,
          totalAcceptances: 0,
          totalRejections: 0,
          acceptanceRate: 0,
          viewRate: 0,
          requestRate: 0,
          firstSubmissionDate: null,
          latestSubmissionDate: null,
        },
      })
    }

    // Format response
    const formattedSummary = {
      totalSubmissions: Number(summary.total_submissions),
      activeSubmissions: Number(summary.active_submissions),
      draftSubmissions: Number(summary.draft_submissions),
      pausedSubmissions: Number(summary.paused_submissions),
      closedSubmissions: Number(summary.closed_submissions),
      totalPartnersContacted: Number(summary.total_partners_contacted),
      totalViews: Number(summary.total_views),
      totalRequests: Number(summary.total_requests),
      totalAcceptances: Number(summary.total_acceptances),
      totalRejections: Number(summary.total_rejections),
      acceptanceRate: Number(summary.acceptance_rate),
      viewRate: Number(summary.view_rate),
      requestRate: Number(summary.request_rate),
      firstSubmissionDate: summary.first_submission_date,
      latestSubmissionDate: summary.latest_submission_date,
    }

    return NextResponse.json({ summary: formattedSummary })
  } catch (error) {
        const authError = handleAuthError(error)
    if (authError) return authError

    console.error('Error fetching analytics summary:', error)
    return errorResponses.internalError(
      error instanceof Error ? error.message : 'Failed to fetch analytics summary',
      { details: error }
    )
  }
}
