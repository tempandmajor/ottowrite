'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TiptapEditor } from '@/components/editor/tiptap-editor'
import { AIAssistant } from '@/components/editor/ai-assistant'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Save, PanelRightClose, PanelRightOpen } from 'lucide-react'
import Link from 'next/link'

type Document = {
  id: string
  title: string
  content: any
  type: string
  word_count: number
  project_id: string
}

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

  useEffect(() => {
    loadDocument()
  }, [params.id])

  const loadDocument = async () => {
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
        return
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
      setContent(data.content?.html || '')
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
  }

  const saveDocument = async () => {
    if (!document) return

    setSaving(true)
    try {
      const supabase = createClient()

      // Calculate word count from content
      const text = content.replace(/<[^>]*>/g, ' ')
      const words = text.trim().split(/\s+/).filter(w => w.length > 0)
      const wordCount = words.length

      const { error } = await supabase
        .from('documents')
        .update({
          title,
          content: { html: content },
          word_count: wordCount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', document.id)

      if (error) throw error

      setDocument({
        ...document,
        title,
        content: { html: content },
        word_count: wordCount,
      })

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
  }

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!document) return

    const interval = setInterval(() => {
      if (content !== (document.content?.html || '') || title !== document.title) {
        saveDocument()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [content, title, document])

  const insertAIText = (text: string) => {
    // Append AI text to current content
    setContent(content + '\n\n' + text)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading document...</p>
      </div>
    )
  }

  if (!document) {
    return null
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="border-b bg-background sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <Link href="/dashboard/documents">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="max-w-md text-lg font-semibold border-none shadow-none focus-visible:ring-0 px-2"
              placeholder="Document title..."
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAI(!showAI)}
            >
              {showAI ? (
                <>
                  <PanelRightClose className="h-4 w-4 mr-2" />
                  Hide AI
                </>
              ) : (
                <>
                  <PanelRightOpen className="h-4 w-4 mr-2" />
                  Show AI
                </>
              )}
            </Button>
            <Button onClick={saveDocument} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        <div className={`flex-1 overflow-auto ${showAI ? 'pr-2' : ''}`}>
          <div className="container mx-auto px-4 py-6 max-w-5xl">
            <TiptapEditor
              content={content}
              onUpdate={setContent}
              placeholder="Start writing your story..."
            />
          </div>
        </div>

        {showAI && (
          <div className="w-96 border-l overflow-auto">
            <div className="p-4 h-full">
              <AIAssistant
                documentId={document.id}
                currentContent={content}
                onInsertText={insertAIText}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
