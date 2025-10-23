/**
 * Mark Notification as Read API Endpoint
 *
 * PATCH: Marks a specific notification as read
 *
 * Ticket: MS-4.2
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponses } from '@/lib/api/error-response'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ notificationId: string }> }
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

    const { notificationId } = await params

    // Use RPC function to mark as read
    const { data: success, error: readError } = await supabase.rpc(
      'mark_notification_as_read',
      {
        p_notification_id: notificationId,
        p_user_id: user.id,
      }
    )

    if (readError) {
      return errorResponses.internalError('Failed to mark notification as read', {
        details: readError,
      })
    }

    if (!success) {
      return errorResponses.notFound('Notification not found or already read')
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error marking notification as read:', error)
    return errorResponses.internalError(
      error instanceof Error ? error.message : 'Failed to mark notification as read',
      { details: error }
    )
  }
}
