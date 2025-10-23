/**
 * Generate Query Letter API
 *
 * POST /api/submissions/generate-query-letter
 * Generates a professional query letter using AI based on manuscript details
 * Studio-only feature
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponses, successResponse } from '@/lib/api/error-response'
import {
  canAccessSubmissions,
  SUBMISSION_ACCESS_MESSAGES,
  SUBMISSIONS_UPGRADE_URL,
} from '@/lib/submissions/access'
import {
  generateQueryLetter,
  validateQueryLetterRequest,
  type QueryLetterGenerationRequest,
} from '@/lib/submissions/query-letter-generator'

export const maxDuration = 60 // Allow up to 60 seconds for AI generation

/**
 * POST /api/submissions/generate-query-letter
 * Generate a professional query letter using AI
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
    .select('subscription_tier, subscription_status')
    .eq('id', user.id)
    .single()

  const accessResult = canAccessSubmissions(profile)

  if (!accessResult.hasAccess) {
    const message =
      accessResult.reason && SUBMISSION_ACCESS_MESSAGES[accessResult.reason]
        ? SUBMISSION_ACCESS_MESSAGES[accessResult.reason]
        : 'Access to AI query letter generation requires a Studio plan'

    return errorResponses.paymentRequired(message, {
      code: 'STUDIO_PLAN_REQUIRED',
      details: {
        feature: 'ai_query_letter_generation',
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

    // Validate request
    const validation = validateQueryLetterRequest(body)
    if (!validation.valid) {
      return errorResponses.badRequest('Invalid request data', {
        details: {
          errors: validation.errors,
        },
        userId: user.id,
      })
    }

    const generationRequest: QueryLetterGenerationRequest = {
      title: body.title,
      genre: body.genre,
      wordCount: parseInt(body.wordCount),
      manuscriptType: body.manuscriptType,
      synopsis: body.synopsis,
      authorName: body.authorName,
      previousPublications: body.previousPublications,
      targetAgent: body.targetAgent,
      model: body.model || 'claude-sonnet-4.5',
    }

    // Generate query letter
    const result = await generateQueryLetter(generationRequest)

    // Log AI usage for analytics (optional - can be added to database)
    // TODO: Track AI usage in ai_usage_logs table

    return successResponse(
      {
        message: 'Query letter generated successfully',
        queryLetter: result.queryLetter,
        usage: {
          inputTokens: result.aiResponse.usage.inputTokens,
          outputTokens: result.aiResponse.usage.outputTokens,
          totalCost: result.aiResponse.usage.totalCost,
          model: result.aiResponse.model,
        },
      },
      200
    )
  } catch (error) {
    // Handle AI generation errors
    if (error instanceof Error) {
      return errorResponses.internalError('Failed to generate query letter', {
        details: {
          error: error.message,
        },
        userId: user.id,
      })
    }

    return errorResponses.internalError('Failed to generate query letter', {
      userId: user.id,
    })
  }
}
