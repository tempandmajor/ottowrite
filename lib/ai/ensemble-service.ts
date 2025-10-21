import {
  generateWithClaude,
  generateWithGPT5,
  generateWithDeepSeek,
} from '@/lib/ai/service'
import { calculateQualityScores, type QualityScores } from '@/lib/ai/quality-scorer'

export type EnsembleSuggestion = {
  model: 'claude-sonnet-4.5' | 'gpt-5' | 'deepseek-chat' | 'blend'
  content: string
  usage: {
    inputTokens: number
    outputTokens: number
    totalCost: number
  }
  qualityScores?: QualityScores
}

export async function generateEnsembleSuggestions(params: {
  prompt: string
  context?: string
  maxTokens?: number
  includeQualityScores?: boolean
}): Promise<EnsembleSuggestion[]> {
  const { prompt, context, maxTokens = 900, includeQualityScores = true } = params

  const [claude, gpt, deepseek] = await Promise.all([
    generateWithClaude(prompt, context, maxTokens),
    generateWithGPT5(prompt, context, maxTokens),
    generateWithDeepSeek(prompt, context, maxTokens),
  ])

  const suggestions = [claude, gpt, deepseek]

  // Add quality scores if requested
  if (includeQualityScores) {
    return suggestions.map((suggestion) => ({
      ...suggestion,
      qualityScores: calculateQualityScores(suggestion.content, {
        context,
        prompt,
      }),
    }))
  }

  return suggestions
}

type BlendParams = {
  prompt: string
  suggestions: Array<{
    model: 'claude-sonnet-4.5' | 'gpt-5' | 'deepseek-chat'
    content: string
  }>
  context?: string
  additionalInstructions?: string
  maxTokens?: number
}

export async function generateBlendedSuggestion({
  prompt,
  suggestions,
  context,
  additionalInstructions,
  maxTokens = 900,
}: BlendParams): Promise<EnsembleSuggestion> {
  if (suggestions.length < 2) {
    throw new Error('Provide at least two suggestions to blend.')
  }

  const systemPrompt = `You are a collaborative writing editor that merges multiple AI drafts into a cohesive, high-quality passage.
Respect character voice, continuity, and stylistic cues from the original prompt.
Blend the strongest elements from each suggestion while eliminating redundancy or contradictions.
Return polished prose, ready for insertion into the manuscript.`

  const suggestionBlock = suggestions
    .map(
      (suggestion, index) =>
        `Suggestion ${index + 1} (${suggestion.model}):\n${suggestion.content}`
    )
    .join('\n\n')

  const userPrompt = `Original prompt:\n${prompt}

${context ? `Context excerpt:\n${context}\n\n` : ''}${
    additionalInstructions
      ? `Writer instructions:\n${additionalInstructions.trim()}\n\n`
      : ''
  }Combine the following model outputs into a single refined draft:\n\n${suggestionBlock}`

  const result = await generateWithGPT5(userPrompt, systemPrompt, maxTokens)

  return {
    model: 'blend',
    content: result.content,
    usage: result.usage,
    qualityScores: calculateQualityScores(result.content, {
      context,
      prompt,
    }),
  }
}
