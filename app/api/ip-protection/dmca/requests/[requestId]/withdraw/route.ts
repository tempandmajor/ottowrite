/**
 * DMCA Request Withdrawal API Endpoint
 *
 * POST: Withdraw a DMCA takedown request
 *
 * Ticket: MS-5.3
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponses } from '@/lib/api/error-response'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
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

    const { requestId } = await params
    const body = await request.json().catch(() => ({}))
    const reason = body.reason || null

    // Call database function to withdraw request
    const { data, error: withdrawError } = await supabase.rpc('withdraw_dmca_request', {
      p_request_id: requestId,
      p_user_id: user.id,
      p_reason: reason,
    })

    if (withdrawError) {
      if (withdrawError.message?.includes('not found') || withdrawError.message?.includes('access denied')) {
        return errorResponses.notFound('DMCA request not found')
      }
      if (withdrawError.message?.includes('cannot be withdrawn')) {
        return errorResponses.validationError('This request cannot be withdrawn')
      }

      return errorResponses.internalError('Failed to withdraw DMCA request', {
        details: withdrawError,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error withdrawing DMCA request:', error)
    return errorResponses.internalError(
      error instanceof Error ? error.message : 'Failed to withdraw DMCA request',
      { details: error }
    )
  }
}
