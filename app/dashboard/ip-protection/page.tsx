/**
 * IP Protection Dashboard Page
 *
 * Provides authors with visibility into manuscript security and access patterns.
 * Shows DRM status, access logs, and security alerts for all submissions.
 *
 * Ticket: MS-3.4
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { canAccessSubmissions } from '@/lib/submissions/access'
import { SubmissionsUpgradeRequired } from '@/components/submissions/upgrade-required'
import { SubmissionSecurityOverview } from '@/components/ip-protection/submission-security-overview'
import { AccessTimelineChart } from '@/components/ip-protection/access-timeline-chart'
import { SecurityAlertsPanel } from '@/components/ip-protection/security-alerts-panel'
import { RecentAccessLogs } from '@/components/ip-protection/recent-access-logs'
import { DMCARequestsList } from '@/components/ip-protection/dmca-requests-list'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Shield } from 'lucide-react'

export default async function IPProtectionPage() {
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

  // User has access - show IP protection dashboard
  return (
    <div className="container max-w-7xl py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">IP Protection Dashboard</h1>
          </div>
          <p className="text-muted-foreground">
            Monitor manuscript security, access patterns, and suspicious activity
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="access-logs">Access Logs</TabsTrigger>
          <TabsTrigger value="alerts">Security Alerts</TabsTrigger>
          <TabsTrigger value="dmca">DMCA Takedowns</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <SubmissionSecurityOverview userId={user.id} />
          <AccessTimelineChart userId={user.id} />
        </TabsContent>

        <TabsContent value="access-logs" className="space-y-6">
          <RecentAccessLogs userId={user.id} />
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <SecurityAlertsPanel userId={user.id} />
        </TabsContent>

        <TabsContent value="dmca" className="space-y-6">
          <DMCARequestsList userId={user.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
