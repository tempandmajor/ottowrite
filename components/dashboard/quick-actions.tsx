'use client'

import Link from 'next/link'
import { ArrowUpRight, FileText, PenSquare, Users, LayoutPanelLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

const actions = [
  {
    title: 'Create Project',
    description: 'Start a fresh story world with templates and AI planning tools.',
    href: '/dashboard/projects?new=true',
    icon: PenSquare,
  },
  {
    title: 'Generate Outline',
    description: 'Use the AI assistant to shape your next chapter or episode.',
    href: '/dashboard/outlines?new=true',
    icon: FileText,
  },
  {
    title: 'Writing Analytics',
    description: 'Review word counts, streaks, and writing session trends.',
    href: '/dashboard/analytics',
    icon: LayoutPanelLeft,
  },
  {
    title: 'Invite Collaborator',
    description: 'Share your workspace with co-writers and editors.',
    href: '/dashboard/settings/team',
    icon: Users,
  },
]

export function QuickActions() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {actions.map((action) => (
        <div
          key={action.href}
          className="group relative flex h-full flex-col justify-between gap-4 rounded-2xl border bg-card/70 p-6 shadow-card transition hover:shadow-glow"
        >
          <div className="space-y-3">
            <span className="inline-flex rounded-full bg-secondary p-2 text-secondary-foreground">
              <action.icon className="h-5 w-5" />
            </span>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-foreground">{action.title}</h3>
              <p className="text-sm text-muted-foreground">{action.description}</p>
            </div>
          </div>
          <Button variant="link" className="px-0" asChild>
            <Link href={action.href} className="flex items-center gap-1 text-foreground">
              Open
              <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-1 group-hover:-translate-y-1" />
            </Link>
          </Button>
        </div>
      ))}
    </div>
  )
}
