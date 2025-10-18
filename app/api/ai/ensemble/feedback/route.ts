import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
      selected_model?: 'claude-sonnet-4.5' | 'gpt-5' | 'deepseek-v3' | 'blend'
      selection_reason?: string
      inserted_text?: string
      suggestions?: Array<{
        model: 'claude-sonnet-4.5' | 'gpt-5' | 'deepseek-v3'
        content: string
        usage: {
          inputTokens: number
          outputTokens: number
          totalCost: number
        }
      }>
      usage_summary?: {
        totalInputTokens?: number
        totalOutputTokens?: number
        totalCost?: number
      }
      metadata?: Record<string, unknown>
    }

    const prompt = body.prompt?.trim()
    const selectedModel = body.selected_model
    const projectId = body.project_id ?? null
    const documentId = body.document_id ?? null
    const selectionReason = body.selection_reason?.trim()
    const insertedText = body.inserted_text?.trim()
    const suggestions = body.suggestions ?? []

    if (!prompt || !selectedModel) {
      return NextResponse.json({ error: 'prompt and selected_model are required.' }, { status: 400 })
    }

    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      return NextResponse.json(
        { error: 'suggestions array is required to capture feedback.' },
        { status: 400 }
      )
    }

    const sanitizedSuggestions = suggestions.map((suggestion) => ({
      model: suggestion.model,
      content: suggestion.content,
      usage: suggestion.usage,
    }))

    const { data, error } = await supabase
      .from('ensemble_feedback')
      .insert({
        user_id: user.id,
        project_id: projectId,
        document_id: documentId,
        prompt,
        selected_model: selectedModel,
        selection_reason: selectionReason || null,
        inserted_text: insertedText || null,
        suggestions: sanitizedSuggestions,
        usage: body.usage_summary ?? null,
        metadata: body.metadata ?? {},
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ feedback: data })
  } catch (error) {
    console.error('Failed to store ensemble feedback:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to store feedback.' },
      { status: 500 }
    )
  }
}
