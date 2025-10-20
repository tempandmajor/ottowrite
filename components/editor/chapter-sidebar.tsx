'use client'

import { useMemo, useState } from 'react'
import { Plus, Trash2, ChevronUp, ChevronDown, GripVertical } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { trackEvent } from '@/lib/telemetry/track'
import type { DocumentMetadata } from './document-metadata-form'
import { Badge } from '@/components/ui/badge'

export type SceneMetadata = {
  pov?: string
  pacing?: 'slow' | 'balanced' | 'fast'
  tension?: 'low' | 'medium' | 'high'
}

export type Scene = {
  id: string
  title: string
  summary?: string
  metadata?: SceneMetadata
}

export type Chapter = {
  id: string
  title: string
  summary?: string
  scenes: Scene[]
}

const DEFAULT_SCENE_METADATA: SceneMetadata = {
  pacing: 'balanced',
  tension: 'medium',
}

interface ChapterSidebarProps {
  chapters: Chapter[]
  onChange: (nextChapters: Chapter[]) => void
  activeSceneId?: string | null
  onSelectScene: (sceneId: string | null) => void
  onCreateScene: (chapterId: string, sceneId: string) => void
  onInsertAnchor?: (sceneId: string) => void
  missingAnchors?: Set<string>
  metadata?: DocumentMetadata
}

const pacingOptions: Array<{ label: string; value: SceneMetadata['pacing'] }> = [
  { label: 'Slow burn', value: 'slow' },
  { label: 'Balanced', value: 'balanced' },
  { label: 'Fast paced', value: 'fast' },
]

const tensionOptions: Array<{ label: string; value: SceneMetadata['tension'] }> = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
]

const createId = () =>
  typeof globalThis !== 'undefined' && globalThis.crypto && 'randomUUID' in globalThis.crypto
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`

export function ChapterSidebar({
  chapters,
  onChange,
  activeSceneId,
  onSelectScene,
  onCreateScene,
  onInsertAnchor,
  missingAnchors,
  metadata,
}: ChapterSidebarProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const ensureExpanded = (chapterId: string) => {
    setExpanded((prev) => ({
      ...prev,
      [chapterId]: prev[chapterId] ?? true,
    }))
  }

  const handleAddChapter = () => {
    const newChapter: Chapter = {
      id: createId(),
      title: `Chapter ${chapters.length + 1}`,
      summary: '',
      scenes: [],
    }
    onChange([...chapters, newChapter])
    ensureExpanded(newChapter.id)
    trackEvent('editor.sidebar.chapter_add', {
      chapterId: newChapter.id,
      position: chapters.length,
    })
  }

  const handleRemoveChapter = (chapterId: string) => {
    onChange(chapters.filter((chapter) => chapter.id !== chapterId))
    trackEvent('editor.sidebar.chapter_remove', { chapterId })
  }

  const handleAddScene = (chapterId: string) => {
    const sceneId = createId()
    const nextChapters = chapters.map((chapter) =>
      chapter.id === chapterId
        ? {
            ...chapter,
            scenes: [
              ...chapter.scenes,
              {
                id: sceneId,
                title: `Scene ${chapter.scenes.length + 1}`,
                summary: '',
                metadata: { ...DEFAULT_SCENE_METADATA },
              },
            ],
          }
        : chapter
    )
    onChange(nextChapters)
    ensureExpanded(chapterId)
    onCreateScene(chapterId, sceneId)
    onSelectScene(sceneId)
    trackEvent('editor.sidebar.scene_add', {
      chapterId,
      sceneId,
      sceneCount: nextChapters.find((chapter) => chapter.id === chapterId)?.scenes.length ?? 0,
    })
  }

  const handleRemoveScene = (chapterId: string, sceneId: string) => {
    const nextChapters = chapters.map((chapter) =>
      chapter.id === chapterId
        ? { ...chapter, scenes: chapter.scenes.filter((scene) => scene.id !== sceneId) }
        : chapter
    )
    onChange(nextChapters)
    if (activeSceneId === sceneId) {
      onSelectScene(null)
    }
    trackEvent('editor.sidebar.scene_remove', { chapterId, sceneId })
  }

  const handleChapterUpdate = (chapterId: string, updates: Partial<Chapter>) => {
    const nextChapters = chapters.map((chapter) =>
      chapter.id === chapterId ? { ...chapter, ...updates } : chapter
    )
    onChange(nextChapters)
  }

  const handleSceneUpdate = (
    chapterId: string,
    sceneId: string,
    updates: Partial<Scene>
  ) => {
    const nextChapters = chapters.map((chapter) =>
      chapter.id === chapterId
        ? {
            ...chapter,
            scenes: chapter.scenes.map((scene) =>
              scene.id === sceneId ? { ...scene, ...updates } : scene
            ),
          }
        : chapter
    )
    onChange(nextChapters)
  }

  const handleSceneMetadataUpdate = (
    chapterId: string,
    sceneId: string,
    updates: Partial<SceneMetadata>
  ) => {
    const nextChapters = chapters.map((chapter) =>
      chapter.id === chapterId
        ? {
            ...chapter,
            scenes: chapter.scenes.map((scene) =>
              scene.id === sceneId
                ? { ...scene, metadata: { ...scene.metadata, ...updates } }
                : scene
            ),
          }
        : chapter
    )
    onChange(nextChapters)
  }

  const moveChapter = (chapterId: string, direction: -1 | 1) => {
    const index = chapters.findIndex((chapter) => chapter.id === chapterId)
    if (index < 0) return

    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= chapters.length) return

    const reordered = [...chapters]
    const [removed] = reordered.splice(index, 1)
    reordered.splice(targetIndex, 0, removed)
    onChange(reordered)
    trackEvent('editor.sidebar.chapter_move', {
      chapterId,
      from: index,
      to: targetIndex,
    })
  }

  const moveScene = (chapterId: string, sceneId: string, direction: -1 | 1) => {
    const chapter = chapters.find((item) => item.id === chapterId)
    if (!chapter) return
    const index = chapter.scenes.findIndex((scene) => scene.id === sceneId)
    if (index < 0) return
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= chapter.scenes.length) return

    const nextScenes = [...chapter.scenes]
    const [removed] = nextScenes.splice(index, 1)
    nextScenes.splice(targetIndex, 0, removed)
    handleChapterUpdate(chapterId, { scenes: nextScenes })
    trackEvent('editor.sidebar.scene_move', {
      chapterId,
      sceneId,
      from: index,
      to: targetIndex,
    })
  }

  const expandedState = useMemo(() => {
    const nextState = { ...expanded }
    chapters.forEach((chapter) => {
      if (nextState[chapter.id] === undefined) {
        nextState[chapter.id] = true
      }
    })
    return nextState
  }, [chapters, expanded])

  const renderAnchorStatus = (sceneId: string) => {
    if (!missingAnchors || !missingAnchors.has(sceneId)) {
      return null
    }

    return (
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="h-6 px-2 text-[11px]"
        onClick={() => onInsertAnchor?.(sceneId)}
      >
        Insert anchor
      </Button>
    )
  }

  return (
    <Card className="border-none bg-card/80 shadow-card">
      <CardHeader className="space-y-1.5">
        <CardTitle className="text-base font-semibold">Chapters & scenes</CardTitle>
        <p className="text-sm text-muted-foreground">
          Organize your manuscript, document POV changes, and keep track of pacing.
        </p>
        {/* Document Metadata Display */}
        {metadata && (metadata.povCharacter || metadata.pacingTarget || metadata.tone) && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {metadata.povCharacter && (
              <Badge variant="secondary" className="text-xs">
                POV: {metadata.povCharacter}
              </Badge>
            )}
            {metadata.pacingTarget && (
              <Badge variant="secondary" className="text-xs capitalize">
                {metadata.pacingTarget}
              </Badge>
            )}
            {metadata.tone && (
              <Badge variant="outline" className="text-xs">
                {metadata.tone}
              </Badge>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <Button type="button" size="sm" variant="outline" onClick={handleAddChapter}>
            <Plus className="mr-2 h-4 w-4" />
            Add chapter
          </Button>
          <span className="text-xs text-muted-foreground">
            {chapters.length} chapter{chapters.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          {chapters.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-muted/40 p-4 text-sm text-muted-foreground">
              Start by adding your first chapter. Scenes can be nested under each chapter,
              and you can capture POV, pacing, and tension for each section.
            </div>
          ) : (
            chapters.map((chapter, chapterIndex) => {
              const isExpanded = expandedState[chapter.id] ?? true
              return (
                <div
                  key={chapter.id}
                  className="rounded-xl border border-border/60 bg-background/80 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3 border-b px-3 py-2">
                    <div className="flex flex-1 flex-col gap-2">
                      <Input
                        value={chapter.title}
                        onChange={(event) =>
                          handleChapterUpdate(chapter.id, { title: event.target.value })
                        }
                        className="h-8 text-sm font-semibold"
                        placeholder={`Chapter ${chapterIndex + 1}`}
                      />
                      <Textarea
                        value={chapter.summary ?? ''}
                        onChange={(event) =>
                          handleChapterUpdate(chapter.id, { summary: event.target.value })
                        }
                        placeholder="Summary or goals for this chapter..."
                        className="min-h-[60px] text-xs"
                      />
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() =>
                            setExpanded((prev) => ({
                              ...prev,
                              [chapter.id]: !isExpanded,
                            }))
                          }
                          aria-label={isExpanded ? 'Collapse chapter' : 'Expand chapter'}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => moveChapter(chapter.id, -1)}
                          disabled={chapterIndex === 0}
                          aria-label="Move chapter up"
                        >
                          <GripVertical className="h-4 w-4 rotate-180" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => moveChapter(chapter.id, 1)}
                          disabled={chapterIndex === chapters.length - 1}
                          aria-label="Move chapter down"
                        >
                          <GripVertical className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => handleRemoveChapter(chapter.id)}
                          aria-label="Remove chapter"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddScene(chapter.id)}
                        className="h-8 text-xs"
                      >
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        Add scene
                      </Button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="space-y-3 px-3 py-3">
                      {chapter.scenes.length === 0 ? (
                        <div className="rounded-lg border border-dashed bg-muted/40 p-3 text-xs text-muted-foreground">
                          No scenes yet. Add one to break this chapter into focused beats.
                        </div>
                      ) : (
                        chapter.scenes.map((scene, sceneIndex) => {
                          const metadata = scene.metadata ?? {}
                          const isActive = activeSceneId === scene.id
                          return (
                            <div
                              key={scene.id}
                              className={cn(
                                'rounded-lg border px-3 py-2 text-sm',
                                isActive ? 'border-foreground/40 bg-secondary/60' : 'border-border/50 bg-background'
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  size="icon"
                                  variant={isActive ? 'secondary' : 'ghost'}
                                  className="h-7 w-7 shrink-0"
                                  onClick={() => {
                                    onSelectScene(scene.id)
                                    trackEvent('editor.sidebar.scene_select', {
                                      sceneId: scene.id,
                                      chapterId: chapter.id,
                                      source: 'sidebar',
                                    })
                                  }}
                                  aria-label="Set as active scene"
                                >
                                  <span className="text-xs font-semibold">{sceneIndex + 1}</span>
                                </Button>
                                {renderAnchorStatus(scene.id)}
                                <Input
                                  value={scene.title}
                                  onChange={(event) =>
                                    handleSceneUpdate(chapter.id, scene.id, {
                                      title: event.target.value,
                                    })
                                  }
                                  className="h-8 flex-1 text-sm"
                                  placeholder={`Scene ${sceneIndex + 1}`}
                                />
                                <div className="flex items-center gap-1">
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => moveScene(chapter.id, scene.id, -1)}
                                    disabled={sceneIndex === 0}
                                    aria-label="Move scene up"
                                  >
                                    <ChevronUp className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => moveScene(chapter.id, scene.id, 1)}
                                    disabled={sceneIndex === chapter.scenes.length - 1}
                                    aria-label="Move scene down"
                                  >
                                    <ChevronDown className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleRemoveScene(chapter.id, scene.id)}
                                    aria-label="Remove scene"
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </div>

                              <Textarea
                                value={scene.summary ?? ''}
                                onChange={(event) =>
                                  handleSceneUpdate(chapter.id, scene.id, {
                                    summary: event.target.value,
                                  })
                                }
                                placeholder="What happens in this scene?"
                                className="mt-3 min-h-[60px] text-xs"
                              />

                              <div className="mt-3 grid grid-cols-2 gap-3">
                                <Input
                                  value={metadata.pov ?? ''}
                                  onChange={(event) =>
                                    handleSceneMetadataUpdate(chapter.id, scene.id, {
                                      pov: event.target.value,
                                    })
                                  }
                                  placeholder="POV character"
                                  className="h-8 text-xs"
                                />
                                <Select
                                  value={metadata.pacing ?? 'balanced'}
                                  onValueChange={(value) =>
                                    handleSceneMetadataUpdate(chapter.id, scene.id, {
                                      pacing: value as SceneMetadata['pacing'],
                                    })
                                  }
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Pacing" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {pacingOptions.map((option) => (
                                      <SelectItem key={option.value} value={option.value ?? 'balanced'}>
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Select
                                  value={metadata.tension ?? 'medium'}
                                  onValueChange={(value) =>
                                    handleSceneMetadataUpdate(chapter.id, scene.id, {
                                      tension: value as SceneMetadata['tension'],
                                    })
                                  }
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Tension" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {tensionOptions.map((option) => (
                                      <SelectItem key={option.value} value={option.value ?? 'medium'}>
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
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
