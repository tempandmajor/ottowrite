import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { DashboardNav } from '@/components/dashboard/dashboard-nav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <DashboardHeader email={user.email ?? ''} />
      <DashboardShell email={user.email ?? ''}>{children}</DashboardShell>
    </div>
  )
}
