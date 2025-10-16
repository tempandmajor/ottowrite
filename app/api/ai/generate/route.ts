import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateWithAI, AIModel } from '@/lib/ai/service'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    // Track AI usage in database
    await supabase.from('ai_usage').insert([
      {
        user_id: user.id,
        document_id: documentId || null,
        model: response.model,
        prompt_tokens: response.usage.inputTokens,
        completion_tokens: response.usage.outputTokens,
        total_cost: response.usage.totalCost,
        prompt_preview: prompt.substring(0, 200),
      },
    ])

    return NextResponse.json({
      content: response.content,
      usage: response.usage,
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
