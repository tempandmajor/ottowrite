'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
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
import {
  ArrowLeft,
  Save,
  Loader2,
  Plus,
  X,
  Sparkles,
  BookOpenCheck,
} from 'lucide-react'
import { ImageUpload } from '@/components/ui/image-upload'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SectionNav } from '@/components/dashboard/section-nav'
import { useToast } from '@/hooks/use-toast'

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

    const method = isNew ? 'POST' : 'PATCH'
    const response = await fetch('/api/characters', {
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

  const sections = [
    { id: 'profile', label: 'Profile' },
    { id: 'psyche', label: 'Psychology' },
    { id: 'story', label: 'Story Arc' },
    { id: 'notes', label: 'Notes' },
  ]

  const [activeTab, setActiveTab] = useState<string>(sections[0].id)

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[260px_1fr]">
      <div className="space-y-6 lg:sticky lg:top-28 lg:h-fit">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/projects/${projectId}/characters`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to characters
          </Link>
        </Button>
        <section className="rounded-3xl border bg-card/80 p-6 shadow-card">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              {isNew ? 'Create character' : 'Character profile'}
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">
                {isNew ? 'New Character' : character.name}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isNew
                  ? 'Craft a compelling persona to enrich your story world.'
                  : 'Update biography, personality, and narrative arc details.'}
              </p>
            </div>
          </div>
          <div className="mt-6 space-y-3 text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              <Badge variant="muted" className="capitalize">
                {character.role || 'supporting'}
              </Badge>
              <span>• Importance {character.importance}/10</span>
            </p>
            {character.arc_type && (
              <p className="flex items-center gap-2 text-xs">
                <BookOpenCheck className="h-4 w-4 text-primary" />
                {character.arc_type} arc
              </p>
            )}
          </div>
          <div className="mt-6 flex flex-col gap-3">
            <Button size="lg" onClick={saveCharacter} disabled={saving} className="justify-between">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving character
                </>
              ) : (
                <>
                  Save character
                  <Save className="h-4 w-4" />
                </>
              )}
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/dashboard/projects/${projectId}`}>Project overview</Link>
            </Button>
          </div>
        </section>

        <SectionNav sections={sections} current={activeTab} onSelect={setActiveTab} />
      </div>

      <div>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            {sections.map((section) => (
              <TabsTrigger key={section.id} value={section.id}>
                {section.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic information</CardTitle>
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

            <Card>
              <CardHeader>
                <CardTitle>Physical description</CardTitle>
                <CardDescription>Appearance and vocal qualities</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Character image</Label>
                  <ImageUpload
                    value={character.image_url}
                    onChange={(url) => setCharacter({ ...character, image_url: url || undefined })}
                    folder="characters"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="appearance">Appearance (brief)</Label>
                  <Input
                    id="appearance"
                    value={character.appearance || ''}
                    onChange={(e) => setCharacter({ ...character, appearance: e.target.value })}
                    placeholder="Short description (e.g., tall, dark hair, green eyes)"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="physical_description">Detailed physical description</Label>
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
                  <Label htmlFor="voice_description">Voice description</Label>
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
          </TabsContent>

          <TabsContent value="psyche" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Personality & drives</CardTitle>
                <CardDescription>Capture defining traits, strengths, and fears.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Personality traits</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newTrait}
                      onChange={(e) => setNewTrait(e.target.value)}
                      placeholder="Add a trait"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
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
                  <div className="mt-2 flex flex-wrap gap-2">
                    {character.personality_traits?.map((trait, i) => (
                      <Badge key={i} variant="secondary" className="flex items-center gap-1">
                        {trait}
                        <button
                          onClick={() => removeFromArray('personality_traits', i)}
                          className="rounded-full bg-background/40 p-0.5 transition hover:text-destructive"
                          aria-label={`Remove ${trait}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  {[
                    {
                      title: 'Strengths',
                      field: 'strengths' as keyof Character,
                      value: newStrength,
                      setValue: setNewStrength,
                      placeholder: 'Add a strength',
                    },
                    {
                      title: 'Weaknesses',
                      field: 'weaknesses' as keyof Character,
                      value: newWeakness,
                      setValue: setNewWeakness,
                      placeholder: 'Add a weakness',
                    },
                    {
                      title: 'Fears',
                      field: 'fears' as keyof Character,
                      value: newFear,
                      setValue: setNewFear,
                      placeholder: 'Add a fear',
                    },
                    {
                      title: 'Desires',
                      field: 'desires' as keyof Character,
                      value: newDesire,
                      setValue: setNewDesire,
                      placeholder: 'Add a desire',
                    },
                  ].map(({ title, field, value, setValue, placeholder }) => (
                    <div key={title} className="space-y-2">
                      <Label>{title}</Label>
                      <div className="flex gap-2">
                        <Input
                          value={value}
                          onChange={(e) => setValue(e.target.value)}
                          placeholder={placeholder}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              addToArray(field, value)
                              setValue('')
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          onClick={() => {
                            addToArray(field, value)
                            setValue('')
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(character[field] as string[] | undefined)?.map((item, index) => (
                          <Badge key={index} variant="secondary" className="flex items-center gap-1">
                            {item}
                            <button
                              onClick={() => removeFromArray(field, index)}
                              className="rounded-full bg-background/40 p-0.5 transition hover:text-destructive"
                              aria-label={`Remove ${item}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="story" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Backstory & arc</CardTitle>
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
                  <Label htmlFor="arc_type">Arc type</Label>
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
                  <Label htmlFor="character_arc">Character arc description</Label>
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
                    <Label htmlFor="internal_conflict">Internal conflict</Label>
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
                    <Label htmlFor="external_conflict">External conflict</Label>
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

            <Card>
              <CardHeader>
                <CardTitle>Story placement</CardTitle>
                <CardDescription>Track when and where this character appears.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="first_appearance">First appearance</Label>
                    <Input
                      id="first_appearance"
                      value={character.first_appearance || ''}
                      onChange={(e) =>
                        setCharacter({ ...character, first_appearance: e.target.value })
                      }
                      placeholder="Scene, episode, or chapter"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_appearance">Last appearance</Label>
                    <Input
                      id="last_appearance"
                      value={character.last_appearance || ''}
                      onChange={(e) =>
                        setCharacter({ ...character, last_appearance: e.target.value })
                      }
                      placeholder="Where the character exits"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="story_function">Story function</Label>
                  <Textarea
                    id="story_function"
                    value={character.story_function || ''}
                    onChange={(e) => setCharacter({ ...character, story_function: e.target.value })}
                    placeholder="What purpose does this character serve in the narrative?"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notes" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Tags & archetypes</CardTitle>
                <CardDescription>Add quick labels to filter and group characters.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add a tag (e.g., mentor, rebel)"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
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
                <div className="flex flex-wrap gap-2">
                  {character.tags?.map((tag, i) => (
                    <Badge key={i} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <button
                        onClick={() => removeFromArray('tags', i)}
                        className="rounded-full bg-background/40 p-0.5 transition hover:text-destructive"
                        aria-label={`Remove ${tag}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
                <CardDescription>Capture additional ideas, reminders, or dialogue snippets.</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={character.notes || ''}
                  onChange={(e) => setCharacter({ ...character, notes: e.target.value })}
                  placeholder="Additional notes about this character"
                  rows={6}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-8 flex justify-end">
          <Button size="lg" onClick={saveCharacter} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save character
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
