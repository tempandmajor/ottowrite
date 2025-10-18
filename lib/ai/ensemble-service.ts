import { generateWithClaude, generateWithGPT5, generateWithDeepSeek } from '@/lib/ai/service'

export type EnsembleSuggestion = {
  model: 'claude-sonnet-4.5' | 'gpt-5' | 'deepseek-v3'
  content: string
  usage: {
    inputTokens: number
    outputTokens: number
    totalCost: number
  }
}

export async function generateEnsembleSuggestions(params: {
  prompt: string
  context?: string
  maxTokens?: number
}): Promise<EnsembleSuggestion[]> {
  const { prompt, context, maxTokens = 900 } = params

  const [claude, gpt, deepseek] = await Promise.all([
    generateWithClaude(prompt, context, maxTokens),
    generateWithGPT5(prompt, context, maxTokens),
    generateWithDeepSeek(prompt, context, maxTokens),
  ])

  return [claude, gpt, deepseek]
}
