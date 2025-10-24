/**
 * Beginner Dashboard Component
 *
 * Dashboard for users with 1-2 projects.
 * Shows welcome message, basic stats, recent projects, and getting started checklist.
 * Implements progressive disclosure (Miller's Law).
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TemplateDialog } from '@/components/dashboard/template-dialog'
import { StatCard } from '@/components/dashboard/stat-card'
import { GettingStartedChecklist } from '@/components/dashboard/getting-started-checklist'
import { Sparkles, PenSquare, ArrowUpRight, FileText } from 'lucide-react'

interface Project {
  id: string
  name: string
  type: string
  created_at: string
}

interface OnboardingChecklist {
  created_first_project: boolean
  added_first_character: boolean
  wrote_first_100_words: boolean
  used_ai_assistant: boolean
}

interface BeginnerDashboardProps {
  projects: Project[]
  stats: {
    projectCount: number
    documentCount: number
    totalWordsGenerated: number
  }
  checklistProgress?: OnboardingChecklist
}

export function BeginnerDashboard({ projects, stats, checklistProgress }: BeginnerDashboardProps) {
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)

  return (
    <div className="space-y-12">
      {/* Getting Started Checklist */}
      {checklistProgress && (
        <GettingStartedChecklist initialProgress={checklistProgress} />
      )}

      {/* Hero Section - Simplified */}
      <section className="flex flex-col gap-6 rounded-2xl bg-gradient-to-br from-primary/10 via-background to-accent/5 p-10 shadow-lg">
        <div className="space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
            <Sparkles className="h-4 w-4" />
            Your Writing Space
          </div>
          <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Keep writing!
            </h1>
            <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
              You&apos;re off to a great start. Continue building your projects and exploring Ottowrite&apos;s tools.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              size="lg"
              className="h-12 px-6 text-base font-semibold shadow-md"
              onClick={() => setShowTemplateDialog(true)}
            >
              <PenSquare className="mr-2 h-5 w-5" />
              New Project
            </Button>
            <Button variant="outline" size="lg" className="h-12 px-6" asChild>
              <Link href="/dashboard/projects">
                View All Projects
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Stats - Simplified to 2 cards */}
      <section className="grid gap-4 md:grid-cols-2">
        <StatCard
          label="Projects"
          value={stats.projectCount}
          helper="Keep building"
          icon={<PenSquare className="h-6 w-6" />}
          tone="primary"
          priority="high"
          tooltip="Total number of writing projects you've created"
        />
        <StatCard
          label="Documents"
          value={stats.documentCount}
          helper="Works in progress"
          icon={<FileText className="h-5 w-5" />}
          tone="secondary"
          tooltip="Active documents across all your projects"
        />
      </section>

      {/* Recent Projects */}
      <section className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Your Projects</h2>
            <p className="text-sm text-muted-foreground">
              Continue where you left off
            </p>
          </div>
          {projects.length > 1 && (
            <Button variant="ghost" asChild>
              <Link href="/dashboard/projects" className="flex items-center gap-2 text-sm font-medium">
                View all
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((project) => (
            <div
              key={project.id}
              className="rounded-2xl border bg-card/80 p-6 shadow-card transition hover:shadow-lg"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground">{project.name}</h3>
                  <Badge variant="muted" className="capitalize">
                    {project.type.replace('_', ' ')}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Last updated {new Date(project.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="mt-5 flex items-center gap-3">
                <Button asChild>
                  <Link href={`/dashboard/projects/${project.id}`}>Open project</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href={`/dashboard/projects/${project.id}/characters`}>Characters</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <TemplateDialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog} />
    </div>
  )
}
