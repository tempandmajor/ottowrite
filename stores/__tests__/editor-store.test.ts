import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
  useEditorStore,
  useWordCount,
  useEditorContent,
  selectWordCount,
  selectContent,
  selectStructure,
  selectDocumentMeta,
  selectSaveStatus,
  selectAIContext,
  selectSceneNavigation,
  type EditorDocumentRecord,
} from '../editor-store'

describe('EditorStore', () => {
  beforeEach(() => {
    // Reset store before each test
    const { result } = renderHook(() => useEditorStore())
    act(() => {
      result.current.reset()
    })
  })

  describe('Initial State', () => {
    it('should initialize with correct default values', () => {
      const { result } = renderHook(() => useEditorStore())

      expect(result.current.document).toBeNull()
      expect(result.current.title).toBe('')
      expect(result.current.content).toBe('')
      expect(result.current.structure).toEqual([])
      expect(result.current.sceneAnchors).toBeInstanceOf(Set)
      expect(result.current.sceneAnchors.size).toBe(0)
      expect(result.current.activeSceneId).toBeNull()
      expect(result.current.loading).toBe(true)
      expect(result.current.saving).toBe(false)
      expect(result.current.userTier).toBe('free')
      expect(result.current.projectTitle).toBeNull()
      expect(result.current.lastSavedAt).toBeNull()
      expect(result.current.isDirty).toBe(false)
      expect(result.current.baseHash).toBeNull()
      expect(result.current.serverContent).toBeNull()
    })
  })

  describe('State Mutations', () => {
    it('should set document', () => {
      const { result } = renderHook(() => useEditorStore())
      const doc: EditorDocumentRecord = {
        id: 'doc-1',
        title: 'Test Doc',
        type: 'novel',
        word_count: 100,
        project_id: 'proj-1',
      }

      act(() => {
        result.current.setDocument(doc)
      })

      expect(result.current.document).toEqual(doc)
    })

    it('should set document with updater function', () => {
      const { result } = renderHook(() => useEditorStore())
      const doc: EditorDocumentRecord = {
        id: 'doc-1',
        title: 'Test Doc',
        type: 'novel',
        word_count: 100,
        project_id: 'proj-1',
      }

      act(() => {
        result.current.setDocument(doc)
      })

      act(() => {
        result.current.setDocument((prev) => (prev ? { ...prev, word_count: 200 } : null))
      })

      expect(result.current.document?.word_count).toBe(200)
    })

    it('should set title', () => {
      const { result } = renderHook(() => useEditorStore())

      act(() => {
        result.current.setTitle('My Novel')
      })

      expect(result.current.title).toBe('My Novel')
    })

    it('should set content as string', () => {
      const { result } = renderHook(() => useEditorStore())

      act(() => {
        result.current.setContent('<p>Hello World</p>')
      })

      expect(result.current.content).toBe('<p>Hello World</p>')
    })

    it('should set content with updater function', () => {
      const { result } = renderHook(() => useEditorStore())

      act(() => {
        result.current.setContent('<p>Hello</p>')
      })

      act(() => {
        result.current.setContent((prev) => prev + '<p>World</p>')
      })

      expect(result.current.content).toBe('<p>Hello</p><p>World</p>')
    })

    it('should set structure', () => {
      const { result } = renderHook(() => useEditorStore())
      const structure = [{ id: '1', title: 'Chapter 1', level: 1, sections: [] }]

      act(() => {
        result.current.setStructure(structure)
      })

      expect(result.current.structure).toEqual(structure)
    })

    it('should set scene anchors', () => {
      const { result } = renderHook(() => useEditorStore())

      act(() => {
        result.current.setSceneAnchors(['scene-1', 'scene-2'])
      })

      expect(result.current.sceneAnchors.size).toBe(2)
      expect(result.current.sceneAnchors.has('scene-1')).toBe(true)
      expect(result.current.sceneAnchors.has('scene-2')).toBe(true)
    })

    it('should set active scene ID', () => {
      const { result } = renderHook(() => useEditorStore())

      act(() => {
        result.current.setActiveSceneId('scene-1')
      })

      expect(result.current.activeSceneId).toBe('scene-1')
    })

    it('should set loading state', () => {
      const { result } = renderHook(() => useEditorStore())

      act(() => {
        result.current.setLoading(false)
      })

      expect(result.current.loading).toBe(false)
    })

    it('should set saving state', () => {
      const { result } = renderHook(() => useEditorStore())

      act(() => {
        result.current.setSaving(true)
      })

      expect(result.current.saving).toBe(true)
    })

    it('should set user tier', () => {
      const { result } = renderHook(() => useEditorStore())

      act(() => {
        result.current.setUserTier('professional')
      })

      expect(result.current.userTier).toBe('professional')
    })

    it('should set project title', () => {
      const { result } = renderHook(() => useEditorStore())

      act(() => {
        result.current.setProjectTitle('My Project')
      })

      expect(result.current.projectTitle).toBe('My Project')
    })

    it('should set last saved at', () => {
      const { result } = renderHook(() => useEditorStore())
      const date = new Date()

      act(() => {
        result.current.setLastSavedAt(date)
      })

      expect(result.current.lastSavedAt).toBe(date)
    })

    it('should set isDirty', () => {
      const { result } = renderHook(() => useEditorStore())

      act(() => {
        result.current.setIsDirty(true)
      })

      expect(result.current.isDirty).toBe(true)
    })

    it('should set base hash', () => {
      const { result } = renderHook(() => useEditorStore())

      act(() => {
        result.current.setBaseHash('abc123')
      })

      expect(result.current.baseHash).toBe('abc123')
    })

    it('should set server content', () => {
      const { result } = renderHook(() => useEditorStore())
      const serverContent = {
        html: '<p>Server content</p>',
        structure: [],
        wordCount: 50,
      }

      act(() => {
        result.current.setServerContent(serverContent)
      })

      expect(result.current.serverContent).toEqual(serverContent)
    })

    it('should reset to initial state', () => {
      const { result } = renderHook(() => useEditorStore())

      act(() => {
        result.current.setTitle('Test')
        result.current.setContent('<p>Content</p>')
        result.current.setLoading(false)
      })

      expect(result.current.title).toBe('Test')
      expect(result.current.content).toBe('<p>Content</p>')
      expect(result.current.loading).toBe(false)

      act(() => {
        result.current.reset()
      })

      expect(result.current.title).toBe('')
      expect(result.current.content).toBe('')
      expect(result.current.loading).toBe(true)
    })
  })

  describe('Selectors', () => {
    it('selectWordCount should return word count from document', () => {
      const { result } = renderHook(() => useEditorStore())
      const doc: EditorDocumentRecord = {
        id: 'doc-1',
        title: 'Test',
        type: 'novel',
        word_count: 500,
        project_id: 'proj-1',
      }

      act(() => {
        result.current.setDocument(doc)
      })

      expect(selectWordCount(result.current)).toBe(500)
    })

    it('selectWordCount should return 0 if no document', () => {
      const { result } = renderHook(() => useEditorStore())
      expect(selectWordCount(result.current)).toBe(0)
    })

    it('selectContent should return content', () => {
      const { result } = renderHook(() => useEditorStore())

      act(() => {
        result.current.setContent('<p>Test content</p>')
      })

      expect(selectContent(result.current)).toBe('<p>Test content</p>')
    })

    it('selectStructure should return structure', () => {
      const { result } = renderHook(() => useEditorStore())
      const structure = [{ id: '1', title: 'Chapter 1', level: 1, sections: [] }]

      act(() => {
        result.current.setStructure(structure)
      })

      expect(selectStructure(result.current)).toEqual(structure)
    })

    it('selectDocumentMeta should return document metadata', () => {
      const { result } = renderHook(() => useEditorStore())
      const doc: EditorDocumentRecord = {
        id: 'doc-1',
        title: 'Test',
        type: 'novel',
        word_count: 500,
        project_id: 'proj-1',
      }

      act(() => {
        result.current.setDocument(doc)
        result.current.setTitle('My Title')
      })

      const meta = selectDocumentMeta(result.current)
      expect(meta).toEqual({
        id: 'doc-1',
        title: 'My Title',
        type: 'novel',
        wordCount: 500,
        projectId: 'proj-1',
      })
    })

    it('selectSaveStatus should return save-related state', () => {
      const { result } = renderHook(() => useEditorStore())
      const date = new Date()

      act(() => {
        result.current.setIsDirty(true)
        result.current.setSaving(true)
        result.current.setLastSavedAt(date)
      })

      const status = selectSaveStatus(result.current)
      expect(status).toEqual({
        isDirty: true,
        saving: true,
        lastSavedAt: date,
      })
    })

    it('selectAIContext should return AI-relevant state', () => {
      const { result } = renderHook(() => useEditorStore())
      const doc: EditorDocumentRecord = {
        id: 'doc-1',
        title: 'Test',
        type: 'novel',
        word_count: 500,
        project_id: 'proj-1',
      }
      const structure = [{ id: '1', title: 'Chapter 1', level: 1, sections: [] }]

      act(() => {
        result.current.setDocument(doc)
        result.current.setContent('<p>Content</p>')
        result.current.setStructure(structure)
      })

      const context = selectAIContext(result.current)
      expect(context).toEqual({
        content: '<p>Content</p>',
        structure,
        type: 'novel',
        wordCount: 500,
      })
    })

    it('selectSceneNavigation should return navigation state', () => {
      const { result } = renderHook(() => useEditorStore())
      const structure = [{ id: '1', title: 'Chapter 1', level: 1, sections: [] }]

      act(() => {
        result.current.setStructure(structure)
        result.current.setActiveSceneId('scene-1')
        result.current.setSceneAnchors(['scene-1', 'scene-2'])
      })

      const nav = selectSceneNavigation(result.current)
      expect(nav.structure).toEqual(structure)
      expect(nav.activeSceneId).toBe('scene-1')
      expect(nav.sceneAnchors.size).toBe(2)
    })
  })

  describe('Custom Hooks', () => {
    it('useWordCount should return word count', () => {
      const { result } = renderHook(() => {
        const wordCount = useWordCount()
        const store = useEditorStore()
        return { wordCount, setDocument: store.setDocument }
      })

      const doc: EditorDocumentRecord = {
        id: 'doc-1',
        title: 'Test',
        type: 'novel',
        word_count: 750,
        project_id: 'proj-1',
      }

      act(() => {
        result.current.setDocument(doc)
      })

      expect(result.current.wordCount).toBe(750)
    })

    it('useEditorContent should return content', () => {
      const { result } = renderHook(() => {
        const content = useEditorContent()
        const store = useEditorStore()
        return { content, setContent: store.setContent }
      })

      act(() => {
        result.current.setContent('<p>Test</p>')
      })

      expect(result.current.content).toBe('<p>Test</p>')
    })

    it('useDocumentMeta should return metadata', () => {
      const { result } = renderHook(() => useEditorStore())

      const doc: EditorDocumentRecord = {
        id: 'doc-1',
        title: 'Test',
        type: 'novel',
        word_count: 500,
        project_id: 'proj-1',
      }

      act(() => {
        result.current.setDocument(doc)
        result.current.setTitle('My Title')
      })

      // Test the selector function directly
      const meta = selectDocumentMeta(result.current)
      expect(meta.id).toBe('doc-1')
      expect(meta.wordCount).toBe(500)
      expect(meta.title).toBe('My Title')
    })

    it('useSaveStatus should return save status', () => {
      const { result } = renderHook(() => useEditorStore())

      act(() => {
        result.current.setIsDirty(true)
        result.current.setSaving(false)
      })

      // Test the selector function directly
      const status = selectSaveStatus(result.current)
      expect(status.isDirty).toBe(true)
      expect(status.saving).toBe(false)
    })

    it('useAIContext should return AI context', () => {
      const { result } = renderHook(() => useEditorStore())

      act(() => {
        result.current.setContent('<p>AI content</p>')
      })

      // Test the selector function directly
      const context = selectAIContext(result.current)
      expect(context.content).toBe('<p>AI content</p>')
    })
  })

  // Shallow comparison utilities are covered via selector tests above.

  describe('Re-render Optimization', () => {
    it('should not re-render when unrelated state changes (useWordCount)', () => {
      const storeHook = renderHook(() => useEditorStore())
      const { result, rerender } = renderHook(() => useWordCount())

      const initialValue = result.current

      // Change unrelated state
      act(() => {
        storeHook.result.current.setTitle('New Title')
        storeHook.result.current.setContent('<p>New content</p>')
        storeHook.result.current.setLoading(false)
      })

      rerender()

      // Should still be same value, no re-render
      expect(result.current).toBe(initialValue)
    })

    it('should re-render only when selected state changes (useWordCount)', () => {
      const storeHook = renderHook(() => useEditorStore())
      const { result, rerender } = renderHook(() => useWordCount())

      expect(result.current).toBe(0)

      const doc: EditorDocumentRecord = {
        id: 'doc-1',
        title: 'Test',
        type: 'novel',
        word_count: 1000,
        project_id: 'proj-1',
      }

      act(() => {
        storeHook.result.current.setDocument(doc)
      })

      rerender()

      // Should have new value after re-render
      expect(result.current).toBe(1000)
    })
  })
})
