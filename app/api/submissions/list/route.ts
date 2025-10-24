/**
 * Submissions List API Endpoint
 *
 * GET: Returns list of all submissions for authenticated user
 *
 * Ticket: MS-4.1
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponses } from '@/lib/api/error-response'
import { requireAuth } from '@/lib/api/auth-helpers'

export async function GET(request: Request) {
  try {
    const { user, supabase } = await requireAuth(request)

    // Get all submissions for user
    const { data: submissions, error: submissionsError } = await supabase
      .from('manuscript_submissions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (submissionsError) {
      return errorResponses.internalError('Failed to fetch submissions', {
        details: submissionsError,
      })
    }

    // Get partner statistics for each submission
    const enrichedSubmissions = await Promise.all(
      submissions.map(async (submission) => {
        // Get partner counts
        const { count: totalPartners } = await supabase
          .from('partner_submissions')
          .select('*', { count: 'exact', head: true })
          .eq('submission_id', submission.id)

        const { count: viewedCount } = await supabase
          .from('partner_submissions')
          .select('*', { count: 'exact', head: true })
          .eq('submission_id', submission.id)
          .eq('viewed_by_partner', true)

        const { count: requestedCount } = await supabase
          .from('partner_submissions')
          .select('*', { count: 'exact', head: true })
          .eq('submission_id', submission.id)
          .in('status', ['sample_requested', 'full_requested'])

        const { count: acceptedCount } = await supabase
          .from('partner_submissions')
          .select('*', { count: 'exact', head: true })
          .eq('submission_id', submission.id)
          .eq('status', 'accepted')

        const { count: rejectedCount } = await supabase
          .from('partner_submissions')
          .select('*', { count: 'exact', head: true })
          .eq('submission_id', submission.id)
          .eq('status', 'rejected')

        // Get last activity
        const { data: lastActivity } = await supabase
          .from('partner_submissions')
          .select('updated_at')
          .eq('submission_id', submission.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .single()

        return {
          id: submission.id,
          title: submission.title,
          genre: submission.genre,
          wordCount: submission.word_count,
          status: submission.status,
          createdAt: submission.created_at,
          totalPartners: totalPartners || 0,
          viewedCount: viewedCount || 0,
          requestedCount: requestedCount || 0,
          acceptedCount: acceptedCount || 0,
          rejectedCount: rejectedCount || 0,
          lastActivity: lastActivity?.updated_at || null,
        }
      })
    )

    return NextResponse.json({ submissions: enrichedSubmissions })
  } catch (error) {
    console.error('Error fetching submissions list:', error)
    return errorResponses.internalError(
      error instanceof Error ? error.message : 'Failed to fetch submissions',
      { details: error }
    )
  }
}
