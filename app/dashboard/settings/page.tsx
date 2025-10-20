import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SettingsForm } from './settings-form'
import { getUsageSummary } from '@/lib/account/usage'

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select(
      'id, full_name, preferred_genres, writing_focus, writing_preferences, timezone, subscription_tier'
    )
    .eq('id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw error
  }

  const safeProfile =
    profile ?? {
      id: user.id,
      full_name: null,
      preferred_genres: [],
      writing_focus: null,
      writing_preferences: null,
      timezone: null,
      subscription_tier: null,
    }

  const usageSummary = await getUsageSummary(supabase, user.id)

  return (
    <SettingsForm
      profile={{
        id: safeProfile.id,
        fullName: safeProfile.full_name ?? '',
        preferredGenres: Array.isArray(safeProfile.preferred_genres)
          ? safeProfile.preferred_genres
          : [],
        writingFocus: safeProfile.writing_focus ?? 'prose',
        writingPreferences:
          (safeProfile.writing_preferences as Record<string, string> | null) ?? {},
        timezone: safeProfile.timezone ?? '',
      }}
      email={user.email ?? ''}
      usageSummary={usageSummary}
    />
  )
}
