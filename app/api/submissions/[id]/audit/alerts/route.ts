/**
 * Submission Audit Alerts API
 *
 * GET /api/submissions/[id]/audit/alerts - Get suspicious activity alerts
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponses, successResponse } from '@/lib/api/error-response'
import { getSuspiciousActivityAlerts, type AlertStatus } from '@/lib/submissions/audit-trail'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

/**
 * GET /api/submissions/[id]/audit/alerts
 * Get suspicious activity alerts for a submission
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
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') as AlertStatus | null

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

    // Get alerts
    const result = await getSuspiciousActivityAlerts(submissionId, status || undefined)

    if (!result.success) {
      return errorResponses.internalError('Failed to fetch alerts', {
        details: result.error,
      })
    }

    return successResponse({
      alerts: result.alerts || [],
      total: result.alerts?.length || 0,
    })
  } catch (error) {
    console.error('Error fetching alerts:', error)
    return errorResponses.internalError('An unexpected error occurred')
  }
}
