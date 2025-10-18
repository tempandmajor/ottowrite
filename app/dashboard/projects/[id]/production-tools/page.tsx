'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FormatValidator } from '@/components/screenplay/format-validator'
import { BreakdownSheets } from '@/components/screenplay/breakdown-sheets'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Loader2, Wand2 } from 'lucide-react'

type ProjectSummary = {
  id: string
  name: string
  type: string
}

export default function ProductionToolsPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [project, setProject] = useState<ProjectSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [scriptText, setScriptText] = useState('')

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
        .select('id, name, type')
        .eq('id', params.id)
        .eq('user_id', user.id)
        .single()

      if (error || !data) {
        throw error ?? new Error('Project not found.')
      }

      setProject(data)
    } catch (error) {
      console.error('Failed to load project production tools:', error)
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
        <p>Loading production tools…</p>
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
            <h1 className="text-3xl font-semibold text-foreground">Format & production tools</h1>
            <p className="text-sm text-muted-foreground">
              Validate screenplay pages, auto-build breakdown sheets, and prep for scheduling.
            </p>
          </div>
        </div>
      </div>

      <Card className="border border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-primary" />
            Screenplay workspace
          </CardTitle>
          <CardDescription>
            Paste a scene or the entire script. We use it to power formatting checks and production breakdowns locally in your browser.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="production-script">Script excerpt</Label>
            <Textarea
              id="production-script"
              rows={14}
              value={scriptText}
              onChange={(event) => setScriptText(event.target.value)}
              placeholder="Paste your screenplay here. Include scene headings (INT./EXT.), dialogue cues, and action lines."
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Nothing is stored server-side—analysis happens instantly in the browser for quick iteration.
          </p>
        </CardContent>
      </Card>

      <FormatValidator scriptText={scriptText} />

      <BreakdownSheets scriptText={scriptText} />
    </div>
  )
}
