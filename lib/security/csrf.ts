/**
 * CSRF (Cross-Site Request Forgery) Protection
 *
 * Implements double-submit cookie pattern for CSRF protection:
 * 1. Generate a random token
 * 2. Store in httpOnly cookie
 * 3. Also send in response header
 * 4. Client must send token in custom header
 * 5. Server verifies cookie matches header
 */

import { NextRequest, NextResponse } from 'next/server'
import { createHash, randomBytes } from 'crypto'

export const CSRF_COOKIE_NAME = 'csrf_token'
export const CSRF_HEADER_NAME = 'x-csrf-token'
const TOKEN_LENGTH = 32
const TOKEN_MAX_AGE = 60 * 60 * 24 // 24 hours

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCSRFToken(): string {
  return randomBytes(TOKEN_LENGTH).toString('base64url')
}

/**
 * Create a hash of the token for double-submit cookie pattern
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('base64url')
}

/**
 * Set CSRF token in response cookies and headers
 */
export function setCSRFToken(response: NextResponse): string {
  const token = generateCSRFToken()
  const isProduction = process.env.NODE_ENV === 'production'

  // Set token in httpOnly cookie
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    maxAge: TOKEN_MAX_AGE,
  })

  // Also set in response header for client to read
  response.headers.set(CSRF_HEADER_NAME, token)

  return token
}

/**
 * Verify CSRF token from request
 */
export function verifyCSRFToken(request: NextRequest): {
  valid: boolean
  reason?: string
} {
  // GET, HEAD, OPTIONS are safe methods - no CSRF check needed
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return { valid: true }
  }

  // Get token from cookie
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value

  // Get token from header
  const headerToken = request.headers.get(CSRF_HEADER_NAME)

  // Both must be present
  if (!cookieToken || !headerToken) {
    return {
      valid: false,
      reason: 'Missing CSRF token in cookie or header',
    }
  }

  // Tokens must match
  if (cookieToken !== headerToken) {
    return {
      valid: false,
      reason: 'CSRF token mismatch',
    }
  }

  return { valid: true }
}

/**
 * Middleware to enforce CSRF protection on state-changing requests
 */
export function enforceCSRF(request: NextRequest): NextResponse | null {
  // Skip CSRF for API routes that use other auth (like webhooks with signatures)
  const pathname = request.nextUrl.pathname
  if (pathname.startsWith('/api/webhooks/')) {
    return null // Skip CSRF check for webhooks
  }

  // Only enforce on state-changing methods
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    return null // No enforcement needed
  }

  const verification = verifyCSRFToken(request)

  if (!verification.valid) {
    return NextResponse.json(
      {
        error: 'CSRF token validation failed',
        reason: verification.reason,
      },
      { status: 403 }
    )
  }

  return null // CSRF check passed
}

/**
 * Rotate CSRF token (should be called after login or privilege escalation)
 */
export function rotateCSRFToken(response: NextResponse): string {
  return setCSRFToken(response)
}

/**
 * Clear CSRF token (should be called on logout)
 */
export function clearCSRFToken(response: NextResponse): void {
  response.cookies.delete(CSRF_COOKIE_NAME)
}

/**
 * Get CSRF token from request for client-side usage
 */
export function getCSRFToken(request: NextRequest): string | undefined {
  return request.cookies.get(CSRF_COOKIE_NAME)?.value
}
