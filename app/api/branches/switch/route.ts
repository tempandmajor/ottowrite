/**
 * API endpoint for switching active branch
 */

import { NextResponse } from 'next/server'
import {requireAuth, handleAuthError} from '@/lib/api/auth-helpers'
import { requireDefaultRateLimit } from '@/lib/api/rate-limit-helpers'

export const dynamic = 'force-dynamic'

// POST /api/branches/switch - Switch to a different branch
export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireAuth(request)
    await requireDefaultRateLimit(request, user.id)

    const body = await request.json()
    const { branchId, documentId } = body

    if (!branchId || !documentId) {
      return NextResponse.json(
        { error: 'branchId and documentId are required' },
        { status: 400 }
      )
    }

    // Verify user owns the branch
    const { data: branch, error: branchError } = await supabase
      .from('document_branches')
      .select('id, document_id, content')
      .eq('id', branchId)
      .eq('user_id', user.id)
      .eq('document_id', documentId)
      .single()

    if (branchError || !branch) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 })
    }

    // Deactivate all branches for this document
    const { error: deactivateError } = await supabase
      .from('document_branches')
      .update({ is_active: false })
      .eq('document_id', documentId)
      .eq('user_id', user.id)

    if (deactivateError) {
      console.error('Error deactivating branches:', deactivateError)
      return NextResponse.json({ error: 'Failed to switch branch' }, { status: 500 })
    }

    // Activate the target branch
    const { data: updatedBranch, error: activateError } = await supabase
      .from('document_branches')
      .update({ is_active: true })
      .eq('id', branchId)
      .select()
      .single()

    if (activateError) {
      console.error('Error activating branch:', activateError)
      return NextResponse.json({ error: 'Failed to switch branch' }, { status: 500 })
    }

    return NextResponse.json({ branch: updatedBranch })
  } catch (error) {
        const authError = handleAuthError(error)
    if (authError) return authError

    console.error('Error in POST /api/branches/switch:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
