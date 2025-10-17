import * as React from 'react'
import { DashboardNav } from './dashboard-nav'
import { cn } from '@/lib/utils'

export function DashboardShell({ children, email }: { children: React.ReactNode; email: string }) {
  return (
    <div className="relative min-h-screen bg-[radial-gradient(circle_at_top,_rgba(79,70,229,0.08),_transparent_55%)]">
      <a
        href="#main-content"
        className="absolute left-4 top-4 z-50 -translate-y-full rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg transition focus-visible:translate-y-0"
      >
        Skip to content
      </a>
      <div className="mx-auto grid min-h-screen max-w-6xl gap-8 px-6 py-8 lg:grid-cols-[260px_1fr]">
        <DashboardNav />
        <main id="main-content" className="relative flex flex-1 flex-col pb-12">
          {children}
        </main>
      </div>
    </div>
  )
}
