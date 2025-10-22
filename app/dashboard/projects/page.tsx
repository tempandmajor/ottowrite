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
import { Checkbox } from '@/components/ui/checkbox'
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
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import {
  Filter,
  FolderPlus,
  Loader2,
  Plus,
  Search,
  Tag as TagIcon,
  Trash2,
  X,
} from 'lucide-react'

type ProjectType = 'novel' | 'series' | 'screenplay' | 'play' | 'short_story'

type ProjectFolder = {
  id: string
  name: string
  color: string | null
  parent_id: string | null
  created_at: string
  updated_at?: string
}

type ProjectTag = {
  id: string
  name: string
  color: string | null
  description?: string | null
  project_count: number
  created_at?: string
  updated_at?: string
}

type ProjectTagSummary = {
  id: string
  name: string
  color: string | null
}

type ProjectSummary = {
  id: string
  name: string
  type: ProjectType
  genre: string[] | null
  description?: string | null
  created_at: string
  updated_at: string
  folder_id?: string | null
  tags: ProjectTagSummary[]
  folder: ProjectFolder | null
}

type Pagination = {
  total: number
  page: number
  limit: number
}

const projectTypeLabels: Record<ProjectType, string> = {
  novel: 'Novel',
  series: 'Series',
  screenplay: 'Screenplay',
  play: 'Play',
  short_story: 'Short Story',
}

const resolveErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message.length > 0) {
      return message
    }
  }
  if (error instanceof Error && typeof error.message === 'string' && error.message.length > 0) {
    return error.message
  }
  return fallback
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [availableFolders, setAvailableFolders] = useState<ProjectFolder[]>([])
  const [availableTags, setAvailableTags] = useState<ProjectTag[]>([])
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 20 })
  const [initialLoad, setInitialLoad] = useState(true)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [manageTagsOpen, setManageTagsOpen] = useState(false)
  const [manageFoldersOpen, setManageFoldersOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | ProjectType>('all')
  const [selectedFolderId, setSelectedFolderId] = useState<string>('')
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [creatingProject, setCreatingProject] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    type: 'novel' as ProjectType,
    genre: '',
    description: '',
    folderId: '',
  })
  const [createDefaultFolders, setCreateDefaultFolders] = useState(true)
  const [selectedCreateTagIds, setSelectedCreateTagIds] = useState<string[]>([])
  const { toast } = useToast()

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search.trim()), 250)
    return () => clearTimeout(handler)
  }, [search])

  useEffect(() => {
    if (dialogOpen) {
      setFormData((prev) => ({
        ...prev,
        folderId: selectedFolderId && selectedFolderId !== '__none' ? selectedFolderId : '',
      }))
      setSelectedCreateTagIds([])
    }
  }, [dialogOpen, selectedFolderId])

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (debouncedSearch.length > 0) {
        params.set('q', debouncedSearch)
      }
      if (typeFilter !== 'all') {
        params.set('type', typeFilter)
      }
      if (selectedFolderId === '__none') {
        params.set('folder', '__none')
      } else if (selectedFolderId) {
        params.set('folder', selectedFolderId)
      }
      if (selectedTagIds.length > 0) {
        params.set('tags', selectedTagIds.join(','))
      }
      params.set('limit', String(pagination.limit))

      const response = await fetch(`/api/projects/query?${params.toString()}`, {
        cache: 'no-store',
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error ?? 'Failed to load projects')
      }

      const payload = await response.json()
      setProjects(payload.projects ?? [])
      setAvailableFolders(payload.availableFolders ?? [])
      setAvailableTags(payload.availableTags ?? [])
      setPagination((prev) => ({
        total: payload.pagination?.total ?? payload.projects?.length ?? prev.total,
        page: payload.pagination?.page ?? 1,
        limit: payload.pagination?.limit ?? prev.limit,
      }))
    } catch (error) {
      console.error('Failed to query projects:', error)
      toast({
        title: 'Could not refresh projects',
        description: error instanceof Error ? error.message : 'Please try again later.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
      setInitialLoad(false)
    }
  }, [debouncedSearch, pagination.limit, selectedFolderId, selectedTagIds, typeFilter, toast])

  useEffect(() => {
    void fetchProjects()
  }, [fetchProjects])

  const toggleTagFilter = useCallback((tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    )
  }, [])

  const clearFilters = () => {
    setSearch('')
    setSelectedTagIds([])
    setSelectedFolderId('')
    setTypeFilter('all')
  }

  const toggleCreateTagSelection = (tagId: string) => {
    setSelectedCreateTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    )
  }

  const hasActiveFilters = useMemo(() => {
    return (
      typeFilter !== 'all' ||
      selectedFolderId.length > 0 ||
      selectedTagIds.length > 0 ||
      debouncedSearch.length > 0
    )
  }, [debouncedSearch.length, selectedFolderId.length, selectedTagIds.length, typeFilter])

  const isRefreshing = !initialLoad && loading

  async function createDefaultProjectStructure(projectId: string, projectType: ProjectType, userId: string) {
    const supabase = createClient()

    // Define default structure based on project type
    const isScreenplay = projectType === 'screenplay' || projectType === 'play'

    const defaultFolders = isScreenplay
      ? [
          { title: 'Acts', type: 'manuscript', position: 0 },
          { title: 'Scenes', type: 'manuscript', position: 1 },
          { title: 'Characters', type: 'characters', position: 2 },
          { title: 'Locations', type: 'notes', position: 3 },
        ]
      : [
          { title: 'Manuscript', type: 'manuscript', position: 0 },
          { title: 'Research', type: 'research', position: 1 },
          { title: 'Characters', type: 'characters', position: 2 },
          { title: 'Notes', type: 'notes', position: 3 },
          { title: 'Deleted Scenes', type: 'deleted', position: 4 },
        ]

    // Create folders
    const folderInserts = defaultFolders.map((folder) => ({
      user_id: userId,
      project_id: projectId,
      title: folder.title,
      type: projectType,
      is_folder: true,
      folder_type: folder.type,
      position: folder.position,
      word_count: 0,
    }))

    const { data: folders, error: foldersError } = await supabase
      .from('documents')
      .insert(folderInserts)
      .select('id, folder_type')

    if (foldersError) throw foldersError

    // Create a starter document in the Manuscript/Acts folder
    const manuscriptFolder = folders?.find((f) => f.folder_type === 'manuscript')
    if (manuscriptFolder) {
      const starterDoc = {
        user_id: userId,
        project_id: projectId,
        parent_folder_id: manuscriptFolder.id,
        title: isScreenplay ? 'Act I' : 'Chapter 1',
        type: projectType,
        is_folder: false,
        position: 0,
        content: { html: '', structure: [] },
        word_count: 0,
      }

      const { error: docError } = await supabase.from('documents').insert(starterDoc)
      if (docError) throw docError
    }
  }

  async function createProject() {
    try {
      setCreatingProject(true)
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const genres = formData.genre
        .split(',')
        .map((g) => g.trim())
        .filter((g) => g.length > 0)

      const { data: project, error } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          name: formData.name,
          type: formData.type,
          genre: genres.length ? genres : null,
          description: formData.description || null,
          folder_id: formData.folderId || null,
        })
        .select('id')
        .single()

      if (error) throw error

      // Create default folder structure if enabled
      if (project?.id && createDefaultFolders) {
        try {
          await createDefaultProjectStructure(project.id, formData.type, user.id)
        } catch (structureError) {
          console.error('Error creating default structure:', structureError)
          // Don't fail the project creation if structure creation fails
        }
      }

      if (project?.id && selectedCreateTagIds.length > 0) {
        const linkRows = selectedCreateTagIds.map((tagId) => ({
          project_id: project.id,
          tag_id: tagId,
          user_id: user.id,
        }))
        const { error: linkError } = await supabase.from('project_tag_links').upsert(linkRows)
        if (linkError) throw linkError
      }

      toast({ title: 'Project created', description: 'Your new project is ready.' })
      setDialogOpen(false)
      setFormData({ name: '', type: 'novel', genre: '', description: '', folderId: selectedFolderId === '__none' ? '' : selectedFolderId })
      setSelectedCreateTagIds([])
      try {
        await supabase.rpc('refresh_user_plan_usage', { p_user_id: user.id })
      } catch (refreshError) {
        console.warn('refresh_user_plan_usage failed after project insert', refreshError)
      }
      await fetchProjects()
    } catch (error) {
      console.error('Error creating project:', error)
      const message = resolveErrorMessage(error, 'Failed to create project')
      const isLimit = /plan .* allows/i.test(message)
      toast({
        title: isLimit ? 'Plan limit reached' : 'Error',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setCreatingProject(false)
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
      await fetchProjects()
    } catch (error) {
      console.error('Error deleting project:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete project',
        variant: 'destructive',
      })
    }
  }

  const totalGenres = useMemo(() => new Set(projects.flatMap((project) => project.genre ?? [])).size, [projects])

  if (initialLoad) {
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

  const showEmptyState = projects.length === 0 && !loading

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold text-foreground">Projects</h1>
          <p className="text-sm text-muted-foreground">
            {pagination.total} total projects · {totalGenres} distinct genres tracked
          </p>
          {isRefreshing && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Updating view…
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setManageTagsOpen(true)}>
            <TagIcon className="mr-2 h-4 w-4" /> Manage tags
          </Button>
          <Button variant="outline" size="sm" onClick={() => setManageFoldersOpen(true)}>
            <FolderPlus className="mr-2 h-4 w-4" /> Manage folders
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New project
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full flex-1 min-w-[200px] md:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search projects..."
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as typeof typeFilter)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {Object.entries(projectTypeLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={selectedFolderId || 'all'}
          onValueChange={(value) => {
            if (value === 'all') {
              setSelectedFolderId('')
            } else {
              setSelectedFolderId(value)
            }
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Folder" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All folders</SelectItem>
            <SelectItem value="__none">Unassigned</SelectItem>
            {availableFolders.map((folder) => (
              <SelectItem key={folder.id} value={folder.id}>
                {folder.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="mr-2 h-4 w-4" /> Clear filters
          </Button>
        )}
      </div>

      <div className="rounded-2xl border border-border/60 bg-card/70 p-4">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Filter className="h-3.5 w-3.5" /> Tags
        </div>
        {availableTags.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tags yet. Create one to start organising projects.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {availableTags.map((tag) => {
              const selected = selectedTagIds.includes(tag.id)
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTagFilter(tag.id)}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition',
                    selected
                      ? 'border-primary bg-primary text-primary-foreground shadow'
                      : 'border-border bg-background/80 text-muted-foreground hover:bg-muted/70'
                  )}
                >
                  <span className="truncate max-w-[140px]">{tag.name}</span>
                  <span className="rounded bg-background/60 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                    {tag.project_count}
                  </span>
                  {selected && <X className="h-3 w-3" />}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {showEmptyState ? (
        <EmptyState
          icon={FolderPlus}
          title="No projects yet"
          description="Start a new world or import an existing manuscript to unlock OttoWrite’s planning tools."
          action={{ label: 'Create project', onClick: () => setDialogOpen(true) }}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((project) => (
            <div key={project.id} className="flex flex-col justify-between rounded-2xl border bg-card/80 p-5 shadow-card">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link
                      href={`/dashboard/projects/${project.id}`}
                      className="text-lg font-semibold text-foreground hover:text-primary"
                    >
                      {project.name}
                    </Link>
                    <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                      {projectTypeLabels[project.type]}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteId(project.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {project.description && (
                  <p className="line-clamp-3 text-sm text-muted-foreground">{project.description}</p>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  {project.folder && (
                    <Badge variant="outline" className="flex items-center gap-2">
                      {project.folder.color && (
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: project.folder.color }}
                        />
                      )}
                      {project.folder.name}
                    </Badge>
                  )}
                  {project.tags.map((tag) => (
                    <Badge key={tag.id} variant="secondary" className="flex items-center gap-1">
                      {tag.color && (
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                      )}
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>
                  Updated {new Date(project.updated_at).toLocaleDateString()} • Created{' '}
                  {new Date(project.created_at).toLocaleDateString()}
                </span>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/dashboard/projects/${project.id}`}>Open workspace</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create project</DialogTitle>
            <DialogDescription>Kick off a new story world or screenplay.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="project-name">Name</Label>
              <Input
                id="project-name"
                placeholder="Project name"
                value={formData.name}
                onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="project-type">Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, type: value as ProjectType }))}
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
              <Label htmlFor="project-folder">Folder</Label>
              <Select
                value={formData.folderId || 'none'}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, folderId: value === 'none' ? '' : value }))
                }
              >
                <SelectTrigger id="project-folder">
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No folder</SelectItem>
                  {availableFolders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      {folder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="project-genre">Genres</Label>
              <Input
                id="project-genre"
                placeholder="fantasy, mystery, coming of age"
                value={formData.genre}
                onChange={(event) => setFormData((prev) => ({ ...prev, genre: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="project-description">Description</Label>
              <Textarea
                id="project-description"
                rows={3}
                placeholder="What makes this project unique?"
                value={formData.description}
                onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="create-default-folders"
                checked={createDefaultFolders}
                onCheckedChange={(checked) => setCreateDefaultFolders(checked as boolean)}
              />
              <Label
                htmlFor="create-default-folders"
                className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Create default folders (Manuscript, Research, Characters, Notes)
              </Label>
            </div>
            <div className="grid gap-2">
              <Label>Select tags</Label>
              {availableTags.length === 0 ? (
                <p className="text-xs text-muted-foreground">No tags yet. Use “Manage tags” to create one.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => {
                    const selected = selectedCreateTagIds.includes(tag.id)
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleCreateTagSelection(tag.id)}
                        className={cn(
                          'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition',
                          selected
                            ? 'border-primary bg-primary text-primary-foreground shadow'
                            : 'border-border bg-background/70 text-muted-foreground hover:bg-muted/70'
                        )}
                      >
                        {tag.name}
                        {selected && <X className="h-3 w-3" />}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createProject} disabled={creatingProject || !formData.name.trim()}>
              {creatingProject ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {creatingProject ? 'Creating...' : 'Create project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone and will permanently remove the project and its documents.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={confirmDeleteProject}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ManageTagsDialog
        open={manageTagsOpen}
        onOpenChange={setManageTagsOpen}
        tags={availableTags}
        onRefresh={() => fetchProjects()}
      />

      <ManageFoldersDialog
        open={manageFoldersOpen}
        onOpenChange={setManageFoldersOpen}
        folders={availableFolders}
        onRefresh={() => fetchProjects()}
      />
    </div>
  )
}

type ManageTagsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  tags: ProjectTag[]
  onRefresh: () => Promise<void> | void
}

function ManageTagsDialog({ open, onOpenChange, tags, onRefresh }: ManageTagsDialogProps) {
  const { toast } = useToast()
  const [form, setForm] = useState({ name: '', color: '', description: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      setForm({ name: '', color: '', description: '' })
      setSubmitting(false)
    }
  }, [open])

  const createTag = async () => {
    if (!form.name.trim()) return
    try {
      setSubmitting(true)
      const response = await fetch('/api/projects/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          color: form.color.trim() || null,
          description: form.description.trim() || null,
        }),
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error ?? 'Failed to create tag')
      }
      toast({ title: 'Tag created' })
      setForm({ name: '', color: '', description: '' })
      await onRefresh()
    } catch (error) {
      console.error('Failed to create tag:', error)
      toast({
        title: 'Could not create tag',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const deleteTag = async (id: string) => {
    const confirmed = window.confirm('Delete this tag? Projects will lose the tag but remain intact.')
    if (!confirmed) return
    try {
      const response = await fetch(`/api/projects/tags?id=${id}`, { method: 'DELETE' })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error ?? 'Failed to delete tag')
      }
      toast({ title: 'Tag removed' })
      await onRefresh()
    } catch (error) {
      console.error('Failed to delete tag:', error)
      toast({
        title: 'Could not delete tag',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage tags</DialogTitle>
          <DialogDescription>Organise projects by theme, status, or pipeline.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="new-tag-name">Create new tag</Label>
            <div className="grid gap-2 md:grid-cols-[1fr_160px]">
              <Input
                id="new-tag-name"
                placeholder="Tag name"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              />
              <Input
                placeholder="#A855F7"
                value={form.color}
                onChange={(event) => setForm((prev) => ({ ...prev, color: event.target.value }))}
              />
            </div>
            <Textarea
              rows={2}
              placeholder="Optional description"
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            />
            <div className="flex justify-end">
              <Button onClick={createTag} disabled={submitting || !form.name.trim()}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {submitting ? 'Saving...' : 'Add tag'}
              </Button>
            </div>
          </div>

          <ScrollArea className="max-h-64 rounded-xl border border-border/60 p-3">
            <div className="space-y-2">
              {tags.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tags yet.</p>
              ) : (
                tags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/60 p-3"
                  >
                    <div>
                      <p className="font-medium text-foreground">{tag.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {tag.project_count} project{tag.project_count === 1 ? '' : 's'}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => void deleteTag(tag.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}

type ManageFoldersDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  folders: ProjectFolder[]
  onRefresh: () => Promise<void> | void
}

function ManageFoldersDialog({ open, onOpenChange, folders, onRefresh }: ManageFoldersDialogProps) {
  const { toast } = useToast()
  const [form, setForm] = useState({ name: '', color: '', parentId: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      setForm({ name: '', color: '', parentId: '' })
      setSubmitting(false)
    }
  }, [open])

  const createFolder = async () => {
    if (!form.name.trim()) return
    try {
      setSubmitting(true)
      const response = await fetch('/api/projects/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          color: form.color.trim() || null,
          parent_id: form.parentId || null,
        }),
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error ?? 'Failed to create folder')
      }
      toast({ title: 'Folder created' })
      setForm({ name: '', color: '', parentId: '' })
      await onRefresh()
    } catch (error) {
      console.error('Failed to create folder:', error)
      toast({
        title: 'Could not create folder',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const deleteFolder = async (id: string) => {
    const confirmed = window.confirm('Delete this folder? Projects inside will move to Unassigned.')
    if (!confirmed) return
    try {
      const response = await fetch(`/api/projects/folders?id=${id}`, { method: 'DELETE' })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error ?? 'Failed to delete folder')
      }
      toast({ title: 'Folder removed' })
      await onRefresh()
    } catch (error) {
      console.error('Failed to delete folder:', error)
      toast({
        title: 'Could not delete folder',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage folders</DialogTitle>
          <DialogDescription>Group projects by franchise, client, or workflow.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="new-folder-name">Create new folder</Label>
            <Input
              id="new-folder-name"
              placeholder="Folder name"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            />
            <div className="grid gap-2 md:grid-cols-[1fr_180px]">
              <Input
                placeholder="#2563EB"
                value={form.color}
                onChange={(event) => setForm((prev) => ({ ...prev, color: event.target.value }))}
              />
              <Select
                value={form.parentId || 'none'}
                onValueChange={(value) => setForm((prev) => ({ ...prev, parentId: value === 'none' ? '' : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Parent folder (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No parent</SelectItem>
                  {folders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      {folder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end">
              <Button onClick={createFolder} disabled={submitting || !form.name.trim()}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {submitting ? 'Saving...' : 'Add folder'}
              </Button>
            </div>
          </div>

          <ScrollArea className="max-h-64 rounded-xl border border-border/60 p-3">
            <div className="space-y-2">
              {folders.length === 0 ? (
                <p className="text-sm text-muted-foreground">No folders yet.</p>
              ) : (
                folders.map((folder) => (
                  <div
                    key={folder.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/60 p-3"
                  >
                    <div>
                      <p className="font-medium text-foreground">{folder.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Created {new Date(folder.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => void deleteFolder(folder.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}
