/**
 * Submission Partners API
 *
 * GET /api/submissions/partners - List available submission partners
 * Supports filtering by genre, type, verification status
 * Studio-only feature
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponses, successResponse } from '@/lib/api/error-response'
import {
  canAccessSubmissions,
  SUBMISSION_ACCESS_MESSAGES,
  SUBMISSIONS_UPGRADE_URL,
} from '@/lib/submissions/access'

/**
 * GET /api/submissions/partners
 * List submission partners with optional filtering
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return errorResponses.unauthorized()
  }

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

  // Parse query parameters
  const searchParams = request.nextUrl.searchParams
  const genre = searchParams.get('genre')
  const type = searchParams.get('type') // agent, publisher, manager
  const verifiedOnly = searchParams.get('verified') === 'true'
  const acceptingOnly = searchParams.get('accepting') === 'true'
  const aarOnly = searchParams.get('aar') === 'true'
  const search = searchParams.get('search') // search by name or company
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  try {
    // Build query
    let query = supabase
      .from('submission_partners')
      .select('*', { count: 'exact' })
      .eq('status', 'active') // Only show active partners

    // Apply filters
    if (genre) {
      query = query.contains('genres', [genre])
    }

    if (type) {
      query = query.eq('type', type)
    }

    if (verifiedOnly) {
      query = query.eq('verified', true)
    }

    if (acceptingOnly) {
      query = query.eq('accepting_submissions', true)
    }

    if (aarOnly) {
      query = query.eq('aar_member', true)
    }

    if (search) {
      // Search by name or company
      query = query.or(`name.ilike.%${search}%,company.ilike.%${search}%`)
    }

    // Apply pagination and ordering
    query = query
      .order('verified', { ascending: false }) // Verified first
      .order('acceptance_rate', { ascending: false, nullsFirst: false }) // Higher acceptance rate first
      .order('name', { ascending: true }) // Alphabetical
      .range(offset, offset + limit - 1)

    const { data: partners, error, count } = await query

    if (error) {
      return errorResponses.internalError('Failed to fetch partners', {
        details: error,
        userId: user.id,
      })
    }

    return successResponse({
      partners: partners || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
      filters: {
        genre,
        type,
        verifiedOnly,
        acceptingOnly,
        aarOnly,
        search,
      },
    })
  } catch (error) {
    return errorResponses.internalError('Failed to fetch partners', {
      details: error,
      userId: user.id,
    })
  }
}
