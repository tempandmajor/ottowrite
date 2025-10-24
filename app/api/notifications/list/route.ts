/**
 * Notifications List API Endpoint
 *
 * GET: Returns list of notifications for authenticated user
 *
 * Ticket: MS-4.2
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponses } from '@/lib/api/error-response'
import {requireAuth, handleAuthError} from '@/lib/api/auth-helpers'

export async function GET(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const unreadOnly = searchParams.get('unreadOnly') === 'true'

    // Build query
    let query = supabase
      .from('submission_notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Filter by unread if requested
    if (unreadOnly) {
      query = query.eq('read', false)
    }

    const { data: notifications, error: notificationsError } = await query

    if (notificationsError) {
      return errorResponses.internalError('Failed to fetch notifications', {
        details: notificationsError,
      })
    }

    // Convert snake_case to camelCase
    const formattedNotifications = notifications.map((notif: any) => ({
      id: notif.id,
      submissionId: notif.submission_id,
      type: notif.type,
      title: notif.title,
      message: notif.message,
      actionUrl: notif.action_url,
      read: notif.read,
      readAt: notif.read_at,
      emailSent: notif.email_sent,
      emailSentAt: notif.email_sent_at,
      createdAt: notif.created_at,
    }))

    return NextResponse.json({ notifications: formattedNotifications })
  } catch (error) {
        const authError = handleAuthError(error)
    if (authError) return authError

    console.error('Error fetching notifications:', error)
    return errorResponses.internalError(
      error instanceof Error ? error.message : 'Failed to fetch notifications',
      { details: error }
    )
  }
}
