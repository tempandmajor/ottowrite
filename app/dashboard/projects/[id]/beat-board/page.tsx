'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { BeatBoard } from '@/components/screenplay/beat-board'
import { BreadcrumbNav } from '@/components/dashboard/breadcrumb-nav'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function ProjectBeatBoardPage() {
  const params = useParams()
  const projectId = params.id as string
  const [projectName, setProjectName] = useState<string>('')

  useEffect(() => {
    async function loadProject() {
      const supabase = createClient()
      const { data } = await supabase
        .from('projects')
        .select('name')
        .eq('id', projectId)
        .single()

      if (data) {
        setProjectName(data.name)
      }
    }
    loadProject()
  }, [projectId])

  return (
    <div className="space-y-4">
      <BreadcrumbNav
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Projects', href: '/dashboard/projects' },
          { label: projectName || 'Project', href: `/dashboard/projects/${projectId}` },
          { label: 'Story Structure' },
        ]}
      />
      <div className="space-y-8">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/dashboard/projects/${projectId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to project
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-semibold text-foreground">Beat board</h1>
            <p className="text-sm text-muted-foreground">
              Arrange scenes across plot tracks, color-code beats, and keep your story arcs aligned.
            </p>
          </div>
        </div>

        <BeatBoard projectId={projectId} />
      </div>
    </div>
  )
}
