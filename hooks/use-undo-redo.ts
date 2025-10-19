/* eslint-disable no-undef */
import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UndoRedoManager, type UndoRedoEntry, type UndoRedoState } from '@/lib/undo-redo/undo-redo-manager'
import type { DocumentSnapshot, SnapshotManager } from '@/lib/snapshots/snapshot-manager'

export type UseUndoRedoOptions = {
  documentId: string | null
  userId: string | null
  snapshotManager: SnapshotManager | null
  enabled?: boolean
  maxStackSize?: number
  autoPersist?: boolean
  persistInterval?: number // ms
}

export type UndoRedoAPI = {
  // Core operations
  undo: () => Promise<DocumentSnapshot | null>
  redo: () => Promise<DocumentSnapshot | null>
  push: (snapshot: DocumentSnapshot, previousWordCount: number, description?: string) => Promise<void>

  // State queries
  canUndo: boolean
  canRedo: boolean
  undoStackSize: number
  redoStackSize: number

  // Peek operations
  peekUndo: () => UndoRedoEntry | null
  peekRedo: () => UndoRedoEntry | null

  // History
  getUndoHistory: () => UndoRedoEntry[]
  getRedoHistory: () => UndoRedoEntry[]

  // Management
  clear: () => Promise<void>
  save: () => Promise<void>
  load: () => Promise<void>

  // State
  isLoading: boolean
  isSaving: boolean
  lastError: Error | null
}

/**
 * Hook for undo/redo with database persistence
 */
export function useUndoRedo(options: UseUndoRedoOptions): UndoRedoAPI {
  const {
    documentId,
    userId,
    snapshotManager,
    enabled = true,
    maxStackSize = 100,
    autoPersist = true,
    persistInterval = 5000, // 5 seconds
  } = options

  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [undoStackSize, setUndoStackSize] = useState(0)
  const [redoStackSize, setRedoStackSize] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [lastError, setLastError] = useState<Error | null>(null)

  const managerRef = useRef<UndoRedoManager | null>(null)
  const persistTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isDirtyRef = useRef(false)

  // Initialize manager
  useEffect(() => {
    if (!managerRef.current) {
      managerRef.current = new UndoRedoManager(maxStackSize)
    }
  }, [maxStackSize])

  // Update state from manager
  const updateState = useCallback(() => {
    if (!managerRef.current) return

    setCanUndo(managerRef.current.canUndo())
    setCanRedo(managerRef.current.canRedo())
    setUndoStackSize(managerRef.current.getUndoStackSize())
    setRedoStackSize(managerRef.current.getRedoStackSize())
  }, [])

  /**
   * Load undo/redo history from database
   */
  const load = useCallback(async () => {
    if (!enabled || !documentId || !userId || !managerRef.current) {
      return
    }

    setIsLoading(true)
    setLastError(null)

    try {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('document_undo_history')
        .select('*')
        .eq('document_id', documentId)
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned (not an error for new documents)
        throw error
      }

      if (data) {
        const state: UndoRedoState = {
          undoStack: data.undo_stack || [],
          redoStack: data.redo_stack || [],
          currentEntryId: data.current_entry_id,
          maxStackSize: data.max_stack_size,
        }

        managerRef.current.setState(state)
        updateState()
        isDirtyRef.current = false
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to load undo/redo history')
      setLastError(err)
      console.error('Failed to load undo/redo history:', err)
    } finally {
      setIsLoading(false)
    }
  }, [enabled, documentId, userId, updateState])

  /**
   * Save undo/redo history to database
   */
  const save = useCallback(async () => {
    if (!enabled || !documentId || !userId || !managerRef.current) {
      return
    }

    if (!isDirtyRef.current) {
      return // No changes to save
    }

    setIsSaving(true)
    setLastError(null)

    try {
      const supabase = createClient()
      const state = managerRef.current.getState()

      const { error } = await supabase
        .from('document_undo_history')
        .upsert(
          {
            document_id: documentId,
            user_id: userId,
            undo_stack: state.undoStack,
            redo_stack: state.redoStack,
            current_entry_id: state.currentEntryId,
            max_stack_size: state.maxStackSize,
          },
          {
            onConflict: 'user_id,document_id',
          }
        )

      if (error) {
        throw error
      }

      isDirtyRef.current = false
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to save undo/redo history')
      setLastError(err)
      console.error('Failed to save undo/redo history:', err)
    } finally {
      setIsSaving(false)
    }
  }, [enabled, documentId, userId])

  /**
   * Push a new snapshot to the undo stack
   */
  const push = useCallback(
    async (snapshot: DocumentSnapshot, previousWordCount: number, description?: string) => {
      if (!enabled || !managerRef.current) {
        return
      }

      try {
        managerRef.current.push(snapshot, previousWordCount, description)
        updateState()
        isDirtyRef.current = true

        // Auto-persist if enabled
        if (autoPersist) {
          await save()
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Failed to push undo entry')
        setLastError(err)
        console.error('Failed to push undo entry:', err)
      }
    },
    [enabled, updateState, autoPersist, save]
  )

  /**
   * Undo operation - returns the snapshot to restore
   */
  const undo = useCallback(async (): Promise<DocumentSnapshot | null> => {
    if (!enabled || !managerRef.current || !snapshotManager) {
      return null
    }

    try {
      const snapshotId = managerRef.current.undo()

      if (!snapshotId) {
        return null // Nothing to undo
      }

      const snapshot = snapshotManager.getSnapshot(snapshotId)
      updateState()
      isDirtyRef.current = true

      // Auto-persist if enabled
      if (autoPersist) {
        await save()
      }

      return snapshot
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to undo')
      setLastError(err)
      console.error('Failed to undo:', err)
      return null
    }
  }, [enabled, snapshotManager, updateState, autoPersist, save])

  /**
   * Redo operation - returns the snapshot to restore
   */
  const redo = useCallback(async (): Promise<DocumentSnapshot | null> => {
    if (!enabled || !managerRef.current || !snapshotManager) {
      return null
    }

    try {
      const snapshotId = managerRef.current.redo()

      if (!snapshotId) {
        return null // Nothing to redo
      }

      const snapshot = snapshotManager.getSnapshot(snapshotId)
      updateState()
      isDirtyRef.current = true

      // Auto-persist if enabled
      if (autoPersist) {
        await save()
      }

      return snapshot
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to redo')
      setLastError(err)
      console.error('Failed to redo:', err)
      return null
    }
  }, [enabled, snapshotManager, updateState, autoPersist, save])

  /**
   * Peek at what would be undone
   */
  const peekUndo = useCallback((): UndoRedoEntry | null => {
    return managerRef.current?.peekUndo() ?? null
  }, [])

  /**
   * Peek at what would be redone
   */
  const peekRedo = useCallback((): UndoRedoEntry | null => {
    return managerRef.current?.peekRedo() ?? null
  }, [])

  /**
   * Get undo history
   */
  const getUndoHistory = useCallback((): UndoRedoEntry[] => {
    return managerRef.current?.getUndoHistory() ?? []
  }, [])

  /**
   * Get redo history
   */
  const getRedoHistory = useCallback((): UndoRedoEntry[] => {
    return managerRef.current?.getRedoHistory() ?? []
  }, [])

  /**
   * Clear all undo/redo history
   */
  const clear = useCallback(async () => {
    if (!managerRef.current) {
      return
    }

    managerRef.current.clear()
    updateState()
    isDirtyRef.current = true

    if (autoPersist) {
      await save()
    }
  }, [updateState, autoPersist, save])

  // Load history on mount
  useEffect(() => {
    if (enabled && documentId && userId) {
      load()
    }
  }, [enabled, documentId, userId, load])

  // Auto-persist on interval
  useEffect(() => {
    if (!enabled || !autoPersist || persistInterval <= 0) {
      return
    }

    persistTimerRef.current = setInterval(() => {
      if (isDirtyRef.current) {
        save()
      }
    }, persistInterval)

    return () => {
      if (persistTimerRef.current) {
        clearInterval(persistTimerRef.current)
        persistTimerRef.current = null
      }
    }
  }, [enabled, autoPersist, persistInterval, save])

  // Save on unmount if dirty
  useEffect(() => {
    return () => {
      if (isDirtyRef.current && autoPersist) {
        // Fire and forget on unmount
        save().catch(console.error)
      }
    }
  }, [autoPersist, save])

  // Keyboard shortcuts
  useEffect(() => {
    if (!enabled) {
      return
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Z = Undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      }

      // Cmd/Ctrl + Shift + Z or Cmd/Ctrl + Y = Redo
      if (
        ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) ||
        ((e.metaKey || e.ctrlKey) && e.key === 'y')
      ) {
        e.preventDefault()
        redo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [enabled, undo, redo])

  return {
    // Core operations
    undo,
    redo,
    push,

    // State queries
    canUndo,
    canRedo,
    undoStackSize,
    redoStackSize,

    // Peek operations
    peekUndo,
    peekRedo,

    // History
    getUndoHistory,
    getRedoHistory,

    // Management
    clear,
    save,
    load,

    // State
    isLoading,
    isSaving,
    lastError,
  }
}
