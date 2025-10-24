import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { checkAuthThrottle } from './lib/security/auth-throttle'
import { getOrGenerateRequestId, REQUEST_ID_HEADER } from './lib/request-id'
import { applyRateLimit, addRateLimitHeaders } from './lib/security/api-rate-limiter'
import { logRequest, startRequestTimer, shouldLogRequest } from './lib/middleware/request-logger'
import {
  validateSessionDetailed,
  generateSessionFingerprint,
  storeSessionMetadata,
  updateSessionActivity,
} from './lib/security/session-manager'
import { generateCSRFToken, CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from './lib/security/csrf'

/**
 * CORS Configuration Helper (PROD-011)
 * Checks if an origin is allowed to make requests to the API
 */
function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false

  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    'http://localhost:3000',
    'http://localhost:3001',
    'https://localhost:3000',
  ].filter((url): url is string => Boolean(url))

  return allowedOrigins.some(allowed =>
    allowed === origin || origin.endsWith(allowed.replace(/^https?:\/\//, ''))
  )
}

/**
 * Add CORS headers to response for API routes
 */
function addCORSHeaders(response: NextResponse, origin: string | null): void {
  if (isOriginAllowed(origin) && origin) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set('Vary', 'Origin')
  }
}

export async function middleware(request: NextRequest) {
  // Start request timer for logging
  const startTime = startRequestTimer()

  // Generate or extract request ID for tracing
  const requestId = getOrGenerateRequestId(request)

  // ===== CORS Configuration (PROD-011) =====
  // Handle CORS for API routes to allow legitimate requests while blocking unauthorized origins
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin')

    // Handle preflight OPTIONS requests
    if (request.method === 'OPTIONS') {
      const allowed = isOriginAllowed(origin)
      return new NextResponse(null, {
        status: 204, // No Content
        headers: {
          'Access-Control-Allow-Origin': allowed && origin ? origin : '',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID, X-CSRF-Token',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Max-Age': '86400', // 24 hours
          'Vary': 'Origin',
          [REQUEST_ID_HEADER]: requestId,
        },
      })
    }
  }

  // Apply authentication throttling to auth routes (legacy, now handled by API rate limiter)
  if (request.nextUrl.pathname.startsWith('/auth/')) {
    const throttle = checkAuthThrottle(request)
    if (!throttle.allowed) {
      return NextResponse.json(
        {
          error: 'Too many authentication attempts. Please try again later.',
          retryAfter: throttle.retryAfter || 60,
          requestId,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(throttle.retryAfter || 60),
            [REQUEST_ID_HEADER]: requestId,
          },
        }
      )
    }
  }

  // Apply global API rate limiting
  // Note: userId is not available yet at middleware level, so we use IP-based limiting
  // Individual routes can apply additional user-specific rate limiting
  const rateLimitResponse = await applyRateLimit(request)
  if (rateLimitResponse) {
    // Add request ID to rate limit response
    rateLimitResponse.headers.set(REQUEST_ID_HEADER, requestId)
    return rateLimitResponse
  }
  let supabaseResponse = NextResponse.next({
    request: {
      headers: new Headers(request.headers),
    },
  })

  // Add request ID to response headers for debugging
  supabaseResponse.headers.set(REQUEST_ID_HEADER, requestId)

  // Add security headers
  supabaseResponse.headers.set('X-Content-Type-Options', 'nosniff')
  supabaseResponse.headers.set('X-Frame-Options', 'DENY')
  supabaseResponse.headers.set('X-XSS-Protection', '1; mode=block')
  supabaseResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  supabaseResponse.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  )

  // Add Strict-Transport-Security in production
  if (process.env.NODE_ENV === 'production') {
    supabaseResponse.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    )
  }

  // Clone request headers and add request ID for downstream handlers
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set(REQUEST_ID_HEADER, requestId)

  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL)?.trim()
  const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY)?.trim()

  // If Supabase env vars are not configured, just pass through
  // Auth will be handled by the server component layout
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Middleware: Supabase env vars not configured, skipping session refresh')
    return supabaseResponse
  }

  try {
    const isProduction = process.env.NODE_ENV === 'production'
    const cookieDomain = process.env.SUPABASE_COOKIE_DOMAIN?.trim() || undefined
    const baseCookieOptions = {
      path: '/',
      sameSite: 'lax' as const,
      secure: isProduction,
      maxAge: 60 * 60 * 24 * 14,
      domain: cookieDomain,
    }

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          supabaseResponse = NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          })
          // Preserve request ID header
          supabaseResponse.headers.set(REQUEST_ID_HEADER, requestId)
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, {
              ...baseCookieOptions,
              ...options,
            })
          )
        },
      },
      cookieOptions: baseCookieOptions,
    })

    // Just refresh the session, don't do auth checks
    // Auth checks are now handled by the server component layout
    const { data: { user } } = await supabase.auth.getUser()

    // Generate and set CSRF token for authenticated users
    if (user) {
      const csrfToken = generateCSRFToken()
      supabaseResponse.cookies.set(CSRF_COOKIE_NAME, csrfToken, {
        ...baseCookieOptions,
        httpOnly: true,
      })
      supabaseResponse.headers.set(CSRF_HEADER_NAME, csrfToken)

      // ✅ FIX (SEC-003): Validate and store session fingerprint for security
      const fingerprint = generateSessionFingerprint(request)
      const validationResult = await validateSessionDetailed(user.id, fingerprint)

      if (!validationResult.valid) {
        if (validationResult.needsStorage && validationResult.reason === 'no_fingerprint') {
          // First-time session - store fingerprint for future validation
          await storeSessionMetadata(user.id, request)
          console.log(`Stored session fingerprint for user ${user.id}`)
        } else {
          // Suspicious activity - fingerprint mismatch or session expired
          console.warn(`Session validation failed for user ${user.id}`, {
            reason: validationResult.reason,
            ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
            userAgent: request.headers.get('user-agent'),
          })
          // Log suspicious activity but don't block yet - just warn
          // In production, you might want to force re-authentication for fingerprint_mismatch
        }
      } else {
        // Valid session - update last_seen_at to track activity
        await updateSessionActivity(user.id, fingerprint)
      }
    }

    // Add rate limit headers to response
    supabaseResponse = addRateLimitHeaders(supabaseResponse, request, user?.id)

    // Log request/response for monitoring and debugging
    if (shouldLogRequest(request)) {
      logRequest(request, supabaseResponse, startTime, user?.id)
    }
  } catch (error) {
    console.error('Middleware: Error refreshing session:', error)
    // Don't throw - let the request continue to the server component
    // which will handle auth properly

    // Still log the request even if session refresh failed
    if (shouldLogRequest(request)) {
      logRequest(request, supabaseResponse, startTime)
    }
  }

  // Add CORS headers to API routes (PROD-011)
  if (request.nextUrl.pathname.startsWith('/api/')) {
    addCORSHeaders(supabaseResponse, request.headers.get('origin'))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - images and assets
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
