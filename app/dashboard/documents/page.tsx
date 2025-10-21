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
import { Filter, FileText, Plus, Search, Trash2 } from 'lucide-react'

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
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        {/* Search/Filters Skeleton */}
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-[140px]" />
          <Skeleton className="h-10 w-[160px]" />
        </div>

        {/* Cards Skeleton */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <Skeleton key={idx} className="h-44 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
          <p className="text-sm text-muted-foreground">
            {documents.length} {documents.length === 1 ? 'document' : 'documents'} · {totalWords.toLocaleString()} words
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Document
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search documents..."
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as typeof typeFilter)}>
            <SelectTrigger className="w-[140px]">
              <Filter className="mr-2 h-4 w-4" />
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
            <SelectTrigger className="w-[160px]">
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
      </div>

      {filteredDocuments.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDocuments.map((doc) => (
            <div
              key={doc.id}
              className="group relative flex flex-col rounded-lg border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md"
            >
              {/* Header */}
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{doc.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {doc.word_count.toLocaleString()} words
                  </p>
                </div>
                <Badge variant="secondary" className="shrink-0 text-xs">
                  {documentTypeLabels[doc.type]}
                </Badge>
              </div>

              {/* Metadata */}
              <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
                <FileText className="h-3.5 w-3.5" />
                <span className="truncate">{doc.project?.name ?? 'No project'}</span>
              </div>

              {/* Actions */}
              <div className="mt-auto flex items-center justify-between gap-2">
                <Button asChild size="sm" className="flex-1">
                  <Link href={`/dashboard/editor/${doc.id}`}>Open</Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label={`Delete ${doc.title}`}
                  onClick={() => setDeleteId(doc.id)}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>

              {/* Last updated footer */}
              <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                Updated {new Date(doc.updated_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={search || typeFilter !== 'all' || projectFilter !== 'all' ? Filter : FileText}
          title={search || typeFilter !== 'all' || projectFilter !== 'all' ? 'No documents found' : 'No documents yet'}
          description={search || typeFilter !== 'all' || projectFilter !== 'all' ? 'Try adjusting your search or filters.' : 'Create your first document to get started.'}
          action={{ label: 'New Document', onClick: () => setDialogOpen(true) }}
          secondaryAction={
            search || typeFilter !== 'all' || projectFilter !== 'all'
              ? { label: 'Clear Filters', onClick: () => { setSearch(''); setTypeFilter('all'); setProjectFilter('all') } }
              : undefined
          }
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
