/**
 * Generate Synopsis API
 *
 * POST /api/submissions/generate-synopsis
 * Generates a professional synopsis using AI based on story description
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
  generateSynopsis,
  validateSynopsisRequest,
  validateSynopsisOutput,
  estimateWordCount,
  type SynopsisGenerationRequest,
} from '@/lib/submissions/synopsis-generator'

export const maxDuration = 60 // Allow up to 60 seconds for AI generation

/**
 * POST /api/submissions/generate-synopsis
 * Generate a professional synopsis using AI
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
        : 'Access to AI synopsis generation requires a Studio plan'

    return errorResponses.paymentRequired(message, {
      code: 'STUDIO_PLAN_REQUIRED',
      details: {
        feature: 'ai_synopsis_generation',
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
    const validation = validateSynopsisRequest(body)
    if (!validation.valid) {
      return errorResponses.badRequest('Invalid request data', {
        details: {
          errors: validation.errors,
        },
        userId: user.id,
      })
    }

    const generationRequest: SynopsisGenerationRequest = {
      title: body.title,
      genre: body.genre,
      wordCount: parseInt(body.wordCount),
      manuscriptType: body.manuscriptType,
      storyDescription: body.storyDescription,
      targetLength: body.targetLength || 'medium',
      includeSubplots: body.includeSubplots !== false, // Default true
      model: body.model || 'claude-sonnet-4.5',
    }

    // Generate synopsis
    const result = await generateSynopsis(generationRequest)

    // Validate output quality
    const outputValidation = validateSynopsisOutput(
      result.synopsis,
      generationRequest.targetLength || 'medium'
    )

    // Log AI usage for analytics (optional - can be added to database)
    // TODO: Track AI usage in ai_usage_logs table

    return successResponse(
      {
        message: 'Synopsis generated successfully',
        synopsis: result.synopsis,
        usage: {
          inputTokens: result.aiResponse.usage.inputTokens,
          outputTokens: result.aiResponse.usage.outputTokens,
          totalCost: result.aiResponse.usage.totalCost,
          model: result.aiResponse.model,
        },
        metadata: {
          estimatedWordCount: estimateWordCount(result.aiResponse.usage.outputTokens),
          targetLength: generationRequest.targetLength,
          qualityCheck: {
            valid: outputValidation.valid,
            issues: outputValidation.issues,
          },
        },
      },
      200
    )
  } catch (error) {
    // Handle AI generation errors
    if (error instanceof Error) {
      return errorResponses.internalError('Failed to generate synopsis', {
        details: {
          error: error.message,
        },
        userId: user.id,
      })
    }

    return errorResponses.internalError('Failed to generate synopsis', {
      userId: user.id,
    })
  }
}
