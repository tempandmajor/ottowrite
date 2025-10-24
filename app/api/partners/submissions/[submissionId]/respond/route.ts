/**
 * Partner Response API
 *
 * POST /api/partners/submissions/[submissionId]/respond - Submit response to a submission
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponses, successResponse } from '@/lib/api/error-response'
import { requireAuth } from '@/lib/api/auth-helpers'
import { requireDefaultRateLimit } from '@/lib/api/rate-limit-helpers'

interface RouteParams {
  params: Promise<{
    submissionId: string
  }>
}

interface ResponseBody {
  status: 'accepted' | 'rejected' | 'requested_more' | 'viewed'
  response_message: string
}

/**
 * POST /api/partners/submissions/[submissionId]/respond
 * Submit a response to a manuscript submission
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, supabase } = await requireAuth(request)
  await requireDefaultRateLimit(request, user.id)

    const { submissionId } = await params
    const body: ResponseBody = await request.json()

    if (!body.status || !body.response_message) {
      return errorResponses.badRequest('status and response_message are required')
    }

    // Verify the submission belongs to a partner owned by this user
    const { data: partnerSubmission, error: fetchError } = await supabase
      .from('partner_submissions')
      .select(`
        id,
        partner_id,
        submission_partners!inner (
          id,
          email
        )
      `)
      .eq('id', submissionId)
      .single()

    if (fetchError || !partnerSubmission) {
      return errorResponses.notFound('Submission not found')
    }

    // Verify partner ownership
    const partner = partnerSubmission.submission_partners as any
    if (partner.email !== user.email) {
      return errorResponses.forbidden('Access denied')
    }

    // Update the partner submission with proper column names
    const updateData: any = {
      status: body.status,
      partner_response: body.response_message,
      partner_response_date: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data: updatedSubmission, error: updateError } = await supabase
      .from('partner_submissions')
      .update(updateData)
      .eq('id', submissionId)
      .select(`
        id,
        submission_id,
        user_id,
        manuscript_submissions (
          id,
          title
        ),
        submission_partners (
          name
        )
      `)
      .single()

    if (updateError) {
      return errorResponses.internalError('Failed to update submission', {
        details: updateError.message,
      })
    }

    // Send notification to author
    if (updatedSubmission) {
      const submission = updatedSubmission.manuscript_submissions as any
      const partner = updatedSubmission.submission_partners as any

      try {
        const { notifyResponseReceived, notifySubmissionAccepted, notifySubmissionRejected } = await import('@/lib/notifications/create-notification')

        if (body.status === 'accepted') {
          await notifySubmissionAccepted(
            updatedSubmission.user_id,
            submission.id,
            submission.title,
            partner.name
          )
        } else if (body.status === 'rejected') {
          await notifySubmissionRejected(
            updatedSubmission.user_id,
            submission.id,
            submission.title,
            partner.name
          )
        } else {
          await notifyResponseReceived(
            updatedSubmission.user_id,
            submission.id,
            submission.title,
            partner.name
          )
        }
      } catch (notificationError) {
        console.error('Failed to send notification:', notificationError)
        // Don't fail the request if notification fails
      }
    }

    return successResponse({
      message: 'Response submitted successfully',
      submission_id: submissionId,
      status: body.status,
    })
  } catch (error) {
    console.error('Error submitting partner response:', error)
    return errorResponses.internalError('An unexpected error occurred')
  }
}
