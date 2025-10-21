'use client'

import { useCallback, useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { type TiptapEditorApi } from '@/components/editor/tiptap-editor'
import { type ScreenplayEditorApi, type ScreenplayElement } from '@/components/editor/screenplay-editor'
import type { Chapter } from '@/components/editor/chapter-sidebar'
import { computeClientContentHash } from '@/lib/client-content-hash'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useAutosave } from '@/hooks/use-autosave'
import { useDocumentSnapshots } from '@/hooks/use-document-snapshots'
import { useUndoRedo } from '@/hooks/use-undo-redo'
import { useEditorStore, type EditorDocumentRecord } from '@/stores/editor-store'
import {
  ArrowLeft,
  Save,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  FileDown,
  History,
  Search,
  Sparkles,
  MoreHorizontal,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow'

// Lazy load heavy editor components - they're only needed when user starts editing
const TiptapEditor = lazy(() =>
  import('@/components/editor/tiptap-editor').then((mod) => ({ default: mod.TiptapEditor }))
)
const ScreenplayEditor = lazy(() =>
  import('@/components/editor/screenplay-editor').then((mod) => ({ default: mod.ScreenplayEditor }))
)

// Lazy load panels that are hidden by default
const AIAssistant = lazy(() => import('@/components/editor/ai-assistant').then((mod) => ({ default: mod.AIAssistant })))
const EnsembleGenerator = lazy(() => import('@/components/ai/ensemble-generator').then((mod) => ({ default: mod.EnsembleGenerator })))
const BackgroundTaskMonitor = lazy(() => import('@/components/ai/background-task-monitor').then((mod) => ({ default: mod.BackgroundTaskMonitor })))
const ResearchPanel = lazy(() => import('@/components/research/research-panel').then((mod) => ({ default: mod.ResearchPanel })))
const ReadabilityPanel = lazy(() => import('@/components/analysis/readability').then((mod) => ({ default: mod.ReadabilityPanel })))
const ReadingPacingPanel = lazy(() => import('@/components/analysis/reading-pacing-panel').then((mod) => ({ default: mod.ReadingPacingPanel })))

// Lazy load modals that are only shown on demand
const ExportModal = lazy(() => import('@/components/editor/export-modal').then((mod) => ({ default: mod.ExportModal })))
const VersionHistory = lazy(() => import('@/components/editor/version-history').then((mod) => ({ default: mod.VersionHistory })))

// Eagerly load critical components that are always visible
import { ChapterSidebar } from '@/components/editor/chapter-sidebar'
import { ScreenplayActBoard } from '@/components/editor/screenplay-act-board'
import { ConflictResolutionPanel } from '@/components/editor/conflict-resolution-panel'
import { AutosaveErrorAlert } from '@/components/editor/autosave-error-alert'
import { UndoRedoControls } from '@/components/editor/undo-redo-controls'
import { DocumentMetadataForm } from '@/components/editor/document-metadata-form'
import { InlineAnalyticsPanel } from '@/components/editor/inline-analytics-panel'
import type { ScreenplayAct } from '@/types/screenplay'
import { ReadingTimeWidget } from '@/components/editor/reading-time-widget'
import { CharacterSceneIndex } from '@/components/editor/character-scene-index'

// Loading fallback component
const EditorLoadingFallback = () => (
  <div className="flex items-center justify-center h-full">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4" />
      <p className="text-sm text-muted-foreground">Loading editor...</p>
    </div>
  </div>
)

const cloneStructure = (chapters: Chapter[]): Chapter[] =>
  chapters.map((chapter) => ({
    ...chapter,
    scenes: (chapter.scenes ?? []).map((scene) => ({
      ...scene,
      metadata: scene.metadata ? { ...scene.metadata } : undefined,
    })),
  }))

const isScriptType = (type?: string) => type === 'screenplay' || type === 'play'

const generateClientId = () =>
  typeof globalThis !== 'undefined' &&
  globalThis.crypto &&
  typeof globalThis.crypto.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const anchorSpanRegex = /<span[^>]*data-scene-anchor=["']true["'][^>]*data-scene-id=["']([^"']+)["'][^>]*>/gi

function extractSceneAnchors(html?: string): string[] {
  if (!html) return []
  const ids = new Set<string>()
  let match: RegExpExecArray | null
  while ((match = anchorSpanRegex.exec(html)) !== null) {
    if (match[1]) ids.add(match[1])
  }
  return Array.from(ids)
}

const SCREENPLAY_BLUEPRINT: Array<{ title: string; sequences: string[] }> = [
  { title: 'Act I', sequences: ['Setup', 'Catalyst'] },
  { title: 'Act II', sequences: ['Midpoint Build', 'All Is Lost'] },
  { title: 'Act III', sequences: ['Finale', 'Resolution'] },
]

const cloneScreenplayStructure = (acts: ScreenplayAct[]): ScreenplayAct[] =>
  acts.map((act) => ({
    ...act,
    sequences: act.sequences.map((sequence) => ({
      ...sequence,
      sceneIds: [...sequence.sceneIds],
    })),
  }))

const flattenScreenplaySceneIds = (acts: ScreenplayAct[]): string[] => {
  const seen = new Set<string>()
  const ordered: string[] = []
  acts.forEach((act) => {
    act.sequences.forEach((sequence) => {
      sequence.sceneIds.forEach((id) => {
        if (!seen.has(id)) {
          seen.add(id)
          ordered.push(id)
        }
      })
    })
  })
  return ordered
}

function createDefaultScreenplayStructure(scenes: ScreenplayElement[]): ScreenplayAct[] {
  const sanitizedScenes = scenes.filter((scene) => scene && typeof scene.id === 'string')
  const totalScenes = sanitizedScenes.length
  const totalSequences = SCREENPLAY_BLUEPRINT.reduce(
    (sum, act) => sum + act.sequences.length,
    0
  )
  const chunkSize = Math.max(1, Math.ceil(totalScenes / Math.max(totalSequences, 1)))
  let cursor = 0

  const acts = SCREENPLAY_BLUEPRINT.map((actBlueprint, actIndex) => {
    const sequences = actBlueprint.sequences.map((sequenceTitle, sequenceIndex) => {
      const start = cursor
      const end = Math.min(start + chunkSize, sanitizedScenes.length)
      const assignedScenes = sanitizedScenes.slice(start, end)
      cursor = end

      return {
        id: `${actIndex + 1}-${sequenceIndex + 1}-${generateClientId()}`,
        title: sequenceTitle,
        summary: null,
        color: null,
        sceneIds: assignedScenes.map((scene) => scene.id),
      }
    })

    return {
      id: `${actIndex + 1}-${generateClientId()}`,
      title: actBlueprint.title,
      summary: null,
      sequences,
    }
  })

  const remaining = sanitizedScenes.slice(cursor)
  if (remaining.length > 0 && acts.length > 0) {
    const lastSequence =
      acts[acts.length - 1].sequences[acts[acts.length - 1].sequences.length - 1]
    lastSequence.sceneIds = [...lastSequence.sceneIds, ...remaining.map((scene) => scene.id)]
  }

  if (acts.length === 0) {
    return [
      {
        id: `1-${generateClientId()}`,
        title: 'Act I',
        summary: null,
        sequences: [
          {
            id: `1-1-${generateClientId()}`,
            title: 'Sequence 1',
            summary: null,
            color: null,
            sceneIds: [],
          },
        ],
      },
    ]
  }

  return acts
}

function sanitiseScreenplayStructure(
  current: ScreenplayAct[] | null | undefined,
  scenes: ScreenplayElement[]
): ScreenplayAct[] {
  const sceneMap = new Map(
    scenes
      .filter((scene) => scene && typeof scene.id === 'string')
      .map((scene, index) => [scene.id, { scene, index }])
  )

  let baseStructure =
    current && Array.isArray(current) && current.length > 0
      ? cloneScreenplayStructure(current)
      : createDefaultScreenplayStructure(scenes)

  baseStructure = baseStructure.map((act, actIndex) => {
    const sequences =
      act.sequences && act.sequences.length > 0
        ? act.sequences.map((sequence, sequenceIndex) => ({
            ...sequence,
            id: sequence.id || `${actIndex + 1}-${sequenceIndex + 1}-${generateClientId()}`,
            title: sequence.title || `Sequence ${sequenceIndex + 1}`,
            sceneIds: Array.from(
              new Set((sequence.sceneIds ?? []).filter((sceneId) => sceneMap.has(sceneId)))
            ),
          }))
        : [
            {
              id: `${actIndex + 1}-1-${generateClientId()}`,
              title: 'Sequence 1',
              summary: null,
              color: null,
              sceneIds: [],
            },
          ]

    return {
      id: act.id || `${actIndex + 1}-${generateClientId()}`,
      title: act.title || `Act ${actIndex + 1}`,
      summary: act.summary ?? null,
      sequences,
    }
  })

  const assigned = new Set<string>()
  baseStructure.forEach((act) =>
    act.sequences.forEach((sequence) =>
      sequence.sceneIds.forEach((sceneId) => assigned.add(sceneId))
    )
  )

  const unassignedScenes = scenes
    .filter((scene) => scene && typeof scene.id === 'string')
    .filter((scene) => !assigned.has(scene.id))
    .map((scene) => scene.id)

  if (unassignedScenes.length > 0) {
    if (baseStructure.length === 0) {
      baseStructure = createDefaultScreenplayStructure(scenes)
    }
    const targetSequence =
      baseStructure[0]?.sequences[0] ??
      ({
        id: `1-1-${generateClientId()}`,
        title: 'Sequence 1',
        summary: null,
        color: null,
        sceneIds: [],
      } satisfies ScreenplayAct['sequences'][number])
    targetSequence.sceneIds = [...targetSequence.sceneIds, ...unassignedScenes]
    if (!baseStructure[0]) {
      baseStructure = [
        {
          id: `1-${generateClientId()}`,
          title: 'Act I',
          summary: null,
          sequences: [targetSequence],
        },
      ]
    } else if (!baseStructure[0].sequences.includes(targetSequence)) {
      baseStructure[0] = {
        ...baseStructure[0],
        sequences: [targetSequence, ...baseStructure[0].sequences],
      }
    }
  }

  return baseStructure
}

const screenplayStructuresEqual = (a: ScreenplayAct[], b: ScreenplayAct[]) => {
  if (a === b) return true
  return JSON.stringify(a) === JSON.stringify(b)
}

export function EditorWorkspace({ workspaceMode }: { workspaceMode: boolean }) {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const {
    document,
    title,
    content,
    structure,
    activeSceneId,
    loading,
    saving,
    userTier,
    projectTitle,
    lastSavedAt,
    isDirty,
    sceneAnchors,
    baseHash,
    serverContent,
    metadata,
    setDocument,
    setTitle,
    setContent,
    setStructure,
    setMetadata,
    setSceneAnchors,
    setActiveSceneId,
    setLoading,
    setSaving,
    setUserTier,
    setProjectTitle,
    setLastSavedAt,
    setIsDirty,
    setBaseHash,
    setServerContent,
    reset: resetEditorState,
  } = useEditorStore()
  const isWorkspaceMode = workspaceMode
  const [showAI, setShowAI] = useState(() => !isWorkspaceMode)
  const [structureSidebarOpen, setStructureSidebarOpen] = useState(() => !isWorkspaceMode)
  const [utilitySidebarOpen, setUtilitySidebarOpen] = useState(() => !isWorkspaceMode)
  const [showExportModal, setShowExportModal] = useState(false)
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [screenplayStructure, setScreenplayStructure] = useState<ScreenplayAct[]>([])
  const lastSceneFocusMissRef = useRef<string | null>(null)
  const tiptapApiRef = useRef<TiptapEditorApi | null>(null)
  const screenplayApiRef = useRef<ScreenplayEditorApi | null>(null)
  const previousWordCountRef = useRef<number>(0)

  // Initialize snapshot manager
  const snapshotAPI = useDocumentSnapshots({
    enabled: Boolean(document?.id),
    maxSnapshots: 50,
  })

  // Initialize undo/redo with persistence
  const undoRedoAPI = useUndoRedo({
    documentId: document?.id ?? null,
    userId,
    snapshotManager: snapshotAPI.hasSnapshots ? (snapshotAPI as any) : null,
    enabled: Boolean(document?.id && userId),
    maxStackSize: 100,
    autoPersist: true,
    persistInterval: 5000,
  })

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setShowAI(false)
    }
  }, [])

  useEffect(() => {
    if (isWorkspaceMode) {
      setStructureSidebarOpen(false)
      setUtilitySidebarOpen(false)
      setShowAI(false)
    }
  }, [isWorkspaceMode])

  useEffect(() => {
    return () => {
      resetEditorState()
    }
  }, [resetEditorState])

  const activeSceneInfo = useMemo(() => {
    if (!activeSceneId) return null
    for (const chapter of structure) {
      const scene = chapter.scenes?.find((item) => item.id === activeSceneId)
      if (scene) {
        return {
          id: scene.id,
          title: scene.title ?? '',
          chapterTitle: chapter.title ?? '',
        }
      }
    }
    return null
  }, [activeSceneId, structure])

  const missingAnchors = useMemo(() => {
    const missing = new Set<string>()
    structure.forEach((chapter) => {
      chapter.scenes?.forEach((scene) => {
        if (scene.id && !sceneAnchors.has(scene.id)) {
          missing.add(scene.id)
        }
      })
    })
    return missing
  }, [structure, sceneAnchors])

  const loadDocument = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
        return
      }

      // Set user ID for undo/redo
      setUserId(user.id)

      // Get user profile for tier info
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('subscription_tier')
        .eq('id', user.id)
        .maybeSingle()

      if (!profileError && profile) {
        setUserTier(profile.subscription_tier || 'free')
      } else {
        setUserTier('free')
      }

      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', params.id)
        .eq('user_id', user.id)
        .single()

      if (error) throw error

      if (!data) {
        toast({
          title: 'Error',
          description: 'Document not found',
          variant: 'destructive',
        })
        router.push('/dashboard/documents')
        return
      }

      let typedData = data as EditorDocumentRecord
      let normalizedContent = typedData.content ?? {}

      if (isScriptType(typedData.type)) {
        const rawScreenplay = Array.isArray(normalizedContent.screenplay)
          ? (normalizedContent.screenplay as ScreenplayElement[])
          : []

        const normalizedScreenplay = rawScreenplay.map((element, index) => ({
          id: element?.id || `${index + 1}-${generateClientId()}`,
          type: (element?.type as ScreenplayElement['type']) ?? 'action',
          content: element?.content ?? (element as any)?.text ?? '',
        }))

        const sceneElements = normalizedScreenplay.filter(
          (element) => element.type === 'scene'
        )

        const initialStructure = sanitiseScreenplayStructure(
          normalizedContent.screenplayStructure as ScreenplayAct[] | null | undefined,
          sceneElements
        )

        normalizedContent = {
          ...normalizedContent,
          screenplay: normalizedScreenplay,
          screenplayStructure: initialStructure,
        }

        typedData = {
          ...typedData,
          content: normalizedContent,
        }
      }

      setDocument(typedData)
      setTitle(typedData.title)
      setLastSavedAt(typedData.updated_at ? new Date(typedData.updated_at) : new Date())
      setIsDirty(false)
      setServerContent(null)

      if (isScriptType(typedData.type)) {
        const screenplayElements = (normalizedContent.screenplay as ScreenplayElement[]) ?? []
        const initialStructure =
          (normalizedContent.screenplayStructure as ScreenplayAct[]) ?? []

        setContent(JSON.stringify(screenplayElements))
        setScreenplayStructure(cloneScreenplayStructure(initialStructure))
        setStructure([])
        setActiveSceneId(null)
        setSceneAnchors(flattenScreenplaySceneIds(initialStructure))
        setBaseHash(null)
      } else {
        const initialHtml = typedData.content?.html || ''
        const initialStructure = Array.isArray(typedData.content?.structure)
          ? (typedData.content?.structure as Chapter[])
          : []
        const initialMetadata = typedData.content?.metadata || {}
        const initialAnchors = extractSceneAnchors(initialHtml)

        setContent(initialHtml)
        setStructure(cloneStructure(initialStructure))
        setMetadata(initialMetadata)
        setActiveSceneId(null)
        setSceneAnchors(initialAnchors)
        setScreenplayStructure([])

        const initialHash = await computeClientContentHash({
          html: initialHtml,
          structure: initialStructure,
          anchorIds: initialAnchors,
        })
        setBaseHash(initialHash)
      }

      let resolvedProjectTitle: string | null = null
      if (typedData.project_id) {
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('title')
          .eq('id', typedData.project_id)
          .eq('user_id', user.id)
          .maybeSingle()

        if (!projectError && projectData?.title) {
          resolvedProjectTitle = projectData.title
        }
      }
      setProjectTitle(resolvedProjectTitle)
    } catch (error) {
      console.error('Error loading document:', error)
      toast({
        title: 'Error',
        description: 'Failed to load document',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [
    params.id,
    router,
    toast,
    setActiveSceneId,
    setBaseHash,
    setContent,
    setDocument,
    setIsDirty,
    setLastSavedAt,
    setLoading,
    setMetadata,
    setProjectTitle,
    setSceneAnchors,
    setServerContent,
    setStructure,
    setTitle,
    setUserTier,
  ])

  useEffect(() => {
    loadDocument()
  }, [loadDocument])

  useEffect(() => {
    if (!activeSceneId) return

    const exists = structure.some((chapter) =>
      chapter.scenes.some((scene) => scene.id === activeSceneId)
    )

    if (!exists) {
      setActiveSceneId(null)
    }
  }, [activeSceneId, setActiveSceneId, structure])

  const saveDocument = useCallback(async () => {
    if (!document) return

    setSaving(true)
    try {
      const supabase = createClient()

      // Calculate word count and prepare content based on type
      let contentData: any
      let wordCount = 0

      if (isScriptType(document.type)) {
        let screenplay: any[] = []
        try {
          screenplay = JSON.parse(content || '[]')
        } catch (parseError) {
          console.error('Error parsing screenplay content:', parseError)
          screenplay = []
        }

        const text = screenplay
          .map((el: any) => (el?.content ?? el?.text ?? ''))
          .join(' ')

        wordCount = text
          .trim()
          .split(/\s+/)
          .filter((w: string) => w.length > 0).length

        contentData = {
          screenplay,
          screenplayStructure: cloneScreenplayStructure(screenplayStructure),
        }
      } else {
        const text = content.replace(/<[^>]*>/g, ' ')
        wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length
        contentData = { html: content, structure: cloneStructure(structure), metadata }
      }

      const { error } = await supabase
        .from('documents')
        .update({
          title,
          content: contentData,
          word_count: wordCount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', document.id)

      if (error) throw error

      setDocument((prev) => {
        if (!prev) return prev
        const nextContent = isScriptType(document.type)
          ? {
              ...(prev.content ?? {}),
              ...contentData,
            }
          : {
              ...(prev.content ?? {}),
              ...contentData,
            }

        return {
          ...prev,
          title,
          content: nextContent,
          word_count: wordCount,
        }
      })
      setLastSavedAt(new Date())
      setIsDirty(false)

      if (!isScriptType(document.type)) {
        const newHash = await computeClientContentHash({
          html: content,
          structure,
          anchorIds: Array.from(sceneAnchors),
        })
        setBaseHash(newHash)
      }

      toast({
        title: 'Success',
        description: 'Document saved successfully',
      })
    } catch (error) {
      console.error('Error saving document:', error)
      toast({
        title: 'Error',
        description: 'Failed to save document',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }, [
    content,
    document,
    sceneAnchors,
    screenplayStructure,
    setBaseHash,
    setDocument,
    setIsDirty,
    setLastSavedAt,
    setSaving,
    structure,
    title,
    metadata,
    toast,
  ])

  const handleStructureChange = useCallback(
    (nextChapters: Chapter[]) => {
      setStructure(nextChapters)
    },
    [setStructure]
  )

  const handleSceneSelect = useCallback(
    (sceneId: string | null) => {
      setActiveSceneId(sceneId)
    },
    [setActiveSceneId]
  )

  const handleMetadataChange = useCallback(
    (nextMetadata: typeof metadata) => {
      setMetadata(nextMetadata)
    },
    [setMetadata]
  )

  const handleSceneCreated = useCallback(
    (_chapterId: string, sceneId: string) => {
      setActiveSceneId(sceneId)
    },
    [setActiveSceneId]
  )

  const handleInsertAnchor = useCallback(
    (sceneId: string) => {
      if (!sceneId || isScriptType(document?.type)) {
        return
      }

      setActiveSceneId(sceneId)

      window.dispatchEvent(
        new CustomEvent('editor-insert-scene-anchor', {
          detail: { sceneId },
        })
      )
    },
    [document, setActiveSceneId]
  )

  const handleAnchorsChange = useCallback(
    (anchors: Set<string>) => {
      setSceneAnchors(anchors)
    },
    [setSceneAnchors]
  )

  const handleSceneFocusResult = useCallback(
    ({ id, found }: { id: string; found: boolean }) => {
      if (!found) {
        if (lastSceneFocusMissRef.current === id) return
        lastSceneFocusMissRef.current = id
        toast({
          title: 'Scene location not found',
          description:
            'Insert an anchor for this scene or add a heading/paragraph with the scene title so navigation can jump to it.',
        })
      } else {
        lastSceneFocusMissRef.current = null
      }
    },
    [toast]
  )

  const insertAIText = (rawText: string) => {
    const normalized = rawText.replace(/\r\n/g, '\n')
    if (!normalized.trim()) return

    if (isScriptType(document?.type)) {
      if (screenplayApiRef.current) {
        screenplayApiRef.current.insertTextAtCursor(normalized)
        return
      }

      const segments = normalized
        .split(/\n{2,}/)
        .map((segment) => segment.trim())
        .filter((segment) => segment.length > 0)

      if (segments.length === 0) return

      setContent((prev) => {
        let screenplay: any[] = []
        try {
          screenplay = JSON.parse(prev || '[]')
        } catch (error) {
          console.error('Error parsing screenplay content for AI insert:', error)
          screenplay = []
        }

        const additions = segments.map((segment) => ({
          id: generateClientId(),
          type: 'action',
          content: segment.trim(),
        }))

        return JSON.stringify([...screenplay, ...additions])
      })
      return
    }

    const paragraphs = normalized
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter((paragraph) => paragraph.length > 0)

    if (paragraphs.length === 0) return

    const htmlSnippet = paragraphs
      .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br />')}</p>`)
      .join('')

    if (tiptapApiRef.current) {
      tiptapApiRef.current.insertHtmlAtCursor(htmlSnippet)
      return
    }

    setContent((prev) => {
      const base = prev || ''
      return base ? base + htmlSnippet : htmlSnippet
    })
  }

  const resolveActiveSelection = useCallback(() => {
    if (isScriptType(document?.type)) {
      return screenplayApiRef.current?.getSelectedText() ?? ''
    }
    return tiptapApiRef.current?.getSelectedText() ?? ''
  }, [document?.type])

  const handleRestoreVersion = (versionContent: any, versionTitle: string) => {
    setTitle(versionTitle)
    if (isScriptType(document?.type)) {
      const restoredScreenplay = Array.isArray(versionContent?.screenplay)
        ? (versionContent.screenplay as ScreenplayElement[])
        : []
      const restoredStructure = Array.isArray(versionContent?.screenplayStructure)
        ? (versionContent.screenplayStructure as ScreenplayAct[])
        : []
      setContent(JSON.stringify(restoredScreenplay))
      setScreenplayStructure(cloneScreenplayStructure(restoredStructure))
      setSceneAnchors(flattenScreenplaySceneIds(restoredStructure))
    } else {
      setContent(versionContent?.html || '')
      const restoredStructure = Array.isArray(versionContent?.structure)
        ? (versionContent.structure as Chapter[])
        : []
      setStructure(cloneStructure(restoredStructure))
    }
    // Save immediately after restore
    setTimeout(() => saveDocument(), 100)
  }

  const screenplayContent = useMemo<ScreenplayElement[]>(() => {
    if (!isScriptType(document?.type)) return []
    try {
      const parsed = JSON.parse(content || '[]')
      return Array.isArray(parsed) ? (parsed as ScreenplayElement[]) : []
    } catch (error) {
      console.error('Failed to parse screenplay content', error)
      return []
    }
  }, [content, document?.type])

  useEffect(() => {
    if (!document) return

    const originalTitle = document.title || ''
    const originalSignature = isScriptType(document.type)
      ? JSON.stringify({
          screenplay: document.content?.screenplay || [],
          screenplayStructure: document.content?.screenplayStructure || [],
        })
      : JSON.stringify({
          html: document.content?.html || '',
          structure: document.content?.structure || [],
        })

    const currentSignature = isScriptType(document.type)
      ? JSON.stringify({
          screenplay: screenplayContent,
          screenplayStructure,
        })
      : JSON.stringify({ html: content, structure })

    setIsDirty(currentSignature !== originalSignature || title !== originalTitle)
  }, [
    content,
    document,
    screenplayContent,
    screenplayStructure,
    setIsDirty,
    structure,
    title,
  ])

  const screenplayScenes = useMemo(() => {
    if (!isScriptType(document?.type)) return [] as ScreenplayElement[]
    return screenplayContent.filter((element) => element.type === 'scene')
  }, [document?.type, screenplayContent])

  const handleScreenplayStructureChange = useCallback(
    (nextActs: ScreenplayAct[]) => {
      setScreenplayStructure((prev) => {
        const sanitized = sanitiseScreenplayStructure(nextActs, screenplayScenes)
        const anchors = flattenScreenplaySceneIds(sanitized)
        setSceneAnchors(anchors)

        if (screenplayStructuresEqual(prev, sanitized)) {
          return prev
        }
        return cloneScreenplayStructure(sanitized)
      })
    },
    [screenplayScenes, setSceneAnchors]
  )

  const screenplaySceneMeta = useMemo(() => {
    const meta: Record<string, { label: string; index: number }> = {}
    screenplayScenes.forEach((scene, index) => {
      if (!scene?.id) return
      const normalized = (scene.content ?? '').trim()
      meta[scene.id] = {
        label: normalized.length > 0 ? normalized : `Scene ${index + 1}`,
        index,
      }
    })
    return meta
  }, [screenplayScenes])

  const wordCount = useMemo(() => {
    if (!document) return 0
    if (isScriptType(document.type)) {
      const text = screenplayContent
        .map((el) => el?.content ?? (el as unknown as { text?: string })?.text ?? '')
        .join(' ')
      return text
        .trim()
        .split(/\s+/)
        .filter((w) => w.length > 0).length
    }
    const text = content.replace(/<[^>]*>/g, ' ')
    return text
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0).length
  }, [document, content, screenplayContent])

  useEffect(() => {
    if (!document || !isScriptType(document.type)) return
    setScreenplayStructure((prev) => {
      const next = sanitiseScreenplayStructure(prev, screenplayScenes)
      const anchors = flattenScreenplaySceneIds(next)
      setSceneAnchors(anchors)
      if (screenplayStructuresEqual(prev, next)) {
        return prev
      }
      return cloneScreenplayStructure(next)
    })
  }, [document, screenplayScenes, setSceneAnchors])


  const isProseDocument = Boolean(document && !isScriptType(document.type))

  const autosaveSnapshot = useMemo(() => {
    if (!isProseDocument) {
      return { html: '', structure: [], metadata: {} }
    }
    return {
      html: content,
      structure,
      metadata,
    }
  }, [content, isProseDocument, structure, metadata])

  const handleAutosaveConflict = useCallback(
    ({ html, structure, wordCount }: { html: string; structure?: unknown; wordCount?: number }) => {
      toast({
        title: 'Autosave conflict',
        description: 'Another session updated this document. Review changes before continuing.',
        variant: 'destructive',
      })

      const conflictStructure = Array.isArray(structure)
        ? cloneStructure(structure as Chapter[])
        : null

      setServerContent({
        html,
        structure: conflictStructure,
        wordCount: typeof wordCount === 'number' ? wordCount : undefined,
      })
    },
    [setServerContent, toast]
  )

  const handleExportClick = useCallback(async () => {
    // Create a preview snapshot before export
    try {
      await snapshotAPI.createPreviewSnapshot(
        autosaveSnapshot,
        Array.from(sceneAnchors),
        wordCount
      )
    } catch (err) {
      console.warn('Failed to create preview snapshot:', err)
    }
    setShowExportModal(true)
  }, [snapshotAPI, autosaveSnapshot, sceneAnchors, wordCount])

  const handleUndo = useCallback(async () => {
    const snapshot = await undoRedoAPI.undo()
    if (snapshot && snapshot.content.html) {
      setContent(snapshot.content.html)
      if (snapshot.content.structure && Array.isArray(snapshot.content.structure)) {
        setStructure(snapshot.content.structure as Chapter[])
      }
      previousWordCountRef.current = snapshot.metadata.wordCount
      toast({
        title: 'Undo successful',
        description: `Restored to ${snapshot.metadata.label || 'previous version'}`,
      })
    }
  }, [undoRedoAPI, setContent, setStructure, toast])

  const handleRedo = useCallback(async () => {
    const snapshot = await undoRedoAPI.redo()
    if (snapshot && snapshot.content.html) {
      setContent(snapshot.content.html)
      if (snapshot.content.structure && Array.isArray(snapshot.content.structure)) {
        setStructure(snapshot.content.structure as Chapter[])
      }
      previousWordCountRef.current = snapshot.metadata.wordCount
      toast({
        title: 'Redo successful',
        description: `Restored to ${snapshot.metadata.label || 'next version'}`,
      })
    }
  }, [undoRedoAPI, setContent, setStructure, toast])

  const { status: autosaveStatus, error: autosaveError, flush: flushAutosave } = useAutosave({
    documentId: document?.id ?? null,
    enabled: Boolean(isProseDocument && document && !serverContent),
    snapshot: autosaveSnapshot,
    sceneAnchors,
    wordCount,
    baseHash,
    onBaseHashChange: (hash) => {
      setBaseHash(hash)
      if (hash) {
        setLastSavedAt(new Date())
      }
    },
    onConflict: handleAutosaveConflict,
    onAfterSave: () => {
      if (!isProseDocument) return
      setDocument((prev) =>
        prev
          ? {
              ...prev,
              content: {
                ...(prev.content ?? {}),
                html: content,
                structure,
              },
              word_count: wordCount,
            }
          : prev
      )
      setIsDirty(false)
    },
    // Create autosave snapshot before saving
    onBeforeSave: async (snapshot, wordCount) => {
      try {
        const createdSnapshot = await snapshotAPI.createSnapshot(snapshot, Array.from(sceneAnchors), {
          source: 'autosave',
          wordCount,
        })

        // Push to undo stack
        const previousCount = previousWordCountRef.current
        await undoRedoAPI.push(createdSnapshot, previousCount, 'Auto save')
        previousWordCountRef.current = wordCount
      } catch (err) {
        console.warn('Failed to create autosave snapshot:', err)
      }
    },
    // Track successful save with snapshot hash
    onSnapshotCreated: async () => {},
  })

  const autosaveLabelData = useMemo(() => {
    switch (autosaveStatus) {
      case 'saving':
        return { label: 'Autosaving…', className: 'text-muted-foreground' }
      case 'saved':
        return { label: 'All changes saved', className: 'text-muted-foreground' }
      case 'pending':
        return { label: 'Autosave pending…', className: 'text-muted-foreground' }
      case 'offline':
        return { label: 'Offline – retrying…', className: 'text-amber-600' }
      case 'error':
        return { label: autosaveError ? autosaveError : 'Autosave failed', className: 'text-destructive' }
      case 'conflict':
        return { label: 'Autosave conflict', className: 'text-amber-600' }
      default:
        return { label: 'Autosave idle', className: 'text-muted-foreground' }
    }
  }, [autosaveError, autosaveStatus])

  const autosaveLabel = autosaveLabelData.label
  const autosaveClassName = autosaveLabelData.className

  const savedMessage = isDirty
    ? 'Unsaved changes'
    : lastSavedAt
    ? `Saved ${formatDistanceToNow(lastSavedAt, { addSuffix: true })}`
    : 'Saved'

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">Loading document...</p>
      </div>
    )
  }

  if (!document) {
    return null
  }

  const editorElement = (
    <Suspense fallback={<EditorLoadingFallback />}>
      {isScriptType(document.type) ? (
        <ScreenplayEditor
          content={screenplayContent}
          onUpdate={(newContent) => setContent(JSON.stringify(newContent))}
          onReady={(api) => {
            screenplayApiRef.current = api
          }}
        />
      ) : (
        <TiptapEditor
          content={content}
          onUpdate={setContent}
          placeholder="Start writing your story..."
          focusScene={activeSceneInfo}
          onAnchorsChange={handleAnchorsChange}
          onSceneFocusResult={handleSceneFocusResult}
          remoteContent={serverContent}
          conflictVisible={autosaveStatus === 'conflict'}
          onReplaceWithServer={async () => {
            if (!serverContent) return
            const nextStructure = Array.isArray(serverContent.structure)
              ? cloneStructure(serverContent.structure)
              : cloneStructure(structure)
            setContent(serverContent.html)
            setStructure(nextStructure)
            const anchorIds = extractSceneAnchors(serverContent.html)
            setSceneAnchors(anchorIds)
            const newHash = await computeClientContentHash({
              html: serverContent.html,
              structure: nextStructure,
              anchorIds,
            })
            setBaseHash(newHash)
            setLastSavedAt(new Date())
            setDocument((prev) =>
              prev
                ? {
                    ...prev,
                    content: {
                      ...(prev.content ?? {}),
                      html: serverContent.html,
                      structure: nextStructure,
                    },
                    word_count: serverContent.wordCount ?? prev.word_count,
                  }
                : prev
            )
            setIsDirty(false)
            setServerContent(null)
            flushAutosave()
          }}
          onCloseConflict={() => {
            setServerContent(null)
            flushAutosave()
          }}
          onReady={(api) => {
            tiptapApiRef.current = api
          }}
        />
      )}
    </Suspense>
  )

  if (isWorkspaceMode) {
    const workspaceContentClasses = cn(
      'flex-1 overflow-auto px-4 py-6 sm:px-6 lg:px-12',
      structureSidebarOpen ? 'lg:pl-[380px]' : '',
      showAI ? 'lg:pr-[400px]' : ''
    )

    const workspaceOutlineOverlay = structureSidebarOpen ? (
      <div
        className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm"
        role="button"
        tabIndex={0}
        onClick={() => setStructureSidebarOpen(false)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            setStructureSidebarOpen(false)
          }
        }}
      >
        <div
          className="absolute left-1/2 top-20 flex h-[calc(100vh-8rem)] w-[min(92vw,420px)] -translate-x-1/2 flex-col overflow-hidden rounded-2xl border bg-card shadow-xl lg:left-8 lg:top-20 lg:h-[calc(100vh-6.5rem)] lg:w-[360px] lg:translate-x-0"
          role="presentation"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b px-4 py-3">
            <span className="text-sm font-semibold">Outline</span>
            <Button variant="ghost" size="icon" onClick={() => setStructureSidebarOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-6">
            {isScriptType(document.type) ? (
              <ScreenplayActBoard
                acts={screenplayStructure}
                onChange={handleScreenplayStructureChange}
                sceneMeta={screenplaySceneMeta}
              />
            ) : (
              <div className="space-y-4">
                <ChapterSidebar
                  chapters={structure}
                  onChange={handleStructureChange}
                  activeSceneId={activeSceneId}
                  onSelectScene={handleSceneSelect}
                  onCreateScene={handleSceneCreated}
                  onInsertAnchor={handleInsertAnchor}
                  missingAnchors={missingAnchors}
                />
                <ReadingTimeWidget
                  content={content}
                  wordCount={wordCount}
                  structure={structure}
                />
                <CharacterSceneIndex
                  content={content}
                  structure={structure}
                  onNavigateToScene={handleSceneSelect}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    ) : null

    const workspaceAssistantOverlay = showAI ? (
      <div
        className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm"
        role="button"
        tabIndex={0}
        onClick={() => setShowAI(false)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            setShowAI(false)
          }
        }}
      >
        <div
          className="absolute right-1/2 top-20 flex h-[calc(100vh-8rem)] w-[min(92vw,420px)] translate-x-1/2 flex-col overflow-hidden rounded-2xl border bg-card shadow-xl lg:right-8 lg:top-20 lg:h-[calc(100vh-6.5rem)] lg:w-[380px] lg:translate-x-0"
          role="presentation"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b px-4 py-3">
            <span className="text-sm font-semibold">AI Assistant</span>
            <Button variant="ghost" size="icon" onClick={() => setShowAI(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <Suspense fallback={<div className="text-sm text-muted-foreground">Loading AI assistant...</div>}>
              <AIAssistant
                documentId={document.id}
                currentContent={content}
                onInsertText={insertAIText}
                getSelection={resolveActiveSelection}
              />
            </Suspense>
          </div>
        </div>
      </div>
    ) : null

    return (
      <>
        <div className="flex min-h-screen flex-col bg-background">
          <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b bg-background px-4 sm:px-6 lg:px-10">
            <div className="flex flex-1 items-center gap-3">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/documents">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to documents
                </Link>
              </Button>
              <div className="flex min-w-0 flex-1 flex-col">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full truncate border-none bg-transparent text-xl font-semibold text-foreground outline-none focus-visible:ring-0"
                  placeholder="Untitled document"
                />
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className={isDirty ? 'text-amber-600' : 'text-muted-foreground'}>{savedMessage}</span>
                  <span className="h-3 w-px bg-border" aria-hidden />
                  <span className={autosaveClassName}>{autosaveLabel}</span>
                </div>
              </div>
            </div>
            <div className="hidden items-center gap-2 md:flex">
              <UndoRedoControls
                canUndo={undoRedoAPI.canUndo}
                canRedo={undoRedoAPI.canRedo}
                undoStackSize={undoRedoAPI.undoStackSize}
                redoStackSize={undoRedoAPI.redoStackSize}
                onUndo={handleUndo}
                onRedo={handleRedo}
                getUndoHistory={undoRedoAPI.getUndoHistory}
                getRedoHistory={undoRedoAPI.getRedoHistory}
              />
              <Button variant="outline" size="sm" onClick={() => setStructureSidebarOpen(true)}>
                <PanelLeftOpen className="mr-2 h-4 w-4" />
                Outline
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowAI(true)}>
                <Sparkles className="mr-2 h-4 w-4" />
                AI Assistant
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportClick}>
                <FileDown className="mr-2 h-4 w-4" />
                Export
              </Button>
              <Button size="sm" onClick={saveDocument} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
            <div className="flex items-center gap-2 md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <MoreHorizontal className="h-4 w-4" />
                    Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onSelect={(event) => {
                      event.preventDefault()
                      setStructureSidebarOpen(true)
                    }}
                    className="flex items-center gap-2"
                  >
                    <PanelLeftOpen className="h-4 w-4" />
                    Outline
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={(event) => {
                      event.preventDefault()
                      setShowAI(true)
                    }}
                    className="flex items-center gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    AI Assistant
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={(event) => {
                      event.preventDefault()
                      handleExportClick()
                    }}
                    className="flex items-center gap-2"
                  >
                    <FileDown className="h-4 w-4" />
                    Export document
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={async (event) => {
                      event.preventDefault()
                      await saveDocument()
                    }}
                    className="flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Save
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main className="relative flex flex-1 overflow-hidden bg-muted/20">
            <div className={workspaceContentClasses}>
              <div className="mx-auto flex max-w-[1100px] flex-col gap-6">
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <Badge variant="muted" className="capitalize">
                      {document.type}
                    </Badge>
                    <span>{wordCount.toLocaleString()} words</span>
                  </div>
                  {projectTitle ? (
                    <Link
                      href={`/dashboard/projects/${document.project_id}`}
                      className="text-xs font-medium text-primary hover:text-primary/80"
                    >
                      {projectTitle}
                    </Link>
                  ) : null}
                </div>
                <div className="overflow-hidden rounded-3xl border bg-card shadow-card">
                  <div className="p-6 sm:p-8 lg:p-10">
                    {editorElement}
                  </div>
                </div>
              </div>
            </div>
            {workspaceOutlineOverlay}
            {workspaceAssistantOverlay}
          </main>
        </div>

        {showExportModal && (
          <Suspense fallback={null}>
            <ExportModal
              open={showExportModal}
              onOpenChange={setShowExportModal}
              title={title}
              content={
                document.type === 'screenplay' || document.type === 'play'
                  ? JSON.parse(content || '[]')
                  : content
              }
              isScreenplay={document.type === 'screenplay' || document.type === 'play'}
              userTier={userTier}
            />
          </Suspense>
        )}

        {showVersionHistory && (
          <Suspense fallback={null}>
            <VersionHistory
              open={showVersionHistory}
              onOpenChange={setShowVersionHistory}
              documentId={document.id}
              onRestoreVersion={handleRestoreVersion}
            />
          </Suspense>
        )}

        {serverContent && (
          <ConflictResolutionPanel
            open={true}
            localContent={content}
            serverContent={serverContent.html}
            localWordCount={wordCount}
            serverWordCount={serverContent.wordCount}
            onResolve={async (resolvedContent, resolution) => {
              if (!serverContent) return

              if (resolution === 'merged') {
                setContent(resolvedContent)
              } else if (resolution === 'server') {
                const nextStructure = Array.isArray(serverContent.structure)
                  ? cloneStructure(serverContent.structure)
                  : cloneStructure(structure)
                setContent(serverContent.html)
                setStructure(nextStructure)
              }

              const finalContent =
                resolution === 'server' ? serverContent.html :
                resolution === 'merged' ? resolvedContent :
                content

              const finalStructure =
                resolution === 'server' && Array.isArray(serverContent.structure)
                  ? cloneStructure(serverContent.structure)
                  : structure

              const anchorIds = extractSceneAnchors(finalContent)
              setSceneAnchors(resolution === 'local' ? sceneAnchors : new Set(anchorIds))

              const newHash = await computeClientContentHash({
                html: finalContent,
                structure: finalStructure,
                anchorIds,
              })

              setBaseHash(newHash)
              setLastSavedAt(new Date())

              setDocument((prev) =>
                prev
                  ? {
                      ...prev,
                      content: {
                        ...(prev.content ?? {}),
                        html: finalContent,
                        structure: finalStructure,
                      },
                      word_count: serverContent.wordCount ?? prev.word_count,
                    }
                  : prev
              )

              setIsDirty(false)
              setServerContent(null)
              flushAutosave()
            }}
            onRetryWithServer={async () => {
              if (!serverContent) return

              const nextStructure = Array.isArray(serverContent.structure)
                ? cloneStructure(serverContent.structure)
                : cloneStructure(structure)
              setContent(serverContent.html)
              setStructure(nextStructure)
              const anchorIds = extractSceneAnchors(serverContent.html)
              setSceneAnchors(new Set(anchorIds))

              const newHash = await computeClientContentHash({
                html: serverContent.html,
                structure: nextStructure,
                anchorIds,
              })

              setBaseHash(newHash)
              setLastSavedAt(new Date())
              setIsDirty(false)
              setServerContent(null)
              flushAutosave()
            }}
            onCancel={() => {
              setServerContent(null)
              flushAutosave()
            }}
          />
        )}
      </>
    )
  }

  const showStructureSidebar = structureSidebarOpen && Boolean(document)
  const showUtilitySidebar = utilitySidebarOpen && Boolean(document)

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center gap-4 px-4 py-4 sm:px-6 xl:px-8">
          <div className="flex flex-1 items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/documents">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to documents
              </Link>
            </Button>
            <div className="flex min-w-0 flex-1 flex-col">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full truncate border-none bg-transparent text-xl font-semibold text-foreground outline-none focus-visible:ring-0"
                placeholder="Untitled document"
              />
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {projectTitle && (
                  <Link
                    href={`/dashboard/projects/${document.project_id}`}
                    className="font-medium text-primary hover:text-primary/80"
                  >
                    {projectTitle}
                  </Link>
                )}
                <span className="h-3 w-px bg-border" aria-hidden />
                <span className="capitalize">{document.type}</span>
                <span className="h-3 w-px bg-border" aria-hidden />
                <span>{wordCount.toLocaleString()} words</span>
                <span className="h-3 w-px bg-border" aria-hidden />
                <span className={isDirty ? 'text-amber-600' : 'text-muted-foreground'}>{savedMessage}</span>
                {!isScriptType(document.type) && (
                  <>
                    <span className="h-3 w-px bg-border" aria-hidden />
                    <span className={autosaveClassName}>{autosaveLabel}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:gap-3 md:ml-auto md:w-auto md:flex-row md:gap-2">
            <div className="hidden items-center gap-2 md:flex">
              {/* Undo/Redo Controls */}
              <UndoRedoControls
                canUndo={undoRedoAPI.canUndo}
                canRedo={undoRedoAPI.canRedo}
                undoStackSize={undoRedoAPI.undoStackSize}
                redoStackSize={undoRedoAPI.redoStackSize}
                onUndo={handleUndo}
                onRedo={handleRedo}
                getUndoHistory={undoRedoAPI.getUndoHistory}
                getRedoHistory={undoRedoAPI.getRedoHistory}
              />
              <Button variant="outline" size="sm" asChild>
                <Link href={`/dashboard/editor/${document.id}/plot-analysis`}>
                  <Search className="mr-2 h-4 w-4" />
                  Plot analysis
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowVersionHistory(true)}>
                <History className="mr-2 h-4 w-4" />
                History
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportClick}>
                <FileDown className="mr-2 h-4 w-4" />
                Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStructureSidebarOpen((prev) => !prev)}
              >
                {structureSidebarOpen ? (
                  <>
                    <PanelLeftClose className="mr-2 h-4 w-4" />
                    Hide outline
                  </>
                ) : (
                  <>
                    <PanelLeftOpen className="mr-2 h-4 w-4" />
                    Show outline
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUtilitySidebarOpen((prev) => !prev)}
              >
                {utilitySidebarOpen ? (
                  <>
                    <PanelRightClose className="mr-2 h-4 w-4" />
                    Hide workspace
                  </>
                ) : (
                  <>
                    <PanelRightOpen className="mr-2 h-4 w-4" />
                    Show workspace
                  </>
                )}
              </Button>
              <DocumentMetadataForm metadata={metadata} onChange={handleMetadataChange} />
              <Button variant="outline" size="sm" onClick={() => setShowAI((prev) => !prev)}>
                {showAI ? (
                  <>
                    <PanelRightClose className="mr-2 h-4 w-4" />
                    Hide AI
                  </>
                ) : (
                  <>
                    <PanelRightOpen className="mr-2 h-4 w-4" />
                    Show AI
                  </>
                )}
              </Button>
            </div>
            <div className="flex items-center gap-2 md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <MoreHorizontal className="h-4 w-4" />
                    Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link href={`/dashboard/editor/${document.id}/plot-analysis`} className="flex items-center gap-2">
                      <Search className="h-4 w-4" />
                      Plot analysis
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={(event) => {
                      event.preventDefault()
                      setShowVersionHistory(true)
                    }}
                    className="flex items-center gap-2"
                  >
                    <History className="h-4 w-4" />
                    Version history
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={(event) => {
                      event.preventDefault()
                      handleExportClick()
                    }}
                    className="flex items-center gap-2"
                  >
                    <FileDown className="h-4 w-4" />
                    Export document
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={(event) => {
                      event.preventDefault()
                      setStructureSidebarOpen((prev) => !prev)
                    }}
                    className="flex items-center gap-2"
                  >
                    {structureSidebarOpen ? (
                      <>
                        <PanelLeftClose className="h-4 w-4" />
                        Hide outline
                      </>
                    ) : (
                      <>
                        <PanelLeftOpen className="h-4 w-4" />
                        Show outline
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={(event) => {
                      event.preventDefault()
                      setUtilitySidebarOpen((prev) => !prev)
                    }}
                    className="flex items-center gap-2"
                  >
                    {utilitySidebarOpen ? (
                      <>
                        <PanelRightClose className="h-4 w-4" />
                        Hide workspace
                      </>
                    ) : (
                      <>
                        <PanelRightOpen className="h-4 w-4" />
                        Show workspace
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={(event) => {
                      event.preventDefault()
                      setShowAI((prev) => !prev)
                    }}
                    className="flex items-center gap-2"
                  >
                    {showAI ? (
                      <>
                        <PanelRightClose className="h-4 w-4" />
                        Hide AI panel
                      </>
                    ) : (
                      <>
                        <PanelRightOpen className="h-4 w-4" />
                        Show AI panel
                      </>
                    )}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <Button onClick={saveDocument} disabled={saving} size="sm" className="w-full sm:w-auto">
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </header>

      <main
        className={cn(
          'mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:gap-8 xl:px-8',
          'flex flex-col gap-8 xl:gap-10',
          (showStructureSidebar || showUtilitySidebar) && 'lg:grid',
          showStructureSidebar &&
            showUtilitySidebar &&
            'lg:grid-cols-[minmax(220px,280px)_minmax(0,1fr)_minmax(280px,340px)]',
          showStructureSidebar &&
            !showUtilitySidebar &&
            'lg:grid-cols-[minmax(220px,280px)_minmax(0,1fr)]',
          !showStructureSidebar &&
            showUtilitySidebar &&
            'lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]'
        )}
      >
        {showStructureSidebar && document && (
          <div className="space-y-4">
            {isScriptType(document.type) ? (
              <ScreenplayActBoard
                acts={screenplayStructure}
                onChange={handleScreenplayStructureChange}
                sceneMeta={screenplaySceneMeta}
              />
            ) : (
              <>
                <ChapterSidebar
                  chapters={structure}
                  onChange={handleStructureChange}
                  activeSceneId={activeSceneId}
                  onSelectScene={handleSceneSelect}
                  onCreateScene={handleSceneCreated}
                  onInsertAnchor={handleInsertAnchor}
                  missingAnchors={missingAnchors}
                />
                <ReadingTimeWidget
                  content={content}
                  wordCount={wordCount}
                  structure={structure}
                />
                <CharacterSceneIndex
                  content={content}
                  structure={structure}
                  onNavigateToScene={handleSceneSelect}
                />
              </>
            )}
          </div>
        )}
        <div className="space-y-6">
          <Card className="border-none bg-card/80 shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Writing cockpit
              </CardTitle>
              <CardDescription>
                Stay aligned with your outline, track word count, and jump to plot analysis.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <Badge variant="muted" className="capitalize">
                {document.type}
              </Badge>
              <span className="h-4 w-px bg-border" aria-hidden />
              <span>{wordCount.toLocaleString()} words</span>
              <span className="h-4 w-px bg-border" aria-hidden />
              <Button variant="link" className="p-0" asChild>
                <Link href={`/dashboard/editor/${document.id}/plot-analysis`}>
                  Open plot analysis
                </Link>
              </Button>
            </CardContent>
          </Card>

          <div className="overflow-hidden rounded-3xl border bg-card shadow-card">
            <div className="p-4 sm:p-6 lg:p-8">
              {editorElement}
            </div>
          </div>
        </div>

        {showUtilitySidebar && (
          <div className="space-y-4">
            <InlineAnalyticsPanel
              documentType={document.type}
              contentHtml={isScriptType(document.type) ? '' : content}
              structure={isScriptType(document.type) ? undefined : structure}
              screenplayElements={isScriptType(document.type) ? screenplayContent : undefined}
              wordCount={wordCount}
            />
            <Card className="border-none bg-card/80 shadow-card">
              <CardHeader>
                <CardTitle>AI assistant</CardTitle>
                <CardDescription>
                  Brainstorm scenes, punch up dialogue, or fill in missing beats without leaving the editor.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {showAI ? (
                  <div className="max-h-[70vh] overflow-y-auto pr-1">
                    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading AI assistant...</div>}>
                      <AIAssistant
                        documentId={document.id}
                        currentContent={content}
                        onInsertText={insertAIText}
                        getSelection={resolveActiveSelection}
                      />
                    </Suspense>
                  </div>
                ) : (
                  <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed bg-muted/40 p-4 text-sm text-muted-foreground">
                    <p>AI panel hidden. Reopen it to access brainstorming and rewriting tools.</p>
                    <Button variant="outline" size="sm" onClick={() => setShowAI(true)}>
                      <PanelRightOpen className="mr-2 h-4 w-4" />
                      Show assistant
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Suspense fallback={null}>
              <EnsembleGenerator
                currentContext={content}
                onInsert={insertAIText}
                projectId={document.project_id}
                documentId={document.id}
              />
            </Suspense>

            <Suspense fallback={null}>
              <BackgroundTaskMonitor
                documentId={document.id}
                projectId={document.project_id}
                documentTitle={document.title}
                documentContent={content}
              />
            </Suspense>

            <Suspense fallback={null}>
              <ResearchPanel
                documentId={document.id}
                projectId={document.project_id}
                context={content}
              />
            </Suspense>

            {!isScriptType(document.type) && (
              <Suspense fallback={null}>
                <ReadingPacingPanel contentHtml={content} structure={structure} wordCount={wordCount} />
              </Suspense>
            )}

            <Suspense fallback={null}>
              <ReadabilityPanel initialText={content} />
            </Suspense>

            <Card className="border-none bg-card/80 shadow-card">
              <CardHeader>
                <CardTitle>Document utilities</CardTitle>
                <CardDescription>Version history, exports, and other tools.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-between" onClick={() => setShowVersionHistory(true)}>
                  View version history
                  <History className="h-4 w-4" />
                </Button>
                <Button variant="outline" className="w-full justify-between" onClick={handleExportClick}>
                  Export document
                  <FileDown className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {showExportModal && (
        <Suspense fallback={null}>
          <ExportModal
            open={showExportModal}
            onOpenChange={setShowExportModal}
            title={title}
            content={
              document.type === 'screenplay' || document.type === 'play'
                ? JSON.parse(content || '[]')
                : content
            }
            isScreenplay={document.type === 'screenplay' || document.type === 'play'}
            userTier={userTier}
          />
        </Suspense>
      )}

      {showVersionHistory && (
        <Suspense fallback={null}>
          <VersionHistory
            open={showVersionHistory}
            onOpenChange={setShowVersionHistory}
            documentId={document.id}
            onRestoreVersion={handleRestoreVersion}
          />
        </Suspense>
      )}

      {/* Conflict Resolution Panel */}
      {serverContent && (
        <ConflictResolutionPanel
          open={true}
          localContent={content}
          serverContent={serverContent.html}
          localWordCount={wordCount}
          serverWordCount={serverContent.wordCount}
          onResolve={async (resolvedContent, resolution) => {
            if (!serverContent) return

            // Update content with resolved version
            if (resolution === 'merged') {
              setContent(resolvedContent)
            } else if (resolution === 'local') {
              // Keep local - no content update needed
            } else if (resolution === 'server') {
              const nextStructure = Array.isArray(serverContent.structure)
                ? cloneStructure(serverContent.structure)
                : cloneStructure(structure)
              setContent(serverContent.html)
              setStructure(nextStructure)
            }

            // Compute new hash for whichever content we're keeping
            const finalContent =
              resolution === 'server' ? serverContent.html :
              resolution === 'merged' ? resolvedContent :
              content

            const finalStructure =
              resolution === 'server' && Array.isArray(serverContent.structure)
                ? cloneStructure(serverContent.structure)
                : structure

            const anchorIds = extractSceneAnchors(finalContent)
            setSceneAnchors(resolution === 'local' ? sceneAnchors : new Set(anchorIds))

            const newHash = await computeClientContentHash({
              html: finalContent,
              structure: finalStructure,
              anchorIds,
            })

            setBaseHash(newHash)
            setLastSavedAt(new Date())

            setDocument((prev) =>
              prev
                ? {
                    ...prev,
                    content: {
                      ...(prev.content ?? {}),
                      html: finalContent,
                      structure: finalStructure,
                    },
                    word_count: serverContent.wordCount ?? prev.word_count,
                  }
                : prev
            )

            setIsDirty(false)
            setServerContent(null)
            flushAutosave()
          }}
          onRetryWithServer={async () => {
            if (!serverContent) return

            // Force reload from server and retry autosave
            const nextStructure = Array.isArray(serverContent.structure)
              ? cloneStructure(serverContent.structure)
              : cloneStructure(structure)
            setContent(serverContent.html)
            setStructure(nextStructure)
            const anchorIds = extractSceneAnchors(serverContent.html)
            setSceneAnchors(new Set(anchorIds))
            const newHash = await computeClientContentHash({
              html: serverContent.html,
              structure: nextStructure,
              anchorIds,
            })
            setBaseHash(newHash)
            setLastSavedAt(new Date())
            setDocument((prev) =>
              prev
                ? {
                    ...prev,
                    content: {
                      ...(prev.content ?? {}),
                      html: serverContent.html,
                      structure: nextStructure,
                    },
                    word_count: serverContent.wordCount ?? prev.word_count,
                  }
                : prev
            )
            setIsDirty(false)
            setServerContent(null)

            // Retry autosave with fresh server state
            flushAutosave()

            toast({
              title: 'Retrying with server version',
              description: 'Your local changes will be applied on top of the latest server version.',
            })
          }}
          onCancel={() => {
            setServerContent(null)
            flushAutosave()
          }}
        />
      )}

      {/* Autosave Error Alert */}
      {(autosaveError || autosaveStatus === 'offline' || autosaveStatus === 'error') && !serverContent && (
        <AutosaveErrorAlert
          error={autosaveError}
          status={autosaveStatus === 'offline' ? 'offline' : 'error'}
          onRetry={() => flushAutosave()}
          onDismiss={() => {
            /* Error will clear on next successful save */
          }}
        />
      )}
    </div>
  )
}
