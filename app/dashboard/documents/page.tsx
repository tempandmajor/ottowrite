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
import { BookOpen, Filter, FileText, Plus, Search, Trash2 } from 'lucide-react'

interface Document {
  id: string
  project_id: string
  title: string
  type: 'novel' | 'screenplay' | 'play' | 'short_story'
  word_count: number
  position: number
  created_at: string
  updated_at: string
  project?: {
    name: string
  }
}

interface Project {
  id: string
  name: string
  type: string
}

const documentTypeLabels: Record<Document['type'], string> = {
  novel: 'Novel',
  screenplay: 'Screenplay',
  play: 'Play',
  short_story: 'Short Story',
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | Document['type']>('all')
  const [projectFilter, setProjectFilter] = useState<'all' | string>('all')
  const [formData, setFormData] = useState({
    title: '',
    type: 'novel' as Document['type'],
    project_id: '',
  })
  const { toast } = useToast()

  const loadInitialData = useCallback(async () => {
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const [documentsResponse, projectsResponse] = await Promise.all([
        supabase
          .from('documents')
          .select(
            `*,
            project:projects(name)`
          )
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false }),
        supabase
          .from('projects')
          .select('id, name, type')
          .eq('user_id', user.id)
          .order('name', { ascending: true }),
      ])

      if (documentsResponse.error) throw documentsResponse.error
      if (projectsResponse.error) throw projectsResponse.error

      setDocuments(documentsResponse.data || [])
      setProjects(projectsResponse.data || [])
      const firstProjectId = projectsResponse.data?.[0]?.id ?? ''

      if (firstProjectId) {
        setFormData((prev) =>
          prev.project_id ? prev : { ...prev, project_id: firstProjectId }
        )
      }
    } catch (error) {
      console.error('Error loading documents:', error)
      toast({ title: 'Error', description: 'Failed to load documents', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadInitialData()
  }, [loadInitialData])

  async function createDocument() {
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { error } = await supabase
        .from('documents')
        .insert([
          {
            user_id: user.id,
            project_id: formData.project_id || null,
            title: formData.title,
            type: formData.type,
            content: {},
            position: 0,
            word_count: 0,
          },
        ])

      if (error) throw error

      toast({ title: 'Document created', description: 'Happy writing!' })
      setDialogOpen(false)
      setFormData({ title: '', type: 'novel', project_id: projects[0]?.id ?? '' })
      loadInitialData()
    } catch (error) {
      console.error('Error creating document:', error)
      toast({ title: 'Error', description: 'Failed to create document', variant: 'destructive' })
    }
  }

  async function confirmDeleteDocument() {
    if (!deleteId) return
    try {
      const supabase = createClient()
      const { error } = await supabase.from('documents').delete().eq('id', deleteId)
      if (error) throw error
      toast({ title: 'Document deleted', description: 'Draft removed from your workspace.' })
      setDeleteId(null)
      loadInitialData()
    } catch (error) {
      console.error('Error deleting document:', error)
      toast({ title: 'Error', description: 'Failed to delete document', variant: 'destructive' })
    }
  }

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch = doc.title.toLowerCase().includes(search.toLowerCase())
      const matchesType = typeFilter === 'all' || doc.type === typeFilter
      const matchesProject = projectFilter === 'all' || doc.project_id === projectFilter
      return matchesSearch && matchesType && matchesProject
    })
  }, [documents, search, typeFilter, projectFilter])

  const totalWords = documents.reduce((sum, doc) => sum + (doc.word_count || 0), 0)

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
        <div className="grid gap-3 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <Skeleton key={idx} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-10 w-full" />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, idx) => (
            <Skeleton key={idx} className="h-36 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-10">
      <section className="flex flex-col gap-6 rounded-3xl border bg-card/70 p-6 shadow-card md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-wide text-secondary-foreground">
            <BookOpen className="h-3.5 w-3.5" />
            Document Library
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Documents</h1>
            <p className="text-sm text-muted-foreground">
              Keep drafts, treatments, and scripts organized with smart filters and AI assist.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>{documents.length} documents</span>
            <span className="h-4 w-px bg-border" />
            <span>{projects.length} projects linked</span>
            <span className="h-4 w-px bg-border" />
            <span>{totalWords.toLocaleString()} words tracked</span>
          </div>
        </div>
        <Button size="lg" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New document
        </Button>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border bg-card/60 p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 items-center gap-2 rounded-full border bg-background px-3 py-2 shadow-inner">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search documents"
            className="border-none bg-transparent shadow-none focus-visible:ring-0"
          />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as typeof typeFilter)}>
            <SelectTrigger className="min-w-[150px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {Object.entries(documentTypeLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={projectFilter} onValueChange={(value) => setProjectFilter(value as typeof projectFilter)}>
            <SelectTrigger className="min-w-[180px]">
              <SelectValue placeholder="Project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      {filteredDocuments.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredDocuments.map((doc) => (
            <div key={doc.id} className="flex h-full flex-col justify-between rounded-2xl border bg-card/80 p-6 shadow-card transition hover:shadow-lg">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground">{doc.title}</h3>
                  <Badge variant="muted" className="capitalize">
                    {documentTypeLabels[doc.type]}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Updated {new Date(doc.updated_at).toLocaleDateString()} · {doc.word_count.toLocaleString()} words
                </p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1">
                    <FileText className="h-3 w-3" />
                    {doc.project?.name ?? 'Unassigned'}
                  </span>
                </div>
              </div>
              <div className="mt-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button asChild>
                    <Link href={`/dashboard/editor/${doc.id}`}>Open</Link>
                  </Button>
                  <Button variant="outline" asChild disabled={!doc.project_id}>
                    <Link href={doc.project_id ? `/dashboard/projects/${doc.project_id}` : '#'}>Project</Link>
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete document ${doc.title}`}
                  onClick={() => setDeleteId(doc.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Filter}
          title="No documents match your filters"
          description="Try adjusting your filters or start a new draft to fill your library."
          action={{ label: 'New document', onClick: () => setDialogOpen(true) }}
          secondaryAction={{ label: 'Clear filters', onClick: () => { setSearch(''); setTypeFilter('all'); setProjectFilter('all') } }}
        />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Create document</DialogTitle>
            <DialogDescription>Draft chapters, scripts, or treatments with AI assistance.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="document-title">Title</Label>
              <Input
                id="document-title"
                placeholder="Chapter 1"
                value={formData.title}
                onChange={(event) => setFormData((prev) => ({ ...prev, title: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="document-type">Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, type: value as Document['type'] }))}
              >
                <SelectTrigger id="document-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(documentTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="document-project">Project</Label>
              <Select
                value={formData.project_id}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, project_id: value }))}
              >
                <SelectTrigger id="document-project">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createDocument} disabled={!formData.title.trim()}>
              Create document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the document. Any unsynced changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={confirmDeleteDocument}>
              Delete document
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
