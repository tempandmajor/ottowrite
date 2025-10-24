/**
 * Manuscript Submissions API
 *
 * POST /api/submissions - Create a new manuscript submission (Studio-only)
 * GET /api/submissions - List user's manuscript submissions (Studio-only)
 */

import { NextRequest } from 'next/server'
import { errorResponses, successResponse } from '@/lib/api/error-response'
import {requireAuth, handleAuthError} from '@/lib/api/auth-helpers'
import { requireDefaultRateLimit } from '@/lib/api/rate-limit-helpers'
import { z } from 'zod'
import {
  canAccessSubmissions,
  SUBMISSION_ACCESS_MESSAGES,
  SUBMISSIONS_UPGRADE_URL,
} from '@/lib/submissions/access'

// Validation schema for submission creation
const createSubmissionSchema = z.object({
  partner_id: z.string().uuid().optional(),
  project_id: z.string().uuid().optional(),
  title: z.string().min(1).max(500),
  genre: z.string().min(1).max(100),
  word_count: z.number().int().min(1).max(1000000),
  type: z.enum(['novel', 'novella', 'short_story', 'memoir', 'non_fiction']),
  query_letter: z.string().max(10000).optional(),
  synopsis: z.string().max(10000).optional(),
  author_bio: z.string().max(5000).optional(),
  sample_pages_count: z.number().int().min(0).max(100).optional(),
  sample_pages_content: z.string().max(100000).optional(),
  status: z.enum(['draft', 'active', 'paused', 'closed']).optional(),
})

/**
 * GET /api/submissions
 * List user's manuscript submissions
 */
export async function GET(request: Request) {
  const { user, supabase } = await requireAuth(request)

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
  const { user, supabase } = await requireAuth(request)
  await requireDefaultRateLimit(request, user.id)

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

  // Parse and validate request body
  try {
    const body = await request.json()

    const validation = createSubmissionSchema.safeParse(body)
    if (!validation.success) {
      return errorResponses.validationError('Invalid submission data', {
        details: validation.error.issues,
      })
    }

    const data = validation.data

    // Create submission (draft status by default)
    const { data: submission, error: insertError } = await supabase
      .from('manuscript_submissions')
      .insert({
        user_id: user.id,
        partner_id: data.partner_id || null,
        project_id: data.project_id || null,
        title: data.title,
        genre: data.genre,
        word_count: data.word_count,
        type: data.type,
        query_letter: data.query_letter || '',
        synopsis: data.synopsis || '',
        author_bio: data.author_bio || null,
        sample_pages_count: data.sample_pages_count || 0,
        sample_pages_content: data.sample_pages_content || null,
        status: data.status || 'draft',
        priority_review: profile?.subscription_tier === 'studio',
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
        const authError = handleAuthError(error)
    if (authError) return authError

    return errorResponses.badRequest('Invalid request body', {
      details: error,
      userId: user.id,
    })
  }
}
