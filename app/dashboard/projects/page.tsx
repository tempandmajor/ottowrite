'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash2 } from 'lucide-react'

type Project = {
  id: string
  name: string
  type: 'novel' | 'series' | 'screenplay' | 'play' | 'short_story'
  genre: string[] | null
  created_at: string
  updated_at: string
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    type: 'novel' as Project['type'],
    genre: '',
  })
  const { toast } = useToast()

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setProjects(data || [])
    } catch (error) {
      console.error('Error loading projects:', error)
      toast({
        title: 'Error',
        description: 'Failed to load projects',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const createProject = async () => {
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const genres = formData.genre
        .split(',')
        .map((g) => g.trim())
        .filter((g) => g.length > 0)

      const { data, error } = await supabase
        .from('projects')
        .insert([
          {
            user_id: user.id,
            name: formData.name,
            type: formData.type,
            genre: genres.length > 0 ? genres : null,
          },
        ])
        .select()

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Project created successfully',
      })

      setOpen(false)
      setFormData({ name: '', type: 'novel', genre: '' })
      loadProjects()
    } catch (error) {
      console.error('Error creating project:', error)
      toast({
        title: 'Error',
        description: 'Failed to create project',
        variant: 'destructive',
      })
    }
  }

  const deleteProject = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.'))
      return

    try {
      const supabase = createClient()
      const { error } = await supabase.from('projects').delete().eq('id', id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Project deleted successfully',
      })

      loadProjects()
    } catch (error) {
      console.error('Error deleting project:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete project',
        variant: 'destructive',
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading projects...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground mt-2">
            Organize your writing projects in one place
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Add a new writing project to organize your work
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name</Label>
                <Input
                  id="name"
                  placeholder="My Novel"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, type: value as Project['type'] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="novel">Novel</SelectItem>
                    <SelectItem value="series">Series</SelectItem>
                    <SelectItem value="screenplay">Screenplay</SelectItem>
                    <SelectItem value="play">Play</SelectItem>
                    <SelectItem value="short_story">Short Story</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="genre">Genres (comma-separated)</Label>
                <Input
                  id="genre"
                  placeholder="Fantasy, Adventure, Mystery"
                  value={formData.genre}
                  onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={createProject} disabled={!formData.name}>
                Create Project
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">No projects yet</p>
              <Button onClick={() => setOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Project
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} className="relative">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle>{project.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {project.type.replace('_', ' ')}
                      {project.genre && project.genre.length > 0 && (
                        <span className="ml-2">• {project.genre.join(', ')}</span>
                      )}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteProject(project.id)}
                    className="h-8 w-8 p-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Created {new Date(project.created_at).toLocaleDateString()}
                </p>
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/dashboard/projects/${project.id}`}>
                    Open Project
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
