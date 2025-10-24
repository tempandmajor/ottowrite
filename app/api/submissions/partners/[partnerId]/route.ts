/**
 * Individual Submission Partner API
 *
 * GET /api/submissions/partners/[partnerId] - Get detailed partner information
 * Studio-only feature
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponses, successResponse } from '@/lib/api/error-response'
import { requireAuth } from '@/lib/api/auth-helpers'
import {
  canAccessSubmissions,
  SUBMISSION_ACCESS_MESSAGES,
  SUBMISSIONS_UPGRADE_URL,
} from '@/lib/submissions/access'

interface RouteParams {
  params: Promise<{
    partnerId: string
  }>
}

/**
 * GET /api/submissions/partners/[partnerId]
 * Get detailed information about a specific partner
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { partnerId } = await params
  const { user, supabase } = await requireAuth(request)

  // Check Studio subscription
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('subscription_tier, subscription_status, subscription_current_period_end')
    .eq('id', user.id)
    .single()

  const accessResult = canAccessSubmissions(profile)

  if (!accessResult.hasAccess) {
    const message =
      accessResult.reason && SUBMISSION_ACCESS_MESSAGES[accessResult.reason]
        ? SUBMISSION_ACCESS_MESSAGES[accessResult.reason]
        : 'Access to submission partners requires a Studio plan'

    return errorResponses.paymentRequired(message, {
      code: 'STUDIO_PLAN_REQUIRED',
      details: {
        feature: 'submission_partners',
        requiredPlan: accessResult.requiredTier,
        currentPlan: accessResult.currentTier,
        upgradeUrl: SUBMISSIONS_UPGRADE_URL,
        reason: accessResult.reason,
      },
      userId: user.id,
    })
  }

  try {
    // Fetch partner details
    const { data: partner, error } = await supabase
      .from('submission_partners')
      .select('*')
      .eq('id', partnerId)
      .single()

    if (error || !partner) {
      return errorResponses.notFound('Partner not found')
    }

    // Only show active partners (unless it's inactive but user has history with them)
    if (partner.status !== 'active') {
      // Check if user has any submissions to this partner
      const { data: hasSubmissions } = await supabase
        .from('partner_submissions')
        .select('id')
        .eq('user_id', user.id)
        .eq('partner_id', partnerId)
        .limit(1)
        .single()

      if (!hasSubmissions) {
        return errorResponses.notFound('Partner not found')
      }
    }

    // Get recent notable sales/deals (if available)
    const { data: recentSales } = await supabase
      .from('partner_sales')
      .select('*')
      .eq('partner_id', partnerId)
      .order('sale_date', { ascending: false })
      .limit(5)

    // Get submission statistics for this partner
    const { data: stats } = await supabase
      .from('partner_submission_stats')
      .select('*')
      .eq('partner_id', partnerId)
      .single()

    return successResponse({
      partner,
      recentSales: recentSales || [],
      stats: stats || null,
    })
  } catch (error) {
    return errorResponses.internalError('Failed to fetch partner details', {
      details: error,
      userId: user.id,
    })
  }
}
