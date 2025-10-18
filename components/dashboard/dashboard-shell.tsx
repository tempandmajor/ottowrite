import * as React from 'react'
import { DashboardNav } from './dashboard-nav'

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-background">
      <a
        href="#main-content"
        className="absolute left-4 top-4 z-50 -translate-y-full rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg transition focus-visible:translate-y-0"
      >
        Skip to content
      </a>
      <div className="mx-auto grid min-h-screen w-full max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[260px_1fr] lg:px-8">
        <DashboardNav />
        <main id="main-content" className="relative flex flex-1 flex-col pb-12">
          {children}
        </main>
      </div>
    </div>
  )
}
