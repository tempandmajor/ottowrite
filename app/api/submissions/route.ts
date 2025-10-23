/**
 * Manuscript Submissions API
 *
 * POST /api/submissions - Create a new manuscript submission (Studio-only)
 * GET /api/submissions - List user's manuscript submissions (Studio-only)
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponses, successResponse } from '@/lib/api/error-response'
import {
  canAccessSubmissions,
  SUBMISSION_ACCESS_MESSAGES,
  SUBMISSIONS_UPGRADE_URL,
} from '@/lib/submissions/access'

/**
 * GET /api/submissions
 * List user's manuscript submissions
 */
export async function GET() {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return errorResponses.unauthorized()
  }

  // Check Studio subscription
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('subscription_tier, subscription_status, subscription_current_period_end')
    .eq('id', user.id)
    .single()

  const accessResult = canAccessSubmissions(profile)

  if (!accessResult.hasAccess) {
    const message =
      accessResult.reason && SUBMISSION_ACCESS_MESSAGES[accessResult.reason]
        ? SUBMISSION_ACCESS_MESSAGES[accessResult.reason]
        : 'Access to manuscript submissions requires a Studio plan'

    return errorResponses.paymentRequired(message, {
      code: 'STUDIO_PLAN_REQUIRED',
      details: {
        feature: 'submissions',
        requiredPlan: accessResult.requiredTier,
        currentPlan: accessResult.currentTier,
        upgradeUrl: SUBMISSIONS_UPGRADE_URL,
        reason: accessResult.reason,
      },
      userId: user.id,
    })
  }

  // TODO: Implement fetching submissions from database
  // For now, return empty array as this is just the access control implementation
  return successResponse({
    submissions: [],
    count: 0,
  })
}

/**
 * POST /api/submissions
 * Create a new manuscript submission
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return errorResponses.unauthorized()
  }

  // Check Studio subscription
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('subscription_tier, subscription_status, subscription_current_period_end')
    .eq('id', user.id)
    .single()

  const accessResult = canAccessSubmissions(profile)

  if (!accessResult.hasAccess) {
    const message =
      accessResult.reason && SUBMISSION_ACCESS_MESSAGES[accessResult.reason]
        ? SUBMISSION_ACCESS_MESSAGES[accessResult.reason]
        : 'Access to manuscript submissions requires a Studio plan'

    return errorResponses.paymentRequired(message, {
      code: 'STUDIO_PLAN_REQUIRED',
      details: {
        feature: 'submissions',
        requiredPlan: accessResult.requiredTier,
        currentPlan: accessResult.currentTier,
        upgradeUrl: SUBMISSIONS_UPGRADE_URL,
        reason: accessResult.reason,
      },
      userId: user.id,
    })
  }

  // Parse request body
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.title || !body.genre || !body.word_count || !body.type) {
      return errorResponses.badRequest('Missing required fields', {
        details: {
          required: ['title', 'genre', 'word_count', 'type', 'query_letter', 'synopsis'],
        },
        userId: user.id,
      })
    }

    // Create submission (draft status by default)
    const { data: submission, error: insertError } = await supabase
      .from('manuscript_submissions')
      .insert({
        user_id: user.id,
        partner_id: body.partner_id || null, // Will be set during partner selection
        project_id: body.project_id || null,
        title: body.title,
        genre: body.genre,
        word_count: parseInt(body.word_count),
        type: body.type,
        query_letter: body.query_letter || '',
        synopsis: body.synopsis || '',
        author_bio: body.author_bio || null,
        sample_pages_count: body.sample_pages_count ? parseInt(body.sample_pages_count) : 0,
        sample_pages_content: body.sample_pages_content || null,
        status: body.status || 'draft',
        priority_review: profile?.subscription_tier === 'studio', // Auto-set for Studio users
      })
      .select()
      .single()

    if (insertError) {
      return errorResponses.internalError('Failed to create submission', {
        details: insertError,
        userId: user.id,
      })
    }

    return successResponse(
      {
        message: 'Submission created successfully',
        submission,
      },
      201
    )
  } catch (error) {
    return errorResponses.badRequest('Invalid request body', {
      details: error,
      userId: user.id,
    })
  }
}
