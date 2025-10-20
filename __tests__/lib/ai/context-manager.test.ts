import { describe, it, expect } from 'vitest'

import {
  buildContextBundle,
  buildContextPreview,
  generateContextPrompt,
  estimateTokens,
  type StoryBibleEntry,
  type TimelineEvent,
  type ContextExcerpt,
} from '@/lib/ai/context-manager'

const characters: StoryBibleEntry[] = [
  {
    id: 'c1',
    name: 'Aster Reyes',
    entityType: 'character',
    summary: 'Protagonist detective struggling with burnout.',
    importance: 'main',
    updatedAt: new Date().toISOString(),
    traits: ['methodical', 'insomniac'],
    tags: ['protagonist'],
  },
  {
    id: 'c2',
    name: 'Mara Kincaid',
    entityType: 'character',
    summary: 'Childhood friend turned rival investigator.',
    importance: 'supporting',
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(),
    traits: ['charismatic'],
  },
  {
    id: 'c3',
    name: 'The Azure Collective',
    entityType: 'faction',
    summary: 'Shadowy group manipulating city politics.',
    importance: 'main',
  },
]

const locations: StoryBibleEntry[] = [
  {
    id: 'l1',
    name: 'Verdigris City',
    entityType: 'location',
    summary: 'Futuristic metropolis powered by algae reactors.',
    importance: 'main',
  },
  {
    id: 'l2',
    name: 'The Echo Bazaar',
    entityType: 'location',
    summary: 'Underground market dealing in memories and secrets.',
    importance: 'supporting',
  },
]

const timeline: TimelineEvent[] = [
  {
    id: 't1',
    title: 'Reactor Failure',
    summary: 'A prototype algae reactor explodes, killing five engineers.',
    timestamp: '2045-03-01T10:00:00Z',
    importance: 'major',
    location: 'Verdigris City',
  },
  {
    id: 't2',
    title: 'Collective Ultimatum',
    summary: 'The Azure Collective issues demands to the city council.',
    timestamp: '2045-03-05T12:00:00Z',
    importance: 'minor',
  },
]

const excerpts: ContextExcerpt[] = [
  {
    id: 'e1',
    label: 'Chapter 12 – Alley Confrontation',
    content: 'Mara presses Aster about the Collective tie-in. Rain-slick pavement mirrors flashing neon.',
    source: 'scene',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'e2',
    label: 'Outline Note – Act 3 Stakes',
    content: 'If reactor fails again, Verdigris faces total blackout. Need failsafe in final act.',
    source: 'note',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
  },
]

describe('Context Manager', () => {
  it('builds a bundle within token budget', () => {
    const bundle = buildContextBundle({
      tokenBudget: 200,
      project: {
        projectId: 'p1',
        title: 'Verdigris Murmurs',
        genre: 'Neo-noir Sci-Fi',
        pov: 'First-person',
      },
      storyBible: [...characters, ...locations],
      timeline,
      recentExcerpts: excerpts,
    })

    expect(bundle.project?.title).toBe('Verdigris Murmurs')
    expect(bundle.storyBible.length).toBeLessThanOrEqual(characters.length + locations.length)
    expect(bundle.timeline.length).toBeLessThanOrEqual(timeline.length)
    expect(bundle.recentExcerpts.length).toBeLessThanOrEqual(excerpts.length)
  })

  it('generates a context prompt respecting token limits', () => {
    const bundle = buildContextBundle({
      tokenBudget: 200,
      project: {
        projectId: 'p1',
        title: 'Verdigris Murmurs',
      },
      storyBible: [...characters, ...locations],
      timeline,
      recentExcerpts: excerpts,
    })

    const { prompt, usedTokens } = generateContextPrompt(bundle, {
      maxTokens: 180,
      reserveTokens: 40,
    })

    expect(prompt).toContain('PROJECT: Verdigris Murmurs')
    expect(prompt).toContain('STORY BIBLE')
    expect(usedTokens).toBeLessThanOrEqual(180)
  })

  it('provides a preview with grouped entities', () => {
    const bundle = buildContextBundle({
      storyBible: [...characters, ...locations],
      timeline,
      recentExcerpts: excerpts,
    })

    const preview = buildContextPreview(bundle, 2)

    expect(preview.topCharacters.length).toBeLessThanOrEqual(2)
    expect(preview.topLocations.length).toBeLessThanOrEqual(2)
    expect(preview.recentExcerpts[0].id).toBe('e1')
  })

  it('estimates tokens based on word count', () => {
    expect(estimateTokens('')).toBe(0)
    expect(estimateTokens('one two three')).toBeGreaterThan(2)
  })
})
