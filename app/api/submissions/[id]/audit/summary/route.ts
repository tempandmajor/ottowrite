/**
 * Submission Audit Summary API
 *
 * GET /api/submissions/[id]/audit/summary - Get access summary statistics
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponses, successResponse } from '@/lib/api/error-response'
import { getAccessSummary } from '@/lib/submissions/audit-trail'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

/**
 * GET /api/submissions/[id]/audit/summary
 * Get access summary statistics for a submission
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return errorResponses.unauthorized()
    }

    const { id: submissionId } = await params

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

    // Get access summary
    const result = await getAccessSummary(submissionId)

    if (!result.success) {
      return errorResponses.internalError('Failed to fetch access summary', {
        details: result.error,
      })
    }

    return successResponse({
      summary: result.summary,
    })
  } catch (error) {
    console.error('Error fetching access summary:', error)
    return errorResponses.internalError('An unexpected error occurred')
  }
}
