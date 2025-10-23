/**
 * Partner Submission Detail Page
 *
 * View full manuscript submission and respond
 */

import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PartnerManuscriptViewer } from '@/components/partners/manuscript-viewer'
import { PartnerResponseForm } from '@/components/partners/response-form'

interface PageProps {
  params: Promise<{
    submissionId: string
  }>
}

export default async function PartnerSubmissionDetailPage({ params }: PageProps) {
  const supabase = await createClient()
  const { submissionId } = await params

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/auth/login?redirect=/partners/dashboard')
  }

  // Check if user is a partner
  const { data: partner } = await supabase
    .from('submission_partners')
    .select('*')
    .eq('email', user.email)
    .single()

  if (!partner) {
    redirect('/partners/dashboard')
  }

  // Fetch the partner submission
  const { data: partnerSubmission, error: submissionError } = await supabase
    .from('partner_submissions')
    .select(`
      *,
      manuscript_submissions (
        id,
        title,
        genre,
        word_count,
        query_letter,
        synopsis,
        sample_pages,
        sample_pages_count,
        user_id,
        user_profiles (
          full_name,
          email
        )
      )
    `)
    .eq('id', submissionId)
    .eq('partner_id', partner.id)
    .single()

  if (submissionError || !partnerSubmission) {
    notFound()
  }

  const submission = partnerSubmission.manuscript_submissions

  // Mark as viewed if not already
  if (partnerSubmission.status === 'submitted') {
    await supabase
      .from('partner_submissions')
      .update({
        status: 'viewed',
        viewed_at: new Date().toISOString(),
      })
      .eq('id', submissionId)
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <PartnerManuscriptViewer
        submission={submission}
        partnerSubmission={partnerSubmission}
        partner={partner}
      />

      <div className="mt-8">
        <PartnerResponseForm
          submissionId={submissionId}
          partnerId={partner.id}
          currentStatus={partnerSubmission.status}
          currentResponse={partnerSubmission.response_message}
        />
      </div>
    </div>
  )
}
