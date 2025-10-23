/**
 * Manuscript Submission Coming Soon Page
 *
 * Placeholder page shown when Manuscript Submission feature is gated.
 * Displays feature preview, benefits, and waitlist signup.
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ComingSoonPage } from '@/components/features/coming-soon-page'
import { FileText } from 'lucide-react'
import { FEATURES, checkFeatureAccess } from '@/lib/features/feature-flags'

export default async function ManuscriptSubmissionComingSoonPage() {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // If user has access, redirect to main page
  const access = await checkFeatureAccess(supabase, FEATURES.MANUSCRIPT_SUBMISSION, user.id)
  if (access.hasAccess) {
    redirect('/dashboard/submissions')
  }

  return (
    <ComingSoonPage
      featureId={FEATURES.MANUSCRIPT_SUBMISSION}
      icon={<FileText className="h-6 w-6 text-primary" />}
      benefits={[
        'Submit manuscripts to agents and publishers directly from the platform',
        'Track submission status and partner responses in real-time with a centralized dashboard',
        'Protect your intellectual property with watermarking and DRM tracking',
        'Monitor who views and downloads your submissions with detailed access logs',
        'Generate AI-powered query letters and synopses tailored to each partner',
        'Access detailed analytics on submission performance and partner engagement',
        'Manage DMCA takedown requests if unauthorized distribution is detected',
        'Configure notification preferences for submission events',
      ]}
    />
  )
}
