import { describe, expect, it } from 'vitest'

import {
  mapSnapshotToContextExcerpt,
  normalizeExcerptSource,
  truncateSnapshotContent,
  mapWorldElementToStoryBibleEntry,
} from '@/app/api/ai/generate/route'

describe('AI generate route helpers', () => {
  it('maps document snapshot payloads into context excerpts', () => {
    const lookup = new Map<string, { title: string; type?: string | null }>([
      ['doc-1', { title: 'Chapter One', type: 'novel' }],
    ])
    const excerpt = mapSnapshotToContextExcerpt(
      {
        id: 'snap-1',
        document_id: 'doc-1',
        created_at: '2024-01-01T00:00:00Z',
        payload: {
          html: '<h1>Scene</h1><p>The rain hammered the city skyline.</p>',
        },
        metadata: {
          label: 'Cold Open',
          source: 'scene',
        },
      },
      lookup
    )

    expect(excerpt).toEqual({
      id: 'snap-1',
      label: 'Cold Open - Chapter One',
      content: 'Scene The rain hammered the city skyline.',
      source: 'scene',
      createdAt: '2024-01-01T00:00:00Z',
    })
  })

  it('falls back to document metadata when snapshot metadata missing', () => {
    const lookup = new Map<string, { title: string; type?: string | null }>([
      ['doc-2', { title: 'Episode 3', type: 'screenplay' }],
    ])
    const excerpt = mapSnapshotToContextExcerpt(
      {
        id: 'snap-2',
        document_id: 'doc-2',
        created_at: '2024-01-02T00:00:00Z',
        payload: {
          html: '<p>Interior. Warehouse - Night.</p>',
        },
        metadata: {},
      },
      lookup
    )

    expect(excerpt).toEqual({
      id: 'snap-2',
      label: 'Episode 3 excerpt',
      content: 'Interior. Warehouse - Night.',
      source: 'scene',
      createdAt: '2024-01-02T00:00:00Z',
    })
  })

  it('normalizes excerpt source values', () => {
    expect(normalizeExcerptSource('analysis')).toBe('analysis')
    expect(normalizeExcerptSource('unknown', 'novel')).toBe('chapter')
    expect(normalizeExcerptSource(undefined, 'screenplay')).toBe('scene')
    expect(normalizeExcerptSource(null, 'essay')).toBe('note')
  })

  it('truncates lengthy snapshot content with ellipsis', () => {
    const result = truncateSnapshotContent('x'.repeat(20), 10)
    expect(result).toBe('xxxxxxxxxx...')
  })

  it('maps world elements into story bible entries with inferred importance', () => {
    const entry = mapWorldElementToStoryBibleEntry({
      id: 'we-1',
      name: 'Azure Collective',
      type: 'faction',
      description: 'A shadow cabal steering the city council.',
      tags: ['Primary Threat'],
      updated_at: '2024-01-05T12:00:00Z',
    })

    expect(entry).toMatchObject({
      id: 'we-1',
      name: 'Azure Collective',
      entityType: 'faction',
      importance: 'main',
      summary: 'A shadow cabal steering the city council.',
      updatedAt: '2024-01-05T12:00:00Z',
      tags: ['Primary Threat'],
    })
  })
})
