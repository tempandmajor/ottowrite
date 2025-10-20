import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .select('writing_preferences')
    .eq('id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json(
      { error: 'Failed to load prompt templates' },
      { status: 500 }
    )
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

  return NextResponse.json({ templates })
}

export async function PUT(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const templates = Array.isArray(body?.templates) ? body.templates : []

  const sanitized: PromptTemplate[] = templates
    .filter(
      (item): item is PromptTemplate =>
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
    return NextResponse.json(
      { error: 'Failed to load profile preferences' },
      { status: 500 }
    )
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
    return NextResponse.json(
      { error: 'Failed to save prompt templates' },
      { status: 500 }
    )
  }

  return NextResponse.json({ templates: sanitized })
}
