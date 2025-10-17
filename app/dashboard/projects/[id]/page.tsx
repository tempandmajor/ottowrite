'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState } from '@/components/dashboard/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { TemplateDialog } from '@/components/dashboard/template-dialog'
import { useToast } from '@/hooks/use-toast'
import {
  ArrowLeft,
  Building2,
  BookOpen,
  FileText,
  Lightbulb,
  Plus,
  Users,
  Trash2,
} from 'lucide-react'

interface Project {
  id: string
  name: string
  type: 'novel' | 'series' | 'screenplay' | 'play' | 'short_story'
  genre: string[] | null
  description: string | null
  created_at: string
  updated_at: string
}

interface DocumentSummary {
  id: string
  title: string
  type: 'novel' | 'screenplay' | 'play' | 'short_story'
  word_count: number
  updated_at: string
}

interface CharacterSummary {
  id: string
  name: string
  role: string
  importance: number
  arc_type?: string | null
}

const projectTypeLabels: Record<Project['type'], string> = {
  novel: 'Novel',
  series: 'Series',
  screenplay: 'Screenplay',
  play: 'Play',
  short_story: 'Short Story',
}

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [project, setProject] = useState<Project | null>(null)
  const [documents, setDocuments] = useState<DocumentSummary[]>([])
  const [characters, setCharacters] = useState<CharacterSummary[]>([])
  const [characterStats, setCharacterStats] = useState<{
    total_characters: number
    protagonists: number
    antagonists: number
    supporting: number
    total_relationships: number
    avg_importance: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    type: 'novel' as DocumentSummary['type'],
  })

  useEffect(() => {
    if (!params.id) return
    loadProjectBundle()
  }, [params.id])

  async function loadProjectBundle() {
    setLoading(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      const projectId = params.id as string

      const [projectRes, documentsRes, charactersRes] = await Promise.all([
        supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .eq('user_id', user.id)
          .single(),
        supabase
          .from('documents')
          .select('id, title, type, word_count, updated_at')
          .eq('project_id', projectId)
          .order('updated_at', { ascending: false }),
        supabase
          .from('characters')
          .select('id, name, role, importance, arc_type')
          .eq('project_id', projectId)
          .order('importance', { ascending: false }),
      ])

      if (projectRes.error || !projectRes.data) {
        throw projectRes.error ?? new Error('Project not found')
      }

      setProject(projectRes.data)
      setDocuments(documentsRes.data || [])
      setCharacters(charactersRes.data || [])

      const { data: statsData } = await supabase.rpc('get_character_stats', {
        p_project_id: projectId,
      })

      if (statsData && statsData.length > 0) {
        const stats = statsData[0]
        setCharacterStats({
          total_characters: Number(stats.total_characters || 0),
          protagonists: Number(stats.protagonists || 0),
          antagonists: Number(stats.antagonists || 0),
          supporting: Number(stats.supporting || 0),
          total_relationships: Number(stats.total_relationships || 0),
          avg_importance: Number(stats.avg_importance || 0),
        })
      } else {
        setCharacterStats(null)
      }
    } catch (error) {
      console.error('Error loading project:', error)
      toast({
        title: 'Error',
        description: 'Unable to load this project. Returning to Projects.',
        variant: 'destructive',
      })
      router.push('/dashboard/projects')
    } finally {
      setLoading(false)
    }
  }

  async function createDocument() {
    if (!project) return
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
            project_id: project.id,
            title: formData.title,
            type: formData.type,
            content: {},
            position: 0,
            word_count: 0,
          },
        ])

      if (error) throw error

      toast({ title: 'Document created', description: 'Draft added to your project.' })
      setDialogOpen(false)
      setFormData({ title: '', type: 'novel' })
      loadProjectBundle()
    } catch (error) {
      console.error('Error creating document:', error)
      toast({ title: 'Error', description: 'Could not create document.', variant: 'destructive' })
    }
  }

  async function confirmDeleteDocument() {
    if (!deleteId) return
    try {
      const supabase = createClient()
      const { error } = await supabase.from('documents').delete().eq('id', deleteId)
      if (error) throw error
      toast({ title: 'Document deleted', description: 'Draft removed from the project.' })
      setDeleteId(null)
      loadProjectBundle()
    } catch (error) {
      console.error('Error deleting document:', error)
      toast({ title: 'Error', description: 'Failed to delete document.', variant: 'destructive' })
    }
  }

  const documentWordCount = useMemo(
    () => documents.reduce((sum, doc) => sum + (doc.word_count || 0), 0),
    [documents]
  )

  const topCharacters = useMemo(() => characters.slice(0, 3), [characters])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-96 rounded-3xl" />
      </div>
    )
  }

  if (!project) {
    return null
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
      <div className="space-y-6 lg:sticky lg:top-24 lg:h-fit">
        <Button variant="ghost" size="sm" className="w-fit" asChild>
          <Link href="/dashboard/projects">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to projects
          </Link>
        </Button>

        <section className="rounded-3xl border bg-card/80 p-6 shadow-card">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">{project.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {projectTypeLabels[project.type]}
                {project.genre && project.genre.length > 0 && ` • ${project.genre.join(', ')}`}
              </p>
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              Active
            </span>
          </div>
          {project.description && (
            <p className="mt-4 text-sm text-muted-foreground">{project.description}</p>
          )}
          <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Documents</p>
              <p className="text-lg font-semibold text-foreground">{documents.length}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Characters</p>
              <p className="text-lg font-semibold text-foreground">{characters.length}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total words</p>
              <p className="text-lg font-semibold text-foreground">{documentWordCount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Created</p>
              <p className="text-lg font-semibold text-foreground">
                {new Date(project.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-2">
            <Button className="w-full" onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New document
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setTemplateDialogOpen(true)}>
              <FileText className="mr-2 h-4 w-4" />
              Use template
            </Button>
            <Button variant="ghost" className="w-full" asChild>
              <Link href={`/dashboard/projects/${project.id}/characters`}>
                <Users className="mr-2 h-4 w-4" />
                Manage characters
              </Link>
            </Button>
          </div>
        </section>

        <section className="rounded-3xl border bg-card/70 p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Shortcuts</h2>
          <div className="mt-4 space-y-3 text-sm text-muted-foreground">
            <Button variant="ghost" className="w-full justify-between" asChild>
              <Link href={`/dashboard/projects/${project.id}/story-structure`}>
                Story structure
                <BookOpen className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="ghost" className="w-full justify-between" asChild>
              <Link href={`/dashboard/projects/${project.id}/outlines`}>
                AI outlines
                <Lightbulb className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="ghost" className="w-full justify-between" asChild>
              <Link href={`/dashboard/projects/${project.id}/world-building`}>
                World building
                <Building2 className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </div>

      <div className="space-y-8">
        <Tabs defaultValue="documents">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Project workspace</h2>
              <p className="text-sm text-muted-foreground">
                Keep drafts, characters, and insights aligned as your story evolves.
              </p>
            </div>
            <TabsList>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="characters">Characters</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="documents">
            {documents.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex h-full flex-col justify-between rounded-2xl border bg-card/80 p-6 shadow-card transition hover:shadow-lg">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-foreground">{doc.title}</h3>
                        <Badge variant="muted" className="capitalize">
                          {doc.type.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Updated {new Date(doc.updated_at).toLocaleDateString()} • {doc.word_count.toLocaleString()} words
                      </p>
                    </div>
                    <div className="mt-6 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Button asChild>
                          <Link href={`/dashboard/editor/${doc.id}`}>Open</Link>
                        </Button>
                        <Button variant="outline" asChild>
                          <Link href={`/dashboard/editor/${doc.id}?mode=preview`}>Preview</Link>
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${doc.title}`}
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
                icon={FileText}
                title="No documents yet"
                description="Start drafting chapters, scenes, or treatments to breathe life into this project."
                action={{ label: 'Create document', onClick: () => setDialogOpen(true) }}
              />
            )}
          </TabsContent>

          <TabsContent value="characters">
            {characters.length > 0 ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Characters created for this project. Manage full profiles in the characters dashboard.
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                  {characters.map((character) => (
                    <div key={character.id} className="rounded-2xl border bg-card/70 p-5 shadow-sm">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-base font-semibold text-foreground">{character.name}</h3>
                          <p className="text-xs text-muted-foreground capitalize">
                            {character.role} • Importance {character.importance}/10
                          </p>
                        </div>
                        {character.arc_type && (
                          <Badge variant="outline" className="text-xs capitalize">
                            {character.arc_type} arc
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="outline" asChild>
                  <Link href={`/dashboard/projects/${project.id}/characters`}>
                    Manage characters
                  </Link>
                </Button>
              </div>
            ) : (
              <EmptyState
                icon={Users}
                title="No characters yet"
                description="Build a cast to power your story arcs and relationship maps."
                action={{ label: 'Create character', href: `/dashboard/projects/${project.id}/characters/new` }}
                secondaryAction={{ label: 'Open character hub', href: `/dashboard/projects/${project.id}/characters` }}
              />
            )}
          </TabsContent>

          <TabsContent value="insights">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border-none bg-card/80 shadow-card">
                <CardHeader>
                  <CardTitle>Character composition</CardTitle>
                  <CardDescription>Snapshot of the cast powering this story.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4 text-sm">
                    <Badge variant="muted">Total</Badge>
                    <span className="text-lg font-semibold text-foreground">
                      {characterStats?.total_characters ?? characters.length}
                    </span>
                    <span className="text-xs text-muted-foreground">characters</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border bg-muted/40 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Protagonists</p>
                      <p className="text-base font-semibold text-foreground">
                        {characterStats?.protagonists ?? characters.filter((c) => c.role === 'protagonist').length}
                      </p>
                    </div>
                    <div className="rounded-2xl border bg-muted/40 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Antagonists</p>
                      <p className="text-base font-semibold text-foreground">
                        {characterStats?.antagonists ?? characters.filter((c) => c.role === 'antagonist').length}
                      </p>
                    </div>
                    <div className="rounded-2xl border bg-muted/40 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Supporting</p>
                      <p className="text-base font-semibold text-foreground">
                        {characterStats?.supporting ?? characters.filter((c) => c.role === 'supporting').length}
                      </p>
                    </div>
                  </div>
                  {topCharacters.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Top importance</p>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        {topCharacters.map((character) => (
                          <li key={character.id} className="flex items-center justify-between">
                            <span>{character.name}</span>
                            <span className="text-xs">{character.importance}/10</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-none bg-card/80 shadow-card">
                <CardHeader>
                  <CardTitle>Relationship & pacing</CardTitle>
                  <CardDescription>Monitor dynamics and narrative momentum.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4 text-sm">
                    <Badge variant="muted">Relationships</Badge>
                    <span className="text-lg font-semibold text-foreground">
                      {characterStats?.total_relationships ?? 0}
                    </span>
                  </div>
                  <div className="rounded-2xl border bg-muted/40 p-3 text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      {characterStats?.avg_importance ? characterStats.avg_importance.toFixed(1) : '—'}
                    </span>{' '}
                    average importance across cast
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>
                      Use the relationship manager to visualise your network graph and ensure every character has meaningful stakes.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button asChild size="sm">
                        <Link href={`/dashboard/projects/${project.id}/characters/relationships`}>
                          Open relationship map
                        </Link>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/dashboard/projects/${project.id}/outlines`}>
                          Outline assistant
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create document</DialogTitle>
            <DialogDescription>Add a new draft or scene to this project.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="doc-title">Title</Label>
              <Input
                id="doc-title"
                placeholder="Chapter 1"
                value={formData.title}
                onChange={(event) => setFormData((prev) => ({ ...prev, title: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="doc-type">Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, type: value as DocumentSummary['type'] }))}
              >
                <SelectTrigger id="doc-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="novel">Novel/Prose</SelectItem>
                  <SelectItem value="screenplay">Screenplay</SelectItem>
                  <SelectItem value="play">Play</SelectItem>
                  <SelectItem value="short_story">Short Story</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createDocument} disabled={!formData.title.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TemplateDialog
        open={templateDialogOpen}
        onOpenChange={setTemplateDialogOpen}
        projectId={project.id}
      />

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone and will permanently remove the draft from your project.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={confirmDeleteDocument}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
