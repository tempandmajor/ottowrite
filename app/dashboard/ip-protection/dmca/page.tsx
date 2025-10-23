/**
 * DMCA Takedown Requests Page
 *
 * Lists all DMCA takedown requests submitted by the author with:
 * - Status filtering
 * - Request statistics
 * - Quick actions (view, withdraw)
 *
 * Ticket: MS-5.3
 */

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { canAccessSubmissions } from '@/lib/submissions/access'
import { SubmissionsUpgradeRequired } from '@/components/submissions/upgrade-required'
import { DMCARequestsList } from '@/components/ip-protection/dmca-requests-list'
import { Button } from '@/components/ui/button'
import { Shield, Plus } from 'lucide-react'

export default async function DMCARequestsPage() {
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

  // User has access - show DMCA requests dashboard
  return (
    <div className="container max-w-7xl py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">DMCA Takedown Requests</h1>
          </div>
          <p className="text-muted-foreground">
            Report and track copyright infringement takedown requests
          </p>
        </div>
        <Link href="/dashboard/ip-protection/dmca/new">
          <Button size="lg">
            <Plus className="h-4 w-4 mr-2" />
            New DMCA Request
          </Button>
        </Link>
      </div>

      <DMCARequestsList userId={user.id} />
    </div>
  )
}
