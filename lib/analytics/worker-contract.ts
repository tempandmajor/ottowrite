/**
 * Analytics Worker Contract
 *
 * Defines the interface between analytics job producers and the worker edge function.
 * Jobs are queued in Supabase and processed asynchronously by edge functions.
 */

/**
 * Analytics job types
 */
export type AnalyticsJobType =
  | 'snapshot_analysis'      // Analyze a single snapshot
  | 'snapshot_comparison'    // Compare two snapshots
  | 'writing_velocity'       // Calculate writing speed over time
  | 'structure_analysis'     // Analyze document structure and patterns
  | 'session_summary'        // Summarize a writing session
  | 'daily_summary'          // Daily writing analytics
  | 'weekly_summary'         // Weekly writing analytics

/**
 * Job priority levels
 */
export enum JobPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  URGENT = 3,
}

/**
 * Job status
 */
export enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * Base analytics job input
 */
export type AnalyticsJobInput = {
  jobType: AnalyticsJobType
  documentId: string
  userId: string
  priority?: JobPriority
  metadata?: Record<string, unknown>
} & (
  | { jobType: 'snapshot_analysis'; snapshotId: string }
  | { jobType: 'snapshot_comparison'; fromSnapshotId: string; toSnapshotId: string }
  | { jobType: 'writing_velocity'; startTime: string; endTime: string }
  | { jobType: 'structure_analysis'; snapshotId: string }
  | { jobType: 'session_summary'; sessionId: string; snapshotIds: string[] }
  | { jobType: 'daily_summary'; date: string }
  | { jobType: 'weekly_summary'; startDate: string; endDate: string }
)

/**
 * Snapshot analysis metrics
 */
export type SnapshotAnalysisMetrics = {
  wordCount: number
  characterCount: number
  paragraphCount: number
  sentenceCount: number
  averageWordsPerSentence: number
  averageWordsPerParagraph: number
  readabilityScore: number // Flesch reading ease
  readingTimeMinutes: number

  // Structure metrics
  sceneCount: number
  chapterCount: number
  averageSceneLength: number

  // Writing patterns
  dialoguePercentage: number
  actionPercentage: number
  descriptionPercentage: number

  // Vocabulary
  uniqueWords: number
  vocabularyRichness: number // unique words / total words
  topWords: Array<{ word: string; count: number }>

  // Timestamps
  analyzedAt: string
}

/**
 * Snapshot comparison metrics
 */
export type SnapshotComparisonMetrics = {
  // Changes
  wordsAdded: number
  wordsRemoved: number
  wordsChanged: number
  netWordChange: number

  // Structure changes
  scenesAdded: number
  scenesRemoved: number
  scenesModified: number

  // Time-based
  timeBetweenSnapshots: number // milliseconds
  writingVelocity: number // words per hour

  // Content analysis
  majorRevisions: number // significant structural changes
  minorEdits: number // small text changes

  // Comparison metadata
  fromTimestamp: string
  toTimestamp: string
  analyzedAt: string
}

/**
 * Writing velocity metrics
 */
export type WritingVelocityMetrics = {
  totalWordsWritten: number
  totalTimeMinutes: number
  averageWordsPerHour: number
  peakWordsPerHour: number

  // Session breakdown
  sessions: Array<{
    startTime: string
    endTime: string
    wordsWritten: number
    wordsPerHour: number
  }>

  // Patterns
  mostProductiveHourOfDay: number
  leastProductiveHourOfDay: number
  averageSessionLength: number

  analyzedAt: string
}

/**
 * Structure analysis metrics
 */
export type StructureAnalysisMetrics = {
  // Overall structure
  totalScenes: number
  totalChapters: number
  averageScenesPerChapter: number

  // Scene analysis
  scenes: Array<{
    id: string
    wordCount: number
    position: number
    hasDialogue: boolean
    hasAction: boolean
    hasDescription: boolean
  }>

  // Chapter analysis
  chapters: Array<{
    id: string
    sceneCount: number
    wordCount: number
    position: number
  }>

  // Pacing
  pacingScore: number // 0-100, based on scene length variance
  structureBalance: number // 0-100, how well balanced the structure is

  analyzedAt: string
}

/**
 * Session summary metrics
 */
export type SessionSummaryMetrics = {
  sessionId: string
  startTime: string
  endTime: string
  durationMinutes: number

  // Writing metrics
  totalWordsWritten: number
  wordsPerHour: number
  snapshotsCreated: number

  // Changes
  scenesAdded: number
  scenesModified: number
  scenesDeleted: number

  // Session characterization
  sessionType: 'creation' | 'revision' | 'mixed'
  focusAreas: string[] // e.g., ['dialogue', 'action', 'chapter-3']

  analyzedAt: string
}

/**
 * Daily summary metrics
 */
export type DailySummaryMetrics = {
  date: string
  totalWordsWritten: number
  totalTimeMinutes: number
  sessionsCount: number
  averageWordsPerHour: number

  // Goal tracking
  dailyGoalWords?: number
  goalProgress?: number // percentage

  // Highlights
  longestSession: number // minutes
  mostProductiveSession: number // words

  analyzedAt: string
}

/**
 * Weekly summary metrics
 */
export type WeeklySummaryMetrics = {
  startDate: string
  endDate: string
  totalWordsWritten: number
  totalTimeMinutes: number
  daysActive: number
  sessionsCount: number
  averageWordsPerDay: number

  // Daily breakdown
  dailyMetrics: Array<{
    date: string
    wordsWritten: number
    timeMinutes: number
  }>

  // Trends
  writingStreak: number // consecutive days
  mostProductiveDay: string

  analyzedAt: string
}

/**
 * Analytics job output (union of all possible metrics)
 */
export type AnalyticsJobOutput = {
  jobType: AnalyticsJobType
  success: boolean
  error?: string
  metrics?:
    | SnapshotAnalysisMetrics
    | SnapshotComparisonMetrics
    | WritingVelocityMetrics
    | StructureAnalysisMetrics
    | SessionSummaryMetrics
    | DailySummaryMetrics
    | WeeklySummaryMetrics
  processingTime: number // milliseconds
  completedAt: string
}

/**
 * Analytics job record (stored in database)
 */
export type AnalyticsJob = {
  id: string
  userId: string
  documentId: string
  jobType: AnalyticsJobType
  status: JobStatus
  priority: JobPriority

  // Job data
  input: AnalyticsJobInput
  output: AnalyticsJobOutput | null

  // Metadata
  attempts: number
  maxAttempts: number
  error: string | null

  // Timestamps
  createdAt: string
  scheduledFor: string | null
  startedAt: string | null
  completedAt: string | null
  updatedAt: string
}

/**
 * Queue configuration
 */
export const QUEUE_CONFIG = {
  maxAttempts: 3,
  retryDelayMs: 5000,
  jobTimeoutMs: 60000, // 1 minute
  batchSize: 10,
  pollIntervalMs: 5000,
} as const

/**
 * Worker contract interface
 */
export interface AnalyticsWorker {
  /**
   * Process an analytics job
   */
  process(job: AnalyticsJob): Promise<AnalyticsJobOutput>

  /**
   * Validate job input
   */
  validate(input: AnalyticsJobInput): boolean

  /**
   * Estimate processing time
   */
  estimateTime(jobType: AnalyticsJobType): number
}
