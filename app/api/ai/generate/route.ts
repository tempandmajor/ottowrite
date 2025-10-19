import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateWithAI, AIModel } from '@/lib/ai/service'
import { getMonthlyAIWordLimit } from '@/lib/stripe/config'
import { checkAIRequestQuota } from '@/lib/account/quota'

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
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
    const { model, prompt, context, maxTokens, documentId } = body

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

    if (typeof model !== 'string' || !ALLOWED_MODELS.includes(model as AIModel)) {
      return NextResponse.json(
        { error: 'Unsupported model requested' },
        { status: 400 }
      )
    }

    const sanitizedPrompt = prompt.trim()
    const sanitizedContext =
      typeof context === 'string' ? context : undefined
    const requestedTokens =
      typeof maxTokens === 'number' && Number.isFinite(maxTokens)
        ? Math.floor(maxTokens)
        : DEFAULT_MAX_TOKENS
    const safeMaxTokens = Math.max(
      1,
      Math.min(requestedTokens, MAX_COMPLETION_TOKENS)
    )
    const documentIdValue =
      typeof documentId === 'string' && documentId.length > 0
        ? documentId
        : null

    // Generate AI response
    const response = await generateWithAI({
      model: model as AIModel,
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
      console.warn('refresh_user_plan_usage failed after AI generation', refreshError)
    }

    return NextResponse.json({
      content: response.content,
      usage: {
        ...response.usage,
        wordsGenerated,
        monthlyUsed: currentUsage + wordsGenerated,
        monthlyLimit,
        percentUsed: Math.round(((currentUsage + wordsGenerated) / monthlyLimit) * 100),
      },
      model: response.model,
    })
  } catch (error) {
    console.error('AI generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate AI response' },
      { status: 500 }
    )
  }
}
