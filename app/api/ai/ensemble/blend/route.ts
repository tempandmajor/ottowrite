import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateBlendedSuggestion } from '@/lib/ai/ensemble-service'
import { errorResponses, successResponse } from '@/lib/api/error-response'
import {requireAuth, handleAuthError} from '@/lib/api/auth-helpers'
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
      context?: string
      suggestions?: Array<{
        model: 'claude-sonnet-4.5' | 'gpt-5' | 'deepseek-chat'
        content: string
      }>
      additional_instructions?: string
    }

    const prompt = body.prompt?.trim()
    const suggestions = body.suggestions ?? []

    if (!prompt) {
      return errorResponses.badRequest('Prompt is required', { userId: user.id })
    }

    if (suggestions.length < 2) {
      return errorResponses.badRequest('At least two suggestions are required to blend', {
        userId: user.id,
      })
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

    return successResponse({ suggestion: blended })
  } catch (error) {
        const authError = handleAuthError(error)
    if (authError) return authError

    logger.error('Failed to blend ensemble suggestions', {
      operation: 'ensemble:blend',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to blend suggestions', {
      details: error,
    })
  }
}
