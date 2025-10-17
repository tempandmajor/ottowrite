'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  User,
  Users,
  ArrowLeft,
  Trash2,
  Edit,
  Heart,
  Swords,
  Handshake,
  UserCircle2,
  Network,
} from 'lucide-react'
import Link from 'next/link'

type Character = {
  id: string
  name: string
  role: string
  importance: number
  age?: number
  gender?: string
  appearance?: string
  backstory?: string
  arc_type?: string
  tags?: string[]
  created_at: string
}

type Project = {
  id: string
  title: string
  type: string
}

const roleColors: Record<string, string> = {
  protagonist: 'bg-blue-500',
  antagonist: 'bg-red-500',
  supporting: 'bg-green-500',
  minor: 'bg-gray-500',
  other: 'bg-purple-500',
}

const roleIcons: Record<string, any> = {
  protagonist: UserCircle2,
  antagonist: Swords,
  supporting: Handshake,
  minor: User,
  other: Users,
}

export default function CharactersPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [allCharacters, setAllCharacters] = useState<Character[]>([])
  const [characters, setCharacters] = useState<Character[]>([])
  const [loading, setLoading] = useState(true)
  const [filterRole, setFilterRole] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [projectId])

  useEffect(() => {
    if (filterRole) {
      setCharacters(allCharacters.filter((c) => c.role === filterRole))
    } else {
      setCharacters(allCharacters)
    }
  }, [filterRole, allCharacters])

  async function loadData() {
    const supabase = createClient()
    setLoading(true)

    // Load project
    const { data: projectData } = await supabase
      .from('projects')
      .select('id, title, type')
      .eq('id', projectId)
      .single()

    if (projectData) {
      setProject(projectData)
    }

    // Load characters
    let query = supabase
      .from('characters')
      .select('*')
      .eq('project_id', projectId)
      .order('importance', { ascending: false })
      .order('created_at', { ascending: false })

    const { data: charactersData } = await query

    if (charactersData) {
      setAllCharacters(charactersData)
      setCharacters(filterRole ? charactersData.filter((c) => c.role === filterRole) : charactersData)
    } else {
      setAllCharacters([])
      setCharacters([])
    }

    setLoading(false)
  }

  async function deleteCharacter(id: string) {
    if (!confirm('Are you sure you want to delete this character?')) {
      return
    }

    const response = await fetch(`/api/characters?id=${id}`, {
      method: 'DELETE',
    })

    if (response.ok) {
      setAllCharacters((prev) => prev.filter((c) => c.id !== id))
      setCharacters((prev) => prev.filter((c) => c.id !== id))
    }
  }

  const roleCounts = {
    protagonist: allCharacters.filter((c) => c.role === 'protagonist').length,
    antagonist: allCharacters.filter((c) => c.role === 'antagonist').length,
    supporting: allCharacters.filter((c) => c.role === 'supporting').length,
    minor: allCharacters.filter((c) => c.role === 'minor').length,
    other: allCharacters.filter((c) => c.role === 'other').length,
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
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
            <Link href={`/dashboard/projects/${projectId}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Project
            </Link>
          </Button>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Characters</h1>
            <p className="text-muted-foreground">
              {project?.title} • {allCharacters.length} character{allCharacters.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/dashboard/projects/${projectId}/characters/relationships`}>
                <Network className="h-4 w-4 mr-2" />
                Relationships
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/dashboard/projects/${projectId}/characters/new`}>
                <Plus className="h-4 w-4 mr-2" />
                New Character
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5 mb-8">
        {(Object.entries(roleCounts) as [keyof typeof roleCounts, number][]).map(
          ([role, count]) => {
            const Icon = roleIcons[role]
            return (
              <Card
                key={role}
                className={`cursor-pointer transition-all ${
                  filterRole === role ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setFilterRole(filterRole === role ? null : role)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Icon className={`h-5 w-5 ${roleColors[role]} text-white rounded p-1`} />
                    <span className="text-2xl font-bold">{count}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground capitalize">
                    {role}
                  </p>
                </CardContent>
              </Card>
            )
          }
        )}
      </div>

      {/* Characters List */}
      {characters.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No characters yet</h3>
            <p className="text-muted-foreground mb-4">
              {filterRole
                ? `No ${filterRole} characters found. Try a different filter.`
                : 'Create your first character to bring your story to life.'}
            </p>
            {!filterRole && (
              <Button asChild>
                <Link href={`/dashboard/projects/${projectId}/characters/new`}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Character
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {characters.map((character) => {
            const Icon = roleIcons[character.role]
            return (
              <Card key={character.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-6 w-6 ${roleColors[character.role]} text-white rounded p-1`} />
                      <div>
                        <CardTitle>{character.name}</CardTitle>
                        <CardDescription className="capitalize">{character.role}</CardDescription>
                      </div>
                    </div>
                    <Badge variant="outline">★ {character.importance}/10</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    {character.age && (
                      <p className="text-sm text-muted-foreground">Age: {character.age}</p>
                    )}
                    {character.gender && (
                      <p className="text-sm text-muted-foreground">Gender: {character.gender}</p>
                    )}
                    {character.appearance && (
                      <p className="text-sm line-clamp-2">{character.appearance}</p>
                    )}
                    {character.arc_type && (
                      <Badge variant="secondary" className="capitalize">
                        {character.arc_type} arc
                      </Badge>
                    )}
                  </div>
                  {character.tags && character.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {character.tags.slice(0, 3).map((tag, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {character.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{character.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" asChild>
                      <Link href={`/dashboard/projects/${projectId}/characters/${character.id}`}>
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteCharacter(character.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
