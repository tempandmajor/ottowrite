/**
 * Session Management API
 *
 * GET /api/auth/sessions - List all active sessions for the current user
 * DELETE /api/auth/sessions - Invalidate all sessions (force re-auth)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/security/api-helpers'

/**
 * GET /api/auth/sessions
 * List all active sessions for the authenticated user
 */
export async function GET(_request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get all active sessions from database
  const { data: sessions, error } = await supabase
    .from('session_fingerprints')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('last_seen_at', { ascending: false })

  if (error) {
    console.error('Error fetching sessions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    sessions: sessions.map((s) => ({
      id: s.id,
      device_info: s.device_info,
      ip_address: s.ip_address,
      user_agent: s.user_agent,
      created_at: s.created_at,
      last_seen_at: s.last_seen_at,
    })),
  })
}

/**
 * DELETE /api/auth/sessions
 * Invalidate all sessions for the current user (except current one optionally)
 */
export const DELETE = withAuth(async (request: NextRequest, { userId }) => {
  const supabase = await createClient()

  // Call the database function to invalidate all sessions
  const { data, error } = await supabase.rpc('invalidate_all_user_sessions', {
    p_user_id: userId,
    p_reason: 'user_requested',
  })

  if (error) {
    console.error('Error invalidating sessions:', error)
    return NextResponse.json(
      { error: 'Failed to invalidate sessions' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    invalidated_count: data || 0,
  })
})
