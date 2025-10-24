/**
 * Mark All Notifications as Read API Endpoint
 *
 * PATCH: Marks all unread notifications as read for authenticated user
 *
 * Ticket: MS-4.2
 */

import { NextResponse } from 'next/server'
import { errorResponses } from '@/lib/api/error-response'
import {requireAuth, handleAuthError} from '@/lib/api/auth-helpers'
import { requireDefaultRateLimit } from '@/lib/api/rate-limit-helpers'

export async function PATCH(request: Request) {
  try {
    const { user, supabase } = await requireAuth(request)
    await requireDefaultRateLimit(request, user.id)

    // Use RPC function to mark all as read
    const { data: count, error: readError } = await supabase.rpc(
      'mark_all_notifications_as_read',
      {
        p_user_id: user.id,
      }
    )

    if (readError) {
      return errorResponses.internalError('Failed to mark all notifications as read', {
        details: readError,
      })
    }

    return NextResponse.json({ success: true, count: count || 0 })
  } catch (error) {
        const authError = handleAuthError(error)
    if (authError) return authError

    console.error('Error marking all notifications as read:', error)
    return errorResponses.internalError(
      error instanceof Error ? error.message : 'Failed to mark all notifications as read',
      { details: error }
    )
  }
}
