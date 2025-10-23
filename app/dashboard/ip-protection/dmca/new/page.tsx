/**
 * New DMCA Takedown Request Page
 *
 * Form for creating a new DMCA takedown request
 *
 * Ticket: MS-5.3
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { canAccessSubmissions } from '@/lib/submissions/access'
import { SubmissionsUpgradeRequired } from '@/components/submissions/upgrade-required'
import { DMCARequestForm } from '@/components/ip-protection/dmca-request-form'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function NewDMCARequestPage() {
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

  return (
    <div className="container max-w-7xl py-8">
      <div className="mb-8">
        <Link href="/dashboard/ip-protection/dmca">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to DMCA Requests
          </Button>
        </Link>
        <h1 className="text-3xl font-bold mb-2">New DMCA Takedown Request</h1>
        <p className="text-muted-foreground">
          Submit a Digital Millennium Copyright Act (DMCA) takedown request to report copyright
          infringement
        </p>
      </div>

      <DMCARequestForm />
    </div>
  )
}
