import type { DocumentSnapshot } from '@/lib/snapshots/snapshot-manager'

export type UndoRedoEntry = {
  id: string
  snapshotId: string
  timestamp: Date
  description?: string
  wordCountDelta: number // Change from previous state
}

export type UndoRedoState = {
  undoStack: UndoRedoEntry[]
  redoStack: UndoRedoEntry[]
  currentEntryId: string | null
  maxStackSize: number
}

/**
 * Manager for undo/redo operations with snapshot integration
 * Maintains two stacks (undo/redo) with references to snapshots
 */
export class UndoRedoManager {
  private undoStack: UndoRedoEntry[] = []
  private redoStack: UndoRedoEntry[] = []
  private currentEntryId: string | null = null
  private maxStackSize: number

  constructor(maxStackSize: number = 100) {
    this.maxStackSize = maxStackSize
  }

  /**
   * Push a new entry to the undo stack
   * This clears the redo stack (can't redo after new action)
   */
  push(snapshot: DocumentSnapshot, previousWordCount: number, description?: string): UndoRedoEntry {
    const entry: UndoRedoEntry = {
      id: this.generateEntryId(),
      snapshotId: snapshot.metadata.id,
      timestamp: snapshot.metadata.timestamp,
      description: description ?? this.generateDescription(snapshot),
      wordCountDelta: snapshot.metadata.wordCount - previousWordCount,
    }

    this.undoStack.push(entry)
    this.currentEntryId = entry.id

    // Clear redo stack on new action
    this.redoStack = []

    // Enforce max stack size
    this.enforceStackLimit()

    return entry
  }

  /**
   * Push an existing entry (used for restoration from persistence)
   */
  pushEntry(entry: UndoRedoEntry, stack: 'undo' | 'redo' = 'undo'): void {
    if (stack === 'undo') {
      this.undoStack.push(entry)
    } else {
      this.redoStack.push(entry)
    }
    this.enforceStackLimit()
  }

  /**
   * Move an entry from undo stack to redo stack (undo operation)
   * Returns the snapshot ID to restore
   */
  undo(): string | null {
    if (this.undoStack.length === 0) {
      return null
    }

    const entry = this.undoStack.pop()!
    this.redoStack.push(entry)

    // Current becomes the previous entry's snapshot, or null if stack is empty
    if (this.undoStack.length > 0) {
      this.currentEntryId = this.undoStack[this.undoStack.length - 1].id
      return this.undoStack[this.undoStack.length - 1].snapshotId
    }

    this.currentEntryId = null
    return null // No more states to undo to
  }

  /**
   * Move an entry from redo stack to undo stack (redo operation)
   * Returns the snapshot ID to restore
   */
  redo(): string | null {
    if (this.redoStack.length === 0) {
      return null
    }

    const entry = this.redoStack.pop()!
    this.undoStack.push(entry)
    this.currentEntryId = entry.id

    return entry.snapshotId
  }

  /**
   * Get the current entry (top of undo stack)
   */
  getCurrentEntry(): UndoRedoEntry | null {
    if (this.undoStack.length === 0) {
      return null
    }
    return this.undoStack[this.undoStack.length - 1]
  }

  /**
   * Peek at what would be undone without executing
   */
  peekUndo(): UndoRedoEntry | null {
    if (this.undoStack.length === 0) {
      return null
    }
    return this.undoStack[this.undoStack.length - 1]
  }

  /**
   * Peek at what would be redone without executing
   */
  peekRedo(): UndoRedoEntry | null {
    if (this.redoStack.length === 0) {
      return null
    }
    return this.redoStack[this.redoStack.length - 1]
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.undoStack.length > 0
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.redoStack.length > 0
  }

  /**
   * Get undo stack size
   */
  getUndoStackSize(): number {
    return this.undoStack.length
  }

  /**
   * Get redo stack size
   */
  getRedoStackSize(): number {
    return this.redoStack.length
  }

  /**
   * Get all undo entries (newest first)
   */
  getUndoHistory(): UndoRedoEntry[] {
    return [...this.undoStack].reverse()
  }

  /**
   * Get all redo entries (in order they will be redone)
   */
  getRedoHistory(): UndoRedoEntry[] {
    return [...this.redoStack]
  }

  /**
   * Clear all undo/redo history
   */
  clear(): void {
    this.undoStack = []
    this.redoStack = []
    this.currentEntryId = null
  }

  /**
   * Clear only redo stack
   */
  clearRedo(): void {
    this.redoStack = []
  }

  /**
   * Export state to JSON for persistence
   */
  exportState(): string {
    return JSON.stringify({
      version: '1.0.0',
      undoStack: this.undoStack.map((e) => ({
        ...e,
        timestamp: e.timestamp.toISOString(),
      })),
      redoStack: this.redoStack.map((e) => ({
        ...e,
        timestamp: e.timestamp.toISOString(),
      })),
      currentEntryId: this.currentEntryId,
      exportedAt: new Date().toISOString(),
    })
  }

  /**
   * Import state from JSON (restore from persistence)
   */
  importState(json: string): boolean {
    try {
      const data = JSON.parse(json)

      if (!data.version || !Array.isArray(data.undoStack) || !Array.isArray(data.redoStack)) {
        return false
      }

      this.undoStack = data.undoStack.map((e: any) => ({
        ...e,
        timestamp: new Date(e.timestamp),
      }))

      this.redoStack = data.redoStack.map((e: any) => ({
        ...e,
        timestamp: new Date(e.timestamp),
      }))

      this.currentEntryId = data.currentEntryId ?? null

      return true
    } catch (error) {
      console.error('Failed to import undo/redo state:', error)
      return false
    }
  }

  /**
   * Get serializable state for persistence
   */
  getState(): UndoRedoState {
    return {
      undoStack: [...this.undoStack],
      redoStack: [...this.redoStack],
      currentEntryId: this.currentEntryId,
      maxStackSize: this.maxStackSize,
    }
  }

  /**
   * Restore state from persistence
   */
  setState(state: UndoRedoState): void {
    this.undoStack = [...state.undoStack]
    this.redoStack = [...state.redoStack]
    this.currentEntryId = state.currentEntryId
    this.maxStackSize = state.maxStackSize
  }

  /**
   * Generate a unique entry ID
   */
  private generateEntryId(): string {
    return `undo_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  }

  /**
   * Generate a description for a snapshot
   */
  private generateDescription(snapshot: DocumentSnapshot): string {
    const source = snapshot.metadata.source
    const label = snapshot.metadata.label

    if (label) {
      return label
    }

    switch (source) {
      case 'manual':
        return 'Manual save'
      case 'autosave':
        return 'Auto save'
      case 'preview':
        return 'Export preview'
      case 'analytics':
        return 'Analytics snapshot'
      default:
        return 'Document change'
    }
  }

  /**
   * Enforce max stack size by removing oldest entries
   */
  private enforceStackLimit(): void {
    // Enforce limit on undo stack
    while (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift()
    }

    // Enforce limit on redo stack
    while (this.redoStack.length > this.maxStackSize) {
      this.redoStack.shift()
    }
  }
}

/**
 * Global singleton instance for app-wide undo/redo management
 */
let globalUndoRedoManager: UndoRedoManager | null = null

export function getGlobalUndoRedoManager(): UndoRedoManager {
  if (!globalUndoRedoManager) {
    globalUndoRedoManager = new UndoRedoManager()
  }
  return globalUndoRedoManager
}

export function resetGlobalUndoRedoManager(): void {
  globalUndoRedoManager = null
}
