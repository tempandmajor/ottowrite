/**
 * Comment Notifications API
 * Manages comment notifications for users
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const markReadSchema = z.object({
  notificationIds: z.array(z.string().uuid()).optional(),
  markAllAsRead: z.boolean().optional(),
})

/**
 * GET /api/comments/notifications
 * Get all notifications for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unreadOnly') === 'true'

    let query = supabase
      .from('comment_notifications')
      .select(`
        *,
        comment:comment_id (
          id,
          content,
          user:user_id (
            id,
            email
          )
        ),
        thread:thread_id (
          id,
          quoted_text,
          document:document_id (
            id,
            title
          )
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (unreadOnly) {
      query = query.eq('is_read', false)
    }

    const { data: notifications, error: notifError } = await query

    if (notifError) {
      console.error('[Notifications API] Error fetching notifications:', notifError)
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
    }

    return NextResponse.json({ notifications })
  } catch (error) {
    console.error('[Notifications API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/comments/notifications
 * Mark notifications as read
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = markReadSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.issues },
        { status: 400 }
      )
    }

    const { notificationIds, markAllAsRead } = validation.data

    let query = supabase
      .from('comment_notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)

    if (markAllAsRead) {
      // Mark all as read
      query = query.eq('is_read', false)
    } else if (notificationIds && notificationIds.length > 0) {
      // Mark specific notifications as read
      query = query.in('id', notificationIds)
    } else {
      return NextResponse.json(
        { error: 'Either notificationIds or markAllAsRead must be provided' },
        { status: 400 }
      )
    }

    const { error: updateError } = await query

    if (updateError) {
      console.error('[Notifications API] Error updating notifications:', updateError)
      return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Notifications API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
