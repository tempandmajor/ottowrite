'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TiptapEditor } from '@/components/editor/tiptap-editor'
import { ScreenplayEditor } from '@/components/editor/screenplay-editor'
import { AIAssistant } from '@/components/editor/ai-assistant'
import { ExportModal } from '@/components/editor/export-modal'
import { VersionHistory } from '@/components/editor/version-history'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import {
  ArrowLeft,
  Save,
  PanelRightClose,
  PanelRightOpen,
  FileDown,
  History,
  Search,
  Sparkles,
} from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

type Document = {
  id: string
  title: string
  content: any
  type: string
  word_count: number
  project_id: string
}

const isScriptType = (type?: string) => type === 'screenplay' || type === 'play'

const generateElementId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

export default function EditorPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [document, setDocument] = useState<Document | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showAI, setShowAI] = useState(true)
  const [showExportModal, setShowExportModal] = useState(false)
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [userTier, setUserTier] = useState('free')
  const [projectTitle, setProjectTitle] = useState<string | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [isDirty, setIsDirty] = useState(false)

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

      setDocument(data)
      setTitle(data.title)
      setLastSavedAt(data.updated_at ? new Date(data.updated_at) : new Date())

      // Load content based on document type
      if (data.type === 'screenplay' || data.type === 'play') {
        setContent(JSON.stringify(data.content?.screenplay || []))
      } else {
        setContent(data.content?.html || '')
      }

      if (data.project_id) {
        const { data: projectData } = await supabase
          .from('projects')
          .select('title')
          .eq('id', data.project_id)
          .single()

        if (projectData) {
          setProjectTitle(projectData.title)
        }
      } else {
        setProjectTitle(null)
      }
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
        contentData = { html: content }
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

      setDocument((prev) =>
        prev
          ? {
              ...prev,
              title,
              content: contentData,
              word_count: wordCount,
            }
          : prev
      )
      setLastSavedAt(new Date())
      setIsDirty(false)

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
  }, [content, document, title, toast])

  // Auto-save every 3 seconds
  useEffect(() => {
    if (!document) return

    const interval = setInterval(() => {
      if (!document || saving) {
        return
      }

      const originalSignature = isScriptType(document.type)
        ? JSON.stringify(document.content?.screenplay || [])
        : document.content?.html || ''

      const currentSignature = isScriptType(document.type)
        ? (() => {
            try {
              return JSON.stringify(JSON.parse(content || '[]'))
            } catch (error) {
              console.error('Error parsing screenplay content for autosave:', error)
              return JSON.stringify([])
            }
          })()
        : content

      if (currentSignature !== originalSignature || title !== document.title) {
        saveDocument()
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [content, title, document, saving, saveDocument])

  const insertAIText = (text: string) => {
    if (!text.trim()) return

    if (isScriptType(document?.type)) {
      const segments = text
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
          id: generateElementId(),
          type: 'action',
          content: segment.replace(/\s+/g, ' ').trim(),
        }))

        return JSON.stringify([...screenplay, ...additions])
      })
      return
    }

    const paragraphs = text
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter((paragraph) => paragraph.length > 0)

    if (paragraphs.length === 0) return

    const htmlSnippet = paragraphs
      .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br />')}</p>`)
      .join('')

    setContent((prev) => {
      const base = prev || ''
      return base ? base + htmlSnippet : htmlSnippet
    })
  }

  const handleRestoreVersion = (versionContent: any, versionTitle: string) => {
    setTitle(versionTitle)
    if (isScriptType(document?.type)) {
      setContent(JSON.stringify(versionContent?.screenplay || []))
    } else {
      setContent(versionContent?.html || '')
    }
    // Save immediately after restore
    setTimeout(() => saveDocument(), 100)
  }

  useEffect(() => {
    if (!document) return

    const originalTitle = document.title || ''
    const originalSignature = isScriptType(document.type)
      ? JSON.stringify(document.content?.screenplay || [])
      : document.content?.html || ''

    const currentSignature = isScriptType(document.type) ? content : content

    setIsDirty(currentSignature !== originalSignature || title !== originalTitle)
  }, [content, title, document])

  const wordCount = useMemo(() => {
    if (!document) return 0
    if (isScriptType(document.type)) {
      try {
        const screenplay = JSON.parse(content || '[]') as Array<{ content?: string; text?: string }>
        const text = screenplay
          .map((el) => (el?.content ?? el?.text ?? ''))
          .join(' ')
        return text
          .trim()
          .split(/\s+/)
          .filter((w) => w.length > 0).length
      } catch {
        return 0
      }
    }
    const text = content.replace(/<[^>]*>/g, ' ')
    return text
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0).length
  }, [document, content])

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

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-6 py-4">
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
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
            <Button onClick={saveDocument} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_320px]">
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
                  content={JSON.parse(content || '[]')}
                  onUpdate={(newContent) => setContent(JSON.stringify(newContent))}
                />
              ) : (
                <TiptapEditor
                  content={content}
                  onUpdate={setContent}
                  placeholder="Start writing your story..."
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
