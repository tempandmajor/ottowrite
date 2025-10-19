import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateWithAI, type AIModel } from '@/lib/ai/service'
import { getMonthlyAIWordLimit } from '@/lib/stripe/config'
import { checkAIRequestQuota } from '@/lib/account/quota'
import { classifyIntent, type AICommand } from '@/lib/ai/intent'
import { logger } from '@/lib/monitoring/structured-logger'
import { PerformanceTimer } from '@/lib/monitoring/performance'
import { checkAIRateLimit, createAIRateLimitResponse } from '@/lib/security/ai-rate-limit'

const MAX_PROMPT_LENGTH = 5000
const MAX_COMPLETION_TOKENS = 3000
const DEFAULT_MAX_TOKENS = 2000
const ALLOWED_MODELS: AIModel[] = [
  'claude-sonnet-4.5',
  'gpt-5',
  'deepseek-v3',
]

// Force dynamic rendering - don't try to statically analyze this route
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  // Apply rate limiting first (before any expensive operations)
  const rateLimitCheck = await checkAIRateLimit(request)
  if (!rateLimitCheck.allowed) {
    return createAIRateLimitResponse(rateLimitCheck.retryAfter)
  }

  const supabase = await createClient()
  let classification: ReturnType<typeof classifyIntent> | null = null
  let selectedModel: AIModel | null = null
  let command: AICommand | null = null
  let requestId: string | null = null
  let documentProjectId: string | null = null
  let documentIdValue: string | null = null
  let explicitModel: AIModel | null = null
  let sanitizedPrompt = ''
  let selectionValue: string | undefined
  let sanitizedContext: string | undefined
  let userId: string | null = null
  const startedAt = Date.now()
  const timer = new PerformanceTimer('ai_generation', 'ai_generation')

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    userId = user.id

    // Get user profile to check subscription and usage
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const plan = profile.subscription_tier || 'free'

    const requestQuota = await checkAIRequestQuota(supabase, user.id, plan, 1)
    if (!requestQuota.allowed) {
      const formattedPlan = plan.charAt(0).toUpperCase() + plan.slice(1)
      return NextResponse.json(
        {
          error: `You have reached the ${formattedPlan} plan limit of ${requestQuota.limit} AI requests this month.`,
          limit: requestQuota.limit,
          used: requestQuota.used,
          upgradeRequired: true,
        },
        { status: 429 }
      )
    }

    const monthlyLimit = getMonthlyAIWordLimit(plan)
    const currentUsage = profile.ai_words_used_this_month || 0

    if (currentUsage >= monthlyLimit) {
      return NextResponse.json(
        {
          error: 'Monthly AI word limit exceeded',
          limit: monthlyLimit,
          used: currentUsage,
          upgradeRequired: true,
        },
        { status: 429 }
      )
    }

    const body = await request.json()
    const {
      model,
      prompt,
      context,
      maxTokens,
      documentId,
      command: commandHint,
      selection,
    } = body

    if (typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    if (prompt.length > MAX_PROMPT_LENGTH) {
      return NextResponse.json(
        { error: `Prompt exceeds ${MAX_PROMPT_LENGTH} characters` },
        { status: 400 }
      )
    }

    if (context && typeof context !== 'string') {
      return NextResponse.json(
        { error: 'Context must be a string' },
        { status: 400 }
      )
    }

    if (typeof context === 'string' && context.length > MAX_PROMPT_LENGTH) {
      return NextResponse.json(
        { error: `Context exceeds ${MAX_PROMPT_LENGTH} characters` },
        { status: 400 }
      )
    }

    sanitizedPrompt = prompt.trim()
    sanitizedContext = typeof context === 'string' ? context : undefined
    const commandHintValue = typeof commandHint === 'string' ? commandHint : undefined
    selectionValue = typeof selection === 'string' ? selection : undefined

    classification = classifyIntent({
      prompt: sanitizedPrompt,
      commandHint: commandHintValue,
      selection: selectionValue,
      context: sanitizedContext,
    })
    command = classification.command

    if (typeof model === 'string') {
      if (!ALLOWED_MODELS.includes(model as AIModel)) {
        return NextResponse.json({ error: 'Unsupported model requested' }, { status: 400 })
      }
      explicitModel = model as AIModel
    }

    const requestedTokens =
      typeof maxTokens === 'number' && Number.isFinite(maxTokens)
        ? Math.floor(maxTokens)
        : DEFAULT_MAX_TOKENS
    const safeMaxTokens = Math.max(
      1,
      Math.min(requestedTokens, MAX_COMPLETION_TOKENS)
    )
    documentIdValue =
      typeof documentId === 'string' && documentId.length > 0 ? documentId : null

    selectedModel = explicitModel ?? classification.recommendedModel

    if (documentIdValue) {
      const { data: documentRow } = await supabase
        .from('documents')
        .select('project_id')
        .eq('id', documentIdValue)
        .eq('user_id', user.id)
        .single()
      if (documentRow && documentRow.project_id) {
        documentProjectId = documentRow.project_id
      }
    }

    // Generate AI response
    const response = await generateWithAI({
      model: selectedModel,
      prompt: sanitizedPrompt,
      context: sanitizedContext,
      maxTokens: safeMaxTokens,
    })

    // Calculate word count from generated content
    const wordsGenerated = response.content.trim().split(/\s+/).length

    // Track AI usage in database
    await supabase.from('ai_usage').insert([
      {
        user_id: user.id,
        document_id: documentIdValue,
        model: response.model,
        words_generated: wordsGenerated,
        prompt_tokens: response.usage.inputTokens,
        completion_tokens: response.usage.outputTokens,
        total_cost: response.usage.totalCost,
        prompt_preview: sanitizedPrompt.substring(0, 200),
      },
    ])

    const latencyMs = Date.now() - startedAt

    const { data: requestInsert } = await supabase
      .from('ai_requests')
      .insert({
        user_id: user.id,
        document_id: documentIdValue,
        project_id: documentProjectId,
        command,
        intent: classification.intent,
        requested_model: explicitModel,
        selected_model: selectedModel,
        words_generated: wordsGenerated,
        prompt_tokens: response.usage.inputTokens,
        completion_tokens: response.usage.outputTokens,
        latency_ms: latencyMs,
        status: 'succeeded',
        prompt_preview: sanitizedPrompt.substring(0, 200),
        selection_preview: selectionValue ? selectionValue.substring(0, 200) : null,
      })
      .select('id')
      .single()
    requestId = requestInsert?.id ?? null

    // Update user's monthly AI word usage
    await supabase
      .from('user_profiles')
      .update({
        ai_words_used_this_month: currentUsage + wordsGenerated,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    try {
      await supabase.rpc('refresh_user_plan_usage', { p_user_id: user.id })
    } catch (refreshError) {
      logger.warn('refresh_user_plan_usage failed after AI generation', {
        userId: user.id,
        operation: 'refresh_user_plan_usage',
      }, refreshError instanceof Error ? refreshError : undefined)
    }

    // Log successful AI generation with structured logging
    logger.aiRequest({
      operation: command || 'generate',
      model: selectedModel,
      promptLength: sanitizedPrompt.length,
      completionLength: response.content.length,
      duration: latencyMs,
      tokensUsed: response.usage.inputTokens + response.usage.outputTokens,
      cost: response.usage.totalCost,
      userId: user.id,
      documentId: documentIdValue || undefined,
      success: true,
    })

    timer.end(true, {
      model: selectedModel,
      wordsGenerated,
      tokensUsed: response.usage.inputTokens + response.usage.outputTokens,
    })

    return NextResponse.json({
      content: response.content,
      usage: {
        ...response.usage,
        wordsGenerated,
        monthlyUsed: currentUsage + wordsGenerated,
        monthlyLimit,
        percentUsed: Math.round(((currentUsage + wordsGenerated) / monthlyLimit) * 100),
      },
      model: selectedModel,
      command,
      requestId,
      intent: classification.intent,
    })
  } catch (error) {
    // Log AI generation failure with structured logging
    logger.aiRequest({
      operation: command || 'generate',
      model: selectedModel || 'unknown',
      promptLength: sanitizedPrompt.length,
      duration: Date.now() - startedAt,
      userId: userId || undefined,
      documentId: documentIdValue || undefined,
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    })

    timer.end(false, {
      errorMessage: error instanceof Error ? error.message : String(error),
    })

    if (classification && selectedModel && userId) {
      try {
        await supabase.from('ai_requests').insert({
          user_id: userId,
          document_id: documentIdValue,
          project_id: documentProjectId,
          command: classification.command,
          intent: classification.intent,
          requested_model: explicitModel,
          selected_model: selectedModel,
          words_generated: 0,
          prompt_tokens: 0,
          completion_tokens: 0,
          latency_ms: Date.now() - startedAt,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          prompt_preview: sanitizedPrompt.substring(0, 200) || null,
          selection_preview: selectionValue ? selectionValue.substring(0, 200) : null,
        })
      } catch (logError) {
        logger.error('Failed to log AI request failure', {
          userId,
          operation: 'log_ai_failure',
        }, logError instanceof Error ? logError : undefined)
      }
    }
    return NextResponse.json(
      { error: 'Failed to generate AI response' },
      { status: 500 }
    )
  }
}
