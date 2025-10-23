/**
 * Submission Analytics Page
 *
 * Displays comprehensive analytics and insights for manuscript submissions.
 *
 * Ticket: MS-4.3
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { canAccessSubmissions } from '@/lib/submissions/access'
import { SubmissionsUpgradeRequired } from '@/components/submissions/upgrade-required'
import { AnalyticsDashboard } from '@/components/submissions/analytics-dashboard'

export default async function SubmissionAnalyticsPage() {
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
    .select('subscription_tier, subscription_status, subscription_current_period_end')
    .eq('id', user.id)
    .single()

  // Check Studio access
  const accessResult = canAccessSubmissions(profile)

  // Show upgrade page if no access
  if (!accessResult.hasAccess) {
    return <SubmissionsUpgradeRequired currentPlan={accessResult.currentTier} />
  }

  // User has access - show analytics dashboard
  return (
    <div className="container max-w-7xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Submission Analytics</h1>
        <p className="text-muted-foreground">
          Track your performance and gain insights into your submission strategy
        </p>
      </div>

      <AnalyticsDashboard userId={user.id} />
    </div>
  )
}
