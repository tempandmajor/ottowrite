/**
 * Authentication Throttling Middleware
 *
 * Prevents brute force attacks on authentication endpoints
 * Uses the rate limiter to track failed login attempts
 */

import { rateLimit, RateLimits, getClientIdentifier } from './rate-limiter'
import { NextRequest, NextResponse } from 'next/server'

interface ThrottleResult {
  allowed: boolean
  retryAfter?: number
  remaining: number
}

/**
 * Check if authentication request should be throttled
 *
 * @param request - The Next.js request object
 * @param identifier - Optional custom identifier (email, username)
 * @returns Throttle result with allowed status
 */
export function checkAuthThrottle(
  request: NextRequest,
  identifier?: string
): ThrottleResult {
  // Use email/username if provided, otherwise fall back to IP
  const clientId = identifier || getClientIdentifier(request)
  const result = rateLimit(`auth:${clientId}`, RateLimits.AUTH_LOGIN)

  return {
    allowed: result.allowed,
    retryAfter: result.retryAfter,
    remaining: result.remaining,
  }
}

/**
 * Check if password reset request should be throttled
 *
 * @param request - The Next.js request object
 * @param email - The email address requesting password reset
 * @returns Throttle result with allowed status
 */
export function checkPasswordResetThrottle(
  request: NextRequest,
  email: string
): ThrottleResult {
  const result = rateLimit(`password-reset:${email}`, RateLimits.AUTH_PASSWORD_RESET)

  return {
    allowed: result.allowed,
    retryAfter: result.retryAfter,
    remaining: result.remaining,
  }
}

/**
 * Middleware to add auth throttling headers
 *
 * Call this after a failed login attempt to record it
 */
export function recordFailedAuthAttempt(request: NextRequest, identifier?: string): void {
  const clientId = identifier || getClientIdentifier(request)
  rateLimit(`auth-failed:${clientId}`, {
    max: 10, // Allow 10 failed attempts
    windowMs: 15 * 60 * 1000, // Within 15 minutes
  })
}

/**
 * Enhanced auth throttle that blocks after repeated failures
 *
 * This is more strict than the basic throttle - it completely blocks
 * after too many failed attempts
 */
export function checkFailedAuthAttempts(
  request: NextRequest,
  identifier?: string
): ThrottleResult {
  const clientId = identifier || getClientIdentifier(request)
  const result = rateLimit(`auth-failed:${clientId}`, {
    max: 10,
    windowMs: 15 * 60 * 1000,
  })

  return {
    allowed: result.allowed,
    retryAfter: result.retryAfter,
    remaining: result.remaining,
  }
}

/**
 * Response helper for throttled auth requests
 */
export function createThrottleResponse(
  message: string = 'Too many authentication attempts. Please try again later.',
  retryAfter: number = 60
): NextResponse {
  return NextResponse.json(
    {
      error: message,
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
