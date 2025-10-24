/**
 * API Rate Limiter
 *
 * Comprehensive rate limiting for all API endpoints.
 * Applied at the middleware level for consistent enforcement.
 */

import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, getRateLimitStatus, getClientIdentifier, RateLimitConfig } from './rate-limiter'
import { logger } from '../monitoring/structured-logger'

/**
 * Rate limit configurations for different endpoint types
 */
export const APIRateLimits = {
  // Write operations (POST, PUT, PATCH, DELETE)
  WRITE: {
    max: 100,
    windowMs: 60 * 60 * 1000, // 100 requests per hour
    message: 'Write operation rate limit exceeded. Please wait before making more changes.',
  },

  // Read operations (GET)
  READ: {
    max: 1000,
    windowMs: 60 * 60 * 1000, // 1000 requests per hour
    message: 'Read operation rate limit exceeded. Please slow down your requests.',
  },

  // AI operations (already more restrictive)
  AI: {
    max: 50,
    windowMs: 60 * 60 * 1000, // 50 requests per hour
    message: 'AI operation rate limit exceeded. Please wait before making more AI requests.',
  },

  // Authentication operations
  AUTH: {
    max: 20,
    windowMs: 60 * 60 * 1000, // 20 requests per hour
    message: 'Authentication rate limit exceeded. Please wait before trying again.',
  },

  // Webhook operations (external services)
  WEBHOOK: {
    max: 1000,
    windowMs: 60 * 60 * 1000, // 1000 requests per hour (external services need high limit)
    message: 'Webhook rate limit exceeded.',
  },
} as const

/**
 * Determine which rate limit to apply based on the request
 */
export function getRateLimitForRequest(request: NextRequest): RateLimitConfig | null {
  const { pathname, method } = parseRequest(request)

  // Skip rate limiting for health checks
  if (pathname.startsWith('/api/health')) {
    return null
  }

  // Webhooks (external services, higher limits)
  if (pathname.startsWith('/api/webhooks/')) {
    return APIRateLimits.WEBHOOK
  }

  // AI endpoints (most restrictive)
  if (pathname.startsWith('/api/ai/')) {
    return APIRateLimits.AI
  }

  // Authentication endpoints
  if (pathname.startsWith('/api/auth/') || pathname.startsWith('/auth/')) {
    return APIRateLimits.AUTH
  }

  // API endpoints
  if (pathname.startsWith('/api/')) {
    // Write operations
    if (method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE') {
      return APIRateLimits.WRITE
    }

    // Read operations
    if (method === 'GET') {
      return APIRateLimits.READ
    }
  }

  // No rate limiting for other routes
  return null
}

/**
 * Apply rate limiting to a request
 * Returns NextResponse with 429 if rate limit exceeded, null otherwise
 */
export async function applyRateLimit(
  request: NextRequest,
  userId?: string
): Promise<NextResponse | null> {
  const config = getRateLimitForRequest(request)

  // No rate limiting needed
  if (!config) {
    return null
  }

  const identifier = getClientIdentifier(request, userId)
  const result = rateLimit(identifier, config)

  // Log rate limit check (only if close to limit or exceeded)
  if (!result.allowed || result.remaining < 10) {
    logger.warn('Rate limit check', {
      operation: 'rate_limit:check',
      identifier: userId ? `user:${userId.substring(0, 8)}...` : identifier.substring(0, 20),
      allowed: result.allowed,
      remaining: result.remaining,
      path: request.nextUrl.pathname,
      method: request.method,
    })
  }

  // Rate limit not exceeded
  if (result.allowed) {
    return null
  }

  // Rate limit exceeded - return 429
  logger.warn('Rate limit exceeded', {
    operation: 'rate_limit:exceeded',
    identifier: userId ? `user:${userId.substring(0, 8)}...` : identifier.substring(0, 20),
    path: request.nextUrl.pathname,
    method: request.method,
    retryAfter: result.retryAfter,
  })

  return NextResponse.json(
    {
      error: {
        message: config.message || 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        details: {
          retryAfter: result.retryAfter,
          resetAt: new Date(result.resetAt).toISOString(),
        },
      },
    },
    {
      status: 429,
      headers: createRateLimitHeaders(result, config),
    }
  )
}

/**
 * Add rate limit headers to a response
 * These headers inform clients about their rate limit status
 *
 * IMPORTANT: Uses getRateLimitStatus() which is read-only and does NOT consume tokens.
 * This prevents the double-decrement bug where every request consumed 2 tokens.
 */
export function addRateLimitHeaders(
  response: NextResponse,
  request: NextRequest,
  userId?: string
): NextResponse {
  const config = getRateLimitForRequest(request)

  if (!config) {
    return response
  }

  const identifier = getClientIdentifier(request, userId)
  // ✅ FIX: Use read-only status check - does NOT consume tokens
  const status = getRateLimitStatus(identifier, config)

  // Add rate limit headers with current status
  const headers = createRateLimitHeaders(status, config)
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  return response
}

/**
 * Create rate limit headers for a response
 */
function createRateLimitHeaders(
  result: { remaining: number; resetAt: number; retryAfter?: number },
  config: RateLimitConfig
): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(config.max),
    'X-RateLimit-Remaining': String(Math.max(0, result.remaining)),
    'X-RateLimit-Reset': String(Math.floor(result.resetAt / 1000)), // Unix timestamp in seconds
  }

  if (result.retryAfter) {
    headers['Retry-After'] = String(result.retryAfter) // Seconds
  }

  return headers
}

/**
 * Parse request information
 */
function parseRequest(request: NextRequest): { pathname: string; method: string } {
  return {
    pathname: request.nextUrl.pathname,
    method: request.method || 'GET',
  }
}

// getRateLimitStatus is imported from rate-limiter.ts and re-exported
// No need to redefine it here - use the imported version which is read-only
