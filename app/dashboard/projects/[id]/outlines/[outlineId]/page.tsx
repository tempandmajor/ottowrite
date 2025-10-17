'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import {
  ArrowLeft,
  Loader2,
  FileText,
  Save,
  Sparkles,
  CheckCircle2,
  Target,
  Users,
  MapPin,
  Clock,
  StickyNote,
} from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

type Outline = {
  id: string
  title: string
  format: string
  premise: string | null
  content: any[]
  metadata: any
  created_at: string
  updated_at: string
}

type OutlineSection = {
  type: string
  order: number
  title: string
  description: string
  notes?: string
  wordCountTarget?: number
  pageCountTarget?: number
  characters?: string[]
  locations?: string[]
  plotPoints?: string[]
}

const NOTE_MAX_LENGTH = 2000

export default function OutlineDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [outline, setOutline] = useState<Outline | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingNotes, setEditingNotes] = useState<Record<number, string>>({})
  const [dirtySections, setDirtySections] = useState<number[]>([])

  useEffect(() => {
    loadOutline()
  }, [params.outlineId])

  const loadOutline = async () => {
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
        return
      }

      const { data, error } = await supabase
        .from('outlines')
        .select('*')
        .eq('id', params.outlineId)
        .eq('user_id', user.id)
        .single()

      if (error) throw error
      setOutline(data)
    } catch (error) {
      console.error('Error loading outline:', error)
      toast({
        title: 'Error',
        description: 'Failed to load outline',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const updateSectionNotes = async (index: number, notes: string) => {
    if (!outline) return
    if (notes.length > NOTE_MAX_LENGTH) {
      toast({
        title: 'Notes too long',
        description: `Please keep notes under ${NOTE_MAX_LENGTH} characters.`,
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      const updatedContent = [...outline.content]
      updatedContent[index] = {
        ...updatedContent[index],
        notes,
      }

      const response = await fetch('/api/outlines', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: outline.id,
          content: updatedContent,
        }),
      })

      if (!response.ok) throw new Error('Failed to update notes')

      setOutline({ ...outline, content: updatedContent })
      setEditingNotes((prev) => {
        const updated = { ...prev }
        delete updated[index]
        return updated
      })
      setDirtySections((prev) => prev.filter((sectionIndex) => sectionIndex !== index))

      toast({
        title: 'Success',
        description: 'Notes updated',
      })
    } catch (error) {
      console.error('Error updating notes:', error)
      toast({
        title: 'Error',
        description: 'Failed to update notes',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const hasUnsavedChanges = dirtySections.length > 0

  const outlineStats = useMemo(() => {
    if (!outline) return null

    const totalTargets = outline.content.reduce(
      (acc, section: OutlineSection) => {
        acc.sections += 1
        acc.wordCount += section.wordCountTarget || 0
        acc.pageCount += section.pageCountTarget || 0
        return acc
      },
      { sections: 0, wordCount: 0, pageCount: 0 }
    )

    return totalTargets
  }, [outline])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!outline) {
    return null
  }

  const formatLabel = outline.format.replace('_', ' ')
  const sectionCount = outline.content.length
  const createdAgo = formatDistanceToNow(new Date(outline.created_at), { addSuffix: true })
  const updatedAgo = formatDistanceToNow(new Date(outline.updated_at), { addSuffix: true })
  const projectId = params.id as string
  const generatorModel = outline.metadata?.model
  const projectGenres =
    outline.metadata?.project_genre && Array.isArray(outline.metadata.project_genre)
      ? outline.metadata.project_genre.join(', ')
      : null

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/projects/${projectId}/outlines`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Outlines
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{outline.title}</h1>
            <p className="text-muted-foreground mt-1">
              {formatLabel} • {sectionCount} sections • Created {createdAgo}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <StickyNote className="h-3 w-3" />
              Unsaved notes
            </Badge>
          )}
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Updated {updatedAgo}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
        <div className="space-y-6">
          {/* Premise Card */}
          {outline.premise && (
            <Card className="border-purple-200 bg-purple-50/40">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  Story Premise
                </CardTitle>
                <CardDescription className="text-sm">
                  Ground your draft with the AI generated story premise and adjust as you refine
                  sections.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{outline.premise}</p>
              </CardContent>
            </Card>
          )}

          {/* Sections */}
          <div className="space-y-4">
            {outline.content.map((section: OutlineSection, index: number) => {
              const currentValue =
                editingNotes[index] !== undefined
                  ? editingNotes[index]
                  : section.notes || ''
              const isDirty = dirtySections.includes(index)
              const isOverLimit = currentValue.length > NOTE_MAX_LENGTH

              return (
                <Card key={index} className="border-border/60">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{section.type}</Badge>
                          <span className="text-sm text-muted-foreground">
                            Section {section.order || index + 1}
                          </span>
                        </div>
                        <CardTitle className="text-xl">{section.title}</CardTitle>
                        <CardDescription>{section.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Targets */}
                    {(section.wordCountTarget || section.pageCountTarget) && (
                      <div className="flex gap-4 flex-wrap">
                        {section.wordCountTarget && (
                          <div className="flex items-center gap-2 text-sm">
                            <Target className="h-4 w-4 text-muted-foreground" />
                            <span>
                              <span className="font-semibold">
                                {section.wordCountTarget.toLocaleString()}
                              </span>{' '}
                              words
                            </span>
                          </div>
                        )}
                        {section.pageCountTarget && (
                          <div className="flex items-center gap-2 text-sm">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span>
                              <span className="font-semibold">{section.pageCountTarget}</span> pages
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Characters */}
                    {section.characters && section.characters.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <Users className="h-4 w-4" />
                          Characters
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {section.characters.map((char, i) => (
                            <Badge key={i} variant="outline">
                              {char}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Locations */}
                    {section.locations && section.locations.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <MapPin className="h-4 w-4" />
                          Locations
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {section.locations.map((loc, i) => (
                            <Badge key={i} variant="outline">
                              {loc}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Plot Points */}
                    {section.plotPoints && section.plotPoints.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <CheckCircle2 className="h-4 w-4" />
                          Key Plot Points
                        </div>
                        <ul className="space-y-1 ml-6">
                          {section.plotPoints.map((point, i) => (
                            <li key={i} className="text-sm list-disc">
                              {point}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Notes */}
                    <div className="space-y-2 pt-2 border-t">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold flex items-center gap-2">
                          <StickyNote className="h-4 w-4 text-muted-foreground" />
                          Your Notes
                        </p>
                        {isDirty && (
                          <Button
                            size="sm"
                            onClick={() => updateSectionNotes(index, currentValue)}
                            disabled={saving || isOverLimit}
                          >
                            {saving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Save className="mr-2 h-4 w-4" />
                                Save Notes
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                      <Textarea
                        placeholder="Add your notes, ideas, or reminders for this section..."
                        value={currentValue}
                        onChange={(e) => {
                          const value = e.target.value
                          setEditingNotes((prev) => {
                            if ((section.notes || '') === value) {
                              const next = { ...prev }
                              delete next[index]
                              return next
                            }
                            return { ...prev, [index]: value }
                          })
                          setDirtySections((prev) => {
                            const isSameAsOriginal = (section.notes || '') === value
                            if (isSameAsOriginal) {
                              return prev.filter((sectionIndex) => sectionIndex !== index)
                            }

                            if (prev.includes(index)) {
                              return prev
                            }
                            return [...prev, index]
                          })
                        }}
                        rows={3}
                        className={`resize-none text-sm ${
                          isOverLimit ? 'border-destructive focus-visible:ring-destructive' : ''
                        }`}
                      />
                      <div className="flex items-center justify-between text-xs">
                        <span className={isOverLimit ? 'text-destructive' : 'text-muted-foreground'}>
                          {isOverLimit
                            ? `Too long — trim ${currentValue.length - NOTE_MAX_LENGTH} characters`
                            : 'Keep track of beats, reminders, or TODOs specific to this section.'}
                        </span>
                        <span className={isOverLimit ? 'text-destructive' : 'text-muted-foreground'}>
                          {currentValue.length} / {NOTE_MAX_LENGTH}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 h-fit">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Outline summary</CardTitle>
              <CardDescription>Quick facts to guide polish sessions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Format</span>
                <Badge variant="secondary" className="capitalize">
                  {formatLabel}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Sections</span>
                <span className="font-medium">{sectionCount}</span>
              </div>
              {outlineStats && outlineStats.wordCount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Target words</span>
                  <span className="font-medium">{outlineStats.wordCount.toLocaleString()}</span>
                </div>
              )}
              {outlineStats && outlineStats.pageCount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Target pages</span>
                  <span className="font-medium">{outlineStats.pageCount}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {outline.metadata && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Story context</CardTitle>
                <CardDescription className="text-xs">
                  Useful when exporting outlines or sharing with collaborators.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {outline.metadata.project_type && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Project type</span>
                    <span className="font-medium capitalize">
                      {outline.metadata.project_type.replace('_', ' ')}
                    </span>
                  </div>
                )}
                {projectGenres && (
                  <div className="space-y-1">
                    <span className="text-muted-foreground">Genres</span>
                    <div className="flex flex-wrap gap-1">
                      {projectGenres.split(',').map((genre) => (
                        <Badge key={genre.trim()} variant="outline">
                          {genre.trim()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {generatorModel && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Sparkles className="h-4 w-4 text-purple-500" />
                    <span className="text-xs uppercase tracking-wide">{generatorModel}</span>
                  </div>
                )}
              </div>
              )}
          <Card className="bg-muted/40">
            <CardHeader>
              <CardTitle className="text-base">Editor tips</CardTitle>
              <CardDescription className="text-xs">
                Keep outlines in sync with characters and plot reviews.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <p>• Capture follow-up tasks in notes so they surface in Phase 5 QA.</p>
              <p>• Use consistent tag names for characters/locations to link analytics views.</p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}
