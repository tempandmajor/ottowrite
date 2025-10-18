'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { BeatBoard } from '@/components/screenplay/beat-board'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function ProjectBeatBoardPage() {
  const params = useParams()
  const projectId = params.id as string

  return (
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
  )
}
