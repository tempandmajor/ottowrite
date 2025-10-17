'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BeatBoard } from '@/components/story/beat-board'
import { BeatTemplateSelector } from '@/components/story/beat-template-selector'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Plus, BookOpen } from 'lucide-react'

type Project = {
  id: string
  name: string
  type: string
}

type Beat = {
  id: string
  project_id: string
  beat_type: string
  order_position: number
  title: string
  description: string | null
  notes: string | null
  target_page_count: number | null
  actual_page_count: number | null
  status: 'pending' | 'in_progress' | 'complete'
  linked_document_ids: string[]
  metadata: any
}

export default function StoryStructurePage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [project, setProject] = useState<Project | null>(null)
  const [beats, setBeats] = useState<Beat[]>([])
  const [loading, setLoading] = useState(true)
  const [showTemplateSelector, setShowTemplateSelector] = useState(false)
  const [selectedBeatType, setSelectedBeatType] = useState<string | null>(null)

  useEffect(() => {
    loadProject()
    loadBeats()
  }, [params.id])

  const loadProject = async () => {
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
        .from('projects')
        .select('*')
        .eq('id', params.id)
        .eq('user_id', user.id)
        .single()

      if (error) throw error

      if (!data) {
        toast({
          title: 'Error',
          description: 'Project not found',
          variant: 'destructive',
        })
        router.push('/dashboard/projects')
        return
      }

      setProject(data)
    } catch (error) {
      console.error('Error loading project:', error)
      toast({
        title: 'Error',
        description: 'Failed to load project',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const loadBeats = async () => {
    try {
      const response = await fetch(`/api/story-beats?project_id=${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setBeats(data)

        // Set selected beat type if beats exist
        if (data.length > 0) {
          setSelectedBeatType(data[0].beat_type)
        }
      }
    } catch (error) {
      console.error('Error loading beats:', error)
    }
  }

  const handleTemplateSelected = async (templateName: string) => {
    try {
      const response = await fetch('/api/story-beats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: params.id,
          template_name: templateName,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to initialize beats')
      }

      toast({
        title: 'Success',
        description: 'Story beats initialized from template',
      })

      setSelectedBeatType(templateName)
      setShowTemplateSelector(false)
      loadBeats()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to initialize story beats',
        variant: 'destructive',
      })
    }
  }

  const handleBeatUpdate = async (beatId: string, updates: Partial<Beat>) => {
    try {
      const response = await fetch('/api/story-beats', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: beatId, ...updates }),
      })

      if (!response.ok) {
        throw new Error('Failed to update beat')
      }

      toast({
        title: 'Success',
        description: 'Beat updated successfully',
      })

      loadBeats()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update beat',
        variant: 'destructive',
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading story structure...</p>
      </div>
    )
  }

  if (!project) {
    return null
  }

  const filteredBeats = selectedBeatType
    ? beats.filter((b) => b.beat_type === selectedBeatType)
    : beats

  const uniqueBeatTypes = Array.from(new Set(beats.map((b) => b.beat_type)))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/projects/${project.id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Project
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Story Structure</h1>
            <p className="text-muted-foreground mt-1">{project.name}</p>
          </div>
        </div>
        <Button onClick={() => setShowTemplateSelector(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {beats.length > 0 ? 'Change Structure' : 'Choose Structure'}
        </Button>
      </div>

      {/* Beat Type Selector */}
      {uniqueBeatTypes.length > 1 && (
        <div className="flex gap-2">
          {uniqueBeatTypes.map((type) => (
            <Button
              key={type}
              variant={selectedBeatType === type ? 'default' : 'outline'}
              onClick={() => setSelectedBeatType(type)}
              size="sm"
            >
              {type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
            </Button>
          ))}
        </div>
      )}

      {/* Content */}
      {beats.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="font-semibold text-lg">No Story Structure Yet</h3>
                <p className="text-muted-foreground mt-2">
                  Choose a story structure template to get started with planning your narrative.
                </p>
              </div>
              <Button onClick={() => setShowTemplateSelector(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Choose Structure Template
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <BeatBoard beats={filteredBeats} onBeatUpdate={handleBeatUpdate} />
      )}

      {/* Template Selector Dialog */}
      <BeatTemplateSelector
        open={showTemplateSelector}
        onOpenChange={setShowTemplateSelector}
        projectType={project.type}
        onTemplateSelect={handleTemplateSelected}
      />
    </div>
  )
}
