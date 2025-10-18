'use client'

import { useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
  import { Button } from '@/components/ui/button'
  import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
  import { Badge } from '@/components/ui/badge'
  import { Input } from '@/components/ui/input'
  import { Label } from '@/components/ui/label'
  import { Textarea } from '@/components/ui/textarea'
  import { cn } from '@/lib/utils'
  import { formatDistanceToNow } from 'date-fns'
  import { CalendarDays, MapPin, CheckCircle2, Circle, Pencil, Plus, Trash2 } from 'lucide-react'

export type CharacterArcStage = {
  id?: string
  stage_name: string
  stage_order: number
  description?: string | null
  location?: string | null
  chapter_scene?: string | null
  page_number?: number | null
  emotional_state?: string | null
  beliefs?: string | null
  relationships_status?: string | null
  is_completed?: boolean
  notes?: string | null
  created_at?: string
}

type ArcTimelineProps = {
  arcs: CharacterArcStage[]
  loading?: boolean
  onCreate: (stage: Omit<CharacterArcStage, 'id' | 'created_at'>) => Promise<void>
  onUpdate: (id: string, updates: Partial<CharacterArcStage>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

type EditorMode = { type: 'create' } | { type: 'edit'; stage: CharacterArcStage }

const emptyStage = (order: number): CharacterArcStage => ({
  stage_name: '',
  stage_order: order,
  description: '',
  location: '',
  chapter_scene: '',
  page_number: undefined,
  emotional_state: '',
  beliefs: '',
  relationships_status: '',
  notes: '',
  is_completed: false,
})

export function ArcTimeline({ arcs, loading = false, onCreate, onUpdate, onDelete }: ArcTimelineProps) {
  const [editorOpen, setEditorOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [mode, setMode] = useState<EditorMode>({ type: 'create' })
  const [form, setForm] = useState<CharacterArcStage>(() => emptyStage((arcs?.length ?? 0) + 1))

  const sortedArcs = useMemo(
    () =>
      [...arcs].sort((a, b) => {
        if (a.stage_order === b.stage_order) {
          return (a.created_at ? new Date(a.created_at).getTime() : 0) -
            (b.created_at ? new Date(b.created_at).getTime() : 0)
        }
        return a.stage_order - b.stage_order
      }),
    [arcs]
  )

  const openCreateDialog = () => {
    setMode({ type: 'create' })
    setForm(emptyStage(sortedArcs.length + 1))
    setEditorOpen(true)
  }

  const openEditDialog = (stage: CharacterArcStage) => {
    setMode({ type: 'edit', stage })
    setForm({ ...stage })
    setEditorOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.stage_name.trim()) return
    setSubmitting(true)
    setFormError(null)
    try {
      if (mode.type === 'create') {
        await onCreate({
          ...form,
          stage_name: form.stage_name.trim(),
          stage_order: Number(form.stage_order) || sortedArcs.length + 1,
        })
      } else if (mode.type === 'edit' && mode.stage.id) {
        await onUpdate(mode.stage.id, {
          ...form,
          stage_name: form.stage_name.trim(),
          stage_order: Number(form.stage_order) || mode.stage.stage_order,
        })
      }
      setEditorOpen(false)
    } finally {
      setSubmitting(false)
    }
  }

  const safeHandleSubmit = async () => {
    try {
      await handleSubmit()
    } catch (error) {
      console.error('Arc stage save failed', error)
      setFormError(error instanceof Error ? error.message : 'Failed to save stage')
    }
  }

  const toggleComplete = async (stage: CharacterArcStage) => {
    if (!stage.id) return
    await onUpdate(stage.id, { is_completed: !stage.is_completed })
  }

  const handleDelete = async (stage: CharacterArcStage) => {
    if (!stage.id) return
    if (!confirm(`Delete arc stage "${stage.stage_name}"?`)) return
    await onDelete(stage.id)
  }

  return (
    <Card className="border border-border/70">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Arc timeline</CardTitle>
          <p className="text-sm text-muted-foreground">
            Track this character&apos;s evolution across the story.
          </p>
        </div>
        <Button size="sm" onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add stage
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
            Loading arc data...
          </div>
        ) : sortedArcs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-muted bg-muted/40 p-6 text-sm text-muted-foreground">
            No arc stages yet. Add stages to map the character&apos;s journey.
          </div>
        ) : (
          <ol className="relative ml-2 border-l border-border pl-6">
            {sortedArcs.map((stage, index) => (
              <li key={stage.id ?? `stage-${index}`} className="relative mb-8 last:mb-0">
                <span
                  className={cn(
                    'absolute -left-[11px] flex h-5 w-5 items-center justify-center rounded-full border-2 border-background bg-background',
                    stage.is_completed
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : 'border-border text-muted-foreground'
                  )}
                  aria-hidden
                >
                  {stage.is_completed ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <Circle className="h-3 w-3" />
                  )}
                </span>
                <div className="rounded-xl border bg-card/80 p-4 shadow-sm transition hover:shadow-md">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Stage {stage.stage_order}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {stage.created_at
                            ? formatDistanceToNow(new Date(stage.created_at), { addSuffix: true })
                            : 'Draft'}
                        </span>
                      </div>
                      <h3 className="mt-2 text-lg font-semibold text-foreground">
                        {stage.stage_name}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => toggleComplete(stage)}>
                        {stage.is_completed ? 'Mark pending' : 'Mark complete'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(stage)}
                        aria-label="Edit stage"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(stage)}
                        aria-label="Delete stage"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {stage.description && (
                    <p className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap">
                      {stage.description}
                    </p>
                  )}
                  <div className="mt-3 grid gap-3 text-xs text-muted-foreground sm:grid-cols-2">
                    {stage.chapter_scene && (
                      <span className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-primary" />
                        {stage.chapter_scene}
                      </span>
                    )}
                    {stage.location && (
                      <span className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        {stage.location}
                      </span>
                    )}
                    {stage.emotional_state && (
                      <span>
                        <span className="font-medium text-foreground">Emotional state: </span>
                        {stage.emotional_state}
                      </span>
                    )}
                    {stage.relationships_status && (
                      <span>
                        <span className="font-medium text-foreground">Relationships: </span>
                        {stage.relationships_status}
                      </span>
                    )}
                  </div>
                  {stage.notes && (
                    <div className="mt-3 rounded-lg border border-dashed border-muted p-3 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Notes:</span> {stage.notes}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{mode.type === 'create' ? 'Add arc stage' : 'Edit arc stage'}</DialogTitle>
            <DialogDescription>
              Map an important moment in this character&apos;s journey.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
              <div className="space-y-2">
                <Label htmlFor="stage_name">Stage name</Label>
                <Input
                  id="stage_name"
                  value={form.stage_name}
                  onChange={(event) => setForm((prev) => ({ ...prev, stage_name: event.target.value }))}
                  placeholder="Midpoint reversal"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stage_order">Stage order</Label>
                <Input
                  id="stage_order"
                  type="number"
                  min="1"
                  value={form.stage_order}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, stage_order: Number(event.target.value) || 1 }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={4}
                value={form.description ?? ''}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, description: event.target.value }))
                }
                placeholder="What happens at this stage?"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="location">Location or setting</Label>
                <Input
                  id="location"
                  value={form.location ?? ''}
                  onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))}
                  placeholder="Where does this occur?"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="chapter_scene">Chapter / scene</Label>
                <Input
                  id="chapter_scene"
                  value={form.chapter_scene ?? ''}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, chapter_scene: event.target.value }))
                  }
                  placeholder="e.g., Chapter 12, Scene 34"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="page_number">Page number</Label>
                <Input
                  id="page_number"
                  type="number"
                  value={form.page_number ?? ''}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      page_number: event.target.value ? Number(event.target.value) : undefined,
                    }))
                  }
                  placeholder="Approx. page"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emotional_state">Emotional state</Label>
                <Input
                  id="emotional_state"
                  value={form.emotional_state ?? ''}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, emotional_state: event.target.value }))
                  }
                  placeholder="e.g., hopeful, conflicted, shattered"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="beliefs">Beliefs</Label>
                <Input
                  id="beliefs"
                  value={form.beliefs ?? ''}
                  onChange={(event) => setForm((prev) => ({ ...prev, beliefs: event.target.value }))}
                  placeholder="What do they believe at this point?"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="relationships_status">Relationships</Label>
                <Input
                  id="relationships_status"
                  value={form.relationships_status ?? ''}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, relationships_status: event.target.value }))
                  }
                  placeholder="Relationships changes"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                rows={3}
                value={form.notes ?? ''}
                onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              />
            </div>
          </div>

          {formError && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {formError}
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button onClick={safeHandleSubmit} disabled={submitting}>
              {submitting ? 'Saving...' : 'Save stage'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
