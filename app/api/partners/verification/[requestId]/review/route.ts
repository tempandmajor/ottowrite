/**
 * Partner Verification Review API (Admin Only)
 *
 * POST /api/partners/verification/[requestId]/review - Review a verification request
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponses, successResponse } from '@/lib/api/error-response'
import type { VerificationRedFlag } from '@/lib/submissions/partner-verification'

interface RouteParams {
  params: Promise<{
    requestId: string
  }>
}

interface ReviewVerificationBody {
  decision: 'approve' | 'reject' | 'request_more_info'
  level?: 'basic' | 'standard' | 'premium' | 'elite'
  notes?: string
  rejectionReason?: string
  redFlags?: VerificationRedFlag[]
  additionalInfoNeeded?: string
}

/**
 * POST /api/partners/verification/[requestId]/review
 * Review a partner verification request (admin only)
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

    // Verify admin access
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (userSettings?.role !== 'admin') {
      return errorResponses.forbidden('Admin access required')
    }

    const { requestId } = await params
    const body: ReviewVerificationBody = await request.json()

    if (!body.decision) {
      return errorResponses.badRequest('Missing required field: decision')
    }

    // Get the verification request
    const { data: verificationRequest, error: fetchError } = await supabase
      .from('partner_verification_requests')
      .select('*')
      .eq('id', requestId)
      .single()

    if (fetchError || !verificationRequest) {
      return errorResponses.notFound('Verification request not found')
    }

    let result

    switch (body.decision) {
      case 'approve': {
        if (!body.level) {
          return errorResponses.badRequest('Verification level required for approval')
        }

        // Use database function to approve
        const { error: approveError } = await supabase.rpc(
          'approve_partner_verification',
          {
            p_request_id: requestId,
            p_level: body.level,
            p_admin_id: user.id,
            p_notes: body.notes || null,
          }
        )

        if (approveError) {
          return errorResponses.internalError('Failed to approve verification', {
            details: approveError.message,
          })
        }

        result = {
          message: 'Verification request approved successfully',
          status: 'approved',
          level: body.level,
        }
        break
      }

      case 'reject': {
        if (!body.rejectionReason) {
          return errorResponses.badRequest('Rejection reason required')
        }

        // Use database function to reject
        const { error: rejectError } = await supabase.rpc(
          'reject_partner_verification',
          {
            p_request_id: requestId,
            p_admin_id: user.id,
            p_reason: body.rejectionReason,
            p_red_flags: body.redFlags || null,
          }
        )

        if (rejectError) {
          return errorResponses.internalError('Failed to reject verification', {
            details: rejectError.message,
          })
        }

        result = {
          message: 'Verification request rejected',
          status: 'rejected',
          reason: body.rejectionReason,
        }
        break
      }

      case 'request_more_info': {
        if (!body.additionalInfoNeeded) {
          return errorResponses.badRequest('Please specify what additional information is needed')
        }

        // Use database function to request more info
        const { error: infoError } = await supabase.rpc(
          'request_verification_info',
          {
            p_request_id: requestId,
            p_admin_id: user.id,
            p_info_needed: body.additionalInfoNeeded,
          }
        )

        if (infoError) {
          return errorResponses.internalError('Failed to request additional information', {
            details: infoError.message,
          })
        }

        result = {
          message: 'Additional information requested',
          status: 'more_info_needed',
          info_needed: body.additionalInfoNeeded,
        }
        break
      }

      default:
        return errorResponses.badRequest('Invalid decision')
    }

    return successResponse(result)
  } catch (error) {
    console.error('Error reviewing verification request:', error)
    return errorResponses.internalError('An unexpected error occurred')
  }
}
