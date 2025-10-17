'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Plus, ArrowLeft, FileText, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { OutlineGeneratorDialog } from '@/components/outlines/outline-generator-dialog'
import { OutlineCard } from '@/components/outlines/outline-card'

type Project = {
  id: string
  name: string
  type: string
  genre: string[] | null
  description: string | null
}

type Outline = {
  id: string
  title: string
  format: string
  premise: string | null
  content: any
  created_at: string
  updated_at: string
}

export default function OutlinesPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [project, setProject] = useState<Project | null>(null)
  const [outlines, setOutlines] = useState<Outline[]>([])
  const [loading, setLoading] = useState(true)
  const [showGenerator, setShowGenerator] = useState(false)

  useEffect(() => {
    loadProject()
    loadOutlines()
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

  const loadOutlines = async () => {
    try {
      const response = await fetch(`/api/outlines?project_id=${params.id}`)
      if (!response.ok) throw new Error('Failed to fetch outlines')

      const data = await response.json()
      setOutlines(data)
    } catch (error) {
      console.error('Error loading outlines:', error)
      toast({
        title: 'Error',
        description: 'Failed to load outlines',
        variant: 'destructive',
      })
    }
  }

  const deleteOutline = async (id: string) => {
    if (!confirm('Are you sure you want to delete this outline?')) return

    try {
      const response = await fetch(`/api/outlines?id=${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete outline')

      toast({
        title: 'Success',
        description: 'Outline deleted successfully',
      })

      loadOutlines()
    } catch (error) {
      console.error('Error deleting outline:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete outline',
        variant: 'destructive',
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!project) {
    return null
  }

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
            <h1 className="text-3xl font-bold">Story Outlines</h1>
            <p className="text-muted-foreground mt-1">{project.name}</p>
          </div>
        </div>
        <Button onClick={() => setShowGenerator(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Generate Outline
        </Button>
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="text-lg">AI-Powered Outline Generation</CardTitle>
          <CardDescription>
            Use Claude 4.5 to generate professional story outlines in multiple formats.
            Perfect for planning your narrative structure before you write.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <h4 className="font-semibold text-sm mb-1">Chapter Summary</h4>
              <p className="text-sm text-muted-foreground">
                Chapter-by-chapter breakdown with plot points and word count targets
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-1">Scene-by-Scene</h4>
              <p className="text-sm text-muted-foreground">
                Detailed scene breakdown with characters, locations, and objectives
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-1">Treatment</h4>
              <p className="text-sm text-muted-foreground">
                Narrative prose outline describing the full story flow
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-1">Beat Outline</h4>
              <p className="text-sm text-muted-foreground">
                Story structure beats with thematic significance
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-1">Custom</h4>
              <p className="text-sm text-muted-foreground">
                Flexible structure adapted to your specific needs
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Outlines List */}
      {outlines.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <p className="font-semibold">No outlines yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Generate your first AI-powered outline to start planning your story
                </p>
              </div>
              <Button onClick={() => setShowGenerator(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Generate Your First Outline
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {outlines.map((outline) => (
            <OutlineCard
              key={outline.id}
              outline={outline}
              projectId={project.id}
              onDelete={() => deleteOutline(outline.id)}
              onUpdate={loadOutlines}
            />
          ))}
        </div>
      )}

      {/* Generator Dialog */}
      <OutlineGeneratorDialog
        open={showGenerator}
        onOpenChange={setShowGenerator}
        projectId={project.id}
        projectType={project.type}
        genre={project.genre}
        onGenerated={() => {
          setShowGenerator(false)
          loadOutlines()
        }}
      />
    </div>
  )
}
