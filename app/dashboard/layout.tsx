import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'

// Force dynamic rendering - this layout uses cookies for auth
export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error) {
      console.error('Dashboard layout: Supabase auth error:', error)
      redirect('/auth/login')
    }

    if (!user) {
      redirect('/auth/login')
    }

    return (
      <div className="min-h-screen bg-background font-sans text-foreground">
        <DashboardHeader email={user.email ?? ''} userId={user.id} />
        <DashboardShell>{children}</DashboardShell>
      </div>
    )
  } catch (error) {
    console.error('Dashboard layout: Failed to create Supabase client:', error)
    // Redirect to login if Supabase client creation fails
    redirect('/auth/login')
  }
}
