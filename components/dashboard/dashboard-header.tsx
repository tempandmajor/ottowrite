'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SignOutButton } from '@/components/auth/sign-out-button'
import { NotificationsPanel } from '@/components/submissions/notifications-panel'

const quickLinks = [
  { label: 'Create Project', href: '/dashboard/projects?new=true' },
  { label: 'New Document', href: '/dashboard/documents?new=true' },
  { label: 'Manage plan', href: '/dashboard/account/usage' },
]

export function DashboardHeader({ email, userId }: { email: string; userId: string }) {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
            Ottowrite
          </Link>
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {pathname === '/dashboard' ? 'Overview' : 'Workspace'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationsPanel userId={userId} />
          <div className="hidden items-center gap-2 md:flex">
            {quickLinks.map((link) => (
              <Button key={link.href} variant="ghost" size="sm" asChild>
                <Link href={link.href} className="flex items-center gap-1 text-sm">
                  {link.label}
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-3 rounded-full border px-3 py-1.5 shadow-sm">
            <span className="text-xs text-muted-foreground">{email}</span>
            <SignOutButton className="text-xs" />
          </div>
        </div>
      </div>
    </header>
  )
}
