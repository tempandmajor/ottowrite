/**
 * Unread Notification Count API Endpoint
 *
 * GET: Returns count of unread notifications for authenticated user
 *
 * Ticket: MS-4.2
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponses } from '@/lib/api/error-response'

export async function GET(request: NextRequest) {
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
    console.error('Error fetching unread notification count:', error)
    return errorResponses.internalError(
      error instanceof Error ? error.message : 'Failed to fetch unread count',
      { details: error }
    )
  }
}
