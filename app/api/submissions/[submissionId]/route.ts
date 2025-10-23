/**
 * Submission Detail API Endpoint
 *
 * GET: Returns detailed information for a specific submission
 *
 * Ticket: MS-4.1
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponses } from '@/lib/api/error-response'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return errorResponses.unauthorized('Authentication required')
    }

    const { submissionId } = await params

    // Get submission
    const { data: submission, error: submissionError } = await supabase
      .from('manuscript_submissions')
      .select('*')
      .eq('id', submissionId)
      .eq('user_id', user.id)
      .single()

    if (submissionError || !submission) {
      return errorResponses.notFound('Submission not found')
    }

    // Get partner statistics
    const { count: totalPartners } = await supabase
      .from('partner_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('submission_id', submissionId)

    const { count: viewedCount } = await supabase
      .from('partner_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('submission_id', submissionId)
      .eq('viewed_by_partner', true)

    const { count: requestedCount } = await supabase
      .from('partner_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('submission_id', submissionId)
      .in('status', ['sample_requested', 'full_requested'])

    const { count: acceptedCount } = await supabase
      .from('partner_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('submission_id', submissionId)
      .eq('status', 'accepted')

    const { count: rejectedCount } = await supabase
      .from('partner_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('submission_id', submissionId)
      .eq('status', 'rejected')

    return NextResponse.json({
      submission: {
        id: submission.id,
        title: submission.title,
        genre: submission.genre,
        wordCount: submission.word_count,
        status: submission.status,
        synopsis: submission.synopsis,
        queryLetter: submission.query_letter,
        samplePages: submission.sample_pages,
        createdAt: submission.created_at,
        updatedAt: submission.updated_at,
        totalPartners: totalPartners || 0,
        viewedCount: viewedCount || 0,
        requestedCount: requestedCount || 0,
        acceptedCount: acceptedCount || 0,
        rejectedCount: rejectedCount || 0,
      },
    })
  } catch (error) {
    console.error('Error fetching submission detail:', error)
    return errorResponses.internalError(
      error instanceof Error ? error.message : 'Failed to fetch submission',
      { details: error }
    )
  }
}
