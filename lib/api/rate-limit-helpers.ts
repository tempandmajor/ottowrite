/**
 * Rate Limiting Helpers for API Routes
 *
 * Provides easy-to-use rate limiting for different endpoint types.
 *
 * Usage:
 *   import { requireAIRateLimit, requireResourceRateLimit } from '@/lib/api/rate-limit-helpers'
 *
 *   export async function POST(request: Request) {
 *     await requireAIRateLimit(request, user.id)
 *     // Proceed if rate limit not exceeded
 *   }
 */

import { applyRateLimit } from '@/lib/security/api-rate-limiter'
import { getClientIP } from '@/lib/security/rate-limiter'
import { errorResponses } from './error-response'

/**
 * Rate limit tiers with different limits
 */
export const RateLimitTiers = {
  // Default tier: 100 requests per minute
  DEFAULT: {
    tier: 'default' as const,
    limit: 100,
    window: '1m',
    description: 'Standard API operations',
  },

  // AI tier: 10 requests per minute
  AI: {
    tier: 'ai' as const,
    limit: 10,
    window: '1m',
    description: 'AI generation endpoints',
  },

  // Expensive tier: 5 requests per minute
  EXPENSIVE: {
    tier: 'expensive' as const,
    limit: 5,
    window: '1m',
    description: 'Resource-intensive operations',
  },

  // Auth tier: 20 requests per 15 minutes
  AUTH: {
    tier: 'auth' as const,
    limit: 20,
    window: '15m',
    description: 'Authentication endpoints',
  },
} as const

/**
 * Require rate limit check for AI endpoints
 *
 * Throws 429 error if rate limit exceeded.
 *
 * @param request - Next.js request object
 * @param userId - User ID (optional, uses IP if not provided)
 *
 * @example
 * export async function POST(request: Request) {
 *   const { user } = await requireAuth(request)
 *   await requireAIRateLimit(request, user.id)
 *   // Proceed with AI generation
 * }
 */
export async function requireAIRateLimit(
  request: Request,
  userId?: string
): Promise<void> {
  const identifier = userId || getClientIP(request as any)

  const result = await applyRateLimit(request as any, identifier, {
    tier: RateLimitTiers.AI.tier,
    identifier,
  })

  if (!result.context) {
    throw result.response
  }
}

/**
 * Require rate limit check for expensive/resource-intensive endpoints
 *
 * @example
 * export async function POST(request: Request) {
 *   const { user } = await requireAuth(request)
 *   await requireResourceRateLimit(request, user.id)
 *   // Proceed with expensive operation
 * }
 */
export async function requireResourceRateLimit(
  request: Request,
  userId?: string
): Promise<void> {
  const identifier = userId || getClientIP(request as any)

  const result = await applyRateLimit(request as any, identifier, {
    tier: RateLimitTiers.EXPENSIVE.tier,
    identifier,
  })

  if (!result.context) {
    throw result.response
  }
}

/**
 * Require rate limit check for default endpoints
 *
 * @example
 * export async function POST(request: Request) {
 *   const { user } = await requireAuth(request)
 *   await requireDefaultRateLimit(request, user.id)
 *   // Proceed with operation
 * }
 */
export async function requireDefaultRateLimit(
  request: Request,
  userId?: string
): Promise<void> {
  const identifier = userId || getClientIP(request as any)

  const result = await applyRateLimit(request as any, identifier, {
    tier: RateLimitTiers.DEFAULT.tier,
    identifier,
  })

  if (!result.context) {
    throw result.response
  }
}

/**
 * Require rate limit check for authentication endpoints
 *
 * @example
 * export async function POST(request: Request) {
 *   await requireAuthRateLimit(request)
 *   // Proceed with login/signup
 * }
 */
export async function requireAuthRateLimit(request: Request): Promise<void> {
  const identifier = getClientIP(request as any)

  const result = await applyRateLimit(request as any, identifier, {
    tier: RateLimitTiers.AUTH.tier,
    identifier,
  })

  if (!result.context) {
    throw result.response
  }
}

/**
 * Check rate limit without throwing (returns boolean)
 *
 * Use when you want to handle rate limiting differently than throwing an error.
 *
 * @returns true if within limit, false if exceeded
 *
 * @example
 * const allowed = await checkAIRateLimit(request, user.id)
 * if (!allowed) {
 *   return NextResponse.json({
 *     error: 'Rate limit exceeded',
 *     retryAfter: 60
 *   }, { status: 429 })
 * }
 */
export async function checkAIRateLimit(
  request: Request,
  userId?: string
): Promise<boolean> {
  const identifier = userId || getClientIP(request as any)

  const result = await applyRateLimit(request as any, identifier, {
    tier: RateLimitTiers.AI.tier,
    identifier,
  })

  return !!result.context
}

/**
 * Check resource rate limit without throwing
 */
export async function checkResourceRateLimit(
  request: Request,
  userId?: string
): Promise<boolean> {
  const identifier = userId || getClientIP(request as any)

  const result = await applyRateLimit(request as any, identifier, {
    tier: RateLimitTiers.EXPENSIVE.tier,
    identifier,
  })

  return !!result.context
}

/**
 * Apply rate limit with custom configuration
 *
 * For endpoints that need custom rate limiting rules.
 *
 * @param request - Request object
 * @param userId - User ID
 * @param config - Custom rate limit configuration
 *
 * @example
 * await requireCustomRateLimit(request, user.id, {
 *   tier: 'default',
 *   maxRequests: 50,
 *   windowMs: 60000, // 1 minute
 * })
 */
export async function requireCustomRateLimit(
  request: Request,
  userId: string | undefined,
  config: {
    tier: 'default' | 'ai' | 'expensive' | 'auth'
    maxRequests?: number
    windowMs?: number
  }
): Promise<void> {
  const identifier = userId || getClientIP(request as any)

  const result = await applyRateLimit(request as any, identifier, {
    tier: config.tier,
    identifier,
  })

  if (!result.context) {
    throw result.response
  }
}

/**
 * Get rate limit tier for endpoint type
 *
 * Helper to determine which rate limit tier to use.
 *
 * @param endpointType - Type of endpoint
 * @returns Rate limit tier configuration
 *
 * @example
 * const tier = getRateLimitTier('ai')
 * console.log(`AI endpoints limited to ${tier.limit} requests per ${tier.window}`)
 */
export function getRateLimitTier(
  endpointType: 'default' | 'ai' | 'expensive' | 'auth'
) {
  switch (endpointType) {
    case 'ai':
      return RateLimitTiers.AI
    case 'expensive':
      return RateLimitTiers.EXPENSIVE
    case 'auth':
      return RateLimitTiers.AUTH
    default:
      return RateLimitTiers.DEFAULT
  }
}
