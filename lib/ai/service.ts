import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

export type AIModel = 'claude-sonnet-4.5' | 'gpt-5' | 'deepseek-v3'

export type AIRequest = {
  model: AIModel
  prompt: string
  context?: string
  maxTokens?: number
}

export type AIResponse = {
  content: string
  usage: {
    inputTokens: number
    outputTokens: number
    totalCost: number
  }
  model: AIModel
}

// Lazy-initialized AI clients (to avoid build-time initialization)
let anthropic: Anthropic | null = null
let openai: OpenAI | null = null
let deepseek: OpenAI | null = null

function getAnthropicClient(): Anthropic {
  if (!anthropic) {
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    })
  }
  return anthropic
}

function getOpenAIClient(): OpenAI {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    })
  }
  return openai
}

function getDeepSeekClient(): OpenAI {
  if (!deepseek) {
    deepseek = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: 'https://api.deepseek.com/v1',
    })
  }
  return deepseek
}

// Pricing per million tokens (input/output)
const PRICING = {
  'claude-sonnet-4.5': { input: 3, output: 15 },
  'gpt-5': { input: 5, output: 15 }, // Estimated pricing
  'deepseek-v3': { input: 0.27, output: 1.1 },
}

/**
 * Generate text using Claude Sonnet 4.5
 */
async function generateWithClaude(
  prompt: string,
  context?: string,
  maxTokens: number = 2000
): Promise<AIResponse> {
  const systemPrompt = context
    ? `You are an AI writing assistant helping authors write better stories. Here's the context:\n\n${context}`
    : 'You are an AI writing assistant helping authors write better stories.'

  const client = getAnthropicClient()
  const message = await client.messages.create({
    model: 'claude-sonnet-4.5-20250929',
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  const content =
    message.content[0].type === 'text' ? message.content[0].text : ''

  const inputTokens = message.usage.input_tokens
  const outputTokens = message.usage.output_tokens
  const totalCost =
    (inputTokens / 1000000) * PRICING['claude-sonnet-4.5'].input +
    (outputTokens / 1000000) * PRICING['claude-sonnet-4.5'].output

  return {
    content,
    usage: {
      inputTokens,
      outputTokens,
      totalCost,
    },
    model: 'claude-sonnet-4.5',
  }
}

/**
 * Generate text using GPT-5
 */
async function generateWithGPT5(
  prompt: string,
  context?: string,
  maxTokens: number = 2000
): Promise<AIResponse> {
  const systemPrompt = context
    ? `You are an AI writing assistant helping authors write better stories. Here's the context:\n\n${context}`
    : 'You are an AI writing assistant helping authors write better stories.'

  const client = getOpenAIClient()
  const completion = await client.chat.completions.create({
    model: 'gpt-5',
    max_tokens: maxTokens,
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  const content = completion.choices[0].message.content || ''
  const inputTokens = completion.usage?.prompt_tokens || 0
  const outputTokens = completion.usage?.completion_tokens || 0
  const totalCost =
    (inputTokens / 1000000) * PRICING['gpt-5'].input +
    (outputTokens / 1000000) * PRICING['gpt-5'].output

  return {
    content,
    usage: {
      inputTokens,
      outputTokens,
      totalCost,
    },
    model: 'gpt-5',
  }
}

/**
 * Generate text using DeepSeek V3
 */
async function generateWithDeepSeek(
  prompt: string,
  context?: string,
  maxTokens: number = 2000
): Promise<AIResponse> {
  const systemPrompt = context
    ? `You are an AI writing assistant helping authors write better stories. Here's the context:\n\n${context}`
    : 'You are an AI writing assistant helping authors write better stories.'

  const client = getDeepSeekClient()

  const completion = await client.chat.completions.create({
    model: 'deepseek-chat',
    max_tokens: maxTokens,
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  const content = completion.choices[0].message.content || ''
  const inputTokens = completion.usage?.prompt_tokens || 0
  const outputTokens = completion.usage?.completion_tokens || 0
  const totalCost =
    (inputTokens / 1000000) * PRICING['deepseek-v3'].input +
    (outputTokens / 1000000) * PRICING['deepseek-v3'].output

  return {
    content,
    usage: {
      inputTokens,
      outputTokens,
      totalCost,
    },
    model: 'deepseek-v3',
  }
}

/**
 * Main function to generate text with any AI model
 */
export async function generateWithAI(request: AIRequest): Promise<AIResponse> {
  const { model, prompt, context, maxTokens = 2000 } = request

  switch (model) {
    case 'claude-sonnet-4.5':
      return generateWithClaude(prompt, context, maxTokens)
    case 'gpt-5':
      return generateWithGPT5(prompt, context, maxTokens)
    case 'deepseek-v3':
      return generateWithDeepSeek(prompt, context, maxTokens)
    default:
      throw new Error(`Unsupported AI model: ${model}`)
  }
}

/**
 * Get model recommendations based on task type
 */
export function getRecommendedModel(taskType: 'creative' | 'analytical' | 'bulk'): AIModel {
  switch (taskType) {
    case 'creative':
      return 'claude-sonnet-4.5' // Best for creative prose
    case 'analytical':
      return 'gpt-5' // Best for reasoning and analysis
    case 'bulk':
      return 'deepseek-v3' // Most cost-effective for large operations
    default:
      return 'claude-sonnet-4.5'
  }
}
