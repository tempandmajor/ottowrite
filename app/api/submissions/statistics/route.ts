/**
 * Submissions Statistics API Endpoint
 *
 * GET: Returns summary statistics for user's submissions
 *
 * Ticket: MS-4.1
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponses } from '@/lib/api/error-response'
import {requireAuth, handleAuthError} from '@/lib/api/auth-helpers'

export async function GET(request: Request) {
  try {
    const { user, supabase } = await requireAuth(request)

    // Get submission counts
    const { count: totalSubmissions } = await supabase
      .from('manuscript_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    const { count: activeSubmissions } = await supabase
      .from('manuscript_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'active')

    // Get submission IDs
    const { data: submissions } = await supabase
      .from('manuscript_submissions')
      .select('id')
      .eq('user_id', user.id)

    const submissionIds = submissions?.map((s) => s.id) || []

    if (submissionIds.length === 0) {
      return NextResponse.json({
        stats: {
          totalSubmissions: 0,
          activeSubmissions: 0,
          totalPartners: 0,
          totalViews: 0,
          requestsReceived: 0,
          acceptanceRate: 0,
        },
      })
    }

    // Get partner statistics across all submissions
    const { count: totalPartners } = await supabase
      .from('partner_submissions')
      .select('*', { count: 'exact', head: true })
      .in('submission_id', submissionIds)

    const { count: totalViews } = await supabase
      .from('partner_submissions')
      .select('*', { count: 'exact', head: true })
      .in('submission_id', submissionIds)
      .eq('viewed_by_partner', true)

    const { count: requestsReceived } = await supabase
      .from('partner_submissions')
      .select('*', { count: 'exact', head: true })
      .in('submission_id', submissionIds)
      .in('status', ['sample_requested', 'full_requested', 'accepted'])

    const { count: acceptedCount } = await supabase
      .from('partner_submissions')
      .select('*', { count: 'exact', head: true })
      .in('submission_id', submissionIds)
      .eq('status', 'accepted')

    const { count: totalResponses } = await supabase
      .from('partner_submissions')
      .select('*', { count: 'exact', head: true })
      .in('submission_id', submissionIds)
      .in('status', ['accepted', 'rejected'])

    const acceptanceRate =
      totalResponses && totalResponses > 0
        ? ((acceptedCount || 0) / totalResponses) * 100
        : 0

    return NextResponse.json({
      stats: {
        totalSubmissions: totalSubmissions || 0,
        activeSubmissions: activeSubmissions || 0,
        totalPartners: totalPartners || 0,
        totalViews: totalViews || 0,
        requestsReceived: requestsReceived || 0,
        acceptanceRate,
      },
    })
  } catch (error) {
        const authError = handleAuthError(error)
    if (authError) return authError

    console.error('Error fetching submissions statistics:', error)
    return errorResponses.internalError(
      error instanceof Error ? error.message : 'Failed to fetch statistics',
      { details: error }
    )
  }
}
