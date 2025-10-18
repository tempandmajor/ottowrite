'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Loader2, RefreshCw, FileText, ClipboardCopy } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export type BackgroundTask = {
  id: string
  user_id: string
  project_id: string | null
  document_id: string | null
  task_type: string
  prompt: string
  status: 'queued' | 'running' | 'succeeded' | 'failed'
  provider: string | null
  provider_response_id: string | null
  result: { text?: string; reasoning?: string } | null
  error: string | null
  created_at: string
  updated_at: string
}

type TaskPreset = {
  type: string
  label: string
  description: string
  buildPrompt: (context: string, title?: string) => string
}

type BackgroundTaskMonitorProps = {
  documentId: string
  projectId?: string | null
  documentTitle?: string | null
  documentContent: string
  onInsert?: (text: string) => void
}

const PRESETS: TaskPreset[] = [
  {
    type: 'manuscript_analysis',
    label: 'Full manuscript analysis',
    description: 'Comprehensive feedback on pacing, structure, and character arcs.',
    buildPrompt: (content, title) =>
      `Perform a comprehensive analysis of the following manuscript${title ? ` titled "${title}"` : ''}. Highlight pacing issues, inconsistencies, weak scenes, and opportunities for improvement. Provide actionable recommendations.

MANUSCRIPT:\n${content}`,
  },
  {
    type: 'expanded_outline',
    label: 'Generate expanded outline',
    description: 'Create an outline that elaborates on the current draft.',
    buildPrompt: (content, title) =>
      `Using the current draft${title ? ` of "${title}"` : ''}, generate an expanded outline that lists chapters/scenes, goals, conflicts, and cliffhangers.

CURRENT DRAFT:\n${content}`,
  },
  {
    type: 'chapter_critique',
    label: 'Multi-chapter critique',
    description: 'Detailed critique focusing on tone, continuity, and character voice.',
    buildPrompt: (content, title) =>
      `Critique the following chapters${title ? ` from "${title}"` : ''}. Focus on tone consistency, continuity, and character voice. Provide targeted revisions.

CHAPTERS:\n${content}`,
  },
]

function formatStatus(status: BackgroundTask['status']) {
  switch (status) {
    case 'queued':
      return { label: 'Queued', className: 'bg-muted text-muted-foreground' }
    case 'running':
      return { label: 'Running', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-100' }
    case 'succeeded':
      return { label: 'Completed', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-100' }
    case 'failed':
      return { label: 'Failed', className: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-100' }
    default:
      return { label: status, className: 'bg-muted text-muted-foreground' }
  }
}

export function BackgroundTaskMonitor({
  documentId,
  projectId,
  documentTitle,
  documentContent,
  onInsert,
}: BackgroundTaskMonitorProps) {
  const { toast } = useToast()
  const [tasks, setTasks] = useState<BackgroundTask[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState<string | null>(null)

  const truncatedContent = useMemo(() => {
    if (!documentContent) return ''
    return documentContent.slice(-15000)
  }, [documentContent])

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/ai/background-task?document_id=${documentId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch background tasks')
      }
      const payload = await response.json()
      setTasks(payload.tasks ?? [])
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [documentId])

  useEffect(() => {
    void fetchTasks()
    const interval = setInterval(fetchTasks, 15000)
    return () => clearInterval(interval)
  }, [fetchTasks])

  const triggerTask = async (preset: TaskPreset) => {
    setSubmitting(preset.type)
    try {
      const prompt = preset.buildPrompt(truncatedContent, documentTitle ?? undefined)
      const response = await fetch('/api/ai/background-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_type: preset.type,
          prompt,
          document_id: documentId,
          project_id: projectId ?? null,
          context: '\nDocument excerpt:\n' + truncatedContent.slice(-5000),
        }),
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to start task')
      }

      toast({ title: 'Task started', description: `${preset.label} is in progress.` })
      setTasks((prev) => [payload.task, ...prev])
    } catch (error) {
      console.error(error)
      toast({
        title: 'Unable to start task',
        description: error instanceof Error ? error.message : 'The background task could not be started.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(null)
    }
  }

  const refreshTask = async (task: BackgroundTask) => {
    try {
      const response = await fetch('/api/ai/background-task', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: task.id }),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to refresh task')
      }
      setTasks((prev) => prev.map((item) => (item.id === task.id ? payload.task : item)))
    } catch (error) {
      console.error(error)
      toast({
        title: 'Refresh failed',
        description: error instanceof Error ? error.message : 'Could not refresh task status.',
        variant: 'destructive',
      })
    }
  }

  const copyResult = async (text: string) => {
    await navigator.clipboard.writeText(text)
    toast({ title: 'Copied', description: 'Result copied to clipboard.' })
  }

  return (
    <Card className="border-none bg-card/80 shadow-card">
      <CardHeader>
        <CardTitle>Background analyses</CardTitle>
        <CardDescription>Kick off long-running tasks and monitor their progress.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 md:grid-cols-3">
          {PRESETS.map((preset) => (
            <div key={preset.type} className="rounded-xl border bg-card/60 p-4 text-sm shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">{preset.label}</span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={submitting === preset.type || truncatedContent.length === 0}
                  onClick={() => triggerTask(preset)}
                >
                  {submitting === preset.type ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Run'
                  )}
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{preset.description}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />} Latest tasks
          <Button variant="ghost" size="icon" onClick={fetchTasks} aria-label="Refresh tasks">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4">
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No background analyses yet. Start one using the tasks above.
            </p>
          ) : (
            tasks.map((task) => {
              const statusInfo = formatStatus(task.status)
              return (
                <div key={task.id} className="rounded-xl border bg-card/60 p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold capitalize text-foreground">
                        {task.task_type.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Created {new Date(task.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={statusInfo.className}>{statusInfo.label}</Badge>
                      {task.status !== 'succeeded' && task.status !== 'failed' && (
                        <Button variant="ghost" size="sm" onClick={() => refreshTask(task)}>
                          Check status
                        </Button>
                      )}
                    </div>
                  </div>

                  {task.result?.text && (
                    <div className="mt-4 space-y-2">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                        Result
                      </Label>
                      <Textarea readOnly rows={6} value={task.result.text} className="resize-none" />
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => copyResult(task.result?.text ?? '')}>
                          <ClipboardCopy className="mr-2 h-4 w-4" /> Copy
                        </Button>
                        {onInsert && (
                          <Button variant="outline" size="sm" onClick={() => onInsert(task.result?.text ?? '')}>
                            <FileText className="mr-2 h-4 w-4" /> Insert into doc
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {task.status === 'failed' && task.error && (
                    <p className="mt-3 text-xs text-destructive">Error: {task.error}</p>
                  )}
                </div>
              )
            })
          )}
        </div>
      </CardContent>
    </Card>
  )
}
