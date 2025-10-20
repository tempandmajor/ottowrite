import { createClient } from '@/lib/supabase/server'
import { errorResponses, successResponse } from '@/lib/api/error-response'

type PromptTemplate = {
  id: string
  name: string
  command: string
  content: string
}

const TEMPLATE_KEY = 'prompt_templates'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return errorResponses.unauthorized()
  }

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
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return errorResponses.unauthorized()
  }

  const body = await request.json().catch(() => null)
  const templates = Array.isArray(body?.templates) ? body.templates : []

  const sanitized: PromptTemplate[] = templates
    .filter(
      (item: any): item is PromptTemplate =>
        item &&
        typeof item === 'object' &&
        typeof item.id === 'string' &&
        typeof item.name === 'string' &&
        typeof item.command === 'string' &&
        typeof item.content === 'string'
    )
    .slice(0, 50) // safety cap

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
