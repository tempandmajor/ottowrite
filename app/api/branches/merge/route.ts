/**
 * API endpoint for merging branches with conflict detection
 */

import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api/auth-helpers'
import { requireDefaultRateLimit } from '@/lib/api/rate-limit-helpers'
import { computeWordDiff, calculateDiffStats } from '@/lib/utils/text-diff'

export const dynamic = 'force-dynamic'

// Helper function to detect conflicts between two content objects
function detectConflicts(sourceContent: any, targetContent: any) {
  const conflicts: any[] = []
  let hasConflicts = false

  // For HTML content (novels, etc.)
  if (sourceContent?.html && targetContent?.html) {
    const diff = computeWordDiff(targetContent.html, sourceContent.html)
    const stats = calculateDiffStats(diff)

    if (stats.totalChanges > 0) {
      hasConflicts = true
      conflicts.push({
        type: 'html',
        field: 'html',
        sourceValue: sourceContent.html,
        targetValue: targetContent.html,
        stats,
      })
    }
  }

  // For screenplay content
  if (sourceContent?.screenplay && targetContent?.screenplay) {
    const sourceText = JSON.stringify(sourceContent.screenplay)
    const targetText = JSON.stringify(targetContent.screenplay)

    if (sourceText !== targetText) {
      hasConflicts = true
      conflicts.push({
        type: 'screenplay',
        field: 'screenplay',
        sourceValue: sourceContent.screenplay,
        targetValue: targetContent.screenplay,
      })
    }
  }

  return { hasConflicts, conflicts }
}

// POST /api/branches/merge - Merge source branch into target branch
export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireAuth(request)
    await requireDefaultRateLimit(request, user.id)

    const body = await request.json()
    const { sourceBranchId, targetBranchId, resolvedContent } = body

    if (!sourceBranchId || !targetBranchId) {
      return NextResponse.json(
        { error: 'sourceBranchId and targetBranchId are required' },
        { status: 400 }
      )
    }

    if (sourceBranchId === targetBranchId) {
      return NextResponse.json(
        { error: 'Cannot merge a branch into itself' },
        { status: 400 }
      )
    }

    // Get both branches
    const { data: sourceBranch, error: sourceError } = await supabase
      .from('document_branches')
      .select('*')
      .eq('id', sourceBranchId)
      .eq('user_id', user.id)
      .single()

    const { data: targetBranch, error: targetError } = await supabase
      .from('document_branches')
      .select('*')
      .eq('id', targetBranchId)
      .eq('user_id', user.id)
      .single()

    if (sourceError || !sourceBranch) {
      return NextResponse.json({ error: 'Source branch not found' }, { status: 404 })
    }

    if (targetError || !targetBranch) {
      return NextResponse.json({ error: 'Target branch not found' }, { status: 404 })
    }

    // Verify both branches belong to the same document
    if (sourceBranch.document_id !== targetBranch.document_id) {
      return NextResponse.json(
        { error: 'Branches must belong to the same document' },
        { status: 400 }
      )
    }

    // Detect conflicts
    const { hasConflicts, conflicts } = detectConflicts(
      sourceBranch.content,
      targetBranch.content
    )

    // If there are conflicts and no resolved content provided, return conflict info
    if (hasConflicts && !resolvedContent) {
      const { data: mergeRecord, error: mergeError } = await supabase
        .from('branch_merges')
        .insert({
          source_branch_id: sourceBranchId,
          target_branch_id: targetBranchId,
          source_commit_id: sourceBranch.base_commit_id,
          target_commit_id: targetBranch.base_commit_id,
          user_id: user.id,
          has_conflicts: true,
          conflicts_resolved: false,
          conflict_data: { conflicts },
        })
        .select()
        .single()

      if (mergeError) {
        console.error('Error creating merge record:', mergeError)
      }

      return NextResponse.json({
        hasConflicts: true,
        conflicts,
        mergeId: mergeRecord?.id,
        sourceBranch,
        targetBranch,
      })
    }

    // Determine final content (either resolved or source if no conflicts)
    const finalContent = resolvedContent || sourceBranch.content
    const finalWordCount = resolvedContent
      ? (await calculateWordCount(resolvedContent))
      : sourceBranch.word_count

    // Create merge commit on target branch
    const { data: mergeCommit, error: commitError } = await supabase
      .from('branch_commits')
      .insert({
        branch_id: targetBranchId,
        parent_commit_id: targetBranch.base_commit_id,
        user_id: user.id,
        message: `Merge ${sourceBranch.branch_name} into ${targetBranch.branch_name}`,
        content: finalContent,
        word_count: finalWordCount,
      })
      .select()
      .single()

    if (commitError) {
      console.error('Error creating merge commit:', commitError)
      return NextResponse.json({ error: 'Failed to create merge commit' }, { status: 500 })
    }

    // Update target branch with merged content
    const { error: updateError } = await supabase
      .from('document_branches')
      .update({
        content: finalContent,
        word_count: finalWordCount,
        base_commit_id: mergeCommit.id,
      })
      .eq('id', targetBranchId)

    if (updateError) {
      console.error('Error updating target branch:', updateError)
      return NextResponse.json({ error: 'Failed to update target branch' }, { status: 500 })
    }

    // Record the merge
    const { data: mergeRecord, error: mergeError } = await supabase
      .from('branch_merges')
      .insert({
        source_branch_id: sourceBranchId,
        target_branch_id: targetBranchId,
        source_commit_id: sourceBranch.base_commit_id,
        target_commit_id: targetBranch.base_commit_id,
        merge_commit_id: mergeCommit.id,
        user_id: user.id,
        has_conflicts: hasConflicts,
        conflicts_resolved: hasConflicts,
        conflict_data: hasConflicts ? { conflicts } : null,
      })
      .select()
      .single()

    if (mergeError) {
      console.error('Error recording merge:', mergeError)
    }

    return NextResponse.json({
      success: true,
      mergeCommit,
      mergeRecord,
      hasConflicts,
    })
  } catch (error) {
    console.error('Error in POST /api/branches/merge:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper function to calculate word count from content
async function calculateWordCount(content: any): Promise<number> {
  if (content?.html) {
    const text = content.html.replace(/<[^>]*>/g, ' ')
    return text.trim().split(/\s+/).filter((w: string) => w.length > 0).length
  }

  if (content?.screenplay) {
    const text = content.screenplay
      .map((el: any) => el?.content ?? el?.text ?? '')
      .join(' ')
    return text.trim().split(/\s+/).filter((w: string) => w.length > 0).length
  }

  return 0
}

// GET /api/branches/merge?documentId={id} - Get merge history for a document
export async function GET(request: Request) {
  try {
    const { user, supabase } = await requireAuth(request)
    await requireDefaultRateLimit(request, user.id)

    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')

    if (!documentId) {
      return NextResponse.json({ error: 'documentId is required' }, { status: 400 })
    }

    // Get all merges for branches of this document
    const { data: merges, error: mergesError } = await supabase
      .from('branch_merges')
      .select(`
        *,
        source_branch:document_branches!branch_merges_source_branch_id_fkey(branch_name),
        target_branch:document_branches!branch_merges_target_branch_id_fkey(branch_name)
      `)
      .eq('user_id', user.id)
      .order('merged_at', { ascending: false })

    if (mergesError) {
      console.error('Error fetching merges:', mergesError)
      return NextResponse.json({ error: 'Failed to fetch merge history' }, { status: 500 })
    }

    return NextResponse.json({ merges })
  } catch (error) {
    console.error('Error in GET /api/branches/merge:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
