/**
 * IP Protection Overview API Endpoint
 *
 * Returns security overview data for all user submissions:
 * - Submission security status
 * - Aggregated statistics
 * - DRM and watermark status
 *
 * Ticket: MS-3.4
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponses } from '@/lib/api/error-response'
import { requireAuth } from '@/lib/api/auth-helpers'

export async function GET(request: Request) {
  try {
    const { user, supabase } = await requireAuth(request)

    // Get all submissions for the user
    const { data: submissions, error: submissionsError } = await supabase
      .from('manuscript_submissions')
      .select('id, title, status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (submissionsError) {
      return errorResponses.internalError('Failed to fetch submissions', { details: submissionsError })
    }

    // Get access summary for each submission
    const submissionSecurityData = await Promise.all(
      submissions.map(async (submission) => {
        // Get access summary
        const { data: accessSummary } = await supabase
          .from('manuscript_access_summary')
          .select('*')
          .eq('submission_id', submission.id)
          .single()

        // Get alert count
        const { count: alertCount } = await supabase
          .from('suspicious_activity_alerts')
          .select('*', { count: 'exact', head: true })
          .eq('submission_id', submission.id)
          .in('status', ['new', 'investigating', 'confirmed'])

        // Get partner submissions to check DRM/watermark
        const { data: partnerSubmissions } = await supabase
          .from('partner_submissions')
          .select('watermark_data')
          .eq('submission_id', submission.id)
          .limit(1)

        const hasDrm = true // DRM is applied via API endpoints
        const hasWatermark = partnerSubmissions && partnerSubmissions.length > 0 &&
          partnerSubmissions[0].watermark_data !== null

        return {
          id: submission.id,
          title: submission.title,
          status: submission.status,
          totalAccesses: accessSummary?.total_accesses || 0,
          uniquePartners: accessSummary?.unique_partners || 0,
          uniqueIps: accessSummary?.unique_ips || 0,
          alertCount: alertCount || 0,
          lastAccessed: accessSummary?.last_accessed || null,
          hasDrm,
          hasWatermark,
        }
      })
    )

    // Calculate overall statistics
    const stats = {
      totalSubmissions: submissions.length,
      activeSubmissions: submissions.filter((s) => s.status === 'active').length,
      totalAccesses: submissionSecurityData.reduce((sum, s) => sum + s.totalAccesses, 0),
      totalAlerts: submissionSecurityData.reduce((sum, s) => sum + s.alertCount, 0),
      protectedSubmissions: submissionSecurityData.filter((s) => s.hasDrm).length,
    }

    return NextResponse.json({
      submissions: submissionSecurityData,
      stats,
    })
  } catch (error) {
    console.error('Error fetching IP protection overview:', error)
    return errorResponses.internalError(
      error instanceof Error ? error.message : 'Failed to fetch overview data',
      { details: error }
    )
  }
}
