import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponses, successResponse } from '@/lib/api/error-response'
import { requireAuth } from '@/lib/api/auth-helpers'
import { requireDefaultRateLimit } from '@/lib/api/rate-limit-helpers'
import { logger } from '@/lib/monitoring/structured-logger'

export const dynamic = 'force-dynamic'

// GET - List issues for an analysis
export async function GET(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)
  await requireDefaultRateLimit(request, user.id)

    const { searchParams } = new URL(request.url)
    const analysisId = searchParams.get('analysis_id')
    const severity = searchParams.get('severity')
    const category = searchParams.get('category')
    const resolved = searchParams.get('resolved')

    if (!analysisId) {
      return errorResponses.badRequest('Analysis ID required', { userId: user.id })
    }

    let query = supabase
      .from('plot_issues')
      .select('*')
      .eq('analysis_id', analysisId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (severity) {
      query = query.eq('severity', severity)
    }

    if (category) {
      query = query.eq('category', category)
    }

    if (resolved !== null) {
      query = query.eq('is_resolved', resolved === 'true')
    }

    const { data, error } = await query

    if (error) {
      logger.error('Error fetching plot issues', {
        userId: user.id,
        analysisId,
        operation: 'plot_issues:fetch',
      }, error)
      return errorResponses.internalError('Failed to fetch issues', {
        details: error,
        userId: user.id,
      })
    }

    const severityPriority: Record<string, number> = {
      critical: 1,
      major: 2,
      minor: 3,
      suggestion: 4,
    }

    const sorted = (data || []).sort((a: any, b: any) => {
      const aRank = severityPriority[a.severity] ?? 5
      const bRank = severityPriority[b.severity] ?? 5
      if (aRank !== bRank) return aRank - bRank
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
      return aTime - bTime
    })

    return successResponse(sorted)
  } catch (error) {
    logger.error('Error in GET /api/plot-analysis/issues', {
      operation: 'plot_issues:get',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to fetch issues', { details: error })
  }
}

// PATCH - Update issue (mark resolved, add notes)
export async function PATCH(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)

    const body = await request.json()
    const { id, is_resolved, resolution_notes } = body

    if (!id) {
      return errorResponses.badRequest('Issue ID required', { userId: user.id })
    }

    const updates: any = {}

    if (typeof is_resolved === 'boolean') {
      updates.is_resolved = is_resolved
      if (is_resolved) {
        updates.resolved_at = new Date().toISOString()
      } else {
        updates.resolved_at = null
        updates.resolution_notes = null
      }
    }

    if (resolution_notes !== undefined) {
      updates.resolution_notes = resolution_notes
    }

    const { data, error } = await supabase
      .from('plot_issues')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      logger.error('Error updating plot issue', {
        userId: user.id,
        issueId: id,
        operation: 'plot_issues:update',
      }, error)
      return errorResponses.internalError('Failed to update issue', {
        details: error,
        userId: user.id,
      })
    }

    return successResponse(data)
  } catch (error) {
    logger.error('Error in PATCH /api/plot-analysis/issues', {
      operation: 'plot_issues:patch',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to update issue', { details: error })
  }
}

// DELETE - Delete individual issue
export async function DELETE(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return errorResponses.badRequest('Issue ID required', { userId: user.id })
    }

    const { error } = await supabase
      .from('plot_issues')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      logger.error('Error deleting plot issue', {
        userId: user.id,
        issueId: id,
        operation: 'plot_issues:delete',
      }, error)
      return errorResponses.internalError('Failed to delete issue', {
        details: error,
        userId: user.id,
      })
    }

    return successResponse({ success: true })
  } catch (error) {
    logger.error('Error in DELETE /api/plot-analysis/issues', {
      operation: 'plot_issues:delete',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to delete issue', { details: error })
  }
}
