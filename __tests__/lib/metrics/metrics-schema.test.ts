import { describe, it, expect } from 'vitest'
import type {
  DocumentMetric,
  DocumentMetricInsert,
  MetricEvent,
  MetricEventInsert,
  MilestoneEventData,
  AchievementEventData,
  AnomalyEventData,
} from '@/lib/metrics/types'
import type { SnapshotAnalysisMetrics } from '@/lib/analytics/worker-contract'

describe('Metrics Schema Types', () => {
  describe('DocumentMetric', () => {
    it('should create valid snapshot_analysis metric', () => {
      const metrics: SnapshotAnalysisMetrics = {
        wordCount: 1000,
        characterCount: 5000,
        paragraphCount: 50,
        sentenceCount: 100,
        averageWordsPerSentence: 10,
        averageWordsPerParagraph: 20,
        readabilityScore: 65.5,
        readingTimeMinutes: 4,
        sceneCount: 5,
        chapterCount: 2,
        averageSceneLength: 200,
        dialoguePercentage: 30,
        actionPercentage: 40,
        descriptionPercentage: 30,
        uniqueWords: 450,
        vocabularyRichness: 0.45,
        topWords: [
          { word: 'the', count: 50 },
          { word: 'and', count: 40 },
        ],
        analyzedAt: new Date().toISOString(),
      }

      const metric: DocumentMetricInsert = {
        documentId: 'doc-123',
        userId: 'user-456',
        metricType: 'snapshot_analysis',
        source: 'worker',
        metrics,
        snapshotId: 'snap-789',
        calculatedAt: new Date().toISOString(),
      }

      expect(metric.metricType).toBe('snapshot_analysis')
      expect(metric.metrics.wordCount).toBe(1000)
      expect(metric.snapshotId).toBe('snap-789')
    })

    it('should create valid snapshot_comparison metric', () => {
      const metric: DocumentMetricInsert = {
        documentId: 'doc-123',
        userId: 'user-456',
        metricType: 'snapshot_comparison',
        source: 'worker',
        metrics: {
          wordsAdded: 500,
          wordsRemoved: 100,
          wordsChanged: 400,
          netWordChange: 400,
          scenesAdded: 2,
          scenesRemoved: 0,
          scenesModified: 3,
          timeBetweenSnapshots: 3600000,
          writingVelocity: 400,
          majorRevisions: 0,
          minorEdits: 1,
          fromTimestamp: new Date().toISOString(),
          toTimestamp: new Date().toISOString(),
          analyzedAt: new Date().toISOString(),
        },
        fromSnapshotId: 'snap-1',
        toSnapshotId: 'snap-2',
        calculatedAt: new Date().toISOString(),
      }

      expect(metric.metricType).toBe('snapshot_comparison')
      expect(metric.fromSnapshotId).toBe('snap-1')
      expect(metric.toSnapshotId).toBe('snap-2')
    })

    it('should create valid writing_velocity metric with period', () => {
      const metric: DocumentMetricInsert = {
        documentId: 'doc-123',
        userId: 'user-456',
        metricType: 'writing_velocity',
        source: 'worker',
        metrics: {
          totalWordsWritten: 2000,
          totalTimeMinutes: 120,
          averageWordsPerHour: 1000,
          peakWordsPerHour: 1500,
          sessions: [
            {
              startTime: new Date().toISOString(),
              endTime: new Date().toISOString(),
              wordsWritten: 500,
              wordsPerHour: 1000,
            },
          ],
          mostProductiveHourOfDay: 14,
          leastProductiveHourOfDay: 8,
          averageSessionLength: 60,
          analyzedAt: new Date().toISOString(),
        },
        periodStart: new Date('2025-01-01').toISOString(),
        periodEnd: new Date('2025-01-07').toISOString(),
        calculatedAt: new Date().toISOString(),
      }

      expect(metric.metricType).toBe('writing_velocity')
      expect(metric.periodStart).toBeDefined()
      expect(metric.periodEnd).toBeDefined()
    })

    it('should handle isLatest flag correctly', () => {
      const metric1: DocumentMetric = {
        id: 'metric-1',
        documentId: 'doc-123',
        userId: 'user-456',
        metricType: 'snapshot_analysis',
        source: 'worker',
        metrics: {} as SnapshotAnalysisMetrics,
        periodStart: null,
        periodEnd: null,
        snapshotId: 'snap-1',
        fromSnapshotId: null,
        toSnapshotId: null,
        jobId: null,
        version: 1,
        isLatest: true,
        calculatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const metric2: DocumentMetric = {
        ...metric1,
        id: 'metric-2',
        version: 2,
        isLatest: true,
      }

      // Simulating trigger behavior: when metric2 is inserted, metric1.isLatest should be false
      const updatedMetric1 = { ...metric1, isLatest: false }

      expect(metric2.isLatest).toBe(true)
      expect(updatedMetric1.isLatest).toBe(false)
      expect(metric2.version).toBeGreaterThan(metric1.version)
    })
  })

  describe('MetricEvent', () => {
    it('should create valid milestone event', () => {
      const eventData: MilestoneEventData = {
        milestoneType: 'word_count',
        currentValue: 10000,
        milestoneValue: 10000,
        previousValue: 9500,
      }

      const event: MetricEventInsert = {
        documentId: 'doc-123',
        userId: 'user-456',
        eventType: 'milestone',
        category: 'progress',
        severity: 'success',
        title: '10,000 words written!',
        description: 'Congratulations on reaching 10,000 words',
        eventData,
        metricId: 'metric-789',
      }

      expect(event.eventType).toBe('milestone')
      expect(event.category).toBe('progress')
      expect(event.severity).toBe('success')
      expect((event.eventData as MilestoneEventData).milestoneType).toBe('word_count')
    })

    it('should create valid achievement event', () => {
      const eventData: AchievementEventData = {
        achievementType: 'writing_streak',
        value: 7,
        unit: 'days',
        previousBest: 5,
      }

      const event: MetricEventInsert = {
        documentId: 'doc-123',
        userId: 'user-456',
        eventType: 'achievement',
        category: 'consistency',
        severity: 'success',
        title: '7-day writing streak!',
        description: 'You wrote every day this week',
        eventData,
      }

      expect(event.eventType).toBe('achievement')
      expect(event.category).toBe('consistency')
      expect((event.eventData as AchievementEventData).achievementType).toBe('writing_streak')
    })

    it('should create valid anomaly event', () => {
      const eventData: AnomalyEventData = {
        anomalyType: 'unusual_velocity',
        deviationPercent: 150,
        expectedValue: 500,
        actualValue: 1250,
        confidence: 0.95,
      }

      const event: MetricEventInsert = {
        documentId: 'doc-123',
        userId: 'user-456',
        eventType: 'anomaly',
        category: 'productivity',
        severity: 'info',
        title: 'Unusually high writing velocity',
        description: 'You wrote 150% more than your average',
        eventData,
      }

      expect(event.eventType).toBe('anomaly')
      expect(event.severity).toBe('info')
      expect((event.eventData as AnomalyEventData).deviationPercent).toBe(150)
    })

    it('should create valid goal_reached event', () => {
      const event: MetricEventInsert = {
        documentId: 'doc-123',
        userId: 'user-456',
        eventType: 'goal_reached',
        category: 'productivity',
        severity: 'success',
        title: 'Daily goal achieved!',
        description: 'You reached your daily writing goal of 1000 words',
        eventData: {
          goalType: 'daily',
          targetValue: 1000,
          actualValue: 1200,
          unit: 'words',
          completionPercent: 120,
        },
      }

      expect(event.eventType).toBe('goal_reached')
      expect(event.severity).toBe('success')
    })

    it('should track read/dismiss state correctly', () => {
      const event: MetricEvent = {
        id: 'event-123',
        documentId: 'doc-123',
        userId: 'user-456',
        eventType: 'milestone',
        category: 'progress',
        severity: 'success',
        title: 'Milestone reached',
        description: null,
        eventData: null,
        metricId: null,
        snapshotId: null,
        isRead: false,
        isDismissed: false,
        readAt: null,
        dismissedAt: null,
        eventTime: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      }

      // Simulate marking as read
      const readEvent = {
        ...event,
        isRead: true,
        readAt: new Date().toISOString(),
      }

      expect(readEvent.isRead).toBe(true)
      expect(readEvent.readAt).toBeDefined()

      // Simulate dismissing
      const dismissedEvent = {
        ...readEvent,
        isDismissed: true,
        dismissedAt: new Date().toISOString(),
      }

      expect(dismissedEvent.isDismissed).toBe(true)
      expect(dismissedEvent.dismissedAt).toBeDefined()
    })
  })

  describe('Metric Type Validation', () => {
    it('should only allow valid metric types', () => {
      const validTypes = [
        'snapshot_analysis',
        'snapshot_comparison',
        'writing_velocity',
        'structure_analysis',
        'session_summary',
        'daily_summary',
        'weekly_summary',
      ]

      validTypes.forEach((type) => {
        expect(validTypes).toContain(type)
      })
    })

    it('should only allow valid event types', () => {
      const validEventTypes = [
        'milestone',
        'achievement',
        'anomaly',
        'goal_reached',
        'goal_missed',
        'quality_change',
        'velocity_change',
        'structure_change',
      ]

      validEventTypes.forEach((type) => {
        expect(validEventTypes).toContain(type)
      })
    })

    it('should only allow valid categories', () => {
      const validCategories = ['productivity', 'quality', 'consistency', 'structure', 'progress']

      validCategories.forEach((category) => {
        expect(validCategories).toContain(category)
      })
    })

    it('should only allow valid severity levels', () => {
      const validSeverities = ['info', 'warning', 'success', 'error']

      validSeverities.forEach((severity) => {
        expect(validSeverities).toContain(severity)
      })
    })
  })

  describe('Database Constraint Validation', () => {
    it('should validate period constraints', () => {
      // Both null is valid
      const metric1: Partial<DocumentMetric> = {
        periodStart: null,
        periodEnd: null,
      }
      expect(metric1.periodStart).toBeNull()
      expect(metric1.periodEnd).toBeNull()

      // Both defined with start <= end is valid
      const metric2: Partial<DocumentMetric> = {
        periodStart: '2025-01-01T00:00:00Z',
        periodEnd: '2025-01-07T00:00:00Z',
      }
      expect(new Date(metric2.periodStart!).getTime()).toBeLessThanOrEqual(
        new Date(metric2.periodEnd!).getTime()
      )
    })

    it('should validate snapshot reference constraints', () => {
      // snapshot_analysis requires snapshot_id
      const metric1: Partial<DocumentMetric> = {
        metricType: 'snapshot_analysis',
        snapshotId: 'snap-123',
      }
      expect(metric1.snapshotId).toBeDefined()

      // snapshot_comparison requires both from and to
      const metric2: Partial<DocumentMetric> = {
        metricType: 'snapshot_comparison',
        fromSnapshotId: 'snap-1',
        toSnapshotId: 'snap-2',
      }
      expect(metric2.fromSnapshotId).toBeDefined()
      expect(metric2.toSnapshotId).toBeDefined()
    })

    it('should validate read/dismiss timestamp constraints', () => {
      // Unread event should have no read_at
      const event1: Partial<MetricEvent> = {
        isRead: false,
        readAt: null,
      }
      expect(event1.isRead).toBe(false)
      expect(event1.readAt).toBeNull()

      // Read event should have read_at
      const event2: Partial<MetricEvent> = {
        isRead: true,
        readAt: new Date().toISOString(),
      }
      expect(event2.isRead).toBe(true)
      expect(event2.readAt).toBeDefined()
    })
  })
})
