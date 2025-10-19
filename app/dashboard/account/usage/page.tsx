import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUsageSummary } from '@/lib/account/usage'
import { UsageDashboard } from '@/components/account/usage-dashboard'

export default async function AccountUsagePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, full_name')
    .eq('id', user.id)
    .maybeSingle()

  const usageSummary = await getUsageSummary(supabase, user.id)

  return (
    <UsageDashboard
      userEmail={user.email ?? ''}
      usageSummary={usageSummary}
      fullName={profile?.full_name ?? ''}
    />
  )
}
