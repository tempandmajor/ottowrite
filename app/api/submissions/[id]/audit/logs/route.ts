/**
 * Submission Audit Logs API
 *
 * GET /api/submissions/[id]/audit/logs - Get access logs
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponses, successResponse } from '@/lib/api/error-response'
import {requireAuth, handleAuthError} from '@/lib/api/auth-helpers'
import { getAccessHistory } from '@/lib/submissions/audit-trail'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

/**
 * GET /api/submissions/[id]/audit/logs
 * Get access logs for a submission
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, supabase } = await requireAuth(request)

    const { id: submissionId } = await params
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    // Verify the submission belongs to this user
    const { data: submission } = await supabase
      .from('manuscript_submissions')
      .select('id, user_id')
      .eq('id', submissionId)
      .eq('user_id', user.id)
      .single()

    if (!submission) {
      return errorResponses.notFound('Submission not found')
    }

    // Get access history
    const result = await getAccessHistory(submissionId, limit)

    if (!result.success) {
      return errorResponses.internalError('Failed to fetch access logs', {
        details: result.error,
      })
    }

    return successResponse({
      logs: result.logs || [],
      total: result.logs?.length || 0,
    })
  } catch (error) {
        const authError = handleAuthError(error)
    if (authError) return authError

    console.error('Error fetching access logs:', error)
    return errorResponses.internalError('An unexpected error occurred')
  }
}
