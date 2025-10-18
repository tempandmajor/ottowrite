'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/dashboard/empty-state'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Trash2, Edit, Network, Filter, Scale, Heart, GitBranch } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { RelationshipWithCharacters } from '@/types/relationships'

const RelationshipNetwork = dynamic(
  () => import('@/components/dashboard/relationship-network').then((mod) => mod.RelationshipNetwork),
  { ssr: false }
)

type Character = {
  id: string
  name: string
  role: string
}

type Project = {
  id: string
  title: string
}

const relationshipTypes = [
  'family',
  'romantic',
  'friendship',
  'rivalry',
  'mentor_mentee',
  'colleague',
  'enemy',
  'ally',
  'acquaintance',
  'other',
]

const relationshipStatuses = ['current', 'past', 'developing', 'ending', 'complicated']

const relationshipColors: Record<string, string> = {
  family: 'bg-blue-500',
  romantic: 'bg-pink-500',
  friendship: 'bg-green-500',
  rivalry: 'bg-orange-500',
  mentor_mentee: 'bg-purple-500',
  colleague: 'bg-gray-500',
  enemy: 'bg-red-500',
  ally: 'bg-cyan-500',
  acquaintance: 'bg-yellow-500',
  other: 'bg-slate-500',
}

export default function CharacterRelationshipsPage() {
  const params = useParams()
  const { toast } = useToast()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [characters, setCharacters] = useState<Character[]>([])
  const [relationships, setRelationships] = useState<RelationshipWithCharacters[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRelationship, setEditingRelationship] = useState<RelationshipWithCharacters | null>(null)
  const [filterType, setFilterType] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [polarityFilter, setPolarityFilter] = useState<'all' | 'positive' | 'negative'>('all')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    character_a_id: '',
    character_b_id: '',
    relationship_type: 'friendship' as string,
    description: '',
    strength: 5,
    is_positive: true,
    status: 'current' as string,
    starts_at: '',
    ends_at: '',
    key_moments: '',
  })

  const loadData = useCallback(async () => {
    const supabase = createClient()

    const { data: projectData } = await supabase
      .from('projects')
      .select('id, title')
      .eq('id', projectId)
      .single()

    if (projectData) {
      setProject(projectData)
    }

    const { data: charactersData } = await supabase
      .from('characters')
      .select('id, name, role')
      .eq('project_id', projectId)
      .order('name')

    if (charactersData) {
      setCharacters(charactersData)
    }

    const { data: relationshipsData } = await supabase
      .from('character_relationships')
      .select(`
        *,
        character_a:characters!character_relationships_character_a_id_fkey(id, name, role),
        character_b:characters!character_relationships_character_b_id_fkey(id, name, role)
      `)
      .eq('project_id', projectId)

    if (relationshipsData) {
      setRelationships(relationshipsData as RelationshipWithCharacters[])
    }

    setLoading(false)
  }, [projectId])

  useEffect(() => {
    loadData()
  }, [loadData])

  function openCreateDialog() {
    setEditingRelationship(null)
    setFormData({
      character_a_id: '',
      character_b_id: '',
      relationship_type: 'friendship',
      description: '',
      strength: 5,
      is_positive: true,
      status: 'current',
      starts_at: '',
      ends_at: '',
      key_moments: '',
    })
    setDialogOpen(true)
  }

  function openEditDialog(relationship: RelationshipWithCharacters) {
    setEditingRelationship(relationship)
    setFormData({
      character_a_id: relationship.character_a_id,
      character_b_id: relationship.character_b_id,
      relationship_type: relationship.relationship_type,
      description: relationship.description || '',
      strength: relationship.strength,
      is_positive: relationship.is_positive,
      status: relationship.status,
      starts_at: relationship.starts_at || '',
      ends_at: relationship.ends_at || '',
      key_moments: Array.isArray(relationship.key_moments)
        ? relationship.key_moments.join(', ')
        : '',
    })
    setDialogOpen(true)
  }

  async function saveRelationship() {
    if (!formData.character_a_id || !formData.character_b_id) {
      toast({
        title: 'Error',
        description: 'Please select both characters',
        variant: 'destructive',
      })
      return
    }

    if (formData.character_a_id === formData.character_b_id) {
      toast({
        title: 'Error',
        description: 'Cannot create relationship between the same character',
        variant: 'destructive',
      })
      return
    }

    const payload = {
      character_a_id: formData.character_a_id,
      character_b_id: formData.character_b_id,
      relationship_type: formData.relationship_type,
      description: formData.description,
      strength: formData.strength,
      is_positive: formData.is_positive,
      status: formData.status,
      starts_at: formData.starts_at || null,
      ends_at: formData.ends_at || null,
      key_moments: formData.key_moments
        ? formData.key_moments
            .split(',')
            .map((item) => item.trim())
            .filter((item) => item.length > 0)
        : null,
    }

    const method = editingRelationship ? 'PATCH' : 'POST'
    const body = editingRelationship
      ? { id: editingRelationship.id, ...payload }
      : { project_id: projectId, ...payload }

    const response = await fetch('/api/characters/relationships', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (response.ok) {
      toast({
        title: 'Success',
        description: `Relationship ${editingRelationship ? 'updated' : 'created'} successfully`,
      })
      setDialogOpen(false)
      loadData()
    } else {
      const error = await response.json()
      toast({
        title: 'Error',
        description: error.error || 'Failed to save relationship',
        variant: 'destructive',
      })
    }
  }

  function requestDelete(id: string) {
    setDeleteId(id)
  }

  async function confirmDelete() {
    if (!deleteId) return
    const response = await fetch(`/api/characters/relationships?id=${deleteId}`, {
      method: 'DELETE',
    })
    if (response.ok) {
      toast({ title: 'Relationship deleted', description: 'Connection removed successfully.' })
      setDeleteId(null)
      loadData()
    }
  }

  const filteredRelationships = useMemo(() => {
    return relationships.filter((relationship) => {
      const matchesType = filterType === 'all' || relationship.relationship_type === filterType
      const matchesStatus = statusFilter === 'all' || relationship.status === statusFilter
      const matchesPolarity =
        polarityFilter === 'all' ||
        (polarityFilter === 'positive' ? relationship.is_positive : !relationship.is_positive)
      return matchesType && matchesStatus && matchesPolarity
    })
  }, [relationships, filterType, statusFilter, polarityFilter])

  const timelineEntries = useMemo(() => {
    return filteredRelationships.flatMap((relationship) => {
      const entries: Array<{ id: string; title: string; description: string }> = []
      if (relationship.starts_at) {
        entries.push({
          id: `${relationship.id}-start`,
          title: `Begins (${relationship.starts_at})`,
          description: `${relationship.character_a?.name} • ${relationship.relationship_type.replace('_', ' ')} • ${relationship.character_b?.name}`,
        })
      }
      if (Array.isArray(relationship.key_moments)) {
        relationship.key_moments.forEach((moment, index) => {
          entries.push({
            id: `${relationship.id}-moment-${index}`,
            title: moment,
            description: `${relationship.character_a?.name} ↔ ${relationship.character_b?.name}`,
          })
        })
      }
      if (relationship.ends_at) {
        entries.push({
          id: `${relationship.id}-end`,
          title: `Shifts (${relationship.ends_at})`,
          description: `${relationship.status.replace('_', ' ')}`,
        })
      }
      if (entries.length === 0) {
        entries.push({
          id: `${relationship.id}-fallback`,
          title: `${relationship.status.replace('_', ' ')} relationship`,
          description: `${relationship.character_a?.name} ↔ ${relationship.character_b?.name}`,
        })
      }
      return entries
    })
  }, [filteredRelationships])

  const totalPositive = relationships.filter((rel) => rel.is_positive).length
  const totalNegative = relationships.length - totalPositive

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-60" />
        <Skeleton className="h-32 rounded-3xl" />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-40 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-10">
      <section className="flex flex-col gap-6 rounded-3xl border bg-card/80 p-6 shadow-card md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-wide text-secondary-foreground">
            <Network className="h-3.5 w-3.5" />
            Character relationships
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Connection map</h1>
            <p className="text-sm text-muted-foreground">
              Explore how your cast intersects, track emotional dynamics, and keep development arcs aligned.
            </p>
            {project?.title && (
              <p className="text-xs text-muted-foreground mt-1">
                Project: {project.title}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>{relationships.length} relationships total</span>
            <span className="h-4 w-px bg-border" />
            <span>{totalPositive} positive • {totalNegative} negative</span>
          </div>
        </div>
        <Button size="lg" onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          New relationship
        </Button>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border bg-card/60 p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={filterType === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('all')}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            All types
          </Button>
          {relationshipTypes.map((type) => (
            <Badge
              key={type}
              variant={filterType === type ? 'default' : 'outline'}
              className="cursor-pointer capitalize"
              onClick={() => setFilterType((prev) => (prev === type ? 'all' : type))}
            >
              {type.replace('_', ' ')}
            </Badge>
          ))}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="sm:w-44">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {relationshipStatuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {status.replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={polarityFilter} onValueChange={(value) => setPolarityFilter(value as typeof polarityFilter)}>
            <SelectTrigger className="sm:w-44">
              <SelectValue placeholder="Polarity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All dynamics</SelectItem>
              <SelectItem value="positive">Positive</SelectItem>
              <SelectItem value="negative">Negative</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">List view</TabsTrigger>
          <TabsTrigger value="network">Network graph</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          {filteredRelationships.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredRelationships.map((relationship) => (
                <Card key={relationship.id} className="flex h-full flex-col justify-between rounded-2xl border bg-card/80 p-6 shadow-card transition hover:shadow-lg">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-lg font-semibold text-foreground">
                          {relationship.character_a?.name}
                          <span className="mx-2 text-muted-foreground">↔</span>
                          {relationship.character_b?.name}
                        </CardTitle>
                        <CardDescription className="mt-1 flex flex-wrap items-center gap-2">
                          <Badge className={`${relationshipColors[relationship.relationship_type]} text-white capitalize`}>
                            {relationship.relationship_type.replace('_', ' ')}
                          </Badge>
                          <Badge variant="outline">Strength {relationship.strength}/10</Badge>
                          <Badge variant={relationship.is_positive ? 'outline' : 'destructive'} className="flex items-center gap-1">
                            {relationship.is_positive ? (
                              <Heart className="h-3 w-3" />
                            ) : (
                              <Scale className="h-3 w-3" />
                            )}
                            {relationship.is_positive ? 'Positive' : 'Negative'}
                          </Badge>
                          <Badge variant="outline" className="capitalize">
                            {relationship.status}
                          </Badge>
                        </CardDescription>
                      </div>
                    </div>
                    {relationship.description && (
                      <p className="text-sm text-muted-foreground">{relationship.description}</p>
                    )}
                  </div>
                  <div className="mt-6 flex items-center justify-between">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => openEditDialog(relationship)}>
                      <Edit className="mr-2 h-3 w-3" />
                      Edit relationship
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="ml-2"
                      onClick={() => requestDelete(relationship.id)}
                      aria-label="Delete relationship"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Network}
              title="No relationships match your filters"
              description="Adjust the filters or create a new connection to visualize your character web."
              action={{ label: 'Create relationship', onClick: openCreateDialog }}
              secondaryAction={{
                label: 'Reset filters',
                onClick: () => {
                  setFilterType('all')
                  setStatusFilter('all')
                  setPolarityFilter('all')
                },
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="network">
          {filteredRelationships.length > 1 ? (
            <div className="rounded-3xl border bg-card/70 p-6 shadow-card">
              <RelationshipNetwork
                relationships={filteredRelationships}
                characters={characters}
              />
            </div>
          ) : (
            <EmptyState
              icon={GitBranch}
              title="Not enough data"
              description="Add at least two relationships to visualise the network graph."
              action={{ label: 'Create relationship', onClick: openCreateDialog }}
            />
          )}
        </TabsContent>

        <TabsContent value="timeline">
          {timelineEntries.length > 0 ? (
            <div className="relative space-y-6 rounded-3xl border bg-card/80 p-6 shadow-card">
              <div className="absolute left-4 top-10 bottom-10 hidden w-px bg-border lg:block" aria-hidden />
              {timelineEntries.map((entry) => (
                <div key={entry.id} className="relative flex gap-4 lg:pl-10">
                  <div className="mt-1 hidden h-3 w-3 rounded-full border-2 border-primary bg-background lg:block" />
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">{entry.title}</h4>
                    <p className="text-xs text-muted-foreground">{entry.description}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={GitBranch}
              title="No timeline data yet"
              description="Add key moments, start/end markers, or update relationship details to build a chronology."
              action={{ label: 'Update relationships', onClick: openCreateDialog }}
            />
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingRelationship ? 'Edit relationship' : 'New relationship'}</DialogTitle>
            <DialogDescription>Define the connection between two characters in this project.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Character A</Label>
                <Select
                  value={formData.character_a_id}
                  onValueChange={(value) => setFormData({ ...formData, character_a_id: value })}
                  disabled={!!editingRelationship}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select character" />
                  </SelectTrigger>
                  <SelectContent>
                    {characters.map((char) => (
                      <SelectItem key={char.id} value={char.id}>
                        {char.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Character B</Label>
                <Select
                  value={formData.character_b_id}
                  onValueChange={(value) => setFormData({ ...formData, character_b_id: value })}
                  disabled={!!editingRelationship}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select character" />
                  </SelectTrigger>
                  <SelectContent>
                    {characters.map((char) => (
                      <SelectItem key={char.id} value={char.id}>
                        {char.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Relationship type</Label>
              <Select
                value={formData.relationship_type}
                onValueChange={(value) => setFormData({ ...formData, relationship_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {relationshipTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Strength (1-10)</Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.strength}
                  onChange={(e) => setFormData({ ...formData, strength: parseInt(e.target.value) || 5 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Nature</Label>
                <Select
                  value={formData.is_positive ? 'positive' : 'negative'}
                  onValueChange={(value) => setFormData({ ...formData, is_positive: value === 'positive' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="positive">Positive</SelectItem>
                    <SelectItem value="negative">Negative</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {relationshipStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the relationship between these characters"
                rows={3}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="relationship-start">Start timeline</Label>
                <Input
                  id="relationship-start"
                  value={formData.starts_at}
                  onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
                  placeholder="e.g. Act I, Episode 2"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="relationship-end">End timeline</Label>
                <Input
                  id="relationship-end"
                  value={formData.ends_at}
                  onChange={(e) => setFormData({ ...formData, ends_at: e.target.value })}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="relationship-moments">Key moments (comma separated)</Label>
              <Textarea
                id="relationship-moments"
                value={formData.key_moments}
                onChange={(e) => setFormData({ ...formData, key_moments: e.target.value })}
                placeholder="First mission together, Betrayal at the docks, Reconciliation"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveRelationship}>
              {editingRelationship ? 'Update' : 'Create'} relationship
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete relationship?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the link between these characters. You can always recreate it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
