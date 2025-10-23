/**
 * Partner Selection Page
 *
 * Allows users to select partners to submit their manuscript to
 * Studio-only feature
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { canAccessSubmissions } from '@/lib/submissions/access'
import { SubmissionsUpgradeRequired } from '@/components/submissions/upgrade-required'
import { PartnerSelectionFlow } from '@/components/submissions/partner-selection-flow'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function SelectPartnersPage({ params }: PageProps) {
  const { id: submissionId } = await params
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

  // Fetch the submission to get manuscript details
  const { data: submission } = await supabase
    .from('manuscript_submissions')
    .select('*')
    .eq('id', submissionId)
    .eq('user_id', user.id) // Ensure user owns this submission
    .single()

  if (!submission) {
    redirect('/dashboard/submissions')
  }

  return (
    <div className="container max-w-7xl py-8">
      <PartnerSelectionFlow submission={submission} />
    </div>
  )
}
