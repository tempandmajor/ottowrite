/**
 * Projects API Route
 *
 * Handles project creation with quota enforcement
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkProjectQuota } from '@/lib/account/quota'
import { errorResponses } from '@/lib/api/error-response'
import { requireAuth } from '@/lib/api/auth-helpers'
import { requireDefaultRateLimit } from '@/lib/api/rate-limit-helpers'

export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireAuth(request)
  await requireDefaultRateLimit(request, user.id)

    // Get user profile with subscription info
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return errorResponses.internalError('Failed to fetch user profile')
    }

    const tier = profile.subscription_tier || 'free'

    // Check project quota
    const quotaCheck = await checkProjectQuota(supabase, user.id, tier)

    if (!quotaCheck.allowed) {
      return errorResponses.paymentRequired(
        `You've reached your plan's limit of ${quotaCheck.limit} projects. Upgrade to create more projects.`,
        {
          code: 'PROJECT_LIMIT_EXCEEDED',
          details: {
            used: quotaCheck.used,
            limit: quotaCheck.limit,
            currentTier: tier,
            upgradeUrl: '/pricing',
          },
        }
      )
    }

    // Parse request body
    const body = await request.json()
    const { name, type, genre, description, folder_id } = body

    // Validate required fields
    if (!name || !type) {
      return errorResponses.badRequest('Missing required fields: name and type')
    }

    // Normalize genre to array (database expects TEXT[])
    // Accepts: string, string[], null, undefined
    // Returns: string[] | null
    const normalizedGenre = genre
      ? Array.isArray(genre)
        ? genre.filter((g: string) => g && g.trim().length > 0)
        : [genre].filter((g) => g && g.trim().length > 0)
      : null

    // Create project
    const { data: project, error: createError } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name,
        type,
        genre: normalizedGenre && normalizedGenre.length > 0 ? normalizedGenre : null,
        description: description || null,
        folder_id: folder_id || null,
      })
      .select('id, name, type, genre, description, folder_id, created_at, updated_at')
      .single()

    if (createError) {
      console.error('Project creation error:', createError)
      return errorResponses.internalError('Failed to create project')
    }

    // Refresh usage stats (non-blocking)
    try {
      await supabase.rpc('refresh_user_plan_usage', { p_user_id: user.id })
    } catch (refreshError) {
      console.warn('refresh_user_plan_usage failed after project insert', refreshError)
    }

    return NextResponse.json(
      {
        project,
        quota: {
          used: quotaCheck.used + 1,
          limit: quotaCheck.limit,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Unexpected error in POST /api/projects:', error)
    return errorResponses.internalError()
  }
}
