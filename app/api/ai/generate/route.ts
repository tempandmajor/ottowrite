import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateWithAI, AIModel } from '@/lib/ai/service'
import { getMonthlyAIWordLimit } from '@/lib/stripe/config'

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

    // Check if usage limit exceeded
    const monthlyLimit = getMonthlyAIWordLimit(profile.subscription_tier || 'free')
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

    if (!model || !prompt) {
      return NextResponse.json(
        { error: 'Model and prompt are required' },
        { status: 400 }
      )
    }

    // Generate AI response
    const response = await generateWithAI({
      model: model as AIModel,
      prompt,
      context,
      maxTokens,
    })

    // Calculate word count from generated content
    const wordsGenerated = response.content.trim().split(/\s+/).length

    // Track AI usage in database
    await supabase.from('ai_usage').insert([
      {
        user_id: user.id,
        document_id: documentId || null,
        model: response.model,
        words_generated: wordsGenerated,
        prompt_tokens: response.usage.inputTokens,
        completion_tokens: response.usage.outputTokens,
        total_cost: response.usage.totalCost,
        prompt_preview: prompt.substring(0, 200),
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
