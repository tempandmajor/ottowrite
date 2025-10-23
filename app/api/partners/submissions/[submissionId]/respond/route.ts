/**
 * Partner Response API
 *
 * POST /api/partners/submissions/[submissionId]/respond - Submit response to a submission
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponses, successResponse } from '@/lib/api/error-response'

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
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return errorResponses.unauthorized()
    }

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

    // Update the partner submission
    const updateData: any = {
      status: body.status,
      response_message: body.response_message,
      responded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { error: updateError } = await supabase
      .from('partner_submissions')
      .update(updateData)
      .eq('id', submissionId)

    if (updateError) {
      return errorResponses.internalError('Failed to update submission', {
        details: updateError.message,
      })
    }

    // TODO: Send email notification to author
    // This would be implemented in a future iteration

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
