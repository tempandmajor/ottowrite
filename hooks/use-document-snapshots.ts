/* eslint-disable no-undef */
import { useCallback, useEffect, useRef, useState } from 'react'
import { SnapshotManager, type DocumentSnapshot, type SnapshotMetadata } from '@/lib/snapshots/snapshot-manager'
import type { ClientContentSnapshot } from '@/lib/client-content-hash'

export type UseDocumentSnapshotsOptions = {
  enabled?: boolean
  maxSnapshots?: number
  autoSnapshotOnSave?: boolean
  autoSnapshotInterval?: number | null // ms, null to disable
}

export type SnapshotAPI = {
  // Create snapshots
  createSnapshot: (
    content: ClientContentSnapshot,
    sceneAnchors: string[],
    options?: {
      source?: SnapshotMetadata['source']
      label?: string
      wordCount?: number
    }
  ) => Promise<DocumentSnapshot>

  createManualSnapshot: (
    content: ClientContentSnapshot,
    sceneAnchors: string[],
    label?: string,
    wordCount?: number
  ) => Promise<DocumentSnapshot>

  createPreviewSnapshot: (
    content: ClientContentSnapshot,
    sceneAnchors: string[],
    wordCount?: number
  ) => Promise<DocumentSnapshot>

  createAnalyticsSnapshot: (
    content: ClientContentSnapshot,
    sceneAnchors: string[],
    wordCount?: number
  ) => Promise<DocumentSnapshot>

  // Get snapshots
  getSnapshot: (id: string) => DocumentSnapshot | null
  getCurrentSnapshot: () => DocumentSnapshot | null
  getAllSnapshots: () => DocumentSnapshot[]
  getSnapshotsBySource: (source: SnapshotMetadata['source']) => DocumentSnapshot[]
  getLatestSnapshot: () => DocumentSnapshot | null

  // Compare snapshots
  compareSnapshots: (fromId: string, toId: string) => ReturnType<SnapshotManager['compareSnapshots']>
  compareWithCurrent: (snapshotId: string) => ReturnType<SnapshotManager['compareWithCurrent']>

  // Manage snapshots
  restoreSnapshot: (id: string) => DocumentSnapshot | null
  deleteSnapshot: (id: string) => boolean
  clearSnapshots: () => void

  // State
  snapshotCount: number
  hasSnapshots: boolean
  isCreating: boolean
  lastError: Error | null
}

/**
 * Hook for managing document snapshots with autosave integration
 */
export function useDocumentSnapshots(options: UseDocumentSnapshotsOptions = {}): SnapshotAPI {
  const {
    enabled = true,
    maxSnapshots = 50,
    autoSnapshotOnSave = false,
    autoSnapshotInterval = null,
  } = options

  const [snapshotCount, setSnapshotCount] = useState(0)
  const [isCreating, setIsCreating] = useState(false)
  const [lastError, setLastError] = useState<Error | null>(null)

  const managerRef = useRef<SnapshotManager | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize snapshot manager
  useEffect(() => {
    if (!managerRef.current) {
      managerRef.current = new SnapshotManager(maxSnapshots)
    }
  }, [maxSnapshots])

  // Update snapshot count when manager changes
  const updateSnapshotCount = useCallback(() => {
    if (managerRef.current) {
      setSnapshotCount(managerRef.current.getSnapshotCount())
    }
  }, [])

  /**
   * Create a snapshot with error handling
   */
  const createSnapshot = useCallback(
    async (
      content: ClientContentSnapshot,
      sceneAnchors: string[],
      options: {
        source?: SnapshotMetadata['source']
        label?: string
        wordCount?: number
      } = {}
    ): Promise<DocumentSnapshot> => {
      if (!enabled || !managerRef.current) {
        throw new Error('Snapshots are not enabled')
      }

      setIsCreating(true)
      setLastError(null)

      try {
        const snapshot = await managerRef.current.createSnapshot(content, sceneAnchors, options)
        updateSnapshotCount()
        return snapshot
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Failed to create snapshot')
        setLastError(err)
        throw err
      } finally {
        setIsCreating(false)
      }
    },
    [enabled, updateSnapshotCount]
  )

  /**
   * Create a manual snapshot (user-initiated)
   */
  const createManualSnapshot = useCallback(
    async (
      content: ClientContentSnapshot,
      sceneAnchors: string[],
      label?: string,
      wordCount?: number
    ): Promise<DocumentSnapshot> => {
      return createSnapshot(content, sceneAnchors, {
        source: 'manual',
        label: label ?? 'Manual snapshot',
        wordCount,
      })
    },
    [createSnapshot]
  )

  /**
   * Create a preview snapshot (for export preview, etc.)
   */
  const createPreviewSnapshot = useCallback(
    async (
      content: ClientContentSnapshot,
      sceneAnchors: string[],
      wordCount?: number
    ): Promise<DocumentSnapshot> => {
      return createSnapshot(content, sceneAnchors, {
        source: 'preview',
        label: 'Preview snapshot',
        wordCount,
      })
    },
    [createSnapshot]
  )

  /**
   * Create an analytics snapshot (for analysis workflows)
   */
  const createAnalyticsSnapshot = useCallback(
    async (
      content: ClientContentSnapshot,
      sceneAnchors: string[],
      wordCount?: number
    ): Promise<DocumentSnapshot> => {
      return createSnapshot(content, sceneAnchors, {
        source: 'analytics',
        label: 'Analytics snapshot',
        wordCount,
      })
    },
    [createSnapshot]
  )

  /**
   * Get a snapshot by ID
   */
  const getSnapshot = useCallback((id: string): DocumentSnapshot | null => {
    return managerRef.current?.getSnapshot(id) ?? null
  }, [])

  /**
   * Get the current snapshot
   */
  const getCurrentSnapshot = useCallback((): DocumentSnapshot | null => {
    return managerRef.current?.getCurrentSnapshot() ?? null
  }, [])

  /**
   * Get all snapshots
   */
  const getAllSnapshots = useCallback((): DocumentSnapshot[] => {
    return managerRef.current?.getAllSnapshots() ?? []
  }, [])

  /**
   * Get snapshots by source
   */
  const getSnapshotsBySource = useCallback((source: SnapshotMetadata['source']): DocumentSnapshot[] => {
    return managerRef.current?.getSnapshotsBySource(source) ?? []
  }, [])

  /**
   * Get the latest snapshot
   */
  const getLatestSnapshot = useCallback((): DocumentSnapshot | null => {
    return managerRef.current?.getLatestSnapshot() ?? null
  }, [])

  /**
   * Compare two snapshots
   */
  const compareSnapshots = useCallback((fromId: string, toId: string) => {
    return managerRef.current?.compareSnapshots(fromId, toId) ?? null
  }, [])

  /**
   * Compare with current snapshot
   */
  const compareWithCurrent = useCallback((snapshotId: string) => {
    return managerRef.current?.compareWithCurrent(snapshotId) ?? null
  }, [])

  /**
   * Restore a snapshot
   */
  const restoreSnapshot = useCallback((id: string): DocumentSnapshot | null => {
    const snapshot = managerRef.current?.restoreSnapshot(id) ?? null
    if (snapshot) {
      updateSnapshotCount()
    }
    return snapshot
  }, [updateSnapshotCount])

  /**
   * Delete a snapshot
   */
  const deleteSnapshot = useCallback(
    (id: string): boolean => {
      const deleted = managerRef.current?.deleteSnapshot(id) ?? false
      if (deleted) {
        updateSnapshotCount()
      }
      return deleted
    },
    [updateSnapshotCount]
  )

  /**
   * Clear all snapshots
   */
  const clearSnapshots = useCallback(() => {
    managerRef.current?.clearSnapshots()
    updateSnapshotCount()
  }, [updateSnapshotCount])

  /**
   * Setup auto-snapshot interval if configured
   */
  useEffect(() => {
    if (!enabled || !autoSnapshotInterval || autoSnapshotInterval <= 0) {
      return
    }

    // Note: Auto-snapshot would need content/sceneAnchors from parent
    // This is just the interval setup - actual snapshot creation
    // would be triggered by parent component

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [enabled, autoSnapshotInterval])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return {
    // Create snapshots
    createSnapshot,
    createManualSnapshot,
    createPreviewSnapshot,
    createAnalyticsSnapshot,

    // Get snapshots
    getSnapshot,
    getCurrentSnapshot,
    getAllSnapshots,
    getSnapshotsBySource,
    getLatestSnapshot,

    // Compare snapshots
    compareSnapshots,
    compareWithCurrent,

    // Manage snapshots
    restoreSnapshot,
    deleteSnapshot,
    clearSnapshots,

    // State
    snapshotCount,
    hasSnapshots: snapshotCount > 0,
    isCreating,
    lastError,
  }
}
