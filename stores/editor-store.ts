import { create } from 'zustand'

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
