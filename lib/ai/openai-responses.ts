/**
 * OpenAI Responses API Integration
 * Enhanced features: Streaming, prompt caching, fallback, compression
 */

import OpenAI from 'openai'
import type { AIResponse } from './service'

const PRICING = {
  'gpt-5': { input: 5, output: 15 }, // Per million tokens
}

let openaiClient: OpenAI | null = null

function getClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    })
  }
  return openaiClient
}

export type ResponsesAPIOptions = {
  model?: string
  maxTokens?: number
  verbosity?: 'low' | 'medium' | 'high'
  reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high'
  stream?: boolean
  useCache?: boolean
  fallbackToChat?: boolean
}

/**
 * Generate text using OpenAI Responses API (GPT-5)
 * With streaming, caching, and fallback support
 */
export async function generateWithResponsesAPI(
  prompt: string,
  systemPrompt: string,
  options: ResponsesAPIOptions = {}
): Promise<AIResponse> {
  const {
    model = 'gpt-5',
    maxTokens = 2000,
    verbosity = 'medium',
    reasoningEffort = 'minimal',
    useCache = true,
    fallbackToChat = true,
  } = options

  const client = getClient()

  try {
    // Try Responses API first
    const response = await (client as any).responses.create({
      model,
      input: [
        {
          role: 'system',
          content: [{ type: 'input_text', text: systemPrompt }],
        },
        {
          role: 'user',
          content: [{ type: 'input_text', text: prompt }],
        },
      ],
      verbosity,
      reasoning_effort: reasoningEffort,
      max_output_tokens: maxTokens,
      // Enable prompt caching if available
      ...(useCache && { cache: { type: 'ephemeral' } }),
    })

    const content = response.output?.[0]?.content?.[0]?.text || ''
    const inputTokens = response.usage?.input_tokens || 0
    const outputTokens = response.usage?.output_tokens || 0
    const cachedTokens = response.usage?.cached_tokens || 0

    // Calculate cost (cached tokens are typically cheaper)
    const totalCost =
      ((inputTokens - cachedTokens) / 1000000) * PRICING[model as 'gpt-5'].input +
      (cachedTokens / 1000000) * (PRICING[model as 'gpt-5'].input * 0.5) + // 50% discount for cached
      (outputTokens / 1000000) * PRICING[model as 'gpt-5'].output

    return {
      content,
      usage: {
        inputTokens,
        outputTokens,
        totalCost,
      },
      model: 'gpt-5',
    }
  } catch (error) {
    // Fallback to standard Chat Completions API
    if (fallbackToChat) {
      console.warn('Responses API failed, falling back to Chat API:', error)
      return await fallbackToChatAPI(prompt, systemPrompt, maxTokens)
    }
    throw error
  }
}

/**
 * Fallback to standard Chat Completions API
 */
async function fallbackToChatAPI(
  prompt: string,
  systemPrompt: string,
  maxTokens: number
): Promise<AIResponse> {
  const client = getClient()

  const completion = await client.chat.completions.create({
    model: 'gpt-5',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ],
    max_tokens: maxTokens,
  })

  const content = completion.choices[0]?.message?.content || ''
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
 * Stream text generation using OpenAI Responses API
 */
export async function* streamWithResponsesAPI(
  prompt: string,
  systemPrompt: string,
  options: ResponsesAPIOptions = {}
): AsyncGenerator<string, void, unknown> {
  const {
    model = 'gpt-5',
    maxTokens = 2000,
    verbosity = 'medium',
    reasoningEffort = 'minimal',
    fallbackToChat = true,
  } = options

  const client = getClient()

  try {
    // Try streaming with Responses API
    const stream = await (client as any).responses.create({
      model,
      input: [
        {
          role: 'system',
          content: [{ type: 'input_text', text: systemPrompt }],
        },
        {
          role: 'user',
          content: [{ type: 'input_text', text: prompt }],
        },
      ],
      verbosity,
      reasoning_effort: reasoningEffort,
      max_output_tokens: maxTokens,
      stream: true,
    })

    for await (const chunk of stream) {
      const text = chunk.output?.[0]?.content?.[0]?.text
      if (text) {
        yield text
      }
    }
  } catch (error) {
    // Fallback to streaming Chat API
    if (fallbackToChat) {
      console.warn('Responses API streaming failed, falling back to Chat API:', error)
      yield* streamWithChatAPI(prompt, systemPrompt, maxTokens)
    } else {
      throw error
    }
  }
}

/**
 * Fallback streaming with Chat Completions API
 */
async function* streamWithChatAPI(
  prompt: string,
  systemPrompt: string,
  maxTokens: number
): AsyncGenerator<string, void, unknown> {
  const client = getClient()

  const stream = await client.chat.completions.create({
    model: 'gpt-5',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ],
    max_tokens: maxTokens,
    stream: true,
  })

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content
    if (content) {
      yield content
    }
  }
}

/**
 * Compress response content to reduce bandwidth
 */
export function compressResponse(content: string): string {
  // Remove excessive whitespace while preserving paragraph breaks
  return content
    .split('\n\n')
    .map((paragraph) => paragraph.replace(/\s+/g, ' ').trim())
    .filter((p) => p.length > 0)
    .join('\n\n')
}

/**
 * Batch multiple prompts for efficiency
 */
export async function batchGenerate(
  prompts: Array<{ prompt: string; systemPrompt: string }>,
  options: ResponsesAPIOptions = {}
): Promise<AIResponse[]> {
  // Execute in parallel but limit concurrency to avoid rate limits
  const BATCH_SIZE = 3
  const results: AIResponse[] = []

  for (let i = 0; i < prompts.length; i += BATCH_SIZE) {
    const batch = prompts.slice(i, i + BATCH_SIZE)
    const batchResults = await Promise.all(
      batch.map(({ prompt, systemPrompt }) =>
        generateWithResponsesAPI(prompt, systemPrompt, options)
      )
    )
    results.push(...batchResults)
  }

  return results
}
