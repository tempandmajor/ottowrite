/**
 * Individual Session Management API
 *
 * DELETE /api/auth/sessions/[sessionId] - Invalidate a specific session
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * DELETE /api/auth/sessions/[sessionId]
 * Invalidate a specific session
 */
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { sessionId } = await context.params

  // Verify the session belongs to the user
  const { data: session } = await supabase
    .from('session_fingerprints')
    .select('user_id')
    .eq('id', sessionId)
    .single()

  if (!session || session.user_id !== user.id) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  // Invalidate the session
  const { error } = await supabase
    .from('session_fingerprints')
    .update({
      is_active: false,
      invalidated_at: new Date().toISOString(),
      invalidation_reason: 'user_requested',
    })
    .eq('id', sessionId)

  if (error) {
    console.error('Error invalidating session:', error)
    return NextResponse.json(
      { error: 'Failed to invalidate session' },
      { status: 500 }
    )
  }

  // Log the activity
  await supabase.rpc('log_session_activity', {
    p_user_id: user.id,
    p_session_id: sessionId,
    p_activity_type: 'session_invalidated',
    p_metadata: { reason: 'user_requested' },
  })

  return NextResponse.json({ success: true })
}
