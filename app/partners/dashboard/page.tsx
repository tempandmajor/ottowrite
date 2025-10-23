/**
 * Partner Dashboard
 *
 * Dashboard for literary agents and publishers to view and manage manuscript submissions
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PartnerSubmissionInbox } from '@/components/partners/submission-inbox'
import { PartnerStats } from '@/components/partners/partner-stats'

export default async function PartnerDashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/auth/login?redirect=/partners/dashboard')
  }

  // Check if user is a partner
  const { data: partner, error: partnerError } = await supabase
    .from('submission_partners')
    .select('*')
    .eq('email', user.email)
    .single()

  if (partnerError || !partner) {
    return (
      <div className="container mx-auto py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-4">Partner Access Required</h1>
          <p className="text-muted-foreground mb-8">
            This area is for verified literary agents and publishers only.
          </p>
          <p className="text-sm text-muted-foreground">
            If you are a literary agent or publisher and would like to join our network,
            please contact us at{' '}
            <a href="mailto:partners@ottowrite.com" className="text-primary hover:underline">
              partners@ottowrite.com
            </a>
          </p>
        </div>
      </div>
    )
  }

  // Fetch submission statistics
  const { data: statsData } = await supabase
    .rpc('get_partner_submission_stats', {
      p_partner_id: partner.id,
    })
    .single()

  // Type the stats data
  const stats = statsData as {
    total_submissions: number
    new_submissions: number
    reviewed_submissions: number
    accepted_submissions: number
    rejected_submissions: number
    acceptance_rate: number
  } | null

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Partner Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {partner.name}
        </p>
      </div>

      {/* Statistics */}
      <PartnerStats stats={stats} partner={partner} />

      {/* Submission Inbox */}
      <div className="mt-8">
        <PartnerSubmissionInbox partnerId={partner.id} />
      </div>
    </div>
  )
}
