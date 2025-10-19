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

  if (error) {
    throw error
  }

  const usageSummary = await getUsageSummary(supabase, user.id)

  return (
    <SettingsForm
      profile={{
        id: profile.id,
        fullName: profile.full_name ?? '',
        preferredGenres: profile.preferred_genres ?? [],
        writingFocus: profile.writing_focus ?? 'prose',
        writingPreferences:
          (profile.writing_preferences as Record<string, string> | null) ?? {},
        timezone: profile.timezone ?? '',
      }}
      email={user.email ?? ''}
      usageSummary={usageSummary}
    />
  )
}
