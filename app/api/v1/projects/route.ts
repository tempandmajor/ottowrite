/**
 * API v1 - Projects Endpoint
 *
 * Sample API endpoint demonstrating rate limiting.
 * Professional: 50 requests/day, Studio: 1000 requests/day
 *
 * Returns user's projects with rate limit headers.
 */

import { NextResponse } from 'next/server'
import { errorResponses } from '@/lib/api/error-response'
import {requireAuth, handleAuthError} from '@/lib/api/auth-helpers'
import { requireDefaultRateLimit } from '@/lib/api/rate-limit-helpers'

export async function GET(request: Request) {
  try {
    const { user, supabase } = await requireAuth(request)
    await requireDefaultRateLimit(request, user.id)

    // Get user's projects
    const { data: projects, error } = await supabase
      .from('projects')
      .select('id, name, type, genre, description, created_at, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('Failed to fetch projects:', error)
      return errorResponses.internalError('Failed to fetch projects')
    }

    // Create success response
    return NextResponse.json({
      data: projects,
      meta: {
        count: projects?.length ?? 0,
      },
    })
  } catch (error) {
        const authError = handleAuthError(error)
    if (authError) return authError

    console.error('Unexpected error in GET /api/v1/projects:', error)
    return errorResponses.internalError()
  }
}
