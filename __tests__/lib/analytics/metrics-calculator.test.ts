import { describe, it, expect } from 'vitest'
import {
  analyzeSnapshot,
  compareSnapshots,
  calculateWritingVelocity,
  analyzeStructure,
} from '@/lib/analytics/metrics-calculator'
import type { DocumentSnapshot } from '@/lib/snapshots/snapshot-manager'

describe('Analytics Metrics Calculator', () => {
  const createTestSnapshot = (
    id: string,
    wordCount: number,
    html: string = '',
    timestamp: string = new Date().toISOString()
  ): DocumentSnapshot => ({
    metadata: {
      id,
      timestamp,
      hash: `hash-${id}`,
      source: 'manual',
      wordCount,
      sceneCount: 3,
    },
    content: {
      html: html || `<p>${'word '.repeat(wordCount)}</p>`,
      structure: [
        { id: 'ch1', title: 'Chapter 1', scenes: [], wordCount: Math.floor(wordCount / 2) },
        { id: 'ch2', title: 'Chapter 2', scenes: [], wordCount: Math.floor(wordCount / 2) },
      ],
      sceneAnchors: [
        { id: 'scene1', chapterId: 'ch1' },
        { id: 'scene2', chapterId: 'ch1' },
        { id: 'scene3', chapterId: 'ch2' },
      ],
    },
  })

  describe('analyzeSnapshot', () => {
    it('should calculate basic word and character counts', () => {
      const snapshot = createTestSnapshot('snap1', 100)
      const metrics = analyzeSnapshot(snapshot)

      expect(metrics.wordCount).toBeGreaterThan(0)
      expect(metrics.characterCount).toBeGreaterThan(0)
      expect(metrics.sceneCount).toBe(3)
    })

    it('should calculate sentence and paragraph counts', () => {
      const html = '<p>First sentence. Second sentence.</p><p>Third sentence!</p>'
      const snapshot = createTestSnapshot('snap1', 6, html)
      const metrics = analyzeSnapshot(snapshot)

      expect(metrics.sentenceCount).toBeGreaterThan(0)
      expect(metrics.paragraphCount).toBeGreaterThan(0)
    })

    it('should calculate averages correctly', () => {
      const snapshot = createTestSnapshot('snap1', 100)
      const metrics = analyzeSnapshot(snapshot)

      expect(metrics.averageWordsPerSentence).toBeGreaterThanOrEqual(0)
      expect(metrics.averageWordsPerParagraph).toBeGreaterThanOrEqual(0)
      expect(metrics.averageSceneLength).toBeGreaterThanOrEqual(0)
    })

    it('should calculate readability score', () => {
      const snapshot = createTestSnapshot('snap1', 100)
      const metrics = analyzeSnapshot(snapshot)

      expect(metrics.readabilityScore).toBeGreaterThanOrEqual(0)
      expect(metrics.readabilityScore).toBeLessThanOrEqual(100)
    })

    it('should calculate reading time', () => {
      const snapshot = createTestSnapshot('snap1', 250) // 250 words = 1 minute at 250 wpm
      const metrics = analyzeSnapshot(snapshot)

      expect(metrics.readingTimeMinutes).toBeCloseTo(1, 1)
    })

    it('should identify unique words and vocabulary richness', () => {
      const html = '<p>word word word different unique</p>'
      const snapshot = createTestSnapshot('snap1', 5, html)
      const metrics = analyzeSnapshot(snapshot)

      expect(metrics.uniqueWords).toBeGreaterThan(0)
      expect(metrics.vocabularyRichness).toBeGreaterThan(0)
      expect(metrics.vocabularyRichness).toBeLessThanOrEqual(1)
    })

    it('should return top words', () => {
      const snapshot = createTestSnapshot('snap1', 100)
      const metrics = analyzeSnapshot(snapshot)

      expect(Array.isArray(metrics.topWords)).toBe(true)
      expect(metrics.topWords.length).toBeGreaterThan(0)
      metrics.topWords.forEach((item) => {
        expect(item).toHaveProperty('word')
        expect(item).toHaveProperty('count')
      })
    })
  })

  describe('compareSnapshots', () => {
    it('should detect word additions', () => {
      const from = createTestSnapshot('snap1', 100)
      const to = createTestSnapshot('snap2', 150)

      const metrics = compareSnapshots(from, to)

      expect(metrics.netWordChange).toBeGreaterThan(0)
      expect(metrics.wordsAdded).toBeGreaterThan(0)
    })

    it('should detect word removals', () => {
      const from = createTestSnapshot('snap1', 150)
      const to = createTestSnapshot('snap2', 100)

      const metrics = compareSnapshots(from, to)

      expect(metrics.netWordChange).toBeLessThan(0)
      expect(metrics.wordsRemoved).toBeGreaterThan(0)
    })

    it('should calculate time between snapshots', () => {
      const now = new Date()
      const earlier = new Date(now.getTime() - 60 * 60 * 1000) // 1 hour ago

      const from = createTestSnapshot('snap1', 100, '', earlier.toISOString())
      const to = createTestSnapshot('snap2', 150, '', now.toISOString())

      const metrics = compareSnapshots(from, to)

      expect(metrics.timeBetweenSnapshots).toBeGreaterThan(0)
      expect(metrics.writingVelocity).toBeGreaterThan(0)
    })

    it('should detect scene changes', () => {
      const from = createTestSnapshot('snap1', 100)
      const to = { ...createTestSnapshot('snap2', 150), metadata: { ...createTestSnapshot('snap2', 150).metadata, sceneCount: 5 } }

      const metrics = compareSnapshots(from, to)

      expect(metrics.scenesAdded).toBe(2)
      expect(metrics.scenesRemoved).toBe(0)
    })

    it('should handle identical snapshots', () => {
      const from = createTestSnapshot('snap1', 100)
      const to = createTestSnapshot('snap2', 100)

      const metrics = compareSnapshots(from, to)

      expect(metrics.netWordChange).toBe(0)
    })
  })

  describe('calculateWritingVelocity', () => {
    it('should calculate total words written', () => {
      const snapshots = [
        createTestSnapshot('snap1', 100, '', new Date('2025-01-01T10:00:00Z').toISOString()),
        createTestSnapshot('snap2', 150, '', new Date('2025-01-01T11:00:00Z').toISOString()),
        createTestSnapshot('snap3', 200, '', new Date('2025-01-01T12:00:00Z').toISOString()),
      ]

      const metrics = calculateWritingVelocity(
        snapshots,
        new Date('2025-01-01T10:00:00Z'),
        new Date('2025-01-01T12:00:00Z')
      )

      expect(metrics.totalWordsWritten).toBe(100) // 50 + 50
      expect(metrics.sessions.length).toBe(2)
    })

    it('should calculate average words per hour', () => {
      const snapshots = [
        createTestSnapshot('snap1', 100, '', new Date('2025-01-01T10:00:00Z').toISOString()),
        createTestSnapshot('snap2', 200, '', new Date('2025-01-01T11:00:00Z').toISOString()),
      ]

      const metrics = calculateWritingVelocity(
        snapshots,
        new Date('2025-01-01T10:00:00Z'),
        new Date('2025-01-01T11:00:00Z')
      )

      expect(metrics.averageWordsPerHour).toBeGreaterThan(0)
      expect(metrics.peakWordsPerHour).toBeGreaterThan(0)
    })

    it('should identify most/least productive hours', () => {
      const snapshots = [
        createTestSnapshot('snap1', 100, '', new Date('2025-01-01T10:00:00Z').toISOString()),
        createTestSnapshot('snap2', 150, '', new Date('2025-01-01T11:00:00Z').toISOString()),
      ]

      const metrics = calculateWritingVelocity(
        snapshots,
        new Date('2025-01-01T10:00:00Z'),
        new Date('2025-01-01T11:00:00Z')
      )

      expect(metrics.mostProductiveHourOfDay).toBeGreaterThanOrEqual(0)
      expect(metrics.mostProductiveHourOfDay).toBeLessThan(24)
    })
  })

  describe('analyzeStructure', () => {
    it('should count scenes and chapters', () => {
      const snapshot = createTestSnapshot('snap1', 1000)
      const metrics = analyzeStructure(snapshot)

      expect(metrics.totalScenes).toBe(3)
      expect(metrics.totalChapters).toBe(2)
      expect(metrics.averageScenesPerChapter).toBe(1.5)
    })

    it('should provide scene and chapter details', () => {
      const snapshot = createTestSnapshot('snap1', 1000)
      const metrics = analyzeStructure(snapshot)

      expect(Array.isArray(metrics.scenes)).toBe(true)
      expect(Array.isArray(metrics.chapters)).toBe(true)
      expect(metrics.chapters.length).toBe(2)
    })

    it('should calculate pacing and structure balance scores', () => {
      const snapshot = createTestSnapshot('snap1', 1000)
      const metrics = analyzeStructure(snapshot)

      expect(metrics.pacingScore).toBeGreaterThanOrEqual(0)
      expect(metrics.pacingScore).toBeLessThanOrEqual(100)
      expect(metrics.structureBalance).toBeGreaterThanOrEqual(0)
      expect(metrics.structureBalance).toBeLessThanOrEqual(100)
    })

    it('should handle empty structure', () => {
      const snapshot = { ...createTestSnapshot('snap1', 100), content: { html: '<p>test</p>' } }
      const metrics = analyzeStructure(snapshot)

      expect(metrics.totalScenes).toBe(0)
      expect(metrics.totalChapters).toBe(0)
    })
  })
})
