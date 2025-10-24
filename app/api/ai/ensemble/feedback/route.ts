import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponses, successResponse } from '@/lib/api/error-response'
import { requireAuth } from '@/lib/api/auth-helpers'
import { requireAIRateLimit } from '@/lib/api/rate-limit-helpers'
import { logger } from '@/lib/monitoring/structured-logger'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)
  await requireAIRateLimit(request, user.id)

    const body = (await request.json()) as {
      project_id?: string | null
      document_id?: string | null
      prompt?: string
      selected_model?: 'claude-sonnet-4.5' | 'gpt-5' | 'deepseek-chat' | 'blend'
      selection_reason?: string
      inserted_text?: string
      suggestions?: Array<{
        model: 'claude-sonnet-4.5' | 'gpt-5' | 'deepseek-chat'
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
      return errorResponses.badRequest('prompt and selected_model are required', {
        userId: user.id,
      })
    }

    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      return errorResponses.badRequest('suggestions array is required to capture feedback', {
        userId: user.id,
      })
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
      logger.error('Failed to store ensemble feedback', {
        userId: user.id,
        projectId: projectId ?? undefined,
        documentId: documentId ?? undefined,
        operation: 'ensemble:feedback',
      }, error)
      return errorResponses.internalError('Failed to store ensemble feedback', {
        details: error,
        userId: user.id,
      })
    }

    return successResponse({ feedback: data })
  } catch (error) {
    logger.error('Ensemble feedback error', {
      operation: 'ensemble:feedback',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to store feedback', {
      details: error,
    })
  }
}
