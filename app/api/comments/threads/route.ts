/**
 * Comment Threads API
 * Manages comment threads on documents
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const createThreadSchema = z.object({
  documentId: z.string().uuid(),
  startPosition: z.number().int().min(0),
  endPosition: z.number().int().min(0),
  quotedText: z.string().min(1).max(1000),
  initialComment: z.string().min(1).max(5000),
  mentionedUsers: z.array(z.string().uuid()).optional(),
})

const updateThreadSchema = z.object({
  threadId: z.string().uuid(),
  isResolved: z.boolean().optional(),
})

/**
 * GET /api/comments/threads?documentId=xxx
 * Get all comment threads for a document
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
    const documentId = searchParams.get('documentId')

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 })
    }

    // Get all threads for the document with comments
    const { data: threads, error: threadsError } = await supabase
      .from('comment_threads')
      .select(`
        *,
        comments (
          *,
          user:user_id (
            id,
            email
          )
        )
      `)
      .eq('document_id', documentId)
      .order('created_at', { ascending: false })

    if (threadsError) {
      console.error('[Comments API] Error fetching threads:', threadsError)
      return NextResponse.json({ error: 'Failed to fetch threads' }, { status: 500 })
    }

    return NextResponse.json({ threads })
  } catch (error) {
    console.error('[Comments API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/comments/threads
 * Create a new comment thread
 */
export async function POST(request: NextRequest) {
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
    const validation = createThreadSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.issues },
        { status: 400 }
      )
    }

    const { documentId, startPosition, endPosition, quotedText, initialComment, mentionedUsers } = validation.data

    // Verify user has access to the document
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, user_id')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single()

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found or access denied' }, { status: 404 })
    }

    // Create the thread
    const { data: thread, error: threadError } = await supabase
      .from('comment_threads')
      .insert({
        document_id: documentId,
        user_id: user.id,
        start_position: startPosition,
        end_position: endPosition,
        quoted_text: quotedText,
      })
      .select()
      .single()

    if (threadError) {
      console.error('[Comments API] Error creating thread:', threadError)
      return NextResponse.json({ error: 'Failed to create thread' }, { status: 500 })
    }

    // Create the initial comment
    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .insert({
        thread_id: thread.id,
        user_id: user.id,
        content: initialComment,
        mentioned_users: mentionedUsers || [],
      })
      .select()
      .single()

    if (commentError) {
      console.error('[Comments API] Error creating initial comment:', commentError)
      // Rollback thread creation
      await supabase.from('comment_threads').delete().eq('id', thread.id)
      return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 })
    }

    return NextResponse.json({ thread, comment }, { status: 201 })
  } catch (error) {
    console.error('[Comments API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/comments/threads
 * Update a comment thread (e.g., resolve/unresolve)
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
    const validation = updateThreadSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.issues },
        { status: 400 }
      )
    }

    const { threadId, isResolved } = validation.data

    const updateData: Record<string, unknown> = {}

    if (isResolved !== undefined) {
      updateData.is_resolved = isResolved
      updateData.resolved_at = isResolved ? new Date().toISOString() : null
      updateData.resolved_by = isResolved ? user.id : null
    }

    const { data: thread, error: updateError } = await supabase
      .from('comment_threads')
      .update(updateData)
      .eq('id', threadId)
      .select()
      .single()

    if (updateError) {
      console.error('[Comments API] Error updating thread:', updateError)
      return NextResponse.json({ error: 'Failed to update thread' }, { status: 500 })
    }

    return NextResponse.json({ thread })
  } catch (error) {
    console.error('[Comments API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
