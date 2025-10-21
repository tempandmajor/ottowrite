/**
 * Scene Breakdown Parser
 * Extract and analyze scenes from screenplay for production planning
 */

import type { ScreenplayElement } from './formatter'

export type SceneTime = 'DAY' | 'NIGHT' | 'DAWN' | 'DUSK' | 'CONTINUOUS' | 'LATER' | 'SAME TIME' | 'MAGIC HOUR'
export type SceneLocation = 'INT' | 'EXT' | 'INT./EXT.' | 'EXT./INT.' | 'I/E'

export type Scene = {
  id: string
  sceneNumber: number
  heading: string
  location: string // e.g., "COFFEE SHOP"
  locationType: SceneLocation
  time: SceneTime | string
  description: string // Action/description text
  dialogue: Array<{
    character: string
    lines: string[]
  }>
  characters: string[] // Unique characters in scene
  pageNumber?: number
  duration?: number // Estimated duration in minutes
  tags?: string[]
  notes?: string
}

export type SceneBreakdown = {
  scenes: Scene[]
  totalScenes: number
  locations: string[]
  characters: string[]
  intCount: number
  extCount: number
  dayCount: number
  nightCount: number
}

/**
 * Parse scene heading into components
 */
function parseSceneHeading(heading: string): {
  locationType: SceneLocation
  location: string
  time: string
} {
  // Standard format: INT. LOCATION - TIME
  const match = heading.match(/^(INT\.|EXT\.|INT\.\/EXT\.|EXT\.\/INT\.|I\/E)\s+(.+?)\s*[-–—]\s*(.+)$/i)

  if (match) {
    return {
      locationType: match[1].toUpperCase() as SceneLocation,
      location: match[2].trim(),
      time: match[3].trim().toUpperCase(),
    }
  }

  // Fallback: Try to extract location type
  const locationMatch = heading.match(/^(INT\.|EXT\.|INT\.\/EXT\.|EXT\.\/INT\.|I\/E)\s+(.+)$/i)
  if (locationMatch) {
    return {
      locationType: locationMatch[1].toUpperCase() as SceneLocation,
      location: locationMatch[2].trim(),
      time: 'DAY', // Default
    }
  }

  // Fallback: Treat entire heading as location
  return {
    locationType: 'INT',
    location: heading,
    time: 'DAY',
  }
}

/**
 * Extract scenes from screenplay elements
 */
export function extractScenes(elements: ScreenplayElement[]): Scene[] {
  const scenes: Scene[] = []
  let currentScene: Partial<Scene> | null = null
  let sceneNumber = 1

  for (const element of elements) {
    if (element.type === 'scene-heading') {
      // Save previous scene if exists
      if (currentScene) {
        scenes.push({
          id: `scene-${sceneNumber - 1}`,
          sceneNumber: sceneNumber - 1,
          heading: currentScene.heading || '',
          location: currentScene.location || '',
          locationType: currentScene.locationType || 'INT',
          time: currentScene.time || 'DAY',
          description: currentScene.description || '',
          dialogue: currentScene.dialogue || [],
          characters: currentScene.characters || [],
          tags: currentScene.tags || [],
        })
      }

      // Start new scene
      const parsed = parseSceneHeading(element.text)
      currentScene = {
        heading: element.text,
        location: parsed.location,
        locationType: parsed.locationType,
        time: parsed.time,
        description: '',
        dialogue: [],
        characters: [],
        tags: [],
      }
      sceneNumber++
    } else if (currentScene) {
      // Add to current scene
      if (element.type === 'action') {
        if (currentScene.description) {
          currentScene.description += '\n\n' + element.text
        } else {
          currentScene.description = element.text
        }
      } else if (element.type === 'character') {
        // Extract character name (remove extensions like V.O., O.S.)
        const characterName = element.text.replace(/\s+\([^)]+\)$/, '').trim()

        // Add to characters list if not already present
        if (!currentScene.characters) currentScene.characters = []
        if (!currentScene.characters.includes(characterName)) {
          currentScene.characters.push(characterName)
        }

        // Start new dialogue entry
        if (!currentScene.dialogue) currentScene.dialogue = []
        currentScene.dialogue.push({
          character: characterName,
          lines: [],
        })
      } else if (element.type === 'dialogue' && currentScene.dialogue && currentScene.dialogue.length > 0) {
        // Add dialogue line to current character
        const lastDialogue = currentScene.dialogue[currentScene.dialogue.length - 1]
        lastDialogue.lines.push(element.text)
      } else if (element.type === 'parenthetical' && currentScene.dialogue && currentScene.dialogue.length > 0) {
        // Add parenthetical to current character's dialogue
        const lastDialogue = currentScene.dialogue[currentScene.dialogue.length - 1]
        lastDialogue.lines.push(element.text)
      }
    }
  }

  // Save last scene
  if (currentScene) {
    scenes.push({
      id: `scene-${sceneNumber - 1}`,
      sceneNumber: sceneNumber - 1,
      heading: currentScene.heading || '',
      location: currentScene.location || '',
      locationType: currentScene.locationType || 'INT',
      time: currentScene.time || 'DAY',
      description: currentScene.description || '',
      dialogue: currentScene.dialogue || [],
      characters: currentScene.characters || [],
      tags: currentScene.tags || [],
    })
  }

  return scenes
}

/**
 * Generate scene breakdown statistics
 */
export function generateSceneBreakdown(scenes: Scene[]): SceneBreakdown {
  const locations = new Set<string>()
  const characters = new Set<string>()
  let intCount = 0
  let extCount = 0
  let dayCount = 0
  let nightCount = 0

  for (const scene of scenes) {
    locations.add(scene.location)
    scene.characters.forEach((char) => characters.add(char))

    // Count location types
    if (scene.locationType === 'INT') {
      intCount++
    } else if (scene.locationType === 'EXT') {
      extCount++
    }

    // Count time of day
    const timeUpper = scene.time.toUpperCase()
    if (timeUpper.includes('DAY')) {
      dayCount++
    } else if (timeUpper.includes('NIGHT')) {
      nightCount++
    }
  }

  return {
    scenes,
    totalScenes: scenes.length,
    locations: Array.from(locations).sort(),
    characters: Array.from(characters).sort(),
    intCount,
    extCount,
    dayCount,
    nightCount,
  }
}

/**
 * Estimate scene duration based on page count
 * Industry rule: 1 page ≈ 1 minute of screen time
 */
export function estimateSceneDuration(scene: Scene): number {
  // Rough estimate based on content
  const actionWords = scene.description.split(/\s+/).length
  const dialogueWords = scene.dialogue.reduce((sum, d) => sum + d.lines.join(' ').split(/\s+/).length, 0)

  // Assume ~150 words per minute for action, ~200 words per minute for dialogue
  const actionMinutes = actionWords / 150
  const dialogueMinutes = dialogueWords / 200

  return Math.max(0.5, Math.round((actionMinutes + dialogueMinutes) * 10) / 10)
}

/**
 * Group scenes by location
 */
export function groupScenesByLocation(scenes: Scene[]): Map<string, Scene[]> {
  const grouped = new Map<string, Scene[]>()

  for (const scene of scenes) {
    const existing = grouped.get(scene.location) || []
    existing.push(scene)
    grouped.set(scene.location, existing)
  }

  return grouped
}

/**
 * Group scenes by character
 */
export function groupScenesByCharacter(scenes: Scene[]): Map<string, Scene[]> {
  const grouped = new Map<string, Scene[]>()

  for (const scene of scenes) {
    for (const character of scene.characters) {
      const existing = grouped.get(character) || []
      existing.push(scene)
      grouped.set(character, existing)
    }
  }

  return grouped
}

/**
 * Filter scenes by criteria
 */
export function filterScenes(
  scenes: Scene[],
  filters: {
    locationType?: SceneLocation
    time?: SceneTime | string
    location?: string
    character?: string
    tag?: string
  }
): Scene[] {
  return scenes.filter((scene) => {
    if (filters.locationType && scene.locationType !== filters.locationType) {
      return false
    }
    if (filters.time && !scene.time.toUpperCase().includes(filters.time.toUpperCase())) {
      return false
    }
    if (filters.location && !scene.location.toLowerCase().includes(filters.location.toLowerCase())) {
      return false
    }
    if (filters.character && !scene.characters.some((c) => c.toLowerCase().includes(filters.character!.toLowerCase()))) {
      return false
    }
    if (filters.tag && !scene.tags?.includes(filters.tag)) {
      return false
    }
    return true
  })
}

/**
 * Export scene breakdown to CSV
 */
export function exportToCSV(scenes: Scene[]): string {
  const headers = [
    'Scene #',
    'Location Type',
    'Location',
    'Time',
    'Characters',
    'Description',
    'Duration (min)',
    'Tags',
  ]

  const rows = scenes.map((scene) => [
    scene.sceneNumber.toString(),
    scene.locationType,
    `"${scene.location}"`,
    scene.time,
    `"${scene.characters.join(', ')}"`,
    `"${scene.description.replace(/"/g, '""').substring(0, 100)}..."`,
    scene.duration?.toString() || estimateSceneDuration(scene).toString(),
    `"${scene.tags?.join(', ') || ''}"`,
  ])

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')
}

/**
 * Export scene breakdown to formatted text
 */
export function exportToText(scenes: Scene[]): string {
  const lines: string[] = []

  lines.push('SCENE BREAKDOWN')
  lines.push('=' .repeat(80))
  lines.push('')

  for (const scene of scenes) {
    lines.push(`SCENE ${scene.sceneNumber}: ${scene.heading}`)
    lines.push('-'.repeat(80))
    lines.push(`Location: ${scene.location}`)
    lines.push(`Type: ${scene.locationType}`)
    lines.push(`Time: ${scene.time}`)
    lines.push(`Characters: ${scene.characters.join(', ')}`)
    lines.push(`Estimated Duration: ${scene.duration || estimateSceneDuration(scene)} minutes`)
    if (scene.tags && scene.tags.length > 0) {
      lines.push(`Tags: ${scene.tags.join(', ')}`)
    }
    lines.push('')
    lines.push('Description:')
    lines.push(scene.description.substring(0, 200) + (scene.description.length > 200 ? '...' : ''))
    lines.push('')
    lines.push('')
  }

  return lines.join('\n')
}

/**
 * Calculate shooting schedule recommendations
 * Groups scenes by location to minimize company moves
 */
export function generateShootingSchedule(scenes: Scene[]): Array<{
  day: number
  location: string
  scenes: Scene[]
  totalDuration: number
}> {
  const byLocation = groupScenesByLocation(scenes)
  const schedule: Array<{
    day: number
    location: string
    scenes: Scene[]
    totalDuration: number
  }> = []

  let day = 1
  const maxDurationPerDay = 480 // 8 hours in minutes

  for (const [location, locationScenes] of byLocation) {
    let currentDayScenes: Scene[] = []
    let currentDuration = 0

    for (const scene of locationScenes) {
      const duration = scene.duration || estimateSceneDuration(scene)

      if (currentDuration + duration > maxDurationPerDay && currentDayScenes.length > 0) {
        // Save current day and start new day
        schedule.push({
          day,
          location,
          scenes: currentDayScenes,
          totalDuration: currentDuration,
        })
        day++
        currentDayScenes = []
        currentDuration = 0
      }

      currentDayScenes.push(scene)
      currentDuration += duration
    }

    // Save remaining scenes
    if (currentDayScenes.length > 0) {
      schedule.push({
        day,
        location,
        scenes: currentDayScenes,
        totalDuration: currentDuration,
      })
      day++
    }
  }

  return schedule
}
