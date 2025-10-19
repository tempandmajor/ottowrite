import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateEnsembleSuggestions } from '@/lib/ai/ensemble-service'
import { getMonthlyAIWordLimit } from '@/lib/stripe/config'
import { checkAIRequestQuota } from '@/lib/account/quota'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const plan = profile.subscription_tier || 'free'

    const ENSEMBLE_REQUESTS = 3
    const requestQuota = await checkAIRequestQuota(supabase, user.id, plan, ENSEMBLE_REQUESTS)
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

    const body = await request.json()
    const prompt: string = body?.prompt ?? ''
    const context: string | undefined = body?.context ?? undefined
    const maxTokens: number | undefined = body?.maxTokens ?? undefined

    if (!prompt || prompt.trim().length < 5) {
      return NextResponse.json(
        { error: 'Prompt must be at least 5 characters long.' },
        { status: 400 }
      )
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
      console.warn('refresh_user_plan_usage failed after ensemble generation', refreshError)
    }

    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error('Ensemble generation failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate suggestions.' },
      { status: 500 }
    )
  }
}
