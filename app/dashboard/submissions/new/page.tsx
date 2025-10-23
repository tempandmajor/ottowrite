/**
 * New Submission Page
 *
 * Studio-exclusive page for creating a new manuscript submission.
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { canAccessSubmissions } from '@/lib/submissions/access'
import { SubmissionsUpgradeRequired } from '@/components/submissions/upgrade-required'
import { SubmissionForm } from '@/components/submissions/submission-form'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'

export default async function NewSubmissionPage() {
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
      {/* Header */}
      <div className="mb-8">
        <Link href="/dashboard/submissions">
          <Button variant="ghost" size="sm" className="mb-4">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Submissions
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">New Submission</h1>
        <p className="text-muted-foreground mt-2">
          Create your submission package to send to literary agents and publishers
        </p>
      </div>

      {/* Submission Form */}
      <SubmissionForm />
    </div>
  )
}
