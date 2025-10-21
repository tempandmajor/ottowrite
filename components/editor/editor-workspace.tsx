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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
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
  UserPlus,
  Keyboard,
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
const KeyboardShortcutsDialog = lazy(() => import('@/components/editor/keyboard-shortcuts-dialog').then((mod) => ({ default: mod.KeyboardShortcutsDialog })))
const CommandPalette = lazy(() => import('@/components/editor/command-palette').then((mod) => ({ default: mod.CommandPalette })))

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

type RecentDocument = {
  id: string
  title: string
  updatedAt: string
}

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
  const [leftRailWidth, setLeftRailWidth] = useState(320)
  const [rightRailWidth, setRightRailWidth] = useState(360)
  const [focusMode, setFocusMode] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [recentDocuments, setRecentDocuments] = useState<RecentDocument[]>([])
  const [recentsLoading, setRecentsLoading] = useState(false)
  const railsRestoredRef = useRef(false)
  const previousRailsRef = useRef({ outline: true, ai: true })
  const recentsFetchedRef = useRef(false)
  const supabaseClient = useMemo(() => createClient(), [])
  const [showExportModal, setShowExportModal] = useState(false)
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)
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
      setShowAI(false)
      setFocusMode(false)
    }
  }, [isWorkspaceMode])

  // Reset recents fetched flag when dialog closes
  useEffect(() => {
    if (!commandPaletteOpen) {
      recentsFetchedRef.current = false
    }
  }, [commandPaletteOpen])

  useEffect(() => {
    if (!commandPaletteOpen || !userId || recentsFetchedRef.current) {
      return
    }
    let cancelled = false
    const loadRecents = async () => {
      try {
        setRecentsLoading(true)
        const { data, error } = await supabaseClient
          .from('documents')
          .select('id, title, updated_at')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false })
          .limit(6)

        if (!cancelled) {
          if (error) {
            console.warn('Failed to load recent documents for command palette', error)
          } else if (data) {
            const mapped = data
              .filter((doc) => doc.id !== document?.id)
              .map((doc) => ({
                id: doc.id,
                title: doc.title || 'Untitled document',
                updatedAt: doc.updated_at ?? new Date().toISOString(),
              }))
            setRecentDocuments(mapped)
            recentsFetchedRef.current = true
          }
        }
      } finally {
        if (!cancelled) {
          setRecentsLoading(false)
        }
      }
    }

    loadRecents()
    return () => {
      cancelled = true
    }
  }, [commandPaletteOpen, userId, supabaseClient, document?.id])

  useEffect(() => {
    if (!isWorkspaceMode || !document?.id || railsRestoredRef.current) {
      return
    }
    try {
      const raw = typeof window !== 'undefined'
        ? window.localStorage.getItem(`workspace-rails:${document.id}`)
        : null
      if (raw) {
        const parsed = JSON.parse(raw) as {
          leftOpen?: boolean
          rightOpen?: boolean
          leftWidth?: number
          rightWidth?: number
        }
        if (typeof parsed.leftOpen === 'boolean') {
          setStructureSidebarOpen(parsed.leftOpen)
        }
        if (typeof parsed.rightOpen === 'boolean') {
          setShowAI(parsed.rightOpen)
        }
        if (typeof parsed.leftWidth === 'number' && Number.isFinite(parsed.leftWidth)) {
          setLeftRailWidth(Math.min(520, Math.max(240, parsed.leftWidth)))
        }
        if (typeof parsed.rightWidth === 'number' && Number.isFinite(parsed.rightWidth)) {
          setRightRailWidth(Math.min(520, Math.max(260, parsed.rightWidth)))
        }
      }
    } catch (error) {
      console.warn('Failed to restore workspace rail settings', error)
    } finally {
      railsRestoredRef.current = true
    }
  }, [isWorkspaceMode, document?.id, setStructureSidebarOpen, setShowAI])

  useEffect(() => {
    if (!isWorkspaceMode || !document?.id || !railsRestoredRef.current) {
      return
    }
    try {
      const payload = {
        leftOpen: structureSidebarOpen,
        rightOpen: showAI,
        leftWidth: leftRailWidth,
        rightWidth: rightRailWidth,
      }
      window.localStorage.setItem(`workspace-rails:${document.id}`, JSON.stringify(payload))
    } catch (error) {
      console.warn('Failed to persist workspace rail settings', error)
    }
  }, [isWorkspaceMode, document?.id, structureSidebarOpen, showAI, leftRailWidth, rightRailWidth])

  const clampWidth = useCallback((value: number, min: number, max: number) => {
    return Math.min(max, Math.max(min, value))
  }, [])

  const handleLeftResizeStart = useCallback(
    (event: React.MouseEvent<HTMLDivElement | HTMLButtonElement>) => {
      if (!structureSidebarOpen) return
      event.preventDefault()
      const startX = event.clientX
      const startWidth = leftRailWidth
      const onMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - startX
        setLeftRailWidth(clampWidth(startWidth + delta, 240, 520))
      }
      const onUp = () => {
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
      }
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    },
    [structureSidebarOpen, leftRailWidth, clampWidth]
  )

  const handleRightResizeStart = useCallback(
    (event: React.MouseEvent<HTMLDivElement | HTMLButtonElement>) => {
      if (!showAI) return
      event.preventDefault()
      const startX = event.clientX
      const startWidth = rightRailWidth
      const onMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - startX
        setRightRailWidth(clampWidth(startWidth - delta, 260, 520))
      }
      const onUp = () => {
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
      }
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    },
    [showAI, rightRailWidth, clampWidth]
  )

  const handleLeftResizeKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement | HTMLButtonElement>) => {
      if (!structureSidebarOpen) return
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        setLeftRailWidth((current) => clampWidth(current - 20, 240, 520))
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        setLeftRailWidth((current) => clampWidth(current + 20, 240, 520))
      } else if (event.key === 'Escape') {
        event.preventDefault()
        setStructureSidebarOpen(false)
      }
    },
    [structureSidebarOpen, clampWidth]
  )

  const handleRightResizeKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement | HTMLButtonElement>) => {
      if (!showAI) return
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        setRightRailWidth((current) => clampWidth(current + 20, 260, 520))
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        setRightRailWidth((current) => clampWidth(current - 20, 260, 520))
      } else if (event.key === 'Escape') {
        event.preventDefault()
        setShowAI(false)
      }
    },
    [showAI, clampWidth]
  )

  const toggleFocusMode = useCallback(() => {
    setFocusMode((prev) => {
      if (!prev) {
        // Entering focus mode: save current rail states (even if already hidden)
        // This ensures we restore the exact state when exiting focus
        previousRailsRef.current = {
          outline: structureSidebarOpen,
          ai: showAI,
        }
        // Hide visible rails
        if (structureSidebarOpen) {
          setStructureSidebarOpen(false)
        }
        if (showAI) {
          setShowAI(false)
        }
      } else {
        // Exiting focus mode: restore previous rail states exactly as they were
        // If AI was already hidden, it stays hidden; if it was visible, it comes back
        setStructureSidebarOpen(previousRailsRef.current.outline)
        setShowAI(previousRailsRef.current.ai)
      }
      return !prev
    })
  }, [structureSidebarOpen, showAI])

  useEffect(() => {
    if (!isWorkspaceMode) return
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      if (event.ctrlKey && event.shiftKey) {
        switch (key) {
          case 'f': {
            event.preventDefault()
            toggleFocusMode()
            break
          }
          case 'o': {
            event.preventDefault()
            setFocusMode(false)
            setStructureSidebarOpen((prev) => !prev)
            break
          }
          case 'a': {
            event.preventDefault()
            setFocusMode(false)
            setShowAI((prev) => !prev)
            break
          }
          case 'h': {
            event.preventDefault()
            setShowVersionHistory(true)
            break
          }
          case '?': {
            event.preventDefault()
            setShowKeyboardHelp(true)
            break
          }
          default:
        }
      } else if (event.ctrlKey && key === 'k') {
        event.preventDefault()
        setCommandPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isWorkspaceMode, toggleFocusMode, setStructureSidebarOpen, setShowAI, setShowVersionHistory])

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

  const targetWordCount = typeof metadata?.targetWordCount === 'number' && Number.isFinite(metadata.targetWordCount)
    ? metadata.targetWordCount
    : null
  const wordProgress =
    targetWordCount && targetWordCount > 0
      ? Math.min(100, Math.round((wordCount / targetWordCount) * 100))
      : null

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
    return (
      <>
        <div className="flex min-h-screen flex-col bg-background">
          <header className="sticky top-0 z-40 border-b bg-background">
            <div className="mx-auto flex h-14 w-full max-w-[1200px] items-center gap-4 px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/dashboard/documents">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Documents
                  </Link>
                </Button>
                {document.project_id ? (
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/dashboard/projects/${document.project_id}`}>
                      Project
                    </Link>
                  </Button>
                ) : null}
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full truncate border-none bg-transparent text-base font-semibold text-foreground outline-none focus-visible:ring-0 md:text-lg"
                  placeholder="Untitled document"
                />
                {!focusMode && (
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {projectTitle ? (
                      <>
                        <Link
                          href={`/dashboard/projects/${document.project_id}`}
                          className="text-primary hover:text-primary/80"
                        >
                          {projectTitle}
                        </Link>
                        <span aria-hidden className="h-3 w-px bg-border" />
                      </>
                    ) : null}
                    <span>
                      {targetWordCount
                        ? `${wordCount.toLocaleString()} / ${targetWordCount.toLocaleString()} words${wordProgress !== null ? ` (${wordProgress}% )` : ''}`
                        : `${wordCount.toLocaleString()} words`}
                    </span>
                    <span aria-hidden className="h-3 w-px bg-border" />
                    <span className={isDirty ? 'text-amber-600' : 'text-muted-foreground'}>
                      {savedMessage}
                    </span>
                    <span aria-hidden className="h-3 w-px bg-border" />
                    <span className={autosaveClassName}>{autosaveLabel}</span>
                  </div>
                )}
              </div>

              <TooltipProvider delayDuration={150} disableHoverableContent>
                <div className={cn('hidden items-center gap-2 md:flex transition-opacity', focusMode ? 'opacity-0 pointer-events-none' : 'opacity-100')}>
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
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" disabled>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Share
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Sharing coming soon</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFocusMode(false)
                          setStructureSidebarOpen((prev) => !prev)
                        }}
                      >
                        {structureSidebarOpen ? (
                          <>
                            <PanelLeftClose className="mr-2 h-4 w-4" />
                            Hide Outline
                          </>
                        ) : (
                          <>
                            <PanelLeftOpen className="mr-2 h-4 w-4" />
                            Show Outline
                          </>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Toggle outline (Ctrl+Shift+O)</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFocusMode(false)
                          setShowAI((prev) => !prev)
                        }}
                      >
                        {showAI ? (
                          <>
                            <PanelRightClose className="mr-2 h-4 w-4" />
                            Hide AI
                          </>
                        ) : (
                          <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Show AI
                          </>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Toggle AI assistant (Ctrl+Shift+A)</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => setShowVersionHistory(true)}>
                        <History className="mr-2 h-4 w-4" />
                        History
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Open version history (Ctrl+Shift+H)</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" onClick={handleExportClick}>
                        <FileDown className="mr-2 h-4 w-4" />
                        Export
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Export document</TooltipContent>
                  </Tooltip>
                  <DocumentMetadataForm metadata={metadata} onChange={handleMetadataChange} />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="sm" onClick={saveDocument} disabled={saving}>
                        <Save className="mr-2 h-4 w-4" />
                        {saving ? 'Saving…' : 'Save'}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Save now</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={focusMode ? 'default' : 'outline'}
                        size="sm"
                        onClick={toggleFocusMode}
                      >
                        {focusMode ? 'Exit Focus' : 'Focus Mode'}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {focusMode ? 'Exit Focus Mode (Ctrl+Shift+F)' : 'Enter Focus Mode (Ctrl+Shift+F)'}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>

              <div className={cn('md:hidden', focusMode ? 'hidden' : '')}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="flex items-center gap-2">
                      <MoreHorizontal className="h-4 w-4" />
                      Actions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onSelect={(event) => event.preventDefault()} className="flex items-center gap-2" disabled>
                      <UserPlus className="h-4 w-4" />
                      Share (soon)
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={(event) => {
                        event.preventDefault()
                        setFocusMode(false)
                        setStructureSidebarOpen((prev) => !prev)
                      }}
                      className="flex items-center gap-2"
                    >
                      {structureSidebarOpen ? 'Hide outline' : 'Show outline'}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={(event) => {
                        event.preventDefault()
                        setFocusMode(false)
                        setShowAI((prev) => !prev)
                      }}
                      className="flex items-center gap-2"
                    >
                      {showAI ? 'Hide AI assistant' : 'Show AI assistant'}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={(event) => {
                        event.preventDefault()
                        toggleFocusMode()
                      }}
                      className="flex items-center gap-2"
                    >
                      {focusMode ? 'Exit focus mode' : 'Focus mode'}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={(event) => {
                        event.preventDefault()
                        setShowVersionHistory(true)
                      }}
                      className="flex items-center gap-2"
                    >
                      Version history
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={(event) => {
                        event.preventDefault()
                        handleExportClick()
                      }}
                      className="flex items-center gap-2"
                    >
                      Export
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={(event) => {
                        event.preventDefault()
                        setCommandPaletteOpen(true)
                      }}
                      className="flex items-center gap-2"
                    >
                      Command palette
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={async (event) => {
                        event.preventDefault()
                        await saveDocument()
                      }}
                      className="flex items-center gap-2"
                    >
                      Save now
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          <main className="flex flex-1 overflow-hidden bg-muted/20">
            <div className="flex h-full w-full overflow-hidden">
              {structureSidebarOpen && (
                <>
                  <aside
                    aria-label="Document outline"
                    className="hidden h-full flex-col gap-4 overflow-y-auto border-r bg-muted/10 p-4 lg:flex"
                    style={{ width: leftRailWidth }}
                  >
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
                  </aside>
                  <button
                    type="button"
                    aria-label="Resize outline panel"
                    onMouseDown={handleLeftResizeStart}
                    onKeyDown={handleLeftResizeKeyDown}
                    className="hidden h-full w-2 cursor-col-resize select-none bg-transparent transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary lg:flex"
                  />
                </>
              )}

              <div className="flex-1 min-w-0 overflow-hidden">
                <div className="h-full overflow-auto">
                  <div className="mx-auto flex max-w-[1100px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-10">
                    {!focusMode && (
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
                    )}
                    <div className="overflow-hidden rounded-3xl border bg-card shadow-card">
                      <div className="p-6 sm:p-8 lg:p-10">
                        {editorElement}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {showAI && !focusMode && (
                <>
                  <button
                    type="button"
                    aria-label="Resize assistant panel"
                    onMouseDown={handleRightResizeStart}
                    onKeyDown={handleRightResizeKeyDown}
                    className="hidden h-full w-2 cursor-col-resize select-none bg-transparent transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary lg:flex"
                  />
                  <aside
                    aria-label="Assistant and analytics"
                    className="hidden h-full flex-col gap-4 overflow-y-auto border-l bg-muted/10 p-4 lg:flex"
                    style={{ width: rightRailWidth }}
                  >
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
                        <div className="max-h-[60vh] overflow-y-auto pr-1">
                          <Suspense fallback={<div className="text-sm text-muted-foreground">Loading AI assistant...</div>}>
                            <AIAssistant
                              documentId={document.id}
                              currentContent={content}
                              onInsertText={insertAIText}
                              getSelection={resolveActiveSelection}
                            />
                          </Suspense>
                        </div>
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
                  </aside>
                </>
              )}
            </div>
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

        {commandPaletteOpen && (
          <Suspense fallback={null}>
            <CommandPalette
              open={commandPaletteOpen}
              onOpenChange={setCommandPaletteOpen}
              structure={structure}
              activeSceneId={activeSceneId}
              recentDocuments={recentDocuments}
              recentsLoading={recentsLoading}
              onToggleOutline={() => {
                setFocusMode(false)
                setStructureSidebarOpen((prev) => !prev)
              }}
              onToggleAI={() => {
                setFocusMode(false)
                setShowAI((prev) => !prev)
              }}
              onToggleFocus={toggleFocusMode}
              onShowVersionHistory={() => setShowVersionHistory(true)}
              onShowExport={handleExportClick}
              onNavigateToScene={handleSceneSelect}
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

  const showStructureSidebar = structureSidebarOpen && Boolean(document) && !focusMode
  const showUtilitySidebar = !focusMode // Hide utility sidebar in focus mode
  
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
            <TooltipProvider delayDuration={150} disableHoverableContent>
              <div className={cn('hidden items-center gap-2 md:flex transition-opacity', focusMode ? 'opacity-0 pointer-events-none' : 'opacity-100')}>
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
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/editor/${document.id}/plot-analysis`}>
                        <Search className="mr-2 h-4 w-4" />
                        Plot analysis
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Open plot analysis</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => setShowVersionHistory(true)}>
                      <History className="mr-2 h-4 w-4" />
                      History
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Version history (Ctrl+Shift+H)</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={handleExportClick}>
                      <FileDown className="mr-2 h-4 w-4" />
                      Export
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Export document</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFocusMode(false)
                        setStructureSidebarOpen((prev) => !prev)
                      }}
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
                  </TooltipTrigger>
                  <TooltipContent>Toggle outline (Ctrl+Shift+O)</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFocusMode(false)
                        setShowAI((prev) => !prev)
                      }}
                    >
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
                  </TooltipTrigger>
                  <TooltipContent>Toggle AI assistant (Ctrl+Shift+A)</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="sm" onClick={saveDocument} disabled={saving}>
                      <Save className="mr-2 h-4 w-4" />
                      {saving ? 'Saving…' : 'Save'}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Save now</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={focusMode ? 'default' : 'outline'}
                      size="sm"
                      onClick={toggleFocusMode}
                    >
                      {focusMode ? 'Exit Focus' : 'Focus Mode'}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {focusMode ? 'Exit Focus Mode (Ctrl+Shift+F)' : 'Enter Focus Mode (Ctrl+Shift+F)'}
                  </TooltipContent>
                </Tooltip>
                <DocumentMetadataForm metadata={metadata} onChange={handleMetadataChange} />
              </div>
            </TooltipProvider>
            <div className={cn('flex items-center gap-2 md:hidden', focusMode ? 'hidden' : '')}>
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
          // Enable grid layout when sidebars are present
          (showStructureSidebar || showUtilitySidebar) && 'lg:grid',
          // Focus mode: single column only
          focusMode && 'lg:grid-cols-[minmax(0,1fr)]',
          // Both sidebars visible
          !focusMode && showStructureSidebar && showUtilitySidebar &&
            'lg:grid-cols-[minmax(220px,280px)_minmax(0,1fr)_minmax(280px,340px)]',
          // Only outline sidebar
          !focusMode && showStructureSidebar && !showUtilitySidebar &&
            'lg:grid-cols-[minmax(220px,280px)_minmax(0,1fr)]',
          // Only utility sidebar (AI panel)
          !focusMode && !showStructureSidebar && showUtilitySidebar &&
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

      {showKeyboardHelp && (
        <Suspense fallback={null}>
          <KeyboardShortcutsDialog
            open={showKeyboardHelp}
            onOpenChange={setShowKeyboardHelp}
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

      {/* Keyboard Shortcuts Help Footer */}
      {!focusMode && (
        <div className="fixed bottom-4 right-4 z-20">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowKeyboardHelp(true)}
            className="shadow-lg backdrop-blur-sm bg-background/95 hover:bg-accent"
          >
            <Keyboard className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Press </span>
            <kbd className="mx-1 px-1.5 py-0.5 text-xs font-semibold bg-muted border rounded">
              Ctrl
            </kbd>
            <span className="hidden sm:inline">+</span>
            <kbd className="mx-1 px-1.5 py-0.5 text-xs font-semibold bg-muted border rounded hidden sm:inline">
              Shift
            </kbd>
            <span className="hidden sm:inline">+</span>
            <kbd className="mx-1 px-1.5 py-0.5 text-xs font-semibold bg-muted border rounded">
              ?
            </kbd>
            <span className="sm:hidden ml-1">for shortcuts</span>
          </Button>
        </div>
      )}
    </div>
  )
}
