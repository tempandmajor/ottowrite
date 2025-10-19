import { create } from 'zustand'
import { shallow } from 'zustand/shallow'

import type { Chapter } from '@/components/editor/chapter-sidebar'

export type EditorDocumentContent = {
  html?: string
  screenplay?: any
  structure?: Chapter[]
}

export type EditorDocumentRecord = {
  id: string
  title: string
  content?: EditorDocumentContent
  type: string
  word_count: number
  project_id: string
  updated_at?: string
}

export type EditorServerContent = {
  html: string
  structure?: Chapter[] | null
  wordCount?: number
} | null

const createInitialState = () => ({
  document: null as EditorDocumentRecord | null,
  title: '',
  content: '',
  structure: [] as Chapter[],
  sceneAnchors: new Set<string>(),
  activeSceneId: null as string | null,
  loading: true,
  saving: false,
  userTier: 'free',
  projectTitle: null as string | null,
  lastSavedAt: null as Date | null,
  isDirty: false,
  baseHash: null as string | null,
  serverContent: null as EditorServerContent,
})

type EditorState = ReturnType<typeof createInitialState> & {
  setDocument: (
    document:
      | EditorDocumentRecord
      | null
      | ((prev: EditorDocumentRecord | null) => EditorDocumentRecord | null)
  ) => void
  setTitle: (title: string) => void
  setContent: (content: string | ((prev: string) => string)) => void
  setStructure: (structure: Chapter[]) => void
  setSceneAnchors: (anchors: Iterable<string>) => void
  setActiveSceneId: (sceneId: string | null) => void
  setLoading: (loading: boolean) => void
  setSaving: (saving: boolean) => void
  setUserTier: (tier: string) => void
  setProjectTitle: (title: string | null) => void
  setLastSavedAt: (date: Date | null) => void
  setIsDirty: (dirty: boolean) => void
  setBaseHash: (hash: string | null) => void
  setServerContent: (payload: EditorServerContent) => void
  reset: () => void
}

export const useEditorStore = create<EditorState>((set) => ({
  ...createInitialState(),
  setDocument: (document) =>
    set((state) => ({
      document:
        typeof document === 'function'
          ? (document as (prev: EditorDocumentRecord | null) => EditorDocumentRecord | null)(
              state.document
            )
          : document,
    })),
  setTitle: (title) => set({ title }),
  setContent: (content) =>
    set((state) => ({
      content: typeof content === 'function' ? content(state.content) : content,
    })),
  setStructure: (structure) => set({ structure }),
  setSceneAnchors: (anchors) => set({ sceneAnchors: new Set(anchors) }),
  setActiveSceneId: (sceneId) => set({ activeSceneId: sceneId }),
  setLoading: (loading) => set({ loading }),
  setSaving: (saving) => set({ saving }),
  setUserTier: (tier) => set({ userTier: tier }),
  setProjectTitle: (title) => set({ projectTitle: title }),
  setLastSavedAt: (date) => set({ lastSavedAt: date }),
  setIsDirty: (dirty) => set({ isDirty: dirty }),
  setBaseHash: (hash) => set({ baseHash: hash }),
  setServerContent: (payload) => set({ serverContent: payload }),
  reset: () => set(() => createInitialState()),
}))

// Memoized selectors for optimal performance
// These prevent re-renders when unrelated state changes

/**
 * Select word count - optimized for analytics panels
 * Only re-renders when word_count changes
 */
export const selectWordCount = (state: EditorState) => state.document?.word_count ?? 0

/**
 * Select content for analysis - optimized for AI/analytics panels
 * Only re-renders when content changes
 */
export const selectContent = (state: EditorState) => state.content

/**
 * Select structure for analytics - optimized for structure-based analysis
 * Only re-renders when structure array changes
 */
export const selectStructure = (state: EditorState) => state.structure

/**
 * Select document metadata - optimized for header/info displays
 * Only re-renders when document, title, or wordCount changes
 * Note: Returns a new object on each call - use with shallow comparison
 */
export const selectDocumentMeta = (state: EditorState) => ({
  id: state.document?.id,
  title: state.title,
  type: state.document?.type,
  wordCount: state.document?.word_count ?? 0,
  projectId: state.document?.project_id,
})

/**
 * Select save status - optimized for status indicators
 * Only re-renders when save-related state changes
 * Note: Returns a new object on each call - use with shallow comparison
 */
export const selectSaveStatus = (state: EditorState) => ({
  isDirty: state.isDirty,
  saving: state.saving,
  lastSavedAt: state.lastSavedAt,
})

/**
 * Select content for AI operations - optimized for AI panels
 * Returns both content and structure for AI context
 * Note: Returns a new object on each call - use with shallow comparison
 */
export const selectAIContext = (state: EditorState) => ({
  content: state.content,
  structure: state.structure,
  type: state.document?.type,
  wordCount: state.document?.word_count ?? 0,
})

/**
 * Select scene navigation data - optimized for chapter sidebar
 * Only re-renders when structure or active scene changes
 * Note: Returns a new object on each call - use with shallow comparison
 */
export const selectSceneNavigation = (state: EditorState) => ({
  structure: state.structure,
  activeSceneId: state.activeSceneId,
  sceneAnchors: state.sceneAnchors,
})

/**
 * Hook for using editor store with shallow comparison
 * Prevents re-renders when selecting multiple primitive values
 *
 * @example
 * const { title, wordCount } = useEditorStoreShallow(
 *   state => ({ title: state.title, wordCount: state.document?.word_count })
 * )
 */
export function useEditorStoreShallow<T>(selector: (state: EditorState) => T): T {
  return useEditorStore(selector, shallow)
}

/**
 * Hook for selecting word count without re-rendering on other changes
 */
export function useWordCount() {
  return useEditorStore(selectWordCount)
}

/**
 * Hook for selecting content without re-rendering on other changes
 */
export function useEditorContent() {
  return useEditorStore(selectContent)
}

/**
 * Hook for selecting document metadata without re-rendering on content changes
 * Uses shallow comparison to prevent re-renders when object properties have same values
 */
export function useDocumentMeta() {
  return useEditorStore(
    (state) => ({
      id: state.document?.id,
      title: state.title,
      type: state.document?.type,
      wordCount: state.document?.word_count ?? 0,
      projectId: state.document?.project_id,
    }),
    shallow
  )
}

/**
 * Hook for selecting save status without re-rendering on content changes
 * Uses shallow comparison to prevent re-renders when object properties have same values
 */
export function useSaveStatus() {
  return useEditorStore(
    (state) => ({
      isDirty: state.isDirty,
      saving: state.saving,
      lastSavedAt: state.lastSavedAt,
    }),
    shallow
  )
}

/**
 * Hook for selecting AI context without re-rendering on unrelated changes
 * Uses shallow comparison to prevent re-renders when object properties have same values
 */
export function useAIContext() {
  return useEditorStore(
    (state) => ({
      content: state.content,
      structure: state.structure,
      type: state.document?.type,
      wordCount: state.document?.word_count ?? 0,
    }),
    shallow
  )
}
