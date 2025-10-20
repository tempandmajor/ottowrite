import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { checkAuthThrottle } from './lib/security/auth-throttle'
import { getOrGenerateRequestId, REQUEST_ID_HEADER } from './lib/request-id'
import { applyRateLimit, addRateLimitHeaders } from './lib/security/api-rate-limiter'

export async function middleware(request: NextRequest) {
  // Generate or extract request ID for tracing
  const requestId = getOrGenerateRequestId(request)

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

    // Add rate limit headers to response
    supabaseResponse = addRateLimitHeaders(supabaseResponse, request, user?.id)
  } catch (error) {
    console.error('Middleware: Error refreshing session:', error)
    // Don't throw - let the request continue to the server component
    // which will handle auth properly
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
