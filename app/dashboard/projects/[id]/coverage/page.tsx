'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CoverageGenerator } from '@/components/screenplay/coverage-generator'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Loader2 } from 'lucide-react'

type ProjectSummary = {
  id: string
  name: string
  genre: string[] | null
}

export default function CoveragePage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [project, setProject] = useState<ProjectSummary | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProject = useCallback(async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
        return
      }

      const { data, error } = await supabase
        .from('projects')
        .select('id, name, genre')
        .eq('id', params.id)
        .eq('user_id', user.id)
        .single()

      if (error || !data) {
        throw error ?? new Error('Project not found.')
      }

      setProject(data)
    } catch (error) {
      console.error('Failed to load project for coverage:', error)
      toast({
        title: 'Project not found',
        description: 'We could not find that project in your workspace.',
        variant: 'destructive',
      })
      router.push('/dashboard/projects')
    } finally {
      setLoading(false)
    }
  }, [params.id, router, toast])

  useEffect(() => {
    loadProject()
  }, [loadProject])

  if (loading) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p>Loading project details...</p>
      </div>
    )
  }

  if (!project) {
    return null
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/dashboard/projects/${project.id}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to project
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-semibold text-foreground">Script coverage</h1>
            <p className="text-sm text-muted-foreground">
              Request loglines, multi-page synopses, and reader notes to guide revisions.
            </p>
          </div>
        </div>
      </div>

      <CoverageGenerator
        projectId={project.id}
        defaultTitle={project.name}
        defaultGenres={project.genre ?? []}
      />
    </div>
  )
}
