/**
 * TypeScript types for metrics schema
 *
 * Corresponds to document_metrics and metric_events tables in Supabase
 */

import type {
  SnapshotAnalysisMetrics,
  SnapshotComparisonMetrics,
  WritingVelocityMetrics,
  StructureAnalysisMetrics,
  SessionSummaryMetrics,
  DailySummaryMetrics,
  WeeklySummaryMetrics,
} from '@/lib/analytics/worker-contract'

/**
 * Metric types
 */
export type MetricType =
  | 'snapshot_analysis'
  | 'snapshot_comparison'
  | 'writing_velocity'
  | 'structure_analysis'
  | 'session_summary'
  | 'daily_summary'
  | 'weekly_summary'

/**
 * Metric source
 */
export type MetricSource = 'worker' | 'manual' | 'scheduled'

/**
 * Union of all metric data types
 */
export type MetricData =
  | SnapshotAnalysisMetrics
  | SnapshotComparisonMetrics
  | WritingVelocityMetrics
  | StructureAnalysisMetrics
  | SessionSummaryMetrics
  | DailySummaryMetrics
  | WeeklySummaryMetrics

/**
 * Document metric record
 */
export type DocumentMetric = {
  id: string
  documentId: string
  userId: string
  metricType: MetricType
  source: MetricSource
  metrics: MetricData
  periodStart: string | null
  periodEnd: string | null
  snapshotId: string | null
  fromSnapshotId: string | null
  toSnapshotId: string | null
  jobId: string | null
  version: number
  isLatest: boolean
  calculatedAt: string
  createdAt: string
  updatedAt: string
}

/**
 * Document metric insert
 */
export type DocumentMetricInsert = {
  documentId: string
  userId: string
  metricType: MetricType
  source: MetricSource
  metrics: MetricData
  periodStart?: string
  periodEnd?: string
  snapshotId?: string
  fromSnapshotId?: string
  toSnapshotId?: string
  jobId?: string
  calculatedAt: string
}

/**
 * Metric event types
 */
export type MetricEventType =
  | 'milestone'
  | 'achievement'
  | 'anomaly'
  | 'goal_reached'
  | 'goal_missed'
  | 'quality_change'
  | 'velocity_change'
  | 'structure_change'

/**
 * Event category
 */
export type EventCategory = 'productivity' | 'quality' | 'consistency' | 'structure' | 'progress'

/**
 * Event severity
 */
export type EventSeverity = 'info' | 'warning' | 'success' | 'error'

/**
 * Metric event record
 */
export type MetricEvent = {
  id: string
  documentId: string
  userId: string
  eventType: MetricEventType
  category: EventCategory
  severity: EventSeverity
  title: string
  description: string | null
  eventData: Record<string, unknown> | null
  metricId: string | null
  snapshotId: string | null
  isRead: boolean
  isDismissed: boolean
  readAt: string | null
  dismissedAt: string | null
  eventTime: string
  createdAt: string
}

/**
 * Metric event insert
 */
export type MetricEventInsert = {
  documentId: string
  userId: string
  eventType: MetricEventType
  category: EventCategory
  severity?: EventSeverity
  title: string
  description?: string
  eventData?: Record<string, unknown>
  metricId?: string
  snapshotId?: string
}

/**
 * Milestone event data
 */
export type MilestoneEventData = {
  milestoneType: 'word_count' | 'chapter_complete' | 'scene_complete' | 'goal_streak'
  currentValue: number
  milestoneValue: number
  previousValue?: number
}

/**
 * Achievement event data
 */
export type AchievementEventData = {
  achievementType: 'writing_streak' | 'productivity_record' | 'quality_threshold' | 'consistency'
  value: number
  unit: string
  previousBest?: number
}

/**
 * Anomaly event data
 */
export type AnomalyEventData = {
  anomalyType: 'unusual_velocity' | 'quality_drop' | 'structure_disruption' | 'inconsistent_pattern'
  deviationPercent: number
  expectedValue: number
  actualValue: number
  confidence: number
}

/**
 * Goal event data
 */
export type GoalEventData = {
  goalType: 'daily' | 'weekly' | 'monthly' | 'custom'
  targetValue: number
  actualValue: number
  unit: string
  completionPercent: number
}

/**
 * Quality change event data
 */
export type QualityChangeEventData = {
  metricName: string
  previousValue: number
  currentValue: number
  changePercent: number
  direction: 'improved' | 'declined'
}

/**
 * Velocity change event data
 */
export type VelocityChangeEventData = {
  previousWordsPerHour: number
  currentWordsPerHour: number
  changePercent: number
  direction: 'increased' | 'decreased'
  periodDays: number
}

/**
 * Structure change event data
 */
export type StructureChangeEventData = {
  changeType: 'chapters_added' | 'scenes_reorganized' | 'major_revision'
  chaptersAffected: number
  scenesAffected: number
  description: string
}

/**
 * Database function return types
 */
export type GetLatestMetricsParams = {
  documentId: string
  metricType?: MetricType
}

export type GetMetricsForPeriodParams = {
  documentId: string
  startTime: string
  endTime: string
  metricTypes?: MetricType[]
}

export type GetMetricHistoryParams = {
  documentId: string
  metricType: MetricType
  limit?: number
  offset?: number
}

export type StoreMetricFromJobParams = {
  jobId: string
  metricType: MetricType
  metrics: MetricData
  snapshotId?: string
  fromSnapshotId?: string
  toSnapshotId?: string
}

export type CreateMetricEventParams = {
  documentId: string
  userId: string
  eventType: MetricEventType
  category: EventCategory
  title: string
  description?: string
  eventData?: Record<string, unknown>
  metricId?: string
  severity?: EventSeverity
}
