import { computeClientContentHash, type ClientContentSnapshot } from '@/lib/client-content-hash'

export type SnapshotMetadata = {
  id: string
  timestamp: Date
  source: 'manual' | 'autosave' | 'preview' | 'analytics' | 'export'
  label?: string
  hash: string
  wordCount: number
  sceneCount: number
}

export type DocumentSnapshot = {
  metadata: SnapshotMetadata
  content: ClientContentSnapshot
  sceneAnchors: string[]
}

export type SnapshotComparison = {
  from: SnapshotMetadata
  to: SnapshotMetadata
  changes: {
    wordCountDelta: number
    sceneCountDelta: number
    contentChanged: boolean
    structureChanged: boolean
  }
}

/**
 * Manager for creating and managing document snapshots
 */
export class SnapshotManager {
  private snapshots: Map<string, DocumentSnapshot> = new Map()
  private maxSnapshots: number
  private currentSnapshotId: string | null = null

  constructor(maxSnapshots: number = 50) {
    this.maxSnapshots = maxSnapshots
  }

  /**
   * Create a manual snapshot of the current document state
   */
  async createSnapshot(
    content: ClientContentSnapshot,
    sceneAnchors: string[],
    options: {
      source?: SnapshotMetadata['source']
      label?: string
      wordCount?: number
    } = {}
  ): Promise<DocumentSnapshot> {
    const {
      source = 'manual',
      label,
      wordCount = 0,
    } = options

    // Compute hash for the snapshot
    const hash = await computeClientContentHash({
      html: content.html,
      structure: content.structure,
      anchorIds: sceneAnchors,
    })

    // Count scenes from structure
    const sceneCount = Array.isArray(content.structure)
      ? content.structure.reduce((total, chapter) => {
          return total + (chapter.scenes?.length ?? 0)
        }, 0)
      : 0

    const metadata: SnapshotMetadata = {
      id: this.generateSnapshotId(),
      timestamp: new Date(),
      source,
      label,
      hash,
      wordCount,
      sceneCount,
    }

    const snapshot: DocumentSnapshot = {
      metadata,
      content: {
        html: content.html,
        structure: content.structure ? JSON.parse(JSON.stringify(content.structure)) : undefined,
      },
      sceneAnchors: [...sceneAnchors],
    }

    // Store snapshot
    this.snapshots.set(metadata.id, snapshot)
    this.currentSnapshotId = metadata.id

    // Enforce max snapshots limit
    this.enforceSnapshotLimit()

    return snapshot
  }

  /**
   * Get a snapshot by ID
   */
  getSnapshot(id: string): DocumentSnapshot | null {
    return this.snapshots.get(id) ?? null
  }

  /**
   * Get the current snapshot
   */
  getCurrentSnapshot(): DocumentSnapshot | null {
    if (!this.currentSnapshotId) {
      return null
    }
    return this.getSnapshot(this.currentSnapshotId)
  }

  /**
   * Get all snapshots, sorted by timestamp (newest first)
   */
  getAllSnapshots(): DocumentSnapshot[] {
    return Array.from(this.snapshots.values()).sort(
      (a, b) => b.metadata.timestamp.getTime() - a.metadata.timestamp.getTime()
    )
  }

  /**
   * Get snapshots filtered by source
   */
  getSnapshotsBySource(source: SnapshotMetadata['source']): DocumentSnapshot[] {
    return this.getAllSnapshots().filter((s) => s.metadata.source === source)
  }

  /**
   * Compare two snapshots
   */
  compareSnapshots(fromId: string, toId: string): SnapshotComparison | null {
    const fromSnapshot = this.getSnapshot(fromId)
    const toSnapshot = this.getSnapshot(toId)

    if (!fromSnapshot || !toSnapshot) {
      return null
    }

    return {
      from: fromSnapshot.metadata,
      to: toSnapshot.metadata,
      changes: {
        wordCountDelta: toSnapshot.metadata.wordCount - fromSnapshot.metadata.wordCount,
        sceneCountDelta: toSnapshot.metadata.sceneCount - fromSnapshot.metadata.sceneCount,
        contentChanged: fromSnapshot.metadata.hash !== toSnapshot.metadata.hash,
        structureChanged: JSON.stringify(fromSnapshot.content.structure) !== JSON.stringify(toSnapshot.content.structure),
      },
    }
  }

  /**
   * Compare current snapshot with a specific snapshot
   */
  compareWithCurrent(snapshotId: string): SnapshotComparison | null {
    if (!this.currentSnapshotId) {
      return null
    }
    return this.compareSnapshots(snapshotId, this.currentSnapshotId)
  }

  /**
   * Restore a snapshot (returns the snapshot content)
   */
  restoreSnapshot(id: string): DocumentSnapshot | null {
    const snapshot = this.getSnapshot(id)
    if (!snapshot) {
      return null
    }

    this.currentSnapshotId = id
    return snapshot
  }

  /**
   * Delete a snapshot
   */
  deleteSnapshot(id: string): boolean {
    const deleted = this.snapshots.delete(id)
    if (deleted && this.currentSnapshotId === id) {
      // Set current to most recent snapshot
      const remaining = this.getAllSnapshots()
      this.currentSnapshotId = remaining.length > 0 ? remaining[0].metadata.id : null
    }
    return deleted
  }

  /**
   * Clear all snapshots
   */
  clearSnapshots(): void {
    this.snapshots.clear()
    this.currentSnapshotId = null
  }

  /**
   * Get snapshot count
   */
  getSnapshotCount(): number {
    return this.snapshots.size
  }

  /**
   * Check if a snapshot exists
   */
  hasSnapshot(id: string): boolean {
    return this.snapshots.has(id)
  }

  /**
   * Get the latest snapshot by timestamp
   */
  getLatestSnapshot(): DocumentSnapshot | null {
    const snapshots = this.getAllSnapshots()
    return snapshots.length > 0 ? snapshots[0] : null
  }

  /**
   * Get snapshots created within a time range
   */
  getSnapshotsInRange(from: Date, to: Date): DocumentSnapshot[] {
    return this.getAllSnapshots().filter((snapshot) => {
      const timestamp = snapshot.metadata.timestamp.getTime()
      return timestamp >= from.getTime() && timestamp <= to.getTime()
    })
  }

  /**
   * Export snapshots to JSON
   */
  exportSnapshots(): string {
    const snapshots = this.getAllSnapshots()
    return JSON.stringify(
      {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        snapshots: snapshots.map((s) => ({
          ...s,
          metadata: {
            ...s.metadata,
            timestamp: s.metadata.timestamp.toISOString(),
          },
        })),
      },
      null,
      2
    )
  }

  /**
   * Import snapshots from JSON
   */
  importSnapshots(json: string): boolean {
    try {
      const data = JSON.parse(json)
      if (!data.version || !Array.isArray(data.snapshots)) {
        return false
      }

      data.snapshots.forEach((s: any) => {
        const snapshot: DocumentSnapshot = {
          ...s,
          metadata: {
            ...s.metadata,
            timestamp: new Date(s.metadata.timestamp),
          },
        }
        this.snapshots.set(snapshot.metadata.id, snapshot)
      })

      return true
    } catch (error) {
      console.error('Failed to import snapshots:', error)
      return false
    }
  }

  /**
   * Generate a unique snapshot ID
   */
  private generateSnapshotId(): string {
    return `snapshot_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  }

  /**
   * Enforce max snapshots limit by removing oldest
   */
  private enforceSnapshotLimit(): void {
    if (this.snapshots.size <= this.maxSnapshots) {
      return
    }

    const snapshots = this.getAllSnapshots()
    const toRemove = snapshots.slice(this.maxSnapshots)

    toRemove.forEach((snapshot) => {
      this.snapshots.delete(snapshot.metadata.id)
    })
  }
}

/**
 * Global singleton instance for app-wide snapshot management
 */
let globalSnapshotManager: SnapshotManager | null = null

export function getGlobalSnapshotManager(): SnapshotManager {
  if (!globalSnapshotManager) {
    globalSnapshotManager = new SnapshotManager()
  }
  return globalSnapshotManager
}

export function resetGlobalSnapshotManager(): void {
  globalSnapshotManager = null
}
