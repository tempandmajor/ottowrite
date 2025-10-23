/**
 * Submission Confirmation Page
 *
 * Review and confirm submission before sending to partners
 * Studio-only feature
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { canAccessSubmissions } from '@/lib/submissions/access'
import { SubmissionsUpgradeRequired } from '@/components/submissions/upgrade-required'
import { SubmissionConfirmation } from '@/components/submissions/submission-confirmation'

interface PageProps {
  params: Promise<{
    id: string
  }>
  searchParams: Promise<{
    partners?: string
  }>
}

export default async function ConfirmSubmissionPage({ params, searchParams }: PageProps) {
  const { id: submissionId } = await params
  const { partners: partnerIds } = await searchParams
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

  // Fetch the submission
  const { data: submission } = await supabase
    .from('manuscript_submissions')
    .select('*')
    .eq('id', submissionId)
    .eq('user_id', user.id)
    .single()

  if (!submission) {
    redirect('/dashboard/submissions')
  }

  // Parse and fetch selected partners
  if (!partnerIds) {
    redirect(`/dashboard/submissions/${submissionId}/select-partners`)
  }

  const partnerIdArray = partnerIds.split(',')

  const { data: partners } = await supabase
    .from('submission_partners')
    .select('*')
    .in('id', partnerIdArray)
    .eq('status', 'active')

  if (!partners || partners.length === 0) {
    redirect(`/dashboard/submissions/${submissionId}/select-partners`)
  }

  return (
    <div className="container max-w-4xl py-8">
      <SubmissionConfirmation submission={submission} partners={partners} />
    </div>
  )
}
