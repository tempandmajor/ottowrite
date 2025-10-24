/**
 * Unread Notification Count API Endpoint
 *
 * GET: Returns count of unread notifications for authenticated user
 *
 * Ticket: MS-4.2
 */

import { NextResponse } from 'next/server'
import { errorResponses } from '@/lib/api/error-response'
import {requireAuth, handleAuthError} from '@/lib/api/auth-helpers'
import { requireDefaultRateLimit } from '@/lib/api/rate-limit-helpers'

export async function GET(request: Request) {
  try {
    const { user, supabase } = await requireAuth(request)
    await requireDefaultRateLimit(request, user.id)

    // Get unread count using RPC function
    const { data: count, error: countError } = await supabase.rpc(
      'get_unread_notification_count',
      { p_user_id: user.id }
    )

    if (countError) {
      return errorResponses.internalError('Failed to fetch unread count', {
        details: countError,
      })
    }

    return NextResponse.json({ count: count || 0 })
  } catch (error) {
        const authError = handleAuthError(error)
    if (authError) return authError

    console.error('Error fetching unread notification count:', error)
    return errorResponses.internalError(
      error instanceof Error ? error.message : 'Failed to fetch unread count',
      { details: error }
    )
  }
}
