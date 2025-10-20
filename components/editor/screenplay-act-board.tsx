'use client'

import { useMemo, useState } from 'react'
import { GripVertical, Pencil, Plus, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { ScreenplayAct, ScreenplaySequence } from '@/types/screenplay'
import { generateId as generateScreenplayId } from '@/types/screenplay'
import { trackEvent } from '@/lib/telemetry/track'

type SceneMeta = {
  label: string
  index: number
}

type ScreenplayActBoardProps = {
  acts: ScreenplayAct[]
  onChange: (nextActs: ScreenplayAct[]) => void
  sceneMeta: Record<string, SceneMeta>
}

type DragPayload = {
  sequenceId: string
  sourceActId: string
}

const createSequence = (title: string): ScreenplaySequence => ({
  id: generateScreenplayId('seq'),
  title,
  summary: null,
  color: null,
  sceneIds: [],
})

function cloneActs(acts: ScreenplayAct[]): ScreenplayAct[] {
  return acts.map((act) => ({
    ...act,
    sequences: act.sequences.map((sequence) => ({
      ...sequence,
      sceneIds: [...sequence.sceneIds],
    })),
  }))
}

function moveSequence(
  acts: ScreenplayAct[],
  payload: DragPayload,
  targetActId: string,
  targetSequenceId?: string | null
): ScreenplayAct[] {
  const nextActs = cloneActs(acts)
  const sourceActIndex = nextActs.findIndex((act) => act.id === payload.sourceActId)
  if (sourceActIndex === -1) {
    return acts
  }
  const sourceAct = nextActs[sourceActIndex]
  const sequenceIndex = sourceAct.sequences.findIndex((sequence) => sequence.id === payload.sequenceId)
  if (sequenceIndex === -1) {
    return acts
  }
  const [sequence] = sourceAct.sequences.splice(sequenceIndex, 1)

  const destinationActIndex = nextActs.findIndex((act) => act.id === targetActId)
  if (destinationActIndex === -1) {
    // revert removal
    sourceAct.sequences.splice(sequenceIndex, 0, sequence)
    return acts
  }

  const destinationAct = nextActs[destinationActIndex]
  let insertIndex =
    targetSequenceId != null
      ? destinationAct.sequences.findIndex((seq) => seq.id === targetSequenceId)
      : destinationAct.sequences.length

  if (insertIndex === -1) {
    insertIndex = destinationAct.sequences.length
  }

  const movingWithinSameAct = destinationActIndex === sourceActIndex

  if (movingWithinSameAct && insertIndex > sequenceIndex) {
    insertIndex -= 1
  }

  if (movingWithinSameAct && insertIndex === sequenceIndex) {
    // No change in ordering
    destinationAct.sequences.splice(sequenceIndex, 0, sequence)
    return acts
  }

  destinationAct.sequences.splice(insertIndex, 0, sequence)
  return nextActs
}

export function ScreenplayActBoard({ acts, onChange, sceneMeta }: ScreenplayActBoardProps) {
  const [dragging, setDragging] = useState<DragPayload | null>(null)
  const [editingSequenceId, setEditingSequenceId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')

  const sceneCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    acts.forEach((act) => {
      counts[act.id] = act.sequences.reduce((sum, sequence) => sum + sequence.sceneIds.length, 0)
    })
    return counts
  }, [acts])

  const handleAddSequence = (actId: string) => {
    const nextActs = cloneActs(acts).map((act) =>
      act.id === actId
        ? {
            ...act,
            sequences: [
              ...act.sequences,
              createSequence(`Sequence ${act.sequences.length + 1}`),
            ],
          }
        : act
    )
    onChange(nextActs)
    trackEvent('editor.screenplay.sequence_add', {
      actId,
      sequenceCount: nextActs.find((act) => act.id === actId)?.sequences.length ?? 0,
    })
  }

  const handleRenameSequence = (sequenceId: string, nextTitle: string) => {
    const trimmed = nextTitle.trim()
    if (!trimmed) return
    const nextActs = cloneActs(acts).map((act) => ({
      ...act,
      sequences: act.sequences.map((sequence) =>
        sequence.id === sequenceId ? { ...sequence, title: trimmed } : sequence
      ),
    }))
    onChange(nextActs)
    trackEvent('editor.screenplay.sequence_rename', {
      sequenceId,
    })
  }

  const handleDeleteSequence = (actId: string, sequenceId: string) => {
    const nextActs = cloneActs(acts).map((act) => {
      if (act.id !== actId) {
        return act
      }

      const sequence = act.sequences.find((item) => item.id === sequenceId)
      if (!sequence) {
        return act
      }

      const remaining = act.sequences.filter((item) => item.id !== sequenceId)
      if (remaining.length === 0) {
        return {
          ...act,
          sequences: [
            {
              id: generateScreenplayId('seq'),
              title: 'Sequence 1',
              summary: null,
              color: null,
              sceneIds: [...sequence.sceneIds],
            },
          ],
        }
      }

      const recipient = remaining[0]
      recipient.sceneIds = [...sequence.sceneIds, ...recipient.sceneIds]

      return {
        ...act,
        sequences: remaining,
      }
    })

    onChange(nextActs)
    const originalSequence = acts
      .find((act) => act.id === actId)
      ?.sequences.find((sequence) => sequence.id === sequenceId)
    trackEvent('editor.screenplay.sequence_delete', {
      actId,
      sequenceId,
      sceneCount: originalSequence?.sceneIds.length ?? 0,
    })
  }

  const getDragPayload = (event: React.DragEvent): DragPayload | null => {
    try {
      const raw = event.dataTransfer.getData('application/json')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed.sequenceId === 'string' && typeof parsed.sourceActId === 'string') {
          return parsed as DragPayload
        }
      }
    } catch {
      // ignore parse errors
    }
    return dragging
  }

  const handleDrop = (event: React.DragEvent, targetActId: string, targetSequenceId?: string | null) => {
    event.preventDefault()
    const payload = getDragPayload(event)
    setDragging(null)
    if (!payload) return

    if (payload.sourceActId === targetActId && payload.sequenceId === targetSequenceId) {
      return
    }

    const next = moveSequence(acts, payload, targetActId, targetSequenceId)
    onChange(next)
    trackEvent('editor.screenplay.sequence_move', {
      sourceActId: payload.sourceActId,
      sequenceId: payload.sequenceId,
      targetActId,
      targetSequenceId: targetSequenceId ?? null,
    })
  }

  const handleDragStart = (event: React.DragEvent, actId: string, sequenceId: string) => {
    const payload: DragPayload = { sequenceId, sourceActId: actId }
    setDragging(payload)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('application/json', JSON.stringify(payload))
  }

  const handleDragEnd = () => {
    setDragging(null)
  }

  return (
    <div className="space-y-4">
      <Card className="border-none bg-card/80 shadow-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Act & sequence board</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {acts.map((act) => (
              <div
                key={act.id}
                className={cn(
                  'flex flex-col gap-3 rounded-2xl border bg-background/60 p-4 transition-shadow',
                  dragging && dragging.sourceActId !== act.id && 'ring-1 ring-dashed ring-border/70'
                )}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => handleDrop(event, act.id, null)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{act.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {sceneCounts[act.id] || 0} scene{sceneCounts[act.id] === 1 ? '' : 's'}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleAddSequence(act.id)}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Add sequence
                  </Button>
                </div>

                {act.sequences.length === 0 && (
                  <div className="rounded-lg border border-dashed bg-muted/40 p-3 text-xs text-muted-foreground">
                    No sequences yet. Drag in a sequence or create a new one.
                  </div>
                )}

                <div className="space-y-3">
                  {act.sequences.map((sequence) => {
                    const isDragging = dragging?.sequenceId === sequence.id
                    const sceneLabels = sequence.sceneIds.map((sceneId) => ({
                      id: sceneId,
                      label: sceneMeta[sceneId]?.label ?? 'Untitled scene',
                    }))

                    return (
                      <div
                        key={sequence.id}
                        className={cn(
                          'group rounded-xl border bg-card/80 p-3 shadow-sm transition-all',
                          isDragging && 'opacity-40'
                        )}
                        draggable
                        onDragStart={(event) => handleDragStart(event, act.id, sequence.id)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => handleDrop(event, act.id, sequence.id)}
                      >
                        <div className="flex items-start gap-2">
                          <span className="mt-1 text-muted-foreground">
                            <GripVertical className="h-4 w-4" aria-hidden />
                          </span>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              {editingSequenceId === sequence.id ? (
                                <Input
                                  autoFocus
                                  value={editingTitle}
                                  onChange={(event) => setEditingTitle(event.target.value)}
                                  onBlur={() => {
                                    handleRenameSequence(sequence.id, editingTitle)
                                    setEditingSequenceId(null)
                                  }}
                                  onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                      event.preventDefault()
                                      handleRenameSequence(sequence.id, editingTitle)
                                      setEditingSequenceId(null)
                                    }
                                    if (event.key === 'Escape') {
                                      event.preventDefault()
                                      setEditingSequenceId(null)
                                    }
                                  }}
                                />
                              ) : (
                                <p className="text-sm font-medium text-foreground">
                                  {sequence.title}
                                </p>
                              )}
                              <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={() => {
                                    setEditingSequenceId(sequence.id)
                                    setEditingTitle(sequence.title)
                                  }}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  <span className="sr-only">Rename sequence</span>
                                </Button>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={() => handleDeleteSequence(act.id, sequence.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                  <span className="sr-only">Delete sequence</span>
                                </Button>
                              </div>
                            </div>
                            {sceneLabels.length === 0 ? (
                              <p className="text-xs text-muted-foreground">
                                No scenes assigned yet. They will appear here when added to this sequence.
                              </p>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {sceneLabels.map((scene) => (
                                  <Badge
                                    key={scene.id}
                                    variant="secondary"
                                    className="rounded-full px-2 py-1 text-[11px] font-medium"
                                  >
                                    {scene.label}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
