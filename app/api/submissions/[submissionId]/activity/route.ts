/**
 * Submission Activity API Endpoint
 *
 * GET: Returns activity timeline for a submission
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

    // Verify ownership
    const { data: submission } = await supabase
      .from('manuscript_submissions')
      .select('id, created_at')
      .eq('id', submissionId)
      .eq('user_id', user.id)
      .single()

    if (!submission) {
      return errorResponses.notFound('Submission not found')
    }

    // Build activity timeline from various sources
    const activities: any[] = []

    // Add submission created event
    activities.push({
      id: `created-${submission.id}`,
      type: 'submission_created',
      description: 'Submission created',
      partnerName: null,
      metadata: {},
      createdAt: submission.created_at,
    })

    // Get partner submission events
    const { data: partnerSubmissions } = await supabase
      .from('partner_submissions')
      .select('*, submission_partners(name)')
      .eq('submission_id', submissionId)
      .order('created_at', { ascending: false })

    partnerSubmissions?.forEach((ps: any) => {
      const partnerName = ps.submission_partners?.name || 'Unknown Partner'

      // Partner added
      activities.push({
        id: `partner-added-${ps.id}`,
        type: 'partner_added',
        description: `Submitted to ${partnerName}`,
        partnerName,
        metadata: {},
        createdAt: ps.created_at,
      })

      // Partner viewed
      if (ps.viewed_by_partner && ps.first_viewed_at) {
        activities.push({
          id: `partner-viewed-${ps.id}`,
          type: 'partner_viewed',
          description: `${partnerName} viewed submission`,
          partnerName,
          metadata: { viewCount: ps.view_count },
          createdAt: ps.first_viewed_at,
        })
      }

      // Material requested
      if (ps.status === 'sample_requested' || ps.status === 'full_requested') {
        activities.push({
          id: `material-requested-${ps.id}`,
          type: 'material_requested',
          description: `${partnerName} requested additional material`,
          partnerName,
          metadata: { requestType: ps.status },
          createdAt: ps.updated_at,
        })
      }

      // Response received
      if (ps.partner_response_date) {
        activities.push({
          id: `response-${ps.id}`,
          type: 'response_received',
          description: `Response received from ${partnerName}`,
          partnerName,
          metadata: { response: ps.partner_response },
          createdAt: ps.partner_response_date,
        })
      }

      // Accepted
      if (ps.status === 'accepted') {
        activities.push({
          id: `accepted-${ps.id}`,
          type: 'status_accepted',
          description: `Accepted by ${partnerName}!`,
          partnerName,
          metadata: {},
          createdAt: ps.partner_response_date || ps.updated_at,
        })
      }

      // Rejected
      if (ps.status === 'rejected') {
        activities.push({
          id: `rejected-${ps.id}`,
          type: 'status_rejected',
          description: `Declined by ${partnerName}`,
          partnerName,
          metadata: { reason: ps.rejection_reason },
          createdAt: ps.partner_response_date || ps.updated_at,
        })
      }
    })

    // Sort by date descending
    activities.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    return NextResponse.json({ activities })
  } catch (error) {
    console.error('Error fetching submission activity:', error)
    return errorResponses.internalError(
      error instanceof Error ? error.message : 'Failed to fetch activity',
      { details: error }
    )
  }
}
