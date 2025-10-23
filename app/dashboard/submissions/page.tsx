/**
 * Manuscript Submissions Dashboard Page
 *
 * Studio-exclusive feature for submitting manuscripts to agents and publishers.
 * Users without Studio subscription will see upgrade prompt.
 * Feature Gating: Redirects to coming soon page if feature is not enabled
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { canAccessSubmissions } from '@/lib/submissions/access'
import { SubmissionsUpgradeRequired } from '@/components/submissions/upgrade-required'
import { SubmissionsDashboard } from '@/components/submissions/submissions-dashboard'
import { FEATURES, checkFeatureAccess } from '@/lib/features/feature-flags'

export default async function SubmissionsPage() {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Check feature access (coming soon gate)
  const featureAccess = await checkFeatureAccess(supabase, FEATURES.MANUSCRIPT_SUBMISSION, user.id)
  if (!featureAccess.hasAccess && featureAccess.reason === 'coming_soon') {
    redirect('/dashboard/submissions/coming-soon')
  }

  // Get user profile with subscription info
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('subscription_tier, subscription_status, subscription_current_period_end')
    .eq('id', user.id)
    .single()

  // Check Studio access (tier-based access)
  const accessResult = canAccessSubmissions(profile)

  // Show upgrade page if no tier access
  if (!accessResult.hasAccess) {
    return <SubmissionsUpgradeRequired currentPlan={accessResult.currentTier} />
  }

  // User has access - show submissions dashboard
  return <SubmissionsDashboard userId={user.id} />
}
