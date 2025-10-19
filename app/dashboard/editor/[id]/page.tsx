'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TiptapEditor, type TiptapEditorApi } from '@/components/editor/tiptap-editor'
import {
  ScreenplayEditor,
  type ScreenplayEditorApi,
  type ScreenplayElement,
} from '@/components/editor/screenplay-editor'
import { AIAssistant } from '@/components/editor/ai-assistant'
import { EnsembleGenerator } from '@/components/ai/ensemble-generator'
import { BackgroundTaskMonitor } from '@/components/ai/background-task-monitor'
import { ResearchPanel } from '@/components/research/research-panel'
import { ReadabilityPanel } from '@/components/analysis/readability'
import { ReadingPacingPanel } from '@/components/analysis/reading-pacing-panel'
import { ExportModal } from '@/components/editor/export-modal'
import { VersionHistory } from '@/components/editor/version-history'
import { ChapterSidebar, Chapter } from '@/components/editor/chapter-sidebar'
import { computeClientContentHash } from '@/lib/client-content-hash'
import { Button } from '@/components/ui/button'
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
import {
  ArrowLeft,
  Save,
  PanelRightClose,
  PanelRightOpen,
  FileDown,
  History,
  Search,
  Sparkles,
  MoreHorizontal,
} from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

type DocumentContent = {
  html?: string
  screenplay?: any
  structure?: Chapter[]
}

type DocumentRecord = {
  id: string
  title: string
  content?: DocumentContent
  type: string
  word_count: number
  project_id: string
  updated_at?: string
}

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

export default function EditorPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [document, setDocument] = useState<DocumentRecord | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [structure, setStructure] = useState<Chapter[]>([])
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showAI, setShowAI] = useState(true)
  const [showExportModal, setShowExportModal] = useState(false)
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [userTier, setUserTier] = useState('free')
  const [projectTitle, setProjectTitle] = useState<string | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [sceneAnchors, setSceneAnchors] = useState<Set<string>>(new Set())
  const [baseHash, setBaseHash] = useState<string | null>(null)
  const [serverContent, setServerContent] = useState<{
    html: string
    structure?: Chapter[] | null
    wordCount?: number
  } | null>(null)
  const lastSceneFocusMissRef = useRef<string | null>(null)
  const tiptapApiRef = useRef<TiptapEditorApi | null>(null)
  const screenplayApiRef = useRef<ScreenplayEditorApi | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setShowAI(false)
    }
  }, [])

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
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
        return
      }

      // Get user profile for tier info
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('subscription_tier')
        .eq('id', user.id)
        .single()

      if (profile) {
        setUserTier(profile.subscription_tier || 'free')
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

      const typedData = data as DocumentRecord
      setDocument(typedData)
      setTitle(typedData.title)
      setLastSavedAt(typedData.updated_at ? new Date(typedData.updated_at) : new Date())

      if (isScriptType(typedData.type)) {
        setContent(JSON.stringify(typedData.content?.screenplay || []))
        setStructure([])
        setActiveSceneId(null)
        setSceneAnchors(new Set())
        setBaseHash(null)
      } else {
        const initialHtml = typedData.content?.html || ''
        const initialStructure = Array.isArray(typedData.content?.structure)
          ? (typedData.content?.structure as Chapter[])
          : []
        const initialAnchors = extractSceneAnchors(initialHtml)

        setContent(initialHtml)
        setStructure(cloneStructure(initialStructure))
        setActiveSceneId(null)
        setSceneAnchors(new Set(initialAnchors))

        const initialHash = await computeClientContentHash({
          html: initialHtml,
          structure: initialStructure,
          anchorIds: initialAnchors,
        })
        setBaseHash(initialHash)
      }

      let resolvedProjectTitle: string | null = null
      if (typedData.project_id) {
        const { data: projectData } = await supabase
          .from('projects')
          .select('title')
          .eq('id', typedData.project_id)
          .single()

        if (projectData?.title) {
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
  }, [params.id, router, toast])

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
  }, [activeSceneId, structure])

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

        contentData = { screenplay }
      } else {
        const text = content.replace(/<[^>]*>/g, ' ')
        wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length
        contentData = { html: content, structure: cloneStructure(structure) }
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
          ? contentData
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
  }, [content, document, title, toast, structure, sceneAnchors])

  const handleStructureChange = useCallback((nextChapters: Chapter[]) => {
    setStructure(nextChapters)
  }, [])

  const handleSceneSelect = useCallback((sceneId: string | null) => {
    setActiveSceneId(sceneId)
  }, [])

  const handleSceneCreated = useCallback((_chapterId: string, sceneId: string) => {
    setActiveSceneId(sceneId)
  }, [])

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
    [document]
  )

  const handleAnchorsChange = useCallback((anchors: Set<string>) => {
    setSceneAnchors(new Set(anchors))
  }, [])

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
      setContent(JSON.stringify(versionContent?.screenplay || []))
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

  useEffect(() => {
    if (!document) return

    const originalTitle = document.title || ''
    const originalSignature = isScriptType(document.type)
      ? JSON.stringify(document.content?.screenplay || [])
      : JSON.stringify({
          html: document.content?.html || '',
          structure: document.content?.structure || [],
        })

    const currentSignature = isScriptType(document.type)
      ? content
      : JSON.stringify({ html: content, structure })

    setIsDirty(currentSignature !== originalSignature || title !== originalTitle)
  }, [content, title, document, structure])

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


  const isProseDocument = Boolean(document && !isScriptType(document.type))

  const autosaveSnapshot = useMemo(() => {
    if (!isProseDocument) {
      return { html: '', structure: [] }
    }
    return {
      html: content,
      structure,
    }
  }, [content, isProseDocument, structure])

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
    [toast]
  )

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

  const showStructureSidebar = !isScriptType(document.type)

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-4 sm:px-6">
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
              <Button variant="outline" size="sm" onClick={() => setShowExportModal(true)}>
                <FileDown className="mr-2 h-4 w-4" />
                Export
              </Button>
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
                      setShowExportModal(true)
                    }}
                    className="flex items-center gap-2"
                  >
                    <FileDown className="h-4 w-4" />
                    Export document
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
        className={`mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6 sm:px-6 lg:gap-8 ${
          showStructureSidebar
            ? 'lg:grid lg:grid-cols-[280px_minmax(0,1fr)_320px]'
            : 'lg:grid lg:grid-cols-[minmax(0,1fr)_320px]'
        }`}
      >
        {showStructureSidebar && (
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
            <div className="p-6">
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
            </div>
          </div>
        </div>

        <div className="space-y-4">
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
                  <AIAssistant
                    documentId={document.id}
                    currentContent={content}
                    onInsertText={insertAIText}
                    getSelection={resolveActiveSelection}
                  />
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

          <EnsembleGenerator
            currentContext={content}
            onInsert={insertAIText}
            projectId={document.project_id}
            documentId={document.id}
          />

          <BackgroundTaskMonitor
            documentId={document.id}
            projectId={document.project_id}
            documentTitle={document.title}
            documentContent={content}
          />

          <ResearchPanel
            documentId={document.id}
            projectId={document.project_id}
            context={content}
          />

          {!isScriptType(document.type) && (
            <ReadingPacingPanel contentHtml={content} structure={structure} wordCount={wordCount} />
          )}

          <ReadabilityPanel initialText={content} />

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
              <Button variant="outline" className="w-full justify-between" onClick={() => setShowExportModal(true)}>
                Export document
                <FileDown className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

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

      <VersionHistory
        open={showVersionHistory}
        onOpenChange={setShowVersionHistory}
        documentId={document.id}
        onRestoreVersion={handleRestoreVersion}
      />
    </div>
  )
}
