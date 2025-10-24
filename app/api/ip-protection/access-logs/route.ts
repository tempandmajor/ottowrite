/**
 * IP Protection Access Logs API Endpoint
 *
 * Returns detailed access logs for user submissions with:
 * - Pagination support
 * - Action filtering
 * - Partner information
 *
 * Ticket: MS-3.4
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponses } from '@/lib/api/error-response'
import { requireAuth } from '@/lib/api/auth-helpers'

export async function GET(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const filterAction = searchParams.get('action')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    // Get user's submissions
    const { data: submissions } = await supabase
      .from('manuscript_submissions')
      .select('id, title')
      .eq('user_id', user.id)

    if (!submissions || submissions.length === 0) {
      return NextResponse.json({ logs: [], hasMore: false })
    }

    const submissionIds = submissions.map((s) => s.id)
    const submissionTitles = Object.fromEntries(
      submissions.map((s) => [s.id, s.title])
    )

    // Build query for access logs
    let query = supabase
      .from('manuscript_access_logs')
      .select('*', { count: 'exact' })
      .in('submission_id', submissionIds)
      .order('accessed_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply action filter
    if (filterAction && filterAction !== 'all') {
      query = query.eq('action', filterAction)
    }

    const { data: logs, error: logsError, count } = await query

    if (logsError) {
      return errorResponses.internalError('Failed to fetch access logs', { details: logsError })
    }

    // Format logs
    const formattedLogs = logs.map((log) => ({
      id: log.id,
      submissionTitle: submissionTitles[log.submission_id] || 'Unknown Submission',
      partnerName: log.partner_name || 'Unknown Partner',
      partnerEmail: log.partner_email || '',
      action: log.action,
      accessedAt: log.accessed_at,
      ipAddress: log.ip_address,
      locationCountry: log.location_country,
      sessionDuration: log.session_duration_seconds,
      accessGranted: log.access_granted,
    }))

    const hasMore = count ? offset + limit < count : false

    return NextResponse.json({
      logs: formattedLogs,
      hasMore,
      total: count || 0,
    })
  } catch (error) {
    console.error('Error fetching access logs:', error)
    return errorResponses.internalError(
      error instanceof Error ? error.message : 'Failed to fetch access logs',
      { details: error }
    )
  }
}
