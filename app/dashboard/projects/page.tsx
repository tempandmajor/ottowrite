'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Textarea } from '@/components/ui/textarea'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { EmptyState } from '@/components/dashboard/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Filter, Plus, Search, Trash2 } from 'lucide-react'

type Project = {
  id: string
  name: string
  type: 'novel' | 'series' | 'screenplay' | 'play' | 'short_story'
  genre: string[] | null
  description?: string | null
  created_at: string
  updated_at: string
}

const projectTypeLabels: Record<Project['type'], string> = {
  novel: 'Novel',
  series: 'Series',
  screenplay: 'Screenplay',
  play: 'Play',
  short_story: 'Short Story',
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | Project['type']>('all')
  const [formData, setFormData] = useState({
    name: '',
    type: 'novel' as Project['type'],
    genre: '',
    description: '',
  })
  const { toast } = useToast()

  const loadProjects = useCallback(async () => {
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
        .order('updated_at', { ascending: false })

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
  }, [toast])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  async function createProject() {
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

      const { error } = await supabase.from('projects').insert([
        {
          user_id: user.id,
          name: formData.name,
          type: formData.type,
          genre: genres.length ? genres : null,
          description: formData.description || null,
        },
      ])

      if (error) throw error

      toast({ title: 'Project created', description: 'Your new project is ready.' })
      setDialogOpen(false)
      setFormData({ name: '', type: 'novel', genre: '', description: '' })
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

  async function confirmDeleteProject() {
    if (!deleteId) return
    try {
      const supabase = createClient()
      const { error } = await supabase.from('projects').delete().eq('id', deleteId)
      if (error) throw error
      toast({ title: 'Project deleted', description: 'The project has been removed.' })
      setDeleteId(null)
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

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesSearch = project.name.toLowerCase().includes(search.toLowerCase())
      const matchesType = typeFilter === 'all' || project.type === typeFilter
      return matchesSearch && matchesType
    })
  }, [projects, search, typeFilter])

  const totalGenres = new Set(projects.flatMap((project) => project.genre ?? [])).size

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between gap-4">
          <div className="space-y-3">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-10 w-full md:w-64" />
          <Skeleton className="h-10 w-44" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, idx) => (
            <Skeleton key={idx} className="h-40 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-10">
      <section className="flex flex-col gap-6 rounded-3xl border bg-card/70 p-6 shadow-card md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
            <Filter className="h-3.5 w-3.5" />
            Project Library
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight">Projects</h1>
            <p className="text-sm text-muted-foreground">
              Organize novels, screenplays, and serial worlds—all synced with Ottowrite’s AI tools.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground">
              <span>{projects.length} projects</span>
              <span className="h-4 w-px bg-border" />
              <span>{totalGenres} genres tracked</span>
            </div>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </div>
        </div>
        <div className="flex w-full max-w-xs flex-col gap-2 rounded-2xl border bg-background/80 p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Quick tips</p>
          <p className="text-sm text-muted-foreground">
            Use tags and genres to group related projects. Ottowrite surfaces this data in outline and character tools.
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border bg-card/60 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full flex-1 items-center gap-2 rounded-full border bg-background px-3 py-2 shadow-inner">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search projects by name"
            className="border-none bg-transparent shadow-none focus-visible:ring-0"
          />
        </div>
        <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as typeof typeFilter)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {Object.entries(projectTypeLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>

      {filteredProjects.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredProjects.map((project) => (
            <div key={project.id} className="flex h-full flex-col justify-between rounded-2xl border bg-card/80 p-6 shadow-card transition hover:shadow-lg">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground">{project.name}</h3>
                  <Badge variant="muted" className="capitalize">
                    {projectTypeLabels[project.type]}
                  </Badge>
                </div>
                {project.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Updated {new Date(project.updated_at).toLocaleDateString()}
                </p>
                {project.genre && project.genre.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {project.genre.slice(0, 4).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {project.genre.length > 4 && (
                      <Badge variant="outline" className="text-xs">
                        +{project.genre.length - 4}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              <div className="mt-6 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Button asChild>
                    <Link href={`/dashboard/projects/${project.id}`}>Open project</Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href={`/dashboard/projects/${project.id}/characters`}>Characters</Link>
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete project ${project.name}`}
                  onClick={() => setDeleteId(project.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Search}
          title="No projects match your filters"
          description="Adjust the filters or create a new project to get started."
          action={{ label: 'Create project', href: '/dashboard/projects?new=true' }}
          secondaryAction={{ label: 'Clear filters', onClick: () => { setSearch(''); setTypeFilter('all') } }}
        />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Create new project</DialogTitle>
            <DialogDescription>Set up a new workspace for your story.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="project-name">Project name</Label>
              <Input
                id="project-name"
                placeholder="My Novel"
                value={formData.name}
                onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="project-type">Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, type: value as Project['type'] }))}
              >
                <SelectTrigger id="project-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(projectTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="project-genre">Genres (comma separated)</Label>
              <Input
                id="project-genre"
                placeholder="Fantasy, Adventure"
                value={formData.genre}
                onChange={(event) => setFormData((prev) => ({ ...prev, genre: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="project-description">Description</Label>
              <Textarea
                id="project-description"
                placeholder="Optional notes about this project"
                rows={3}
                value={formData.description}
                onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createProject} disabled={!formData.name.trim()}>
              Create project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the project and its associated documents. Characters and outlines linked to this project will also be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={confirmDeleteProject}>
              Delete project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
