/**
 * API endpoints for document branch operations
 * Handles creating, listing, and managing document branches
 */

import { NextResponse } from 'next/server'
import {requireAuth, handleAuthError} from '@/lib/api/auth-helpers'
import { requireDefaultRateLimit } from '@/lib/api/rate-limit-helpers'

export const dynamic = 'force-dynamic'

// GET /api/branches?documentId={id} - List all branches for a document
export async function GET(request: Request) {
  try {
    const { user, supabase } = await requireAuth(request)
    await requireDefaultRateLimit(request, user.id)

    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')

    if (!documentId) {
      return NextResponse.json({ error: 'documentId is required' }, { status: 400 })
    }

    // Verify user owns the document
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single()

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Get all branches for the document
    const { data: branches, error: branchesError } = await supabase
      .from('document_branches')
      .select('*')
      .eq('document_id', documentId)
      .order('created_at', { ascending: true })

    if (branchesError) {
      console.error('Error fetching branches:', branchesError)
      return NextResponse.json({ error: 'Failed to fetch branches' }, { status: 500 })
    }

    return NextResponse.json({ branches })
  } catch (error) {
        const authError = handleAuthError(error)
    if (authError) return authError

    console.error('Error in GET /api/branches:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/branches - Create a new branch
export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireAuth(request)
    await requireDefaultRateLimit(request, user.id)

    const body = await request.json()
    const { documentId, branchName, fromBranchId } = body

    if (!documentId || !branchName) {
      return NextResponse.json(
        { error: 'documentId and branchName are required' },
        { status: 400 }
      )
    }

    // Validate branch name format
    const branchNameRegex = /^[a-zA-Z0-9_-]+$/
    if (!branchNameRegex.test(branchName) || branchName.length < 1 || branchName.length > 100) {
      return NextResponse.json(
        { error: 'Branch name must be alphanumeric with dashes/underscores, 1-100 characters' },
        { status: 400 }
      )
    }

    // Verify user owns the document
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, content, word_count')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single()

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Get source branch content (either specified branch or main branch)
    let sourceContent = document.content
    let sourceWordCount = document.word_count
    let parentBranchId = null

    if (fromBranchId) {
      const { data: sourceBranch, error: sourceBranchError } = await supabase
        .from('document_branches')
        .select('id, content, word_count')
        .eq('id', fromBranchId)
        .eq('document_id', documentId)
        .eq('user_id', user.id)
        .single()

      if (sourceBranchError || !sourceBranch) {
        return NextResponse.json({ error: 'Source branch not found' }, { status: 404 })
      }

      sourceContent = sourceBranch.content
      sourceWordCount = sourceBranch.word_count
      parentBranchId = sourceBranch.id
    }

    // Create the new branch
    const { data: newBranch, error: createError } = await supabase
      .from('document_branches')
      .insert({
        document_id: documentId,
        user_id: user.id,
        branch_name: branchName,
        parent_branch_id: parentBranchId,
        content: sourceContent,
        word_count: sourceWordCount,
        is_main: false,
        is_active: false,
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating branch:', createError)
      if (createError.code === '23505') {
        return NextResponse.json(
          { error: 'A branch with this name already exists' },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: 'Failed to create branch' }, { status: 500 })
    }

    return NextResponse.json({ branch: newBranch }, { status: 201 })
  } catch (error) {
        const authError = handleAuthError(error)
    if (authError) return authError

    console.error('Error in POST /api/branches:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/branches?branchId={id} - Delete a branch
export async function DELETE(request: Request) {
  try {
    const { user, supabase } = await requireAuth(request)
    await requireDefaultRateLimit(request, user.id)

    const { searchParams } = new URL(request.url)
    const branchId = searchParams.get('branchId')

    if (!branchId) {
      return NextResponse.json({ error: 'branchId is required' }, { status: 400 })
    }

    // Verify branch exists and user owns it
    const { data: branch, error: branchError } = await supabase
      .from('document_branches')
      .select('id, is_main')
      .eq('id', branchId)
      .eq('user_id', user.id)
      .single()

    if (branchError || !branch) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 })
    }

    // Prevent deletion of main branch
    if (branch.is_main) {
      return NextResponse.json(
        { error: 'Cannot delete the main branch' },
        { status: 400 }
      )
    }

    // Delete the branch
    const { error: deleteError } = await supabase
      .from('document_branches')
      .delete()
      .eq('id', branchId)

    if (deleteError) {
      console.error('Error deleting branch:', deleteError)
      return NextResponse.json({ error: 'Failed to delete branch' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
        const authError = handleAuthError(error)
    if (authError) return authError

    console.error('Error in DELETE /api/branches:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
