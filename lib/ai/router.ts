import type { AIModel } from '@/lib/ai/service'
import type { IntentClassification } from '@/lib/ai/intent'

export type ModelOverride = {
  forcedModel: AIModel
  rationale?: string
}

const MODEL_CAPABILITIES: Record<
  AIModel,
  {
    strengths: string[]
    weaknesses: string[]
    costScore: number // normalized cost (lower is cheaper)
    speedScore: number // normalized speed (higher is faster)
    maxContextTokens: number
  }
> = {
  'claude-sonnet-4.5': {
    strengths: ['long-form', 'brainstorm', 'structure'],
    weaknesses: ['very short edits'],
    costScore: 0.6,
    speedScore: 0.7,
    maxContextTokens: 200000,
  },
  'gpt-5': {
    strengths: ['style mimicry', 'tone', 'editing'],
    weaknesses: ['high cost'],
    costScore: 1,
    speedScore: 0.6,
    maxContextTokens: 128000,
  },
  'deepseek-v3': {
    strengths: ['summaries', 'short edits', 'cheap experiments'],
    weaknesses: ['creative voice'],
    costScore: 0.2,
    speedScore: 0.9,
    maxContextTokens: 64000,
  },
}

export type RoutingInput = {
  classification: IntentClassification
  selectionLength: number
  documentLength: number
  estimatedContextTokens: number
  userTier: 'free' | 'hobbyist' | 'professional' | 'studio'
  override?: ModelOverride | null
}

export type RoutingDecision = {
  model: AIModel
  intent: IntentClassification
  confidence: number
  rationale: string[]
  alternatives: Array<{ model: AIModel; rationale: string }>
  allowManualOverride: boolean
}

export function routeAIRequest(input: RoutingInput): RoutingDecision {
  const { classification, override } = input
  const rationale: string[] = []

  if (override) {
    rationale.push(`Model forced to ${override.forcedModel}${override.rationale ? ` (${override.rationale})` : ''}`)
    return {
      model: override.forcedModel,
      intent: classification,
      confidence: 0.95,
      rationale,
      alternatives: [],
      allowManualOverride: false,
    }
  }

  const match = MODEL_CAPABILITIES[classification.recommendedModel]
  let chosenModel: AIModel = classification.recommendedModel
  let confidence = classification.confidence

  rationale.push(`Intent classified as "${classification.intent}" (confidence ${classification.confidence.toFixed(2)})`)
  rationale.push(`Default model for ${classification.command} is ${classification.recommendedModel}`)

  const { estimatedContextTokens, selectionLength, documentLength, userTier } = input
  if (estimatedContextTokens > match.maxContextTokens) {
    const fallback = findModelWithContext(estimatedContextTokens)
    if (fallback && fallback !== chosenModel) {
      rationale.push(
        `Context (~${estimatedContextTokens} tokens) exceeds ${chosenModel} limit; switching to ${fallback} for capacity`
      )
      chosenModel = fallback
      confidence = Math.min(confidence, 0.75)
    }
  }

  if (userTier === 'free' && chosenModel === 'gpt-5') {
    rationale.push('Free tier cannot access GPT-5; falling back to Claude Sonnet 4.5')
    chosenModel = 'claude-sonnet-4.5'
    confidence = Math.min(confidence, 0.65)
  }

  if (userTier === 'hobbyist' && chosenModel === 'gpt-5' && classification.command === 'summarize') {
    rationale.push('Hobbyist tier summary -> switching to more cost-effective DeepSeek V3')
    chosenModel = 'deepseek-v3'
    confidence = Math.min(confidence, 0.7)
  }

  const selectionRatio = selectionLength / Math.max(documentLength, 1)
  if (selectionRatio < 0.05 && classification.command === 'rewrite') {
    rationale.push('Very small selection detected; using DeepSeek for rapid edits')
    chosenModel = 'deepseek-v3'
  }

  const alternatives = createAlternativeSuggestions(chosenModel)

  return {
    model: chosenModel,
    intent: classification,
    confidence: Math.min(0.99, Math.max(confidence, 0.55)),
    rationale,
    alternatives,
    allowManualOverride: true,
  }
}

function findModelWithContext(requiredTokens: number): AIModel | null {
  const fits = (Object.keys(MODEL_CAPABILITIES) as AIModel[]).filter(
    (model) => MODEL_CAPABILITIES[model].maxContextTokens >= requiredTokens
  )
  if (fits.includes('claude-sonnet-4.5')) {
    return 'claude-sonnet-4.5'
  }
  if (fits.length > 0) {
    return fits.sort(
      (a, b) => MODEL_CAPABILITIES[a].maxContextTokens - MODEL_CAPABILITIES[b].maxContextTokens
    )[0]
  }
  return null
}

function createAlternativeSuggestions(selectedModel: AIModel) {
  return (Object.keys(MODEL_CAPABILITIES) as AIModel[])
    .filter((model) => model !== selectedModel)
    .map((model) => ({
      model,
      rationale: describeModel(model),
    }))
}

function describeModel(model: AIModel): string {
  const meta = MODEL_CAPABILITIES[model]
  return `${model}: strengths ${meta.strengths.join(', ')}; cost score ${meta.costScore}`
}
