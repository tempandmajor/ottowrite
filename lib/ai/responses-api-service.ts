import OpenAI from 'openai'

const MODEL = process.env.OPENAI_RESPONSES_MODEL || 'gpt-5-responses'

function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is not set')
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

export type BackgroundTaskResult = {
  text: string
  reasoning?: string
}

function sanitizeMetadata(metadata?: Record<string, unknown>) {
  if (!metadata) return undefined
  const entries = Object.entries(metadata).reduce<[string, string][]>((acc, [key, value]) => {
    if (value === undefined || value === null) return acc
    acc.push([key, String(value)])
    return acc
  }, [])
  return entries.length > 0 ? Object.fromEntries(entries) : undefined
}

export async function createBackgroundResponse(input: string, metadata?: Record<string, unknown>) {
  const client = getClient()
  const response = await client.responses.create({
    model: MODEL,
    input,
    metadata: sanitizeMetadata(metadata),
  })
  return response
}

export async function retrieveBackgroundResponse(responseId: string) {
  const client = getClient()
  return client.responses.retrieve(responseId)
}

export function extractResponseText(response: OpenAI.Responses.Response): BackgroundTaskResult {
  const parts = (response.output ?? []) as Array<any>
  const textChunks: string[] = []
  const reasoningChunks: string[] = []

  for (const part of parts) {
    if (part.type === 'output_text') {
      textChunks.push(part.text)
    }
    if (part.type === 'reasoning') {
      reasoningChunks.push(part.reasoning ?? '')
    }
    if (part.type === 'message') {
      for (const content of part.content ?? []) {
        if (content.type === 'output_text') {
          textChunks.push(content.text)
        }
        if (content.type === 'reasoning') {
          reasoningChunks.push(content.reasoning ?? '')
        }
      }
    }
  }

  return {
    text: textChunks.join('\n').trim(),
    reasoning: reasoningChunks.join('\n').trim() || undefined,
  }
}
