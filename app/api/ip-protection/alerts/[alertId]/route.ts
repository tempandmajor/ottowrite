/**
 * IP Protection Alert Management API Endpoint
 *
 * PATCH: Update alert status and add resolution notes
 *
 * Ticket: MS-3.4
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponses } from '@/lib/api/error-response'
import {requireAuth, handleAuthError} from '@/lib/api/auth-helpers'
import { requireDefaultRateLimit } from '@/lib/api/rate-limit-helpers'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ alertId: string }> }
) {
  try {
    const { user, supabase } = await requireAuth(request)
  await requireDefaultRateLimit(request, user.id)

    const { alertId } = await params
    const body = await request.json()
    const { status, notes } = body

    // Validate status
    const validStatuses = ['new', 'investigating', 'confirmed', 'false_positive', 'resolved']
    if (!status || !validStatuses.includes(status)) {
      return errorResponses.validationError('Invalid status value')
    }

    // Get the alert to verify ownership
    const { data: alert, error: alertError } = await supabase
      .from('suspicious_activity_alerts')
      .select('submission_id')
      .eq('id', alertId)
      .single()

    if (alertError || !alert) {
      return errorResponses.notFound('Alert not found')
    }

    // Verify the submission belongs to the user
    const { data: submission, error: submissionError } = await supabase
      .from('manuscript_submissions')
      .select('id')
      .eq('id', alert.submission_id)
      .eq('user_id', user.id)
      .single()

    if (submissionError || !submission) {
      return errorResponses.forbidden('You do not have permission to update this alert')
    }

    // Update the alert using the database function
    const { error: updateError } = await supabase.rpc('update_alert_status', {
      p_alert_id: alertId,
      p_status: status,
      p_reviewer_id: user.id,
      p_notes: notes || null,
    })

    if (updateError) {
      return errorResponses.internalError('Failed to update alert', { details: updateError })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
        const authError = handleAuthError(error)
    if (authError) return authError

    console.error('Error updating alert:', error)
    return errorResponses.internalError(
      error instanceof Error ? error.message : 'Failed to update alert',
      { details: error }
    )
  }
}
