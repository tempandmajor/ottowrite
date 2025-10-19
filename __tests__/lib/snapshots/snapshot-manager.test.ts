import { describe, it, expect, beforeEach } from 'vitest'
import { SnapshotManager } from '@/lib/snapshots/snapshot-manager'
import type { ClientContentSnapshot } from '@/lib/client-content-hash'

describe('SnapshotManager', () => {
  let manager: SnapshotManager

  const createTestSnapshot = (): ClientContentSnapshot => ({
    html: '<p>Test content</p>',
    structure: [
      {
        id: 'chapter-1',
        title: 'Chapter 1',
        scenes: [{ id: 'scene-1', title: 'Scene 1' }],
      },
    ],
  })

  beforeEach(() => {
    manager = new SnapshotManager(10)
  })

  describe('Snapshot Creation', () => {
    it('should create a manual snapshot', async () => {
      const content = createTestSnapshot()
      const anchors = ['scene-1']

      const snapshot = await manager.createSnapshot(content, anchors, {
        source: 'manual',
        label: 'Test snapshot',
        wordCount: 100,
      })

      expect(snapshot).toBeDefined()
      expect(snapshot.metadata.source).toBe('manual')
      expect(snapshot.metadata.label).toBe('Test snapshot')
      expect(snapshot.metadata.wordCount).toBe(100)
      expect(snapshot.metadata.sceneCount).toBe(1)
      expect(snapshot.content.html).toBe(content.html)
    })

    it('should generate unique snapshot IDs', async () => {
      const content = createTestSnapshot()
      const anchors = ['scene-1']

      const snapshot1 = await manager.createSnapshot(content, anchors)
      const snapshot2 = await manager.createSnapshot(content, anchors)

      expect(snapshot1.metadata.id).not.toBe(snapshot2.metadata.id)
    })

    it('should compute hash for snapshot', async () => {
      const content = createTestSnapshot()
      const anchors = ['scene-1']

      const snapshot = await manager.createSnapshot(content, anchors)

      expect(snapshot.metadata.hash).toBeDefined()
      expect(snapshot.metadata.hash.length).toBeGreaterThan(0)
    })

    it('should set current snapshot after creation', async () => {
      const content = createTestSnapshot()
      const anchors = ['scene-1']

      const snapshot = await manager.createSnapshot(content, anchors)
      const current = manager.getCurrentSnapshot()

      expect(current).toEqual(snapshot)
    })

    it('should deep clone structure', async () => {
      const content = createTestSnapshot()
      const anchors = ['scene-1']

      const snapshot = await manager.createSnapshot(content, anchors)

      // Modify original structure
      if (Array.isArray(content.structure)) {
        content.structure[0].title = 'Modified'
      }

      // Snapshot should be unchanged
      expect(snapshot.content.structure).toBeDefined()
      if (Array.isArray(snapshot.content.structure)) {
        expect(snapshot.content.structure[0].title).toBe('Chapter 1')
      }
    })
  })

  describe('Snapshot Retrieval', () => {
    it('should get snapshot by ID', async () => {
      const content = createTestSnapshot()
      const snapshot = await manager.createSnapshot(content, [])

      const retrieved = manager.getSnapshot(snapshot.metadata.id)

      expect(retrieved).toEqual(snapshot)
    })

    it('should return null for non-existent ID', () => {
      const retrieved = manager.getSnapshot('non-existent')

      expect(retrieved).toBeNull()
    })

    it('should get all snapshots sorted by timestamp', async () => {
      const content = createTestSnapshot()

      await manager.createSnapshot(content, [])
      await new Promise((resolve) => setTimeout(resolve, 10))
      await manager.createSnapshot(content, [])
      await new Promise((resolve) => setTimeout(resolve, 10))
      await manager.createSnapshot(content, [])

      const all = manager.getAllSnapshots()

      expect(all).toHaveLength(3)
      // Newest first
      expect(all[0].metadata.timestamp.getTime()).toBeGreaterThan(all[1].metadata.timestamp.getTime())
      expect(all[1].metadata.timestamp.getTime()).toBeGreaterThan(all[2].metadata.timestamp.getTime())
    })

    it('should filter snapshots by source', async () => {
      const content = createTestSnapshot()

      await manager.createSnapshot(content, [], { source: 'manual' })
      await manager.createSnapshot(content, [], { source: 'autosave' })
      await manager.createSnapshot(content, [], { source: 'manual' })
      await manager.createSnapshot(content, [], { source: 'preview' })

      const manualSnapshots = manager.getSnapshotsBySource('manual')

      expect(manualSnapshots).toHaveLength(2)
      expect(manualSnapshots.every((s) => s.metadata.source === 'manual')).toBe(true)
    })

    it('should get latest snapshot', async () => {
      const content = createTestSnapshot()

      await manager.createSnapshot(content, [])
      await new Promise((resolve) => setTimeout(resolve, 10))
      const latest = await manager.createSnapshot(content, [])

      const retrieved = manager.getLatestSnapshot()

      expect(retrieved?.metadata.id).toBe(latest.metadata.id)
    })
  })

  describe('Snapshot Comparison', () => {
    it('should compare two snapshots', async () => {
      const content1 = createTestSnapshot()
      const content2 = {
        html: '<p>Modified content with more words</p>',
        structure: content1.structure,
      }

      const snapshot1 = await manager.createSnapshot(content1, [], { wordCount: 100 })
      await new Promise((resolve) => setTimeout(resolve, 10))
      const snapshot2 = await manager.createSnapshot(content2, [], { wordCount: 150 })

      const comparison = manager.compareSnapshots(snapshot1.metadata.id, snapshot2.metadata.id)

      expect(comparison).toBeDefined()
      expect(comparison?.changes.wordCountDelta).toBe(50)
      expect(comparison?.changes.contentChanged).toBe(true)
    })

    it('should detect identical snapshots', async () => {
      const content = createTestSnapshot()

      const snapshot1 = await manager.createSnapshot(content, [])
      const snapshot2 = await manager.createSnapshot(content, [])

      const comparison = manager.compareSnapshots(snapshot1.metadata.id, snapshot2.metadata.id)

      expect(comparison?.changes.contentChanged).toBe(false)
    })

    it('should detect structure changes', async () => {
      const content1 = createTestSnapshot()
      const content2 = {
        html: content1.html,
        structure: [
          ...content1.structure!,
          { id: 'chapter-2', title: 'Chapter 2', scenes: [] },
        ],
      }

      const snapshot1 = await manager.createSnapshot(content1, [])
      const snapshot2 = await manager.createSnapshot(content2, [])

      const comparison = manager.compareSnapshots(snapshot1.metadata.id, snapshot2.metadata.id)

      expect(comparison?.changes.structureChanged).toBe(true)
    })
  })

  describe('Snapshot Management', () => {
    it('should restore a snapshot', async () => {
      const content = createTestSnapshot()

      const snapshot1 = await manager.createSnapshot(content, [])
      await manager.createSnapshot(content, [])

      const restored = manager.restoreSnapshot(snapshot1.metadata.id)

      expect(restored?.metadata.id).toBe(snapshot1.metadata.id)
      expect(manager.getCurrentSnapshot()?.metadata.id).toBe(snapshot1.metadata.id)
    })

    it('should delete a snapshot', async () => {
      const content = createTestSnapshot()

      const snapshot = await manager.createSnapshot(content, [])

      const deleted = manager.deleteSnapshot(snapshot.metadata.id)

      expect(deleted).toBe(true)
      expect(manager.getSnapshot(snapshot.metadata.id)).toBeNull()
    })

    it('should update current snapshot when deleting current', async () => {
      const content = createTestSnapshot()

      const snapshot1 = await manager.createSnapshot(content, [])
      await new Promise((resolve) => setTimeout(resolve, 10))
      const snapshot2 = await manager.createSnapshot(content, [])

      manager.deleteSnapshot(snapshot2.metadata.id)

      const current = manager.getCurrentSnapshot()
      expect(current?.metadata.id).toBe(snapshot1.metadata.id)
    })

    it('should clear all snapshots', async () => {
      const content = createTestSnapshot()

      await manager.createSnapshot(content, [])
      await manager.createSnapshot(content, [])
      await manager.createSnapshot(content, [])

      manager.clearSnapshots()

      expect(manager.getSnapshotCount()).toBe(0)
      expect(manager.getCurrentSnapshot()).toBeNull()
    })
  })

  describe('Snapshot Limits', () => {
    it('should enforce max snapshots limit', async () => {
      const smallManager = new SnapshotManager(3)
      const content = createTestSnapshot()

      await smallManager.createSnapshot(content, [])
      await smallManager.createSnapshot(content, [])
      await smallManager.createSnapshot(content, [])
      await smallManager.createSnapshot(content, [])

      expect(smallManager.getSnapshotCount()).toBe(3)
    })

    it('should remove oldest snapshots when limit exceeded', async () => {
      const smallManager = new SnapshotManager(2)
      const content = createTestSnapshot()

      const oldest = await smallManager.createSnapshot(content, [], { label: 'oldest' })
      await new Promise((resolve) => setTimeout(resolve, 10))
      await smallManager.createSnapshot(content, [], { label: 'middle' })
      await new Promise((resolve) => setTimeout(resolve, 10))
      await smallManager.createSnapshot(content, [], { label: 'newest' })

      const all = smallManager.getAllSnapshots()
      expect(all).toHaveLength(2)
      expect(all.find((s) => s.metadata.id === oldest.metadata.id)).toBeUndefined()
    })
  })

  describe('Time Range Queries', () => {
    it('should get snapshots in time range', async () => {
      const content = createTestSnapshot()

      const start = new Date()
      await manager.createSnapshot(content, [])
      await new Promise((resolve) => setTimeout(resolve, 50))
      await manager.createSnapshot(content, [])
      await new Promise((resolve) => setTimeout(resolve, 50))
      const end = new Date()

      const inRange = manager.getSnapshotsInRange(start, end)

      expect(inRange).toHaveLength(2)
    })

    it('should exclude snapshots outside time range', async () => {
      const content = createTestSnapshot()

      await manager.createSnapshot(content, [])
      await new Promise((resolve) => setTimeout(resolve, 50))

      const start = new Date()
      await new Promise((resolve) => setTimeout(resolve, 50))
      await manager.createSnapshot(content, [])
      const end = new Date()

      const inRange = manager.getSnapshotsInRange(start, end)

      expect(inRange).toHaveLength(1)
    })
  })

  describe('Export/Import', () => {
    it('should export snapshots to JSON', async () => {
      const content = createTestSnapshot()

      await manager.createSnapshot(content, [], { label: 'Test' })
      await manager.createSnapshot(content, [], { label: 'Test 2' })

      const exported = manager.exportSnapshots()
      const parsed = JSON.parse(exported)

      expect(parsed.version).toBe('1.0.0')
      expect(parsed.snapshots).toHaveLength(2)
    })

    it('should import snapshots from JSON', async () => {
      const content = createTestSnapshot()

      await manager.createSnapshot(content, [], { label: 'Test' })

      const exported = manager.exportSnapshots()

      const newManager = new SnapshotManager()
      const imported = newManager.importSnapshots(exported)

      expect(imported).toBe(true)
      expect(newManager.getSnapshotCount()).toBe(1)
    })

    it('should handle invalid import JSON', () => {
      const imported = manager.importSnapshots('invalid json')

      expect(imported).toBe(false)
    })
  })
})
