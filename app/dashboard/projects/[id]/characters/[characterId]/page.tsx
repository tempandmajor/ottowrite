'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Save, Loader2, Plus, X } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'
import { ImageUpload } from '@/components/ui/image-upload'

type Character = {
  id?: string
  project_id: string
  name: string
  role: string
  importance: number
  age?: number
  gender?: string
  appearance?: string
  physical_description?: string
  personality_traits?: string[]
  strengths?: string[]
  weaknesses?: string[]
  fears?: string[]
  desires?: string[]
  backstory?: string
  arc_type?: string
  character_arc?: string
  internal_conflict?: string
  external_conflict?: string
  first_appearance?: string
  last_appearance?: string
  story_function?: string
  voice_description?: string
  image_url?: string
  tags?: string[]
  notes?: string
}

const createInitialCharacter = (projectId: string): Character => ({
  project_id: projectId,
  name: '',
  role: 'supporting',
  importance: 5,
  personality_traits: [],
  strengths: [],
  weaknesses: [],
  fears: [],
  desires: [],
  tags: [],
})

export default function CharacterEditorPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const projectId = params.id as string
  const characterId = params.characterId as string
  const isNew = characterId === 'new'

  const [character, setCharacter] = useState<Character>(() => createInitialCharacter(projectId))
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(!isNew)

  // Tag input states
  const [newTag, setNewTag] = useState('')
  const [newTrait, setNewTrait] = useState('')
  const [newStrength, setNewStrength] = useState('')
  const [newWeakness, setNewWeakness] = useState('')
  const [newFear, setNewFear] = useState('')
  const [newDesire, setNewDesire] = useState('')

  const resetListInputs = () => {
    setNewTag('')
    setNewTrait('')
    setNewStrength('')
    setNewWeakness('')
    setNewFear('')
    setNewDesire('')
  }

  useEffect(() => {
    if (isNew) {
      setCharacter(createInitialCharacter(projectId))
      resetListInputs()
      setLoading(false)
      return
    }

    setLoading(true)
    resetListInputs()
    loadCharacter()
  }, [characterId, projectId])

  async function loadCharacter() {
    const supabase = createClient()
    try {
      const { data, error } = await supabase
        .from('characters')
        .select('*')
        .eq('id', characterId)
        .eq('project_id', projectId)
        .single()

      if (error) {
        setCharacter(createInitialCharacter(projectId))
        toast({
          title: 'Error',
          description: 'Failed to load character',
          variant: 'destructive',
        })
        return
      }

      if (data) {
        setCharacter(data)
      } else {
        setCharacter(createInitialCharacter(projectId))
        toast({
          title: 'Not found',
          description: 'Character does not exist in this project',
          variant: 'destructive',
        })
      }
    } finally {
      setLoading(false)
    }
  }

  async function saveCharacter() {
    if (!character.name || !character.role) {
      toast({
        title: 'Error',
        description: 'Name and role are required',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)

    const url = isNew ? '/api/characters' : '/api/characters'
    const method = isNew ? 'POST' : 'PATCH'

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(character),
    })

    setSaving(false)

    if (response.ok) {
      const data = await response.json()
      toast({
        title: 'Success',
        description: `Character ${isNew ? 'created' : 'updated'} successfully`,
      })
      if (isNew) {
        router.push(`/dashboard/projects/${projectId}/characters/${data.character.id}`)
      }
    } else {
      toast({
        title: 'Error',
        description: `Failed to ${isNew ? 'create' : 'update'} character`,
        variant: 'destructive',
      })
    }
  }

  function addToArray(field: keyof Character, value: string) {
    if (!value.trim()) return
    const current = (character[field] as string[]) || []
    setCharacter({ ...character, [field]: [...current, value.trim()] })
  }

  function removeFromArray(field: keyof Character, index: number) {
    const current = (character[field] as string[]) || []
    setCharacter({ ...character, [field]: current.filter((_, i) => i !== index) })
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
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
            <h1 className="text-3xl font-bold">{isNew ? 'New Character' : 'Edit Character'}</h1>
            <p className="text-muted-foreground">
              {isNew ? 'Create a new character for your story' : `Editing ${character.name}`}
            </p>
          </div>
          <Button onClick={saveCharacter} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Essential character details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={character.name}
                  onChange={(e) => setCharacter({ ...character, name: e.target.value })}
                  placeholder="Character name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select
                  value={character.role}
                  onValueChange={(value) => setCharacter({ ...character, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="protagonist">Protagonist</SelectItem>
                    <SelectItem value="antagonist">Antagonist</SelectItem>
                    <SelectItem value="supporting">Supporting</SelectItem>
                    <SelectItem value="minor">Minor</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="importance">Importance (1-10)</Label>
                <Input
                  id="importance"
                  type="number"
                  min="1"
                  max="10"
                  value={character.importance}
                  onChange={(e) =>
                    setCharacter({ ...character, importance: parseInt(e.target.value) || 5 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  value={character.age || ''}
                  onChange={(e) =>
                    setCharacter({ ...character, age: parseInt(e.target.value) || undefined })
                  }
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Input
                  id="gender"
                  value={character.gender || ''}
                  onChange={(e) => setCharacter({ ...character, gender: e.target.value })}
                  placeholder="Optional"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Physical Description */}
        <Card>
          <CardHeader>
            <CardTitle>Physical Description</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Character Image</Label>
              <ImageUpload
                value={character.image_url}
                onChange={(url) => setCharacter({ ...character, image_url: url || undefined })}
                folder="characters"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="appearance">Appearance (Brief)</Label>
              <Input
                id="appearance"
                value={character.appearance || ''}
                onChange={(e) => setCharacter({ ...character, appearance: e.target.value })}
                placeholder="Short description (e.g., tall, dark hair, green eyes)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="physical_description">Detailed Physical Description</Label>
              <Textarea
                id="physical_description"
                value={character.physical_description || ''}
                onChange={(e) =>
                  setCharacter({ ...character, physical_description: e.target.value })
                }
                placeholder="Full physical description"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="voice_description">Voice Description</Label>
              <Textarea
                id="voice_description"
                value={character.voice_description || ''}
                onChange={(e) =>
                  setCharacter({ ...character, voice_description: e.target.value })
                }
                placeholder="How does this character sound?"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Personality */}
        <Card>
          <CardHeader>
            <CardTitle>Personality</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Personality Traits</Label>
              <div className="flex gap-2">
                <Input
                  value={newTrait}
                  onChange={(e) => setNewTrait(e.target.value)}
                  placeholder="Add a trait"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addToArray('personality_traits', newTrait)
                      setNewTrait('')
                    }
                  }}
                />
                <Button
                  size="sm"
                  onClick={() => {
                    addToArray('personality_traits', newTrait)
                    setNewTrait('')
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {character.personality_traits?.map((trait, i) => (
                  <Badge key={i} variant="secondary">
                    {trait}
                    <button
                      onClick={() => removeFromArray('personality_traits', i)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Strengths</Label>
                <div className="flex gap-2">
                  <Input
                    value={newStrength}
                    onChange={(e) => setNewStrength(e.target.value)}
                    placeholder="Add a strength"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addToArray('strengths', newStrength)
                        setNewStrength('')
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      addToArray('strengths', newStrength)
                      setNewStrength('')
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {character.strengths?.map((strength, i) => (
                    <Badge key={i} variant="secondary">
                      {strength}
                      <button
                        onClick={() => removeFromArray('strengths', i)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Weaknesses</Label>
                <div className="flex gap-2">
                  <Input
                    value={newWeakness}
                    onChange={(e) => setNewWeakness(e.target.value)}
                    placeholder="Add a weakness"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addToArray('weaknesses', newWeakness)
                        setNewWeakness('')
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      addToArray('weaknesses', newWeakness)
                      setNewWeakness('')
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {character.weaknesses?.map((weakness, i) => (
                    <Badge key={i} variant="secondary">
                      {weakness}
                      <button
                        onClick={() => removeFromArray('weaknesses', i)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Fears</Label>
                <div className="flex gap-2">
                  <Input
                    value={newFear}
                    onChange={(e) => setNewFear(e.target.value)}
                    placeholder="Add a fear"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addToArray('fears', newFear)
                        setNewFear('')
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      addToArray('fears', newFear)
                      setNewFear('')
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {character.fears?.map((fear, i) => (
                    <Badge key={i} variant="secondary">
                      {fear}
                      <button
                        onClick={() => removeFromArray('fears', i)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Desires</Label>
                <div className="flex gap-2">
                  <Input
                    value={newDesire}
                    onChange={(e) => setNewDesire(e.target.value)}
                    placeholder="Add a desire"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addToArray('desires', newDesire)
                        setNewDesire('')
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      addToArray('desires', newDesire)
                      setNewDesire('')
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {character.desires?.map((desire, i) => (
                    <Badge key={i} variant="secondary">
                      {desire}
                      <button
                        onClick={() => removeFromArray('desires', i)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Backstory & Arc */}
        <Card>
          <CardHeader>
            <CardTitle>Backstory & Character Arc</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="backstory">Backstory</Label>
              <Textarea
                id="backstory"
                value={character.backstory || ''}
                onChange={(e) => setCharacter({ ...character, backstory: e.target.value })}
                placeholder="Character's history and background"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="arc_type">Arc Type</Label>
              <Select
                value={character.arc_type || 'none'}
                onValueChange={(value) => setCharacter({ ...character, arc_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select arc type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Arc</SelectItem>
                  <SelectItem value="positive">Positive (Growth)</SelectItem>
                  <SelectItem value="negative">Negative (Fall)</SelectItem>
                  <SelectItem value="flat">Flat (Unchanging)</SelectItem>
                  <SelectItem value="transformative">Transformative</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="character_arc">Character Arc Description</Label>
              <Textarea
                id="character_arc"
                value={character.character_arc || ''}
                onChange={(e) => setCharacter({ ...character, character_arc: e.target.value })}
                placeholder="How does this character change throughout the story?"
                rows={3}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="internal_conflict">Internal Conflict</Label>
                <Textarea
                  id="internal_conflict"
                  value={character.internal_conflict || ''}
                  onChange={(e) =>
                    setCharacter({ ...character, internal_conflict: e.target.value })
                  }
                  placeholder="Inner struggles and doubts"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="external_conflict">External Conflict</Label>
                <Textarea
                  id="external_conflict"
                  value={character.external_conflict || ''}
                  onChange={(e) =>
                    setCharacter({ ...character, external_conflict: e.target.value })
                  }
                  placeholder="Outside forces and obstacles"
                  rows={3}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Story Details */}
        <Card>
          <CardHeader>
            <CardTitle>Story Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first_appearance">First Appearance</Label>
                <Input
                  id="first_appearance"
                  value={character.first_appearance || ''}
                  onChange={(e) =>
                    setCharacter({ ...character, first_appearance: e.target.value })
                  }
                  placeholder="Chapter/scene where character first appears"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_appearance">Last Appearance</Label>
                <Input
                  id="last_appearance"
                  value={character.last_appearance || ''}
                  onChange={(e) =>
                    setCharacter({ ...character, last_appearance: e.target.value })
                  }
                  placeholder="Chapter/scene where character last appears"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="story_function">Story Function</Label>
              <Textarea
                id="story_function"
                value={character.story_function || ''}
                onChange={(e) => setCharacter({ ...character, story_function: e.target.value })}
                placeholder="What role does this character play in the story?"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add a tag"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addToArray('tags', newTag)
                      setNewTag('')
                    }
                  }}
                />
                <Button
                  size="sm"
                  onClick={() => {
                    addToArray('tags', newTag)
                    setNewTag('')
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {character.tags?.map((tag, i) => (
                  <Badge key={i} variant="secondary">
                    {tag}
                    <button
                      onClick={() => removeFromArray('tags', i)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={character.notes || ''}
              onChange={(e) => setCharacter({ ...character, notes: e.target.value })}
              placeholder="Additional notes about this character"
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={saveCharacter} disabled={saving} size="lg">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Character
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
