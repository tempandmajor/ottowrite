'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Users, MapPin, ChevronRight, Clock } from 'lucide-react'
import type { Chapter } from './chapter-sidebar'

type CharacterIndexProps = {
  content: string
  structure: Chapter[]
  onNavigateToScene?: (sceneId: string) => void
}

type CharacterEntry = {
  name: string
  lineCount: number
  sceneCount: number
  lastAppearance: {
    sceneId: string
    sceneTitle: string
    chapterTitle: string
  } | null
}

type SceneEntry = {
  id: string
  title: string
  chapterTitle: string
  location: string | null
  time: string | null
  type: 'INT' | 'EXT' | 'INT/EXT' | null
  characterCount: number
  wordCount: number
}

/**
 * Extract character names from text
 * Looks for patterns like "CHARACTER:" or dialogue attribution
 */
function extractCharacterNames(text: string): string[] {
  const names = new Set<string>()

  // Pattern 1: "CHARACTER:" at start of line (screenplay style)
  const dialoguePattern = /^([A-Z][A-Z\s]+):/gm
  let match
  while ((match = dialoguePattern.exec(text)) !== null) {
    const name = match[1].trim()
    if (name.length > 1 && name.length < 30) {
      names.add(name)
    }
  }

  // Pattern 2: Character names in all caps in prose
  const capsPattern = /\b([A-Z][A-Z]+)\b/g
  while ((match = capsPattern.exec(text)) !== null) {
    const name = match[1]
    if (name.length > 2 && name.length < 20 && !commonWords.has(name)) {
      names.add(name)
    }
  }

  return Array.from(names)
}

/**
 * Common words to exclude from character detection
 */
const commonWords = new Set([
  'THE', 'AND', 'BUT', 'FOR', 'NOT', 'WITH', 'YOU', 'THIS', 'THAT',
  'FROM', 'THEY', 'BEEN', 'HAVE', 'HAS', 'HAD', 'WERE', 'WAS', 'ARE',
  'WHAT', 'WHEN', 'WHERE', 'WHO', 'WHY', 'HOW', 'SAID', 'SAYS', 'VERY',
  'JUST', 'THEN', 'THAN', 'SOME', 'COULD', 'WOULD', 'SHOULD', 'MUST',
])

/**
 * Extract scene location and time from title
 */
function parseSceneHeading(title: string): {
  type: 'INT' | 'EXT' | 'INT/EXT' | null
  location: string | null
  time: string | null
} {
  // Pattern: INT. LOCATION - TIME or EXT. LOCATION - TIME
  const pattern = /^(INT\.?|EXT\.?|INT\/EXT\.?)\s+([^-]+?)(?:\s*-\s*(.+))?$/i
  const match = title.match(pattern)

  if (match) {
    const type = match[1].replace('.', '').toUpperCase() as 'INT' | 'EXT' | 'INT/EXT'
    const location = match[2]?.trim() || null
    const time = match[3]?.trim() || null
    return { type, location, time }
  }

  return { type: null, location: null, time: null }
}

/**
 * Strip HTML tags from content
 */
function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0).length
}

export function CharacterSceneIndex({
  content,
  structure,
  onNavigateToScene,
}: CharacterIndexProps) {
  const { characters, scenes } = useMemo(() => {
    const characterMap = new Map<string, CharacterEntry>()
    const sceneList: SceneEntry[] = []

    // Process each chapter and scene
    structure.forEach((chapter) => {
      chapter.scenes?.forEach((scene, sceneIndex) => {
        // Extract scene heading info
        const { type, location, time } = parseSceneHeading(scene.title || '')

        // Extract characters from scene content (approximate based on scene position)
        // In a real implementation, you'd parse the actual scene content
        const sceneCharacters = extractCharacterNames(scene.summary || scene.title || '')

        // Count words in scene summary
        const wordCount = countWords(scene.summary || '')

        // Add to scene list
        sceneList.push({
          id: scene.id,
          title: scene.title || `Scene ${sceneIndex + 1}`,
          chapterTitle: chapter.title || `Chapter ${structure.indexOf(chapter) + 1}`,
          location,
          time,
          type,
          characterCount: sceneCharacters.length,
          wordCount,
        })

        // Update character entries
        sceneCharacters.forEach((name) => {
          const existing = characterMap.get(name)
          if (existing) {
            existing.sceneCount++
            existing.lineCount += 1 // Approximate
            existing.lastAppearance = {
              sceneId: scene.id,
              sceneTitle: scene.title || `Scene ${sceneIndex + 1}`,
              chapterTitle: chapter.title || `Chapter ${structure.indexOf(chapter) + 1}`,
            }
          } else {
            characterMap.set(name, {
              name,
              lineCount: 1,
              sceneCount: 1,
              lastAppearance: {
                sceneId: scene.id,
                sceneTitle: scene.title || `Scene ${sceneIndex + 1}`,
                chapterTitle: chapter.title || `Chapter ${structure.indexOf(chapter) + 1}`,
              },
            })
          }
        })
      })
    })

    // Sort characters by scene count (most prominent first)
    const characters = Array.from(characterMap.values()).sort(
      (a, b) => b.sceneCount - a.sceneCount
    )

    return { characters, scenes: sceneList }
  }, [content, structure])

  return (
    <Card className="w-full">
      <Tabs defaultValue="scenes" className="w-full">
        <CardHeader className="pb-3">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="scenes" className="text-xs">
              <MapPin className="mr-1.5 h-3.5 w-3.5" />
              Scenes ({scenes.length})
            </TabsTrigger>
            <TabsTrigger value="characters" className="text-xs">
              <Users className="mr-1.5 h-3.5 w-3.5" />
              Characters ({characters.length})
            </TabsTrigger>
          </TabsList>
        </CardHeader>

        <CardContent className="px-3 pb-3">
          {/* Scenes Tab */}
          <TabsContent value="scenes" className="mt-0 space-y-2">
            {scenes.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-4">
                No scenes found. Add scenes to your chapters to see them here.
              </p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {scenes.map((scene) => (
                  <Button
                    key={scene.id}
                    variant="ghost"
                    className="w-full justify-start h-auto p-2 hover:bg-accent"
                    onClick={() => onNavigateToScene?.(scene.id)}
                  >
                    <div className="flex-1 text-left space-y-1">
                      <div className="flex items-center gap-2">
                        {scene.type && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0 h-4"
                          >
                            {scene.type}
                          </Badge>
                        )}
                        <span className="text-xs font-medium line-clamp-1">
                          {scene.title}
                        </span>
                      </div>

                      {scene.location && (
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span className="line-clamp-1">{scene.location}</span>
                        </div>
                      )}

                      {scene.time && (
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{scene.time}</span>
                        </div>
                      )}

                      <div className="text-[10px] text-muted-foreground">
                        {scene.chapterTitle}
                        {scene.characterCount > 0 && ` • ${scene.characterCount} characters`}
                      </div>
                    </div>

                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </Button>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Characters Tab */}
          <TabsContent value="characters" className="mt-0 space-y-2">
            {characters.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-4">
                No characters detected. Characters are identified from dialogue and scene summaries.
              </p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {characters.map((character) => (
                  <Button
                    key={character.name}
                    variant="ghost"
                    className="w-full justify-start h-auto p-2 hover:bg-accent"
                    onClick={() =>
                      character.lastAppearance &&
                      onNavigateToScene?.(character.lastAppearance.sceneId)
                    }
                    disabled={!character.lastAppearance}
                  >
                    <div className="flex-1 text-left space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{character.name}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                          {character.sceneCount} scene{character.sceneCount !== 1 ? 's' : ''}
                        </Badge>
                      </div>

                      {character.lastAppearance && (
                        <div className="text-[11px] text-muted-foreground">
                          Last seen: {character.lastAppearance.sceneTitle}
                        </div>
                      )}

                      <div className="text-[10px] text-muted-foreground">
                        {character.lineCount} appearance{character.lineCount !== 1 ? 's' : ''}
                      </div>
                    </div>

                    {character.lastAppearance && (
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                  </Button>
                ))}
              </div>
            )}
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  )
}
