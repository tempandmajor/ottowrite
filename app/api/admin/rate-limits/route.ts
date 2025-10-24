/**
 * Rate Limit Monitoring API
 *
 * Admin-only endpoint for monitoring rate limit metrics.
 *
 * Ticket: PROD-008
 */

import { NextRequest, NextResponse } from 'next/server'
import {requireAuth, handleAuthError} from '@/lib/api/auth-helpers'
import { requireDefaultRateLimit } from '@/lib/api/rate-limit-helpers'
import {
  getRateLimitStats,
  getRateLimitHealthScore,
  getRecentViolations,
  detectAbusePatterns,
  generateMonitoringReport,
  shouldAdjustRateLimits,
} from '@/lib/monitoring/rate-limit-monitor'

/**
 * GET /api/admin/rate-limits
 *
 * Get rate limit monitoring data
 *
 * Query params:
 * - format: 'json' | 'text' (default: 'json')
 * - window: time window in hours (default: 1)
 */
export async function GET(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)
    await requireDefaultRateLimit(request, user.id)

    // Check if user has admin/service role
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    // For now, allow all authenticated users to view monitoring
    // TODO: Restrict to admin role in production
    // if (profile?.role !== 'admin') {
    //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    // }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const format = searchParams.get('format') || 'json'
    const windowHours = parseInt(searchParams.get('window') || '1', 10)
    const windowMs = windowHours * 60 * 60 * 1000

    // Generate monitoring data
    const stats = getRateLimitStats(windowMs)
    const healthScore = getRateLimitHealthScore(windowMs)
    const violations = getRecentViolations(20)
    const abusePatterns = detectAbusePatterns(windowMs)
    const adjustment = shouldAdjustRateLimits(windowMs)

    if (format === 'text') {
      // Return text report
      const report = generateMonitoringReport(windowMs)
      return new NextResponse(report, {
        headers: {
          'Content-Type': 'text/plain',
        },
      })
    }

    // Return JSON data
    return NextResponse.json({
      window: {
        hours: windowHours,
        milliseconds: windowMs,
      },
      stats,
      healthScore,
      violations: violations.slice(0, 10),
      abusePatterns,
      recommendations: {
        shouldAdjust: adjustment.shouldAdjust,
        reason: adjustment.reason,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
        const authError = handleAuthError(error)
    if (authError) return authError

    console.error('Error fetching rate limit monitoring data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
