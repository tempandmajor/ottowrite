/**
 * Mark All Notifications as Read API Endpoint
 *
 * PATCH: Marks all unread notifications as read for authenticated user
 *
 * Ticket: MS-4.2
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponses } from '@/lib/api/error-response'

export async function PATCH(request: NextRequest) {
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
    console.error('Error marking all notifications as read:', error)
    return errorResponses.internalError(
      error instanceof Error ? error.message : 'Failed to mark all notifications as read',
      { details: error }
    )
  }
}
