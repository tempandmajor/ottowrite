/**
 * Ghostwriter Coming Soon Page
 *
 * Placeholder page shown when Ghostwriter feature is gated.
 * Displays feature preview, benefits, and waitlist signup.
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ComingSoonPage } from '@/components/features/coming-soon-page'
import { Sparkles } from 'lucide-react'
import { FEATURES, checkFeatureAccess } from '@/lib/features/feature-flags'

export default async function GhostwriterComingSoonPage() {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // If user has access, redirect to main page
  const access = await checkFeatureAccess(supabase, FEATURES.GHOSTWRITER, user.id)
  if (access.hasAccess) {
    redirect('/dashboard/ghostwriter')
  }

  return (
    <ComingSoonPage
      featureId={FEATURES.GHOSTWRITER}
      icon={<Sparkles className="h-6 w-6 text-primary" />}
      benefits={[
        'Generate story chunks with AI that maintains consistency with your existing content',
        'Track character traits, plot points, and story context across generations',
        'Review and refine AI-generated content with built-in quality scoring',
        'Seamlessly integrate chunks into your manuscripts',
        'Manage your monthly word quota and track generation statistics',
        'Accept high-quality chunks or regenerate with different parameters',
      ]}
    />
  )
}
