'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type Project = {
  id: string
  name: string
  type: string
  created_at: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    projectCount: 0,
    documentCount: 0,
    totalWordsGenerated: 0,
  })
  const [projects, setProjects] = useState<Project[]>([])

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
        return
      }

      // Get user stats
      const { data: projectsData, count: projectCount } = await supabase
        .from('projects')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .limit(5)

      const { data: documentsData, count: documentCount } = await supabase
        .from('documents')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .limit(5)

      const { data: aiUsage } = await supabase
        .from('ai_usage')
        .select('words_generated')
        .eq('user_id', user.id)

      const totalWordsGenerated =
        aiUsage?.reduce((sum, record) => sum + (record.words_generated || 0), 0) || 0

      setStats({
        projectCount: projectCount || 0,
        documentCount: documentCount || 0,
        totalWordsGenerated,
      })
      setProjects(projectsData || [])
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome back! Here's an overview of your writing projects.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Total Projects</CardDescription>
            <CardTitle className="text-3xl">{stats.projectCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Total Documents</CardDescription>
            <CardTitle className="text-3xl">{stats.documentCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>AI Words Generated</CardDescription>
            <CardTitle className="text-3xl">{stats.totalWordsGenerated.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Recent Projects */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Recent Projects</h2>
          <Button asChild>
            <Link href="/dashboard/projects">View All</Link>
          </Button>
        </div>
        {projects && projects.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {projects.map((project) => (
              <Card key={project.id}>
                <CardHeader>
                  <CardTitle>{project.name}</CardTitle>
                  <CardDescription>
                    {project.type} • {new Date(project.created_at).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" asChild>
                    <Link href={`/dashboard/projects/${project.id}`}>Open</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                No projects yet.{' '}
                <Link href="/dashboard/projects" className="underline">
                  Create your first project
                </Link>
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
