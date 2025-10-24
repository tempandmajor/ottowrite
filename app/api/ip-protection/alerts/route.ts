/**
 * IP Protection Alerts API Endpoint
 *
 * GET: Returns security alerts for user submissions
 * Supports filtering by status and severity
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
    const filterStatus = searchParams.get('status')
    const filterSeverity = searchParams.get('severity')

    // Get user's submissions
    const { data: submissions } = await supabase
      .from('manuscript_submissions')
      .select('id, title')
      .eq('user_id', user.id)

    if (!submissions || submissions.length === 0) {
      return NextResponse.json({ alerts: [] })
    }

    const submissionIds = submissions.map((s) => s.id)
    const submissionTitles = Object.fromEntries(
      submissions.map((s) => [s.id, s.title])
    )

    // Build query for alerts
    let query = supabase
      .from('suspicious_activity_alerts')
      .select('*')
      .in('submission_id', submissionIds)
      .order('detected_at', { ascending: false })

    // Apply filters
    if (filterStatus && filterStatus !== 'all') {
      query = query.eq('status', filterStatus)
    }

    if (filterSeverity && filterSeverity !== 'all') {
      query = query.eq('severity', filterSeverity)
    }

    const { data: alerts, error: alertsError } = await query

    if (alertsError) {
      return errorResponses.internalError('Failed to fetch alerts', { details: alertsError })
    }

    // Get partner info for each alert
    const enrichedAlerts = await Promise.all(
      alerts.map(async (alert) => {
        // Get partner details
        let partnerName = 'Unknown Partner'
        let partnerEmail = ''

        if (alert.partner_id) {
          const { data: partner } = await supabase
            .from('submission_partners')
            .select('name, email')
            .eq('id', alert.partner_id)
            .single()

          if (partner) {
            partnerName = partner.name
            partnerEmail = partner.email
          }
        }

        return {
          id: alert.id,
          submissionId: alert.submission_id,
          submissionTitle: submissionTitles[alert.submission_id] || 'Unknown Submission',
          partnerName,
          partnerEmail,
          alertType: alert.alert_type,
          severity: alert.severity,
          description: alert.description,
          detectedAt: alert.detected_at,
          status: alert.status,
          metadata: alert.metadata || {},
        }
      })
    )

    return NextResponse.json({ alerts: enrichedAlerts })
  } catch (error) {
    console.error('Error fetching alerts:', error)
    return errorResponses.internalError(
      error instanceof Error ? error.message : 'Failed to fetch alerts',
      { details: error }
    )
  }
}
