'use client'

import { useEffect, useState } from 'react'
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

export default function OutlineDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [outline, setOutline] = useState<Outline | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingNotes, setEditingNotes] = useState<Record<number, string>>({})

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/projects/${params.id}/outlines`}>
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
      </div>

      {/* Premise Card */}
      {outline.premise && (
        <Card className="border-purple-200 bg-purple-50/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              Story Premise
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{outline.premise}</p>
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      {outline.metadata && (
        <div className="flex gap-2 flex-wrap">
          {outline.metadata.project_type && (
            <Badge variant="outline">
              Type: {outline.metadata.project_type.replace('_', ' ')}
            </Badge>
          )}
          {outline.metadata.project_genre && Array.isArray(outline.metadata.project_genre) && (
            <Badge variant="outline">Genre: {outline.metadata.project_genre.join(', ')}</Badge>
          )}
          {outline.metadata.model && (
            <Badge variant="outline" className="bg-purple-50">
              <Sparkles className="mr-1 h-3 w-3" />
              {outline.metadata.model}
            </Badge>
          )}
        </div>
      )}

      {/* Sections */}
      <div className="space-y-4">
        {outline.content.map((section: OutlineSection, index: number) => (
          <Card key={index}>
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
                        <span className="font-semibold">{section.wordCountTarget.toLocaleString()}</span>{' '}
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
                  <p className="text-sm font-semibold">Your Notes</p>
                  {editingNotes[index] !== undefined && (
                    <Button
                      size="sm"
                      onClick={() => updateSectionNotes(index, editingNotes[index])}
                      disabled={saving}
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
                  value={
                    editingNotes[index] !== undefined
                      ? editingNotes[index]
                      : section.notes || ''
                  }
                  onChange={(e) =>
                    setEditingNotes({ ...editingNotes, [index]: e.target.value })
                  }
                  rows={3}
                  className="resize-none text-sm"
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
