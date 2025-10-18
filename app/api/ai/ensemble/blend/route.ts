import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateBlendedSuggestion } from '@/lib/ai/ensemble-service'

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

    const body = (await request.json()) as {
      project_id?: string | null
      document_id?: string | null
      prompt?: string
      context?: string
      suggestions?: Array<{
        model: 'claude-sonnet-4.5' | 'gpt-5' | 'deepseek-v3'
        content: string
      }>
      additional_instructions?: string
    }

    const prompt = body.prompt?.trim()
    const suggestions = body.suggestions ?? []

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required.' }, { status: 400 })
    }

    if (suggestions.length < 2) {
      return NextResponse.json(
        { error: 'At least two suggestions are required to blend.' },
        { status: 400 }
      )
    }

    const suggestionPayload = suggestions.map((suggestion) => ({
      model: suggestion.model,
      content: suggestion.content,
    }))

    const blended = await generateBlendedSuggestion({
      prompt,
      context: body.context,
      suggestions: suggestionPayload,
      additionalInstructions: body.additional_instructions,
    })

    return NextResponse.json({ suggestion: blended })
  } catch (error) {
    console.error('Failed to blend ensemble suggestions:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to blend suggestions.' },
      { status: 500 }
    )
  }
}
