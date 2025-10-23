/**
 * API v1 - Projects Endpoint
 *
 * Sample API endpoint demonstrating rate limiting.
 * Professional: 50 requests/day, Studio: 1000 requests/day
 *
 * Returns user's projects with rate limit headers.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, addRateLimitHeaders, logAPIRequest } from '@/lib/api/rate-limit'
import { errorResponses } from '@/lib/api/error-response'

export async function GET(request: Request) {
  // Check rate limit
  const rateLimitCheck = await checkRateLimit()
  if (rateLimitCheck.response) {
    // Rate limit exceeded or other error
    return rateLimitCheck.response
  }

  const { context } = rateLimitCheck
  const supabase = await createClient()

  try {
    // Get user's projects
    const { data: projects, error } = await supabase
      .from('projects')
      .select('id, name, type, genre, description, created_at, updated_at')
      .eq('user_id', context.userId)
      .order('updated_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('Failed to fetch projects:', error)
      const errorResponse = await errorResponses.internalError('Failed to fetch projects')

      // Log the request
      await logAPIRequest(context, '/api/v1/projects', 'GET', 500)

      return addRateLimitHeaders(errorResponse, context.rateLimit)
    }

    // Create success response
    const response = NextResponse.json({
      data: projects,
      meta: {
        count: projects?.length ?? 0,
        tier: context.tier,
      },
    })

    // Log the request
    await logAPIRequest(context, '/api/v1/projects', 'GET', 200)

    // Add rate limit headers
    return addRateLimitHeaders(response, context.rateLimit)
  } catch (error) {
    console.error('Unexpected error in GET /api/v1/projects:', error)
    const errorResponse = await errorResponses.internalError()

    // Log the request
    await logAPIRequest(context, '/api/v1/projects', 'GET', 500)

    return addRateLimitHeaders(errorResponse, context.rateLimit)
  }
}
