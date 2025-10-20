import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateEnsembleSuggestions } from '@/lib/ai/ensemble-service'
import { getMonthlyAIWordLimit } from '@/lib/stripe/config'
import { checkAIRequestQuota } from '@/lib/account/quota'
import { checkAIRateLimit, createAIRateLimitResponse } from '@/lib/security/ai-rate-limit'
import { errorResponses, successResponse } from '@/lib/api/error-response'
import { logger } from '@/lib/monitoring/structured-logger'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  // Apply strict rate limiting for expensive ensemble operation
  const rateLimitCheck = await checkAIRateLimit(request, true)
  if (!rateLimitCheck.allowed) {
    return createAIRateLimitResponse(
      rateLimitCheck.retryAfter,
      'Rate limit exceeded for ensemble generation. This is an expensive AI operation. Please wait before trying again.'
    )
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return errorResponses.unauthorized()
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return errorResponses.notFound('Profile not found', { userId: user.id })
    }

    const plan = profile.subscription_tier || 'free'

    const ENSEMBLE_REQUESTS = 3
    const requestQuota = await checkAIRequestQuota(supabase, user.id, plan, ENSEMBLE_REQUESTS)
    if (!requestQuota.allowed) {
      const formattedPlan = plan.charAt(0).toUpperCase() + plan.slice(1)
      return errorResponses.tooManyRequests(
        `You have reached the ${formattedPlan} plan limit of ${requestQuota.limit} AI requests this month.`,
        undefined,
        {
          code: 'AI_REQUEST_LIMIT_EXCEEDED',
          userId: user.id,
          details: {
            limit: requestQuota.limit,
            used: requestQuota.used,
            upgradeRequired: true,
          },
        }
      )
    }

    const monthlyLimit = getMonthlyAIWordLimit(plan)
    const currentUsage = profile.ai_words_used_this_month || 0

    const body = await request.json()
    const prompt: string = body?.prompt ?? ''
    const context: string | undefined = body?.context ?? undefined
    const maxTokens: number | undefined = body?.maxTokens ?? undefined

    if (!prompt || prompt.trim().length < 5) {
      return errorResponses.badRequest('Prompt must be at least 5 characters long.', {
        userId: user.id,
      })
    }

    const suggestions = await generateEnsembleSuggestions({
      prompt: prompt.trim(),
      context,
      maxTokens,
    })

    const totalWords = suggestions.reduce((acc, suggestion) => {
      return acc + suggestion.content.trim().split(/\s+/).length
    }, 0)

    if (currentUsage + totalWords > monthlyLimit) {
      return errorResponses.tooManyRequests(
        'Monthly AI word limit exceeded',
        undefined,
        {
          code: 'AI_WORD_LIMIT_EXCEEDED',
          userId: user.id,
          details: {
            limit: monthlyLimit,
            used: currentUsage,
            upgradeRequired: true,
          },
        }
      )
    }

    const promptPreview = prompt.trim().substring(0, 200)

    await supabase.from('ai_usage').insert(
      suggestions.map((suggestion) => ({
        user_id: user.id,
        document_id: null,
        model: suggestion.model,
        words_generated: suggestion.content.trim().length === 0 ? 0 : suggestion.content.trim().split(/\s+/).length,
        prompt_tokens: suggestion.usage.inputTokens,
        completion_tokens: suggestion.usage.outputTokens,
        total_cost: suggestion.usage.totalCost,
        prompt_preview: promptPreview,
      }))
    )

    await supabase
      .from('user_profiles')
      .update({
        ai_words_used_this_month: currentUsage + totalWords,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    try {
      await supabase.rpc('refresh_user_plan_usage', { p_user_id: user.id })
    } catch (refreshError) {
      logger.warn('refresh_user_plan_usage failed after ensemble generation', {
        userId: user.id,
        operation: 'ensemble:refresh_usage',
      }, refreshError instanceof Error ? refreshError : undefined)
    }

    return successResponse({ suggestions })
  } catch (error) {
    logger.error('Ensemble generation failed', {
      operation: 'ensemble:generate',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to generate ensemble suggestions', {
      details: error,
    })
  }
}
