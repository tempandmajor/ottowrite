'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { TemplateDialog } from '@/components/dashboard/template-dialog'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { StatCard } from '@/components/dashboard/stat-card'
import { EmptyState } from '@/components/dashboard/empty-state'
import { DashboardLoading } from '@/components/dashboard/loading-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowUpRight, FileText, PenSquare, Sparkles } from 'lucide-react'

interface Project {
  id: string
  name: string
  type: string
  created_at: string
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)
  const [stats, setStats] = useState({
    projectCount: 0,
    documentCount: 0,
    totalWordsGenerated: 0,
  })
  const [projects, setProjects] = useState<Project[]>([])

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    try {
      const supabase = createClient()
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        console.error('Dashboard load: failed to fetch user', userError)
        window.location.href = '/auth/login'
        return
      }

      if (!user) {
        window.location.href = '/auth/login'
        return
      }

      const [projectsResponse, documentsResponse, aiUsageResponse] = await Promise.all([
        supabase
          .from('projects')
          .select('*', { count: 'exact' })
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('documents')
          .select('*', { count: 'exact' })
          .eq('user_id', user.id),
        supabase
          .from('ai_usage')
          .select('words_generated')
          .eq('user_id', user.id),
      ])

      if (projectsResponse.error) {
        throw projectsResponse.error
      }
      if (documentsResponse.error) {
        throw documentsResponse.error
      }
      if (aiUsageResponse.error) {
        throw aiUsageResponse.error
      }

      const projectCount = projectsResponse.count ?? 0
      const documentCount = documentsResponse.count ?? 0
      const aiUsage = aiUsageResponse.data ?? []

      const totalWordsGenerated =
        aiUsage.reduce((sum, record) => sum + (record?.words_generated || 0), 0) || 0

      setStats({
        projectCount,
        documentCount,
        totalWordsGenerated,
      })
      setProjects(projectsResponse.data ?? [])
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <DashboardLoading />
  }

  return (
    <div className="space-y-12">
      <section className="flex flex-col gap-6 rounded-3xl bg-gradient-to-r from-muted via-background to-muted p-8 shadow-card md:flex-row md:items-center md:justify-between">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-wide text-secondary-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            Workspace Overview
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Welcome back, storyteller.
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
              Keep your narratives, characters, and outlines aligned. Here’s what’s happening across your workspace today.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="lg" onClick={() => setShowTemplateDialog(true)}>
              <PenSquare className="h-4 w-4 mr-2" />
              New from Template
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/dashboard/projects">
                View Projects
                <ArrowUpRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-3 rounded-2xl border bg-card/70 p-6 shadow-card">
          <p className="text-sm font-medium text-muted-foreground">Recent milestones</p>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-center justify-between">
              <span>Projects created</span>
              <Badge variant="outline" className="text-primary">
                {stats.projectCount}
              </Badge>
            </li>
            <li className="flex items-center justify-between">
              <span>Active documents</span>
              <Badge variant="outline">{stats.documentCount}</Badge>
            </li>
            <li className="flex items-center justify-between">
              <span>AI words generated</span>
              <Badge variant="outline">{stats.totalWordsGenerated.toLocaleString()}</Badge>
            </li>
          </ul>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Projects"
          value={stats.projectCount}
          helper="Across all genres"
          icon={<PenSquare className="h-5 w-5" />}
          delta={{ value: '+2 this month', positive: true }}
        />
        <StatCard
          label="Documents"
          value={stats.documentCount}
          helper="Works in progress"
          icon={<FileText className="h-5 w-5" />}
        />
        <StatCard
          label="AI words"
          value={stats.totalWordsGenerated.toLocaleString()}
          helper="Saved via Ottowrite"
          icon={<Sparkles className="h-5 w-5" />}
          tone="accent"
        />
      </section>

      <section className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Recent projects</h2>
            <p className="text-sm text-muted-foreground">
              Resume where you left off or spin up something new.
            </p>
          </div>
          <Button variant="ghost" asChild>
            <Link href="/dashboard/projects" className="flex items-center gap-2 text-sm font-medium">
              View all projects
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        {projects.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {projects.map((project) => (
              <div key={project.id} className="rounded-2xl border bg-card/80 p-6 shadow-card transition hover:shadow-lg">
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
        ) : (
          <EmptyState
            icon={PenSquare}
            title="No projects yet"
            description="Start your first project to unlock AI-assisted outlining, character management, and scene planning."
            action={{ label: 'Create project', href: '/dashboard/projects?new=true' }}
            secondaryAction={{ label: 'Browse templates', href: '/dashboard/projects' }}
          />
        )}
      </section>

      <section className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Quick actions</h2>
            <p className="text-sm text-muted-foreground">
              Accelerate your writing workflow with these shortcuts.
            </p>
          </div>
        </div>
        <QuickActions />
      </section>

      <TemplateDialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog} />
    </div>
  )
}
