/**
 * API Rate Limiting Middleware
 *
 * Enforces daily rate limits for API endpoints:
 * - Professional: 50 requests/day
 * - Studio: 1000 requests/day
 * - Free/Hobbyist: No API access
 *
 * Returns 429 Too Many Requests when limit exceeded
 * Includes X-RateLimit-* headers in all responses
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkAPIRateLimit } from '@/lib/account/quota'
import { canAccessFeature } from '@/lib/stripe/config'
import { isSubscriptionActive } from '@/lib/stripe/config'
import { errorResponses } from '@/lib/api/error-response'

export interface RateLimitResult {
  allowed: boolean
  used: number
  limit: number
  remaining?: number
  resetAt: string | null
}

export interface RateLimitContext {
  userId: string
  tier: string
  rateLimit: RateLimitResult
  startTime: number
}

/**
 * Check API rate limit and return context if allowed
 * Returns NextResponse with error if not allowed
 */
export async function checkRateLimit(): Promise<
  { response: NextResponse; context?: never } | { response?: never; context: RateLimitContext }
> {
  const startTime = Date.now()
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { response: await errorResponses.unauthorized('API authentication required') }
  }

  // Get user profile with subscription info
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('subscription_tier, subscription_status, subscription_current_period_end')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return { response: await errorResponses.internalError('Failed to fetch user profile') }
  }

  const tier = (profile.subscription_tier || 'free') as 'free' | 'hobbyist' | 'professional' | 'studio'

  // Check if subscription is active
  if (!isSubscriptionActive(profile)) {
    return {
      response: await errorResponses.paymentRequired(
        'Your subscription is not active. Please update your subscription to use the API.',
        {
          code: 'SUBSCRIPTION_INACTIVE',
        }
      ),
    }
  }

  // Check if user has API access
  if (!canAccessFeature(tier, 'apiAccess')) {
    return {
      response: await errorResponses.forbidden(
        'API access requires Professional or Studio plan. Upgrade to use the API.',
        {
          code: 'API_ACCESS_REQUIRED',
          details: {
            currentTier: tier,
            requiredTiers: ['professional', 'studio'],
            upgradeUrl: '/pricing',
          },
        }
      ),
    }
  }

  // Check rate limit
  const rateLimit = await checkAPIRateLimit(supabase, user.id, tier)

  if (!rateLimit.allowed) {
    const response = await errorResponses.tooManyRequests(
      `Rate limit exceeded. You have used ${rateLimit.used} of ${rateLimit.limit} daily API requests. Limit resets at ${rateLimit.resetAt}.`,
      undefined,
      {
        code: 'RATE_LIMIT_EXCEEDED',
        details: {
          used: rateLimit.used,
          limit: rateLimit.limit,
          resetAt: rateLimit.resetAt,
          currentTier: tier,
        },
      }
    )

    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', String(rateLimit.limit))
    response.headers.set('X-RateLimit-Remaining', '0')
    response.headers.set('X-RateLimit-Reset', rateLimit.resetAt || '')

    return { response }
  }

  // Rate limit check passed
  return {
    context: {
      userId: user.id,
      tier,
      rateLimit,
      startTime,
    },
  }
}

/**
 * Add rate limit headers to a response
 */
export function addRateLimitHeaders(response: NextResponse, rateLimit: RateLimitResult): NextResponse {
  response.headers.set('X-RateLimit-Limit', String(rateLimit.limit))
  response.headers.set('X-RateLimit-Remaining', String(rateLimit.remaining ?? 0))
  if (rateLimit.resetAt) {
    response.headers.set('X-RateLimit-Reset', rateLimit.resetAt)
  }
  return response
}

/**
 * Log API request after completion
 */
export async function logAPIRequest(
  context: RateLimitContext,
  endpoint: string,
  method: string,
  statusCode: number
): Promise<void> {
  const responseTime = Date.now() - context.startTime
  const supabase = await createClient()

  try {
    await supabase.rpc('log_api_request', {
      p_user_id: context.userId,
      p_endpoint: endpoint,
      p_method: method,
      p_status_code: statusCode,
      p_response_time_ms: responseTime,
      p_api_key_id: null, // Future: support API keys
    })
  } catch (error) {
    console.error('Failed to log API request:', error)
    // Don't throw - logging failure shouldn't break the API
  }
}
