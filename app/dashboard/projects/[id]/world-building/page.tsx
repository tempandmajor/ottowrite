'use client'

import { useCallback, useEffect, useMemo, useState, lazy, Suspense } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState } from '@/components/dashboard/empty-state'
import { ImageUpload } from '@/components/ui/image-upload'
import { useToast } from '@/hooks/use-toast'
import {
  ArrowLeft,
  Building2,
  Plus,
  Trash2,
  MapPin,
  Sparkles,
  Compass,
  Loader2,
} from 'lucide-react'
import { WorldElementCard, type WorldElement } from '@/components/world/world-element-card'
import type { SystemDesign } from '@/components/world/system-designer'
import { EventTimeline } from '@/components/world-building/event-timeline'

// Lazy load heavy world-building components
const ConsistencyChecker = lazy(() =>
  import('@/components/world/consistency-checker').then(mod => ({ default: mod.ConsistencyChecker }))
)
const SystemDesigner = lazy(() =>
  import('@/components/world/system-designer').then(mod => ({ default: mod.SystemDesigner }))
)

type Project = {
  id: string
  title: string
}

type LocationEvent = {
  id: string
  title: string
  occurs_at: string | null
  description: string | null
  importance: number
  key_characters: string[] | null
  tags: string[] | null
  created_at: string
}

type Location = {
  id: string
  project_id: string
  name: string
  category: string
  summary?: string | null
  history?: string | null
  culture?: string | null
  climate?: string | null
  key_features?: string[] | null
  tags?: string[] | null
  image_url?: string | null
  location_events?: LocationEvent[]
  created_at: string
  updated_at: string
}

const WORLD_ELEMENT_TYPES = [
  { value: 'location', label: 'Location' },
  { value: 'culture', label: 'Culture' },
  { value: 'faction', label: 'Faction/Organization' },
  { value: 'magic_system', label: 'Magic system' },
  { value: 'technology', label: 'Technology' },
  { value: 'history', label: 'History/Event' },
  { value: 'language', label: 'Language' },
  { value: 'artifact', label: 'Artifact' },
  { value: 'other', label: 'Other' },
]

const DEFAULT_WORLD_ELEMENT = {
  type: 'location',
  name: '',
  summary: '',
  description: '',
  tags: '',
  properties: '',
  ai_prompt: '',
  use_ai: true,
}

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All categories' },
  { value: 'settlement', label: 'Settlements' },
  { value: 'region', label: 'Regions' },
  { value: 'landmark', label: 'Landmarks' },
  { value: 'realm', label: 'Realms' },
  { value: 'other', label: 'Other' },
]

const DEFAULT_LOCATION = {
  name: '',
  category: 'settlement',
  summary: '',
  history: '',
  culture: '',
  climate: '',
  key_features: '',
  tags: '',
  image_url: '',
}

const DEFAULT_EVENT = {
  title: '',
  occurs_at: '',
  description: '',
  importance: 5,
  key_characters: '',
  tags: '',
}

type EventFormState = typeof DEFAULT_EVENT & { id?: string }

// Loading fallback for world-building components
const ComponentLoadingFallback = () => (
  <div className="flex items-center justify-center p-8">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
)

export default function WorldBuildingPage() {
  const params = useParams()
  const { toast } = useToast()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [locationDialogOpen, setLocationDialogOpen] = useState(false)
  const [eventDialogOpen, setEventDialogOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editingLocation, setEditingLocation] = useState<Location | null>(null)
  const [activeEventLocation, setActiveEventLocation] = useState<Location | null>(null)
  const [formData, setFormData] = useState({
    ...DEFAULT_LOCATION,
  })
  const [eventFormData, setEventFormData] = useState<EventFormState>({
    ...DEFAULT_EVENT,
  })
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [worldElements, setWorldElements] = useState<WorldElement[]>([])
  const [worldLoading, setWorldLoading] = useState(true)
  const [worldDialogOpen, setWorldDialogOpen] = useState(false)
  const [worldForm, setWorldForm] = useState({ ...DEFAULT_WORLD_ELEMENT })
  const [editingWorldElement, setEditingWorldElement] = useState<WorldElement | null>(null)
  const [worldSubmitting, setWorldSubmitting] = useState(false)
  const [systemDesignerOpen, setSystemDesignerOpen] = useState(false)
  const [systemDesign, setSystemDesign] = useState<SystemDesign | null>(null)

  const resetWorldForm = useCallback(() => {
    setWorldForm({ ...DEFAULT_WORLD_ELEMENT })
    setEditingWorldElement(null)
  }, [])

  const openNewWorldElement = () => {
    resetWorldForm()
    setWorldDialogOpen(true)
  }

  const openEditWorldElement = (element: WorldElement) => {
    setEditingWorldElement(element)
    setWorldForm({
      type: element.type,
      name: element.name,
      summary: element.summary ?? '',
      description: element.description ?? '',
      tags: (element.tags ?? []).join(', '),
      properties: element.properties ? JSON.stringify(element.properties, null, 2) : '',
      ai_prompt: '',
      use_ai: false,
    })
    setWorldDialogOpen(true)
  }

  const parsePropertyInput = useCallback((input: string) => {
    if (!input.trim()) return {}
    try {
      return JSON.parse(input)
    } catch (error) {
      console.error('Invalid JSON for world element properties', error)
      return { notes: input }
    }
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        return
      }

      const { data: projectData } = await supabase
        .from('projects')
        .select('id, title')
        .eq('id', projectId)
        .eq('user_id', user.id)
        .single()

      if (projectData) {
        setProject(projectData)
      }

      const { data, error } = await supabase
        .from('locations')
        .select(
          `
            *,
            location_events (
              id,
              title,
              occurs_at,
              description,
              importance,
              key_characters,
              tags,
              created_at
            )
          `
        )
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

      if (error) {
        throw error
      }

      setLocations(
        (data ?? []).map((location) => {
          const events = [...(location.location_events ?? [])] as LocationEvent[]
          events.sort((a: LocationEvent, b: LocationEvent) => ((a.occurs_at || '') > (b.occurs_at || '') ? 1 : -1))
          return {
            ...location,
            location_events: events,
          }
        })
      )
    } catch (error) {
      console.error('Error loading world data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load world building data.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [projectId, toast])

  const loadWorldElements = useCallback(async () => {
    setWorldLoading(true)
    try {
      const response = await fetch(`/api/world-elements?project_id=${projectId}`)
      if (!response.ok) {
        throw new Error('Failed to load world elements')
      }
      const payload = await response.json()
      setWorldElements(payload.elements ?? [])
    } catch (error) {
      console.error('Error loading world elements:', error)
      toast({
        title: 'Error',
        description: 'Failed to load world bible entries',
        variant: 'destructive',
      })
    } finally {
      setWorldLoading(false)
    }
  }, [projectId, toast])

  const handleSubmitWorldElement = useCallback(async () => {
    setWorldSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        project_id: projectId,
        type: worldForm.type,
        name: worldForm.name,
        summary: worldForm.summary,
        description: worldForm.description,
        tags: worldForm.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        properties: parsePropertyInput(worldForm.properties),
      }

      if (worldForm.use_ai) {
        payload.use_ai = true
        payload.ai_prompt = worldForm.ai_prompt
      }

      const method = editingWorldElement ? 'PATCH' : 'POST'
      const body = editingWorldElement
        ? { id: editingWorldElement.id, ...payload }
        : payload

      const response = await fetch('/api/world-elements', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to save world entry')
      }

      await loadWorldElements()
      setWorldDialogOpen(false)
      resetWorldForm()
      toast({
        title: editingWorldElement ? 'World entry updated' : 'World entry created',
        description: editingWorldElement
          ? 'Changes saved successfully.'
          : 'New lore added to your world bible.',
      })
    } catch (error) {
      console.error(error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save world entry',
        variant: 'destructive',
      })
    } finally {
      setWorldSubmitting(false)
    }
  }, [editingWorldElement, loadWorldElements, parsePropertyInput, projectId, resetWorldForm, toast, worldForm])

  const handleDeleteWorldElement = useCallback(
    async (element: WorldElement) => {
      if (!confirm(`Delete world entry "${element.name}"?`)) return
      try {
        const response = await fetch(`/api/world-elements?id=${element.id}`, {
          method: 'DELETE',
        })
        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          throw new Error(data.error ?? 'Failed to delete world entry')
        }
        setWorldElements((prev) => prev.filter((item) => item.id !== element.id))
        toast({ title: 'World entry removed' })
      } catch (error) {
        console.error(error)
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to delete world entry',
          variant: 'destructive',
        })
      }
    },
    [toast]
  )

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    loadWorldElements()
  }, [loadWorldElements])

  function openCreateLocation() {
    setEditingLocation(null)
    setFormData({ ...DEFAULT_LOCATION })
    setLocationDialogOpen(true)
  }

  function openEditLocation(location: Location) {
    setEditingLocation(location)
    setFormData({
      name: location.name,
      category: location.category,
      summary: location.summary ?? '',
      history: location.history ?? '',
      culture: location.culture ?? '',
      climate: location.climate ?? '',
      key_features: (location.key_features ?? []).join(', '),
      tags: (location.tags ?? []).join(', '),
      image_url: location.image_url ?? '',
    })
    setLocationDialogOpen(true)
  }

  async function saveLocation() {
    const payload = {
      project_id: projectId,
      name: formData.name,
      category: formData.category,
      summary: formData.summary || null,
      history: formData.history || null,
      culture: formData.culture || null,
      climate: formData.climate || null,
      key_features: formData.key_features
        ? formData.key_features.split(',').map((item) => item.trim()).filter(Boolean)
        : null,
      tags: formData.tags
        ? formData.tags.split(',').map((item) => item.trim()).filter(Boolean)
        : null,
      image_url: formData.image_url || null,
    }

    const method = editingLocation ? 'PATCH' : 'POST'
    const body = editingLocation ? { id: editingLocation.id, ...payload } : payload

    const response = await fetch('/api/locations', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (response.ok) {
      toast({
        title: 'Location saved',
        description: `Location ${editingLocation ? 'updated' : 'created'} successfully.`,
      })
      setLocationDialogOpen(false)
      await loadData()
    } else {
      const error = await response.json()
      toast({
        title: 'Error',
        description: error.error || 'Failed to save location',
        variant: 'destructive',
      })
    }
  }

  function openCreateEvent(location: Location) {
    setActiveEventLocation(location)
    setEventFormData({ ...DEFAULT_EVENT })
    setEventDialogOpen(true)
  }

  function openEditEvent(location: Location, event: LocationEvent) {
    setActiveEventLocation(location)
    setEventFormData({
      title: event.title,
      occurs_at: event.occurs_at ?? '',
      description: event.description ?? '',
      importance: event.importance,
      key_characters: (event.key_characters ?? []).join(', '),
      tags: (event.tags ?? []).join(', '),
      id: event.id,
    })
    setEventDialogOpen(true)
  }

  async function saveEvent() {
    if (!activeEventLocation) return

    const payload = {
      project_id: projectId,
      location_id: activeEventLocation.id,
      title: eventFormData.title,
      occurs_at: eventFormData.occurs_at || null,
      description: eventFormData.description || null,
      importance: eventFormData.importance,
      key_characters: eventFormData.key_characters
        ? eventFormData.key_characters.split(',').map((item) => item.trim()).filter(Boolean)
        : null,
      tags: eventFormData.tags
        ? eventFormData.tags.split(',').map((item) => item.trim()).filter(Boolean)
        : null,
    }

    const isEditing = Boolean(eventFormData.id)
    const method = isEditing ? 'PATCH' : 'POST'
    const body = isEditing
      ? { id: eventFormData.id, ...payload }
      : payload

    const response = await fetch('/api/locations/events', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (response.ok) {
      toast({
        title: 'Timeline updated',
        description: `Event ${isEditing ? 'updated' : 'created'} successfully.`,
      })
      setEventDialogOpen(false)
      await loadData()
    } else {
      const error = await response.json()
      toast({
        title: 'Error',
        description: error.error || 'Failed to save event',
        variant: 'destructive',
      })
    }
  }

  async function deleteLocation(id: string) {
    const response = await fetch(`/api/locations?id=${id}`, {
      method: 'DELETE',
    })

    if (response.ok) {
      toast({
        title: 'Location removed',
        description: 'The location has been deleted.',
      })
      await loadData()
    } else {
      const error = await response.json()
      toast({
        title: 'Error',
        description: error.error || 'Failed to delete location',
        variant: 'destructive',
      })
    }
  }

  async function deleteEvent(id: string) {
    const response = await fetch(`/api/locations/events?id=${id}`, {
      method: 'DELETE',
    })

    if (response.ok) {
      toast({
        title: 'Event removed',
        description: 'The timeline entry has been deleted.',
      })
      await loadData()
    } else {
      const error = await response.json()
      toast({
        title: 'Error',
        description: error.error || 'Failed to delete event',
        variant: 'destructive',
      })
    }
  }

  const filteredLocations = useMemo(() => {
    return locations.filter((location) => {
      const matchesCategory = categoryFilter === 'all' || location.category === categoryFilter
      const matchesSearch =
        search.length === 0 ||
        location.name.toLowerCase().includes(search.toLowerCase()) ||
        (location.summary ?? '').toLowerCase().includes(search.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [locations, categoryFilter, search])

  const timelineEntries = useMemo(() => {
    return filteredLocations.flatMap((location) =>
      (location.location_events ?? []).map((event) => ({
        id: event.id,
        title: event.title,
        occurs_at: event.occurs_at,
        description: event.description,
        location: location.name,
        location_id: location.id,
        importance: event.importance,
        key_characters: event.key_characters,
        order_index: 0, // Will be set by drag-and-drop
      }))
    )
  }, [filteredLocations])

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      settlement: 0,
      region: 0,
      landmark: 0,
      realm: 0,
      other: 0,
    }
    locations.forEach((location) => {
      counts[location.category] = (counts[location.category] ?? 0) + 1
    })
    return counts
  }, [locations])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 rounded-3xl" />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-48 rounded-2xl" />
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
            <Sparkles className="h-3.5 w-3.5" />
            World building
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Locations & Lore</h1>
            <p className="text-sm text-muted-foreground">
              Craft the places that anchor your story world, track their history, and map their evolution.
            </p>
            {project?.title && (
              <p className="text-xs text-muted-foreground mt-1">Project: {project.title}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>{locations.length} total locations</span>
            <span className="h-4 w-px bg-border" aria-hidden />
            <span>{timelineEntries.length} timeline entries</span>
          </div>
        </div>
        <Button size="lg" onClick={openCreateLocation}>
          <Plus className="mr-2 h-4 w-4" />
          New location
        </Button>
      </section>

      <section className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">World bible</h2>
            <p className="text-sm text-muted-foreground">
              Capture cultures, factions, magic systems, and lore entries with AI assistance.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" size="sm" onClick={() => loadWorldElements()} disabled={worldLoading}>
              Refresh
            </Button>
            <Button size="sm" onClick={openNewWorldElement}>
              <Sparkles className="mr-2 h-4 w-4" /> New entry
            </Button>
          </div>
        </div>

        <Suspense fallback={<ComponentLoadingFallback />}>
          <ConsistencyChecker elements={worldElements} />
        </Suspense>

        <Suspense fallback={<ComponentLoadingFallback />}>
          <SystemDesigner
            open={systemDesignerOpen}
            onOpenChange={setSystemDesignerOpen}
            projectId={projectId}
            onSave={(design) => setSystemDesign(design)}
          />
        </Suspense>

        {systemDesign && (
          <Card className="border border-muted/70 bg-card/60">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Draft Magic/Tech System
                <Button size="sm" onClick={() => setSystemDesignerOpen(true)}>
                  Refine system
                </Button>
              </CardTitle>
              <CardDescription>
                Generate or refine a structured system before committing it to the world bible.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Core rules</p>
                <p className="whitespace-pre-wrap text-foreground">{systemDesign.rules}</p>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Costs</p>
                  <p className="whitespace-pre-wrap text-foreground">{systemDesign.costs}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Limitations</p>
                  <p className="whitespace-pre-wrap text-foreground">{systemDesign.limitations}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Failure modes</p>
                  <p className="whitespace-pre-wrap text-foreground">{systemDesign.failureModes}</p>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Applications</p>
                  <p className="whitespace-pre-wrap text-foreground">{systemDesign.applications}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Potential conflicts</p>
                  <p className="whitespace-pre-wrap text-foreground">{systemDesign.conflicts}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {systemDesign.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {worldLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-40 w-full rounded-2xl" />
            ))}
          </div>
        ) : worldElements.length === 0 ? (
          <EmptyState
            icon={Compass}
            title="No world entries yet"
            description="Use the AI prompt to generate lore, cultures, or artifacts."
            action={{ label: 'Create entry', onClick: openNewWorldElement }}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {worldElements.map((element) => (
              <WorldElementCard
                key={element.id}
                element={element}
                onEdit={openEditWorldElement}
                onDelete={handleDeleteWorldElement}
              />
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {CATEGORY_OPTIONS.filter((opt) => opt.value !== 'all').map((option) => (
          <Card key={option.value} className="border-none bg-card/80 shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium capitalize">{option.label}</CardTitle>
              <Badge variant="muted">{categoryCounts[option.value] ?? 0}</Badge>
            </CardHeader>
            <CardContent>
              <CardDescription>
                {option.value === 'settlement' && 'Cities, towns, outposts.'}
                {option.value === 'region' && 'Continents, provinces, territories.'}
                {option.value === 'landmark' && 'Temples, mountains, ruins.'}
                {option.value === 'realm' && 'Worlds, planes, dimensions.'}
                {option.value === 'other' && 'Everything else that shapes your lore.'}
              </CardDescription>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border bg-card/60 p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search locations"
            className="w-full sm:w-64"
          />
        </div>
      </section>

      <Tabs defaultValue="locations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="locations">
          {filteredLocations.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredLocations.map((location) => (
                <Card key={location.id} className="flex h-full flex-col justify-between rounded-2xl border bg-card/80 p-6 shadow-card transition hover:shadow-lg">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <CardTitle className="text-xl font-semibold text-foreground">{location.name}</CardTitle>
                        <CardDescription className="flex flex-wrap items-center gap-2 text-sm">
                          <Badge variant="muted" className="flex items-center gap-1 capitalize">
                            <MapPin className="h-3 w-3" />
                            {location.category}
                          </Badge>
                          <span className="text-muted-foreground">
                            Updated {new Date(location.updated_at).toLocaleDateString()}
                          </span>
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEditLocation(location)}>
                          Edit
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(location.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    {location.summary && <p className="text-sm text-foreground">{location.summary}</p>}
                    <div className="grid gap-3 text-sm text-muted-foreground">
                      {location.history && (
                        <div>
                          <p className="font-semibold text-foreground">History</p>
                          <p>{location.history}</p>
                        </div>
                      )}
                      {location.culture && (
                        <div>
                          <p className="font-semibold text-foreground">Culture</p>
                          <p>{location.culture}</p>
                        </div>
                      )}
                      {location.climate && (
                        <div>
                          <p className="font-semibold text-foreground">Environment</p>
                          <p>{location.climate}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {(location.key_features ?? []).map((feature) => (
                        <Badge key={feature} variant="outline">
                          {feature}
                        </Badge>
                      ))}
                      {(location.tags ?? []).map((tag) => (
                        <Badge key={tag} variant="outline">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="mt-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground">Timeline</p>
                      <Button size="sm" variant="outline" onClick={() => openCreateEvent(location)}>
                        <Plus className="mr-2 h-3 w-3" />
                        Add event
                      </Button>
                    </div>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      {(location.location_events ?? []).length === 0 && (
                        <p>No events yet. Document milestones, wars, key discoveries, or turning points.</p>
                      )}
                      {(location.location_events ?? [])
                        .slice(0, 3)
                        .map((event) => (
                          <div
                            key={event.id}
                            className="flex items-start justify-between rounded-xl border bg-muted/40 p-3"
                          >
                            <div>
                              <p className="font-medium text-foreground">
                                {event.occurs_at ? `${event.occurs_at} • ${event.title}` : event.title}
                              </p>
                              {event.description && <p className="text-xs text-muted-foreground">{event.description}</p>}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">⭐ {event.importance}</Badge>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditEvent(location, event)}
                                aria-label="Edit event"
                              >
                                <Building2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteEvent(event.id)}
                                aria-label="Delete event"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Compass}
              title="No locations yet"
              description="Document key settlements, regions, or landmarks to enrich your story world."
              action={{ label: 'Create location', onClick: openCreateLocation }}
            />
          )}
        </TabsContent>

        <TabsContent value="timeline">
          {timelineEntries.length > 0 ? (
            <EventTimeline
              events={timelineEntries.map((entry) => ({
                id: entry.id,
                title: entry.title,
                description: entry.description,
                occurs_at: entry.occurs_at,
                importance: entry.importance,
                key_characters: entry.key_characters,
                location_id: entry.location_id,
                location_name: entry.location,
                order_index: entry.order_index,
              }))}
              locations={locations.map((loc) => ({ id: loc.id, name: loc.name }))}
              onReorder={async (reorderedEvents) => {
                // Update order in the backend
                try {
                  await Promise.all(
                    reorderedEvents.map((event, idx) =>
                      fetch(`/api/locations/events`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: event.id, order_index: idx }),
                      })
                    )
                  )
                  toast({ title: 'Timeline reordered', description: 'Event order has been saved' })
                  await loadData()
                } catch {
                  toast({ title: 'Failed to reorder', description: 'Please try again', variant: 'destructive' })
                }
              }}
              onEdit={(event) => {
                const location = locations.find((loc) => loc.id === event.location_id)
                const fullEvent = location?.location_events?.find((e) => e.id === event.id)
                if (location && fullEvent) {
                  openEditEvent(location, fullEvent)
                }
              }}
              onDelete={deleteEvent}
            />
          ) : (
            <EmptyState
              icon={Building2}
              title="No timeline entries yet"
              description="Add key events to track the evolution of your world. Timestamps can be story chapters, historical eras, or relative markers."
              action={{ label: 'Add event', onClick: () => locations[0] && openCreateEvent(locations[0]) }}
            />
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={worldDialogOpen} onOpenChange={(open) => {
        setWorldDialogOpen(open)
        if (!open) {
          resetWorldForm()
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingWorldElement ? 'Edit world entry' : 'New world entry'}</DialogTitle>
            <DialogDescription>
              {worldForm.use_ai
                ? 'Describe what you need and let the AI draft it. You can tweak before saving.'
                : 'Manually craft the details for this world element.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2 sm:grid-cols-[1.2fr_1fr] sm:items-center sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="world-name">Name</Label>
                <Input
                  id="world-name"
                  value={worldForm.name}
                  onChange={(event) => setWorldForm((prev) => ({ ...prev, name: event.target.value }))}
                  disabled={worldForm.use_ai && !editingWorldElement}
                  placeholder="Crystal Expanse"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="world-type">Type</Label>
                <Select
                  value={worldForm.type}
                  onValueChange={(value) => setWorldForm((prev) => ({ ...prev, type: value }))}
                >
                  <SelectTrigger id="world-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WORLD_ELEMENT_TYPES.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="world-use-ai"
                type="checkbox"
                className="h-4 w-4 rounded border border-input"
                checked={worldForm.use_ai}
                onChange={(event) => setWorldForm((prev) => ({ ...prev, use_ai: event.target.checked }))}
              />
              <Label htmlFor="world-use-ai" className="text-sm">
                Use AI to draft this entry
              </Label>
            </div>

            {worldForm.use_ai && (
              <div className="space-y-2">
                <Label htmlFor="world-ai-prompt">AI prompt</Label>
                <Textarea
                  id="world-ai-prompt"
                  rows={4}
                  value={worldForm.ai_prompt}
                  onChange={(event) => setWorldForm((prev) => ({ ...prev, ai_prompt: event.target.value }))}
                  placeholder="Describe the element you want generated, including mood, conflicts, and relevance to your story."
                />
                <p className="text-xs text-muted-foreground">
                  The assistant will generate name, summary, description, and structured properties.
                </p>
              </div>
            )}

            {!worldForm.use_ai && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="world-summary">Summary</Label>
                  <Textarea
                    id="world-summary"
                    rows={2}
                    value={worldForm.summary}
                    onChange={(event) => setWorldForm((prev) => ({ ...prev, summary: event.target.value }))}
                    placeholder="Short pitch (2 sentences)."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="world-description">Description</Label>
                  <Textarea
                    id="world-description"
                    rows={5}
                    value={worldForm.description}
                    onChange={(event) => setWorldForm((prev) => ({ ...prev, description: event.target.value }))}
                    placeholder="Full description of the element."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="world-tags">Tags (comma separated)</Label>
                  <Input
                    id="world-tags"
                    value={worldForm.tags}
                    onChange={(event) => setWorldForm((prev) => ({ ...prev, tags: event.target.value }))}
                    placeholder="empire, trade, arcane"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="world-properties">Structured properties (JSON)</Label>
                  <Textarea
                    id="world-properties"
                    rows={4}
                    value={worldForm.properties}
                    onChange={(event) => setWorldForm((prev) => ({ ...prev, properties: event.target.value }))}
                    placeholder='{"leader": "High Magus Arien", "economy": ["crystal trade", "ancient relic auctions"]}'
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setWorldDialogOpen(false)
              resetWorldForm()
            }}>
              Cancel
            </Button>
            <Button onClick={handleSubmitWorldElement} disabled={worldSubmitting}>
              {worldSubmitting ? 'Saving…' : editingWorldElement ? 'Update entry' : 'Create entry'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={locationDialogOpen} onOpenChange={setLocationDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingLocation ? 'Edit location' : 'Create location'}</DialogTitle>
            <DialogDescription>
              Capture the details, history, and culture of this place.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2 sm:grid-cols-[2fr_1fr] sm:items-center sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="location-name">Name</Label>
                <Input
                  id="location-name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="E.g. Emberfall Citadel"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location-category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}
                >
                  <SelectTrigger id="location-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.filter((opt) => opt.value !== 'all').map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="location-summary">Summary</Label>
              <Textarea
                id="location-summary"
                value={formData.summary}
                onChange={(e) => setFormData((prev) => ({ ...prev, summary: e.target.value }))}
                rows={3}
                placeholder="High level overview of this place."
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="location-history">History</Label>
                <Textarea
                  id="location-history"
                  value={formData.history}
                  onChange={(e) => setFormData((prev) => ({ ...prev, history: e.target.value }))}
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location-culture">Culture / society</Label>
                <Textarea
                  id="location-culture"
                  value={formData.culture}
                  onChange={(e) => setFormData((prev) => ({ ...prev, culture: e.target.value }))}
                  rows={4}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="location-climate">Environment</Label>
                <Input
                  id="location-climate"
                  value={formData.climate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, climate: e.target.value }))}
                  placeholder="Climate, terrain, or notable conditions."
                />
              </div>
              <div className="space-y-2">
                <Label>Featured image</Label>
                <ImageUpload
                  value={formData.image_url || undefined}
                  onChange={(url) => setFormData((prev) => ({ ...prev, image_url: url || '' }))}
                  folder="locations"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="location-features">Key features (comma separated)</Label>
                <Input
                  id="location-features"
                  value={formData.key_features}
                  onChange={(e) => setFormData((prev) => ({ ...prev, key_features: e.target.value }))}
                  placeholder="Crystal spires, underground markets, floating docks"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location-tags">Tags (comma separated)</Label>
                <Input
                  id="location-tags"
                  value={formData.tags}
                  onChange={(e) => setFormData((prev) => ({ ...prev, tags: e.target.value }))}
                  placeholder="capital, rebel, ancient"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLocationDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveLocation} disabled={!formData.name.trim()}>
              {editingLocation ? 'Update location' : 'Create location'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{eventFormData.id ? 'Edit timeline event' : 'Add timeline event'}</DialogTitle>
            <DialogDescription>
              Chronicle how this location changes across your story.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="event-title">Title</Label>
              <Input
                id="event-title"
                value={eventFormData.title}
                onChange={(e) => setEventFormData((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="E.g. Siege of Emberfall"
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="event-occurs">Timeline marker</Label>
                <Input
                  id="event-occurs"
                  value={eventFormData.occurs_at}
                  onChange={(e) =>
                    setEventFormData((prev) => ({ ...prev, occurs_at: e.target.value }))
                  }
                  placeholder="Act II, Chapter 14, 402 AE"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-importance">Importance (1-10)</Label>
                <Input
                  id="event-importance"
                  type="number"
                  min={1}
                  max={10}
                  value={eventFormData.importance}
                  onChange={(e) =>
                    setEventFormData((prev) => ({
                      ...prev,
                      importance: parseInt(e.target.value) || 5,
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-description">Description</Label>
              <Textarea
                id="event-description"
                value={eventFormData.description}
                onChange={(e) =>
                  setEventFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                rows={3}
                placeholder="What changes? Who is involved? How does the world shift?"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-characters">Key characters (comma separated)</Label>
              <Input
                id="event-characters"
                value={eventFormData.key_characters}
                onChange={(e) =>
                  setEventFormData((prev) => ({ ...prev, key_characters: e.target.value }))
                }
                placeholder="Aeryn, Captain Thorne, High Seer"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-tags">Tags (comma separated)</Label>
              <Input
                id="event-tags"
                value={eventFormData.tags}
                onChange={(e) => setEventFormData((prev) => ({ ...prev, tags: e.target.value }))}
                placeholder="battle, uprising, discovery"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEventDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveEvent} disabled={!eventFormData.title.trim()}>
              {eventFormData.id ? 'Update event' : 'Create event'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete location?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the location and all of its timeline events. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deleteLocation(deleteId!)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Button variant="ghost" size="sm" asChild>
        <Link href={`/dashboard/projects/${projectId}`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to project
        </Link>
      </Button>
    </div>
  )
}
