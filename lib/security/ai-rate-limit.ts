/**
 * AI Endpoint Rate Limiting
 *
 * Provides rate limiting specifically for AI generation endpoints
 * to prevent abuse and control costs
 */

import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, getClientIdentifier, RateLimits } from './rate-limiter'
import { createClient } from '@/lib/supabase/server'

export interface AIRateLimitResult {
  allowed: boolean
  userId?: string
  retryAfter?: number
  remaining: number
}

/**
 * Check AI generation rate limit
 *
 * Uses user ID if authenticated, otherwise falls back to IP address
 * More strict limits for expensive AI operations
 *
 * @param request - The Next.js request object
 * @param expensive - Whether this is an expensive operation (lower limit)
 * @returns Rate limit result
 */
export async function checkAIRateLimit(
  request: NextRequest,
  expensive: boolean = false
): Promise<AIRateLimitResult> {
  try {
    // Get user ID from Supabase session
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const userId = user?.id
    const identifier = getClientIdentifier(request, userId)

    // Choose rate limit based on operation cost
    const config = expensive ? RateLimits.AI_EXPENSIVE : RateLimits.AI_GENERATE

    const result = rateLimit(identifier, config)

    return {
      allowed: result.allowed,
      userId,
      retryAfter: result.retryAfter,
      remaining: result.remaining,
    }
  } catch (error) {
    // If auth check fails, still apply rate limiting by IP
    console.error('AI rate limit check error:', error)
    const identifier = getClientIdentifier(request)
    const config = expensive ? RateLimits.AI_EXPENSIVE : RateLimits.AI_GENERATE
    const result = rateLimit(identifier, config)

    return {
      allowed: result.allowed,
      retryAfter: result.retryAfter,
      remaining: result.remaining,
    }
  }
}

/**
 * Create a rate limit exceeded response for AI endpoints
 */
export function createAIRateLimitResponse(
  retryAfter: number = 60,
  message?: string
): NextResponse {
  return NextResponse.json(
    {
      error: message || 'AI generation rate limit exceeded. Please wait before trying again.',
      retryAfter,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Reset': new Date(Date.now() + retryAfter * 1000).toISOString(),
      },
    }
  )
}

/**
 * Middleware wrapper for AI endpoints
 *
 * Usage:
 * ```ts
 * export async function POST(request: NextRequest) {
 *   const rateLimitCheck = await checkAIRateLimit(request)
 *   if (!rateLimitCheck.allowed) {
 *     return createAIRateLimitResponse(rateLimitCheck.retryAfter)
 *   }
 *   // ... rest of handler
 * }
 * ```
 */
export async function withAIRateLimit<T>(
  request: NextRequest,
  handler: (request: NextRequest, userId?: string) => Promise<T>,
  expensive: boolean = false
): Promise<T | NextResponse> {
  const rateLimitCheck = await checkAIRateLimit(request, expensive)

  if (!rateLimitCheck.allowed) {
    return createAIRateLimitResponse(
      rateLimitCheck.retryAfter,
      expensive
        ? 'Rate limit exceeded for this expensive AI operation. Please wait before trying again.'
        : undefined
    )
  }

  return handler(request, rateLimitCheck.userId)
}
