/**
 * API endpoint for switching active branch
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// POST /api/branches/switch - Switch to a different branch
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
    console.error('Error in POST /api/branches/switch:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
