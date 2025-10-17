'use client'

import { useEffect, useState } from 'react'
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
import { ArrowLeft, Plus, Trash2, Edit, Network } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'

type Character = {
  id: string
  name: string
  role: string
}

type Relationship = {
  id: string
  character_a_id: string
  character_b_id: string
  relationship_type: string
  description?: string
  strength: number
  is_positive: boolean
  status: string
  character_a?: { id: string; name: string; role: string }
  character_b?: { id: string; name: string; role: string }
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
  const [relationships, setRelationships] = useState<Relationship[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRelationship, setEditingRelationship] = useState<Relationship | null>(null)
  const [filterType, setFilterType] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    character_a_id: '',
    character_b_id: '',
    relationship_type: 'friendship' as string,
    description: '',
    strength: 5,
    is_positive: true,
    status: 'current' as string,
  })

  useEffect(() => {
    loadData()
  }, [projectId])

  async function loadData() {
    const supabase = createClient()

    // Load project
    const { data: projectData } = await supabase
      .from('projects')
      .select('id, title')
      .eq('id', projectId)
      .single()

    if (projectData) {
      setProject(projectData)
    }

    // Load characters
    const { data: charactersData } = await supabase
      .from('characters')
      .select('id, name, role')
      .eq('project_id', projectId)
      .order('name')

    if (charactersData) {
      setCharacters(charactersData)
    }

    // Load relationships
    const { data: relationshipsData } = await supabase
      .from('character_relationships')
      .select(`
        *,
        character_a:characters!character_relationships_character_a_id_fkey(id, name, role),
        character_b:characters!character_relationships_character_b_id_fkey(id, name, role)
      `)
      .eq('project_id', projectId)

    if (relationshipsData) {
      setRelationships(relationshipsData)
    }

    setLoading(false)
  }

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
    })
    setDialogOpen(true)
  }

  function openEditDialog(relationship: Relationship) {
    setEditingRelationship(relationship)
    setFormData({
      character_a_id: relationship.character_a_id,
      character_b_id: relationship.character_b_id,
      relationship_type: relationship.relationship_type,
      description: relationship.description || '',
      strength: relationship.strength,
      is_positive: relationship.is_positive,
      status: relationship.status,
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
        description: 'Cannot create relationship between same character',
        variant: 'destructive',
      })
      return
    }

    const url = editingRelationship
      ? '/api/characters/relationships'
      : '/api/characters/relationships'
    const method = editingRelationship ? 'PATCH' : 'POST'

    const body = editingRelationship
      ? { id: editingRelationship.id, ...formData }
      : { project_id: projectId, ...formData }

    const response = await fetch(url, {
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

  async function deleteRelationship(id: string) {
    if (!confirm('Are you sure you want to delete this relationship?')) {
      return
    }

    const response = await fetch(`/api/characters/relationships?id=${id}`, {
      method: 'DELETE',
    })

    if (response.ok) {
      toast({
        title: 'Success',
        description: 'Relationship deleted successfully',
      })
      loadData()
    }
  }

  const filteredRelationships = filterType
    ? relationships.filter((relationship) => relationship.relationship_type === filterType)
    : relationships

  const handleTypeFilter = (type: string) => {
    setFilterType((current) => (current === type ? null : type))
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/dashboard/projects/${projectId}/characters`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Characters
            </Link>
          </Button>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Network className="h-8 w-8" />
              Character Relationships
            </h1>
            <p className="text-muted-foreground">
              {project?.title} • {relationships.length} relationship
              {relationships.length !== 1 ? 's' : ''}
              {filterType && (
                <span className="ml-2 text-sm text-muted-foreground">
                  • Filtering by {filterType.replace('_', ' ')}
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            {filterType && (
              <Button variant="outline" onClick={() => setFilterType(null)}>
                Clear Filter
              </Button>
            )}
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              New Relationship
            </Button>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-5 lg:grid-cols-6 mb-8">
        {relationshipTypes.map((type) => {
          const count = relationships.filter((r) => r.relationship_type === type).length
          const isActive = filterType === type
          return (
            <Card
              key={type}
              className={`cursor-pointer transition-all ${isActive ? 'ring-2 ring-primary' : ''}`}
              onClick={() => handleTypeFilter(type)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className={`h-3 w-3 rounded-full ${relationshipColors[type]}`}></div>
                  <span className="text-2xl font-bold">{count}</span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground capitalize">
                  {type.replace('_', ' ')}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Relationships List */}
      {filteredRelationships.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <Network className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No relationships yet</h3>
            <p className="text-muted-foreground mb-4">
              {filterType
                ? `No ${filterType.replace('_', ' ')} relationships found. Try another filter.`
                : 'Define connections between your characters to bring their interactions to life.'}
            </p>
            {!filterType && (
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Relationship
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredRelationships.map((relationship) => (
            <Card key={relationship.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <span>{relationship.character_a?.name}</span>
                      <span className="text-muted-foreground">↔</span>
                      <span>{relationship.character_b?.name}</span>
                    </CardTitle>
                    <CardDescription className="mt-1">
                      <Badge
                        className={`${relationshipColors[relationship.relationship_type]} text-white`}
                      >
                        {relationship.relationship_type.replace('_', ' ')}
                      </Badge>
                      <Badge variant="outline" className="ml-2">
                        ★ {relationship.strength}/10
                      </Badge>
                      <Badge
                        variant={relationship.is_positive ? 'default' : 'destructive'}
                        className="ml-2"
                      >
                        {relationship.is_positive ? 'Positive' : 'Negative'}
                      </Badge>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm">
                    <strong>Status:</strong>{' '}
                    <span className="capitalize">{relationship.status}</span>
                  </p>
                  {relationship.description && (
                    <p className="text-sm text-muted-foreground">
                      {relationship.description}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => openEditDialog(relationship)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteRelationship(relationship.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingRelationship ? 'Edit Relationship' : 'New Relationship'}
            </DialogTitle>
            <DialogDescription>
              Define the connection between two characters
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Character A</Label>
                <Select
                  value={formData.character_a_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, character_a_id: value })
                  }
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
                  onValueChange={(value) =>
                    setFormData({ ...formData, character_b_id: value })
                  }
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
              <Label>Relationship Type</Label>
              <Select
                value={formData.relationship_type}
                onValueChange={(value) =>
                  setFormData({ ...formData, relationship_type: value })
                }
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
                  onChange={(e) =>
                    setFormData({ ...formData, strength: parseInt(e.target.value) || 5 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Nature</Label>
                <Select
                  value={formData.is_positive ? 'positive' : 'negative'}
                  onValueChange={(value) =>
                    setFormData({ ...formData, is_positive: value === 'positive' })
                  }
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
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current">Current</SelectItem>
                    <SelectItem value="past">Past</SelectItem>
                    <SelectItem value="developing">Developing</SelectItem>
                    <SelectItem value="ending">Ending</SelectItem>
                    <SelectItem value="complicated">Complicated</SelectItem>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveRelationship}>
              {editingRelationship ? 'Update' : 'Create'} Relationship
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
