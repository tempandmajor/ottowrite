/**
 * API Route Security Helpers
 *
 * Utilities for protecting API routes with CSRF validation and session checks
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyCSRFToken } from './csrf'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Validate CSRF token for state-changing requests
 * Should be used on all POST, PUT, PATCH, DELETE requests
 */
export async function validateCSRF(request: NextRequest): Promise<boolean> {
  // Only validate state-changing methods
  const method = request.method.toUpperCase()
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return true // GET, HEAD, OPTIONS don't need CSRF validation
  }

  const result = verifyCSRFToken(request)
  return result.valid
}

/**
 * Get authenticated user from server-side request
 * Returns null if not authenticated
 */
export async function getAuthenticatedUser(_request?: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

  if (!supabaseUrl || !supabaseAnonKey) {
    return null
  }

  const cookieStore = await cookies()

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        )
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

/**
 * API route wrapper that enforces authentication and CSRF protection
 */
export function withAuth(
  handler: (request: NextRequest, context: { userId: string }) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    // Validate CSRF for state-changing requests
    const isValidCSRF = await validateCSRF(request)
    if (!isValidCSRF) {
      return NextResponse.json(
        { error: 'Invalid CSRF token' },
        { status: 403 }
      )
    }

    // Check authentication
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Call the handler with user context
    return handler(request, { userId: user.id })
  }
}

/**
 * API route wrapper that optionally checks auth (allows anonymous)
 * but still validates CSRF for state-changing requests
 */
export function withOptionalAuth(
  handler: (
    request: NextRequest,
    context: { userId: string | null }
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    // Validate CSRF for state-changing requests
    const isValidCSRF = await validateCSRF(request)
    if (!isValidCSRF) {
      return NextResponse.json(
        { error: 'Invalid CSRF token' },
        { status: 403 }
      )
    }

    // Get user if authenticated
    const user = await getAuthenticatedUser(request)

    // Call the handler with optional user context
    return handler(request, { userId: user?.id || null })
  }
}
