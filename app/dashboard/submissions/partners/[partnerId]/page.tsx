/**
 * Partner Profile Page
 *
 * Displays detailed information about a submission partner
 * Studio-only feature
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { canAccessSubmissions } from '@/lib/submissions/access'
import { SubmissionsUpgradeRequired } from '@/components/submissions/upgrade-required'
import { PartnerProfile } from '@/components/submissions/partner-profile'

interface PageProps {
  params: Promise<{
    partnerId: string
  }>
  searchParams: Promise<{
    submission?: string
  }>
}

export default async function PartnerProfilePage({ params, searchParams }: PageProps) {
  const { partnerId } = await params
  const { submission: submissionId } = await searchParams
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Get user profile with subscription info
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('subscription_tier, subscription_status')
    .eq('id', user.id)
    .single()

  // Check Studio access
  const accessResult = canAccessSubmissions(profile)

  // Show upgrade page if no access
  if (!accessResult.hasAccess) {
    return <SubmissionsUpgradeRequired currentPlan={accessResult.currentTier} />
  }

  return <PartnerProfile partnerId={partnerId} submissionId={submissionId} />
}
