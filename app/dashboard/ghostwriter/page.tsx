/**
 * Ghostwriter Landing Page
 *
 * Main dashboard for the Ghostwriter AI agent feature.
 * Shows usage stats, recent generations, and feature explainers.
 *
 * Ticket: 1.1 - Add Ghostwriter to Sidebar & Create Landing Page
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { GhostwriterDashboard } from '@/components/ghostwriter/ghostwriter-dashboard'

export default async function GhostwriterPage() {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  return <GhostwriterDashboard userId={user.id} />
}
