'use client'

import Link from 'next/link'
import { ArrowUpRight, FileText, PenSquare, Users, LayoutPanelLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const actions = [
  {
    title: 'Create Project',
    description: 'Start a fresh story world with templates and AI planning tools.',
    href: '/dashboard/projects?new=true',
    icon: PenSquare,
    tooltip: 'Create a new writing project using AI-powered templates for novels, screenplays, series, plays, or short stories',
    shortcut: null,
  },
  {
    title: 'Research Notes',
    description: 'Organize research, references, and worldbuilding details.',
    href: '/dashboard/research',
    icon: FileText,
    tooltip: 'Create and manage research notes with categories, tags, and source references for your writing projects',
    shortcut: null,
  },
  {
    title: 'Writing Analytics',
    description: 'Review word counts, streaks, and writing session trends.',
    href: '/dashboard/analytics',
    icon: LayoutPanelLeft,
    tooltip: 'View detailed analytics about your writing productivity, including word count trends, writing streaks, and session history',
    shortcut: null,
  },
  {
    title: 'Manage Plan & Seats',
    description: 'Review usage, upgrade, and manage collaborators.',
    href: '/dashboard/account/usage',
    icon: Users,
    tooltip: 'Manage your subscription plan, review AI usage limits, and invite collaborators to your projects',
    shortcut: null,
  },
]

export function QuickActions() {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="grid gap-4 md:grid-cols-3">
        {actions.map((action) => (
          <Tooltip key={action.href}>
            <TooltipTrigger asChild>
              <div className="group relative flex h-full flex-col justify-between gap-4 rounded-2xl border bg-card/70 p-6 shadow-card transition hover:shadow-glow">
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
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-sm">
              <p className="text-xs">{action.tooltip}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  )
}
