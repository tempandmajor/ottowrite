import { computeWordDiff, calculateDiffStats, type DiffStats } from '@/lib/utils/text-diff'
import type { DocumentSnapshot } from './snapshot-manager'

export type SnapshotDiffResult = {
  wordDiff: DiffStats
  metadata: {
    from: {
      timestamp: Date
      wordCount: number
      sceneCount: number
      hash: string
    }
    to: {
      timestamp: Date
      wordCount: number
      sceneCount: number
      hash: string
    }
    timeDelta: number // milliseconds
  }
  changes: {
    isIdentical: boolean
    hasContentChanges: boolean
    hasStructureChanges: boolean
    wordCountDelta: number
    sceneCountDelta: number
  }
}

/**
 * Compare two document snapshots and return detailed diff results
 */
export function compareSnapshots(from: DocumentSnapshot, to: DocumentSnapshot): SnapshotDiffResult {
  // Strip HTML for text comparison
  const fromText = stripHtmlForComparison(from.content.html ?? '')
  const toText = stripHtmlForComparison(to.content.html ?? '')

  // Compute word-level diff
  const wordDiff = calculateDiffStats(computeWordDiff(fromText, toText))

  // Check for structure changes
  const fromStructure = JSON.stringify(from.content.structure)
  const toStructure = JSON.stringify(to.content.structure)
  const hasStructureChanges = fromStructure !== toStructure

  // Calculate time delta
  const timeDelta = to.metadata.timestamp.getTime() - from.metadata.timestamp.getTime()

  return {
    wordDiff,
    metadata: {
      from: {
        timestamp: from.metadata.timestamp,
        wordCount: from.metadata.wordCount,
        sceneCount: from.metadata.sceneCount,
        hash: from.metadata.hash,
      },
      to: {
        timestamp: to.metadata.timestamp,
        wordCount: to.metadata.wordCount,
        sceneCount: to.metadata.sceneCount,
        hash: to.metadata.hash,
      },
      timeDelta,
    },
    changes: {
      isIdentical: from.metadata.hash === to.metadata.hash,
      hasContentChanges: wordDiff.totalChanges > 0,
      hasStructureChanges,
      wordCountDelta: to.metadata.wordCount - from.metadata.wordCount,
      sceneCountDelta: to.metadata.sceneCount - from.metadata.sceneCount,
    },
  }
}

/**
 * Get a summary of changes between snapshots
 */
export function getSnapshotChangeSummary(diff: SnapshotDiffResult): string {
  const { changes, wordDiff } = diff

  if (changes.isIdentical) {
    return 'No changes detected'
  }

  const parts: string[] = []

  if (wordDiff.additions > 0) {
    parts.push(`+${wordDiff.additions} words`)
  }
  if (wordDiff.deletions > 0) {
    parts.push(`-${wordDiff.deletions} words`)
  }

  if (changes.sceneCountDelta !== 0) {
    const prefix = changes.sceneCountDelta > 0 ? '+' : ''
    parts.push(`${prefix}${changes.sceneCountDelta} scenes`)
  }

  if (changes.hasStructureChanges) {
    parts.push('structure modified')
  }

  if (parts.length === 0) {
    return `${wordDiff.changePercentage.toFixed(1)}% changed`
  }

  return parts.join(', ')
}

/**
 * Calculate writing velocity between two snapshots (words per hour)
 */
export function calculateWritingVelocity(from: DocumentSnapshot, to: DocumentSnapshot): number {
  const wordsDelta = to.metadata.wordCount - from.metadata.wordCount
  const timeDelta = to.metadata.timestamp.getTime() - from.metadata.timestamp.getTime()

  if (timeDelta <= 0) {
    return 0
  }

  const hours = timeDelta / (1000 * 60 * 60)
  return wordsDelta / hours
}

/**
 * Get snapshot statistics for analytics
 */
export function getSnapshotStatistics(snapshots: DocumentSnapshot[]): {
  totalSnapshots: number
  timeRange: { from: Date; to: Date } | null
  totalWords: number
  averageWordCount: number
  totalScenes: number
  averageSceneCount: number
  growthRate: number // words per day
} {
  if (snapshots.length === 0) {
    return {
      totalSnapshots: 0,
      timeRange: null,
      totalWords: 0,
      averageWordCount: 0,
      totalScenes: 0,
      averageSceneCount: 0,
      growthRate: 0,
    }
  }

  // Sort by timestamp
  const sorted = [...snapshots].sort(
    (a, b) => a.metadata.timestamp.getTime() - b.metadata.timestamp.getTime()
  )

  const first = sorted[0]
  const last = sorted[sorted.length - 1]

  const totalWords = snapshots.reduce((sum, s) => sum + s.metadata.wordCount, 0)
  const totalScenes = snapshots.reduce((sum, s) => sum + s.metadata.sceneCount, 0)

  // Calculate growth rate (words per day)
  const timeDelta = last.metadata.timestamp.getTime() - first.metadata.timestamp.getTime()
  const days = timeDelta / (1000 * 60 * 60 * 24)
  const wordGrowth = last.metadata.wordCount - first.metadata.wordCount
  const growthRate = days > 0 ? wordGrowth / days : 0

  return {
    totalSnapshots: snapshots.length,
    timeRange: {
      from: first.metadata.timestamp,
      to: last.metadata.timestamp,
    },
    totalWords,
    averageWordCount: totalWords / snapshots.length,
    totalScenes,
    averageSceneCount: totalScenes / snapshots.length,
    growthRate,
  }
}

/**
 * Find snapshots with significant changes
 */
export function findSignificantSnapshots(
  snapshots: DocumentSnapshot[],
  threshold: number = 5 // percentage change
): Array<{ snapshot: DocumentSnapshot; changePercentage: number }> {
  if (snapshots.length < 2) {
    return []
  }

  const sorted = [...snapshots].sort(
    (a, b) => a.metadata.timestamp.getTime() - b.metadata.timestamp.getTime()
  )

  const significant: Array<{ snapshot: DocumentSnapshot; changePercentage: number }> = []

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    const curr = sorted[i]

    const diff = compareSnapshots(prev, curr)

    if (diff.wordDiff.changePercentage >= threshold) {
      significant.push({
        snapshot: curr,
        changePercentage: diff.wordDiff.changePercentage,
      })
    }
  }

  return significant
}

/**
 * Strip HTML for comparison (simple version)
 */
function stripHtmlForComparison(html: string): string {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
