import { describe, it, expect, beforeEach } from 'vitest'
import { UndoRedoManager } from '@/lib/undo-redo/undo-redo-manager'
import type { DocumentSnapshot } from '@/lib/snapshots/snapshot-manager'

describe('UndoRedoManager', () => {
  let manager: UndoRedoManager

  const createTestSnapshot = (id: string, wordCount: number = 100): DocumentSnapshot => ({
    metadata: {
      id,
      timestamp: new Date(),
      source: 'manual',
      hash: `hash_${id}`,
      wordCount,
      sceneCount: 1,
    },
    content: {
      html: `<p>Test content ${id}</p>`,
      structure: [],
    },
    sceneAnchors: [],
  })

  beforeEach(() => {
    manager = new UndoRedoManager(10)
  })

  describe('Push Operations', () => {
    it('should push a new entry to undo stack', () => {
      const snapshot = createTestSnapshot('snap1')
      manager.push(snapshot, 0, 'Test push')

      expect(manager.canUndo()).toBe(true)
      expect(manager.getUndoStackSize()).toBe(1)
    })

    it('should clear redo stack on new push', () => {
      const snapshot1 = createTestSnapshot('snap1')
      const snapshot2 = createTestSnapshot('snap2')

      manager.push(snapshot1, 0)
      manager.undo()
      expect(manager.canRedo()).toBe(true)

      manager.push(snapshot2, 100)
      expect(manager.canRedo()).toBe(false)
      expect(manager.getRedoStackSize()).toBe(0)
    })

    it('should calculate word count delta', () => {
      const snapshot = createTestSnapshot('snap1', 150)
      const entry = manager.push(snapshot, 100)

      expect(entry.wordCountDelta).toBe(50)
    })
  })

  describe('Undo Operations', () => {
    it('should undo and return previous snapshot ID', () => {
      const snapshot1 = createTestSnapshot('snap1')
      const snapshot2 = createTestSnapshot('snap2')

      manager.push(snapshot1, 0)
      manager.push(snapshot2, 100)

      const undoId = manager.undo()
      expect(undoId).toBe('snap1')
    })

    it('should return null when nothing to undo', () => {
      const undoId = manager.undo()
      expect(undoId).toBeNull()
    })

    it('should move entry to redo stack', () => {
      const snapshot = createTestSnapshot('snap1')
      manager.push(snapshot, 0)

      manager.undo()
      expect(manager.canUndo()).toBe(false)
      expect(manager.canRedo()).toBe(true)
    })
  })

  describe('Redo Operations', () => {
    it('should redo and return next snapshot ID', () => {
      const snapshot1 = createTestSnapshot('snap1')
      const snapshot2 = createTestSnapshot('snap2')

      manager.push(snapshot1, 0)
      manager.push(snapshot2, 100)
      manager.undo()

      const redoId = manager.redo()
      expect(redoId).toBe('snap2')
    })

    it('should return null when nothing to redo', () => {
      const redoId = manager.redo()
      expect(redoId).toBeNull()
    })

    it('should move entry back to undo stack', () => {
      const snapshot = createTestSnapshot('snap1')
      manager.push(snapshot, 0)
      manager.undo()

      manager.redo()
      expect(manager.canUndo()).toBe(true)
      expect(manager.canRedo()).toBe(false)
    })
  })

  describe('Peek Operations', () => {
    it('should peek undo without executing', () => {
      const snapshot = createTestSnapshot('snap1')
      manager.push(snapshot, 0, 'Test')

      const peeked = manager.peekUndo()
      expect(peeked).toBeDefined()
      expect(peeked?.description).toBe('Test')
      expect(manager.canUndo()).toBe(true) // Still can undo
    })

    it('should peek redo without executing', () => {
      const snapshot = createTestSnapshot('snap1')
      manager.push(snapshot, 0, 'Test')
      manager.undo()

      const peeked = manager.peekRedo()
      expect(peeked).toBeDefined()
      expect(peeked?.description).toBe('Test')
      expect(manager.canRedo()).toBe(true) // Still can redo
    })
  })

  describe('History Queries', () => {
    it('should get undo history (newest first)', () => {
      manager.push(createTestSnapshot('snap1'), 0, 'First')
      manager.push(createTestSnapshot('snap2'), 100, 'Second')
      manager.push(createTestSnapshot('snap3'), 200, 'Third')

      const history = manager.getUndoHistory()
      expect(history).toHaveLength(3)
      expect(history[0].description).toBe('Third')
      expect(history[2].description).toBe('First')
    })

    it('should get redo history (in redo order)', () => {
      manager.push(createTestSnapshot('snap1'), 0, 'First')
      manager.push(createTestSnapshot('snap2'), 100, 'Second')
      manager.undo() // Moves snap2 to redo stack
      manager.undo() // Moves snap1 to redo stack

      const history = manager.getRedoHistory()
      expect(history).toHaveLength(2)
      // Redo stack has [snap2, snap1], returned as-is
      expect(history[0].description).toBe('Second')
      expect(history[1].description).toBe('First')
    })
  })

  describe('Clear Operations', () => {
    it('should clear all stacks', () => {
      manager.push(createTestSnapshot('snap1'), 0)
      manager.push(createTestSnapshot('snap2'), 100)
      manager.undo()

      manager.clear()
      expect(manager.getUndoStackSize()).toBe(0)
      expect(manager.getRedoStackSize()).toBe(0)
      expect(manager.canUndo()).toBe(false)
      expect(manager.canRedo()).toBe(false)
    })

    it('should clear redo stack only', () => {
      manager.push(createTestSnapshot('snap1'), 0)
      manager.push(createTestSnapshot('snap2'), 100)
      manager.undo()

      manager.clearRedo()
      expect(manager.getUndoStackSize()).toBe(1)
      expect(manager.getRedoStackSize()).toBe(0)
    })
  })

  describe('Stack Limits', () => {
    it('should enforce max stack size', () => {
      const smallManager = new UndoRedoManager(3)

      smallManager.push(createTestSnapshot('snap1'), 0)
      smallManager.push(createTestSnapshot('snap2'), 100)
      smallManager.push(createTestSnapshot('snap3'), 200)
      smallManager.push(createTestSnapshot('snap4'), 300)

      expect(smallManager.getUndoStackSize()).toBe(3)
    })

    it('should remove oldest entries when limit exceeded', () => {
      const smallManager = new UndoRedoManager(2)

      const oldest = smallManager.push(createTestSnapshot('snap1'), 0, 'Oldest')
      smallManager.push(createTestSnapshot('snap2'), 100, 'Middle')
      smallManager.push(createTestSnapshot('snap3'), 200, 'Newest')

      const history = smallManager.getUndoHistory()
      expect(history).toHaveLength(2)
      expect(history.find((e) => e.id === oldest.id)).toBeUndefined()
    })
  })

  describe('Export/Import', () => {
    it('should export state to JSON', () => {
      manager.push(createTestSnapshot('snap1'), 0, 'First')
      manager.push(createTestSnapshot('snap2'), 100, 'Second')

      const exported = manager.exportState()
      const parsed = JSON.parse(exported)

      expect(parsed.version).toBe('1.0.0')
      expect(parsed.undoStack).toHaveLength(2)
      expect(parsed.redoStack).toHaveLength(0)
    })

    it('should import state from JSON', () => {
      manager.push(createTestSnapshot('snap1'), 0)
      const exported = manager.exportState()

      const newManager = new UndoRedoManager()
      const success = newManager.importState(exported)

      expect(success).toBe(true)
      expect(newManager.getUndoStackSize()).toBe(1)
    })

    it('should handle invalid import JSON', () => {
      const success = manager.importState('invalid json')
      expect(success).toBe(false)
    })

    it('should preserve timestamps on export/import', () => {
      const snapshot = createTestSnapshot('snap1')
      snapshot.metadata.timestamp = new Date('2025-01-01T00:00:00Z')
      manager.push(snapshot, 0)

      const exported = manager.exportState()
      const newManager = new UndoRedoManager()
      newManager.importState(exported)

      const history = newManager.getUndoHistory()
      expect(history[0].timestamp).toEqual(new Date('2025-01-01T00:00:00Z'))
    })
  })

  describe('Get/Set State', () => {
    it('should get current state', () => {
      manager.push(createTestSnapshot('snap1'), 0)
      manager.push(createTestSnapshot('snap2'), 100)

      const state = manager.getState()
      expect(state.undoStack).toHaveLength(2)
      expect(state.redoStack).toHaveLength(0)
      expect(state.maxStackSize).toBe(10)
    })

    it('should restore state', () => {
      manager.push(createTestSnapshot('snap1'), 0)
      const state = manager.getState()

      const newManager = new UndoRedoManager()
      newManager.setState(state)

      expect(newManager.getUndoStackSize()).toBe(1)
      expect(newManager.canUndo()).toBe(true)
    })
  })

  describe('Description Generation', () => {
    it('should use provided description', () => {
      const snapshot = createTestSnapshot('snap1')
      const entry = manager.push(snapshot, 0, 'Custom description')

      expect(entry.description).toBe('Custom description')
    })

    it('should generate description from snapshot label', () => {
      const snapshot = createTestSnapshot('snap1')
      snapshot.metadata.label = 'My label'
      const entry = manager.push(snapshot, 0)

      expect(entry.description).toBe('My label')
    })

    it('should generate description from source', () => {
      const snapshot = createTestSnapshot('snap1')
      snapshot.metadata.source = 'autosave'
      const entry = manager.push(snapshot, 0)

      expect(entry.description).toBe('Auto save')
    })
  })
})
