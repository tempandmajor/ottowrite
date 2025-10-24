/**
 * API endpoint for creating branch commits
 */

import { NextResponse } from 'next/server'
import {requireAuth, handleAuthError} from '@/lib/api/auth-helpers'
import { requireDefaultRateLimit } from '@/lib/api/rate-limit-helpers'

export const dynamic = 'force-dynamic'

// POST /api/branches/commit - Create a commit on a branch
export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireAuth(request)
    await requireDefaultRateLimit(request, user.id)

    const body = await request.json()
    const { branchId, message, content, wordCount } = body

    if (!branchId || !message || !content) {
      return NextResponse.json(
        { error: 'branchId, message, and content are required' },
        { status: 400 }
      )
    }

    // Validate commit message
    if (message.length < 1 || message.length > 500) {
      return NextResponse.json(
        { error: 'Commit message must be between 1 and 500 characters' },
        { status: 400 }
      )
    }

    // Verify user owns the branch
    const { data: branch, error: branchError } = await supabase
      .from('document_branches')
      .select('id')
      .eq('id', branchId)
      .eq('user_id', user.id)
      .single()

    if (branchError || !branch) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 })
    }

    // Get the latest commit for this branch to set as parent
    const { data: latestCommit } = await supabase
      .from('branch_commits')
      .select('id')
      .eq('branch_id', branchId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Create the commit
    const { data: newCommit, error: commitError } = await supabase
      .from('branch_commits')
      .insert({
        branch_id: branchId,
        parent_commit_id: latestCommit?.id || null,
        user_id: user.id,
        message,
        content,
        word_count: wordCount || 0,
      })
      .select()
      .single()

    if (commitError) {
      console.error('Error creating commit:', commitError)
      return NextResponse.json({ error: 'Failed to create commit' }, { status: 500 })
    }

    // Update branch with latest content
    const { error: updateError } = await supabase
      .from('document_branches')
      .update({
        content,
        word_count: wordCount || 0,
        base_commit_id: newCommit.id,
      })
      .eq('id', branchId)

    if (updateError) {
      console.error('Error updating branch:', updateError)
    }

    return NextResponse.json({ commit: newCommit }, { status: 201 })
  } catch (error) {
        const authError = handleAuthError(error)
    if (authError) return authError

    console.error('Error in POST /api/branches/commit:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/branches/commit?branchId={id} - Get commit history for a branch
export async function GET(request: Request) {
  try {
    const { user, supabase } = await requireAuth(request)
    await requireDefaultRateLimit(request, user.id)

    const { searchParams } = new URL(request.url)
    const branchId = searchParams.get('branchId')
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    if (!branchId) {
      return NextResponse.json({ error: 'branchId is required' }, { status: 400 })
    }

    // Verify user owns the branch
    const { data: branch, error: branchError } = await supabase
      .from('document_branches')
      .select('id')
      .eq('id', branchId)
      .eq('user_id', user.id)
      .single()

    if (branchError || !branch) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 })
    }

    // Get commit history
    const { data: commits, error: commitsError } = await supabase
      .from('branch_commits')
      .select('*')
      .eq('branch_id', branchId)
      .order('created_at', { ascending: false })
      .limit(Math.min(limit, 100))

    if (commitsError) {
      console.error('Error fetching commits:', commitsError)
      return NextResponse.json({ error: 'Failed to fetch commits' }, { status: 500 })
    }

    return NextResponse.json({ commits })
  } catch (error) {
        const authError = handleAuthError(error)
    if (authError) return authError

    console.error('Error in GET /api/branches/commit:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
