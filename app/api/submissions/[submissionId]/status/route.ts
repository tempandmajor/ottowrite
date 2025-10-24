/**
 * Submission Status Update API Endpoint
 *
 * PATCH: Updates submission status
 *
 * Ticket: MS-4.1
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponses } from '@/lib/api/error-response'
import { requireAuth } from '@/lib/api/auth-helpers'
import { requireDefaultRateLimit } from '@/lib/api/rate-limit-helpers'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  try {
    const { user, supabase } = await requireAuth(request)
  await requireDefaultRateLimit(request, user.id)

    const { submissionId } = await params
    const body = await request.json()
    const { status } = body

    // Validate status
    const validStatuses = ['draft', 'active', 'paused', 'closed']
    if (!status || !validStatuses.includes(status)) {
      return errorResponses.validationError('Invalid status value')
    }

    // Verify ownership and update
    const { data: submission, error: updateError } = await supabase
      .from('manuscript_submissions')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', submissionId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError || !submission) {
      return errorResponses.notFound('Submission not found')
    }

    return NextResponse.json({ success: true, status: submission.status })
  } catch (error) {
    console.error('Error updating submission status:', error)
    return errorResponses.internalError(
      error instanceof Error ? error.message : 'Failed to update status',
      { details: error }
    )
  }
}
