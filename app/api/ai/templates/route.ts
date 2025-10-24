import { errorResponses, successResponse } from '@/lib/api/error-response'
import { requireAuth } from '@/lib/api/auth-helpers'
import { requireAIRateLimit } from '@/lib/api/rate-limit-helpers'
import { z } from 'zod'

type PromptTemplate = {
  id: string
  name: string
  command: string
  content: string
}

const TEMPLATE_KEY = 'prompt_templates'

// Validation schema for prompt templates
const promptTemplateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  command: z.string().min(1).max(50),
  content: z.string().min(1).max(5000),
})

const updateTemplatesSchema = z.object({
  templates: z.array(promptTemplateSchema).max(50),
})

export async function GET(request: Request) {
  // Auth and rate limiting
  const { user, supabase } = await requireAuth(request)
  await requireAIRateLimit(request, user.id)

  const { data, error } = await supabase
    .from('user_profiles')
    .select('writing_preferences')
    .eq('id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') {
    return errorResponses.internalError('Failed to load prompt templates', {
      details: error,
      userId: user.id,
    })
  }

  const rawPreferences = data?.writing_preferences
  let templates: PromptTemplate[] = []
  if (rawPreferences && typeof rawPreferences === 'object') {
    const stored = (rawPreferences as Record<string, unknown>)[TEMPLATE_KEY]
    if (Array.isArray(stored)) {
      templates = stored.filter((item): item is PromptTemplate => {
        return (
          item &&
          typeof item === 'object' &&
          typeof item.id === 'string' &&
          typeof item.name === 'string' &&
          typeof item.command === 'string' &&
          typeof item.content === 'string'
        )
      })
    }
  }

  return successResponse({ templates })
}

export async function PUT(request: Request) {
  // Auth and rate limiting
  const { user, supabase } = await requireAuth(request)
  await requireAIRateLimit(request, user.id)

  // Validate input
  const body = await request.json().catch(() => null)
  const validation = updateTemplatesSchema.safeParse(body)

  if (!validation.success) {
    return errorResponses.validationError('Invalid template data', {
      details: validation.error.issues,
    })
  }

  const sanitized = validation.data.templates

  const { data: profileData, error: profileError } = await supabase
    .from('user_profiles')
    .select('writing_preferences')
    .eq('id', user.id)
    .single()

  if (profileError && profileError.code !== 'PGRST116') {
    return errorResponses.internalError('Failed to load profile preferences', {
      details: profileError,
      userId: user.id,
    })
  }

  const preferences: Record<string, unknown> =
    (profileData?.writing_preferences as Record<string, unknown>) ?? {}
  preferences[TEMPLATE_KEY] = sanitized

  const { error: updateError } = await supabase
    .from('user_profiles')
    .update({
      writing_preferences: preferences,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (updateError) {
    return errorResponses.internalError('Failed to save prompt templates', {
      details: updateError,
      userId: user.id,
    })
  }

  return successResponse({ templates: sanitized })
}
