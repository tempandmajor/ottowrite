'use client'

/* eslint-disable import/no-named-as-default */

import { useEffect, useRef, useCallback } from 'react'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import Color from '@tiptap/extension-color'
import { TextStyle } from '@tiptap/extension-text-style'
import Highlight from '@tiptap/extension-highlight'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Highlighter
} from 'lucide-react'

import { SceneAnchor } from '@/components/editor/extensions/scene-anchor'

const collectAnchorsFromEditor = (editor: Editor): Set<string> => {
  const anchors = new Set<string>()
  const sceneAnchorType = editor.state.schema.nodes.sceneAnchor

  editor.state.doc.descendants((node) => {
    if (node.type === sceneAnchorType && node.attrs.sceneId) {
      anchors.add(String(node.attrs.sceneId))
    }
    return true
  })

  return anchors
}

export type TiptapEditorApi = {
  insertHtmlAtCursor: (html: string) => void
  getSelectedText: () => string
}

interface TiptapEditorProps {
  content: string
  onUpdate: (content: string) => void
  editable?: boolean
  placeholder?: string
  focusScene?: {
    id: string
    title: string
    chapterTitle?: string
  } | null
  onSceneFocusResult?: (payload: { id: string; found: boolean }) => void
  onAnchorsChange?: (anchors: Set<string>) => void
  remoteContent?: {
    html: string
  } | null
  conflictVisible?: boolean
  onReplaceWithServer?: () => void
  onCloseConflict?: () => void
  onReady?: (api: TiptapEditorApi | null) => void
}

export function TiptapEditor({
  content,
  onUpdate,
  editable = true,
  placeholder = 'Start writing...',
  focusScene = null,
  onSceneFocusResult,
  onAnchorsChange,
  remoteContent = null,
  conflictVisible = false,
  onReplaceWithServer,
  onCloseConflict,
  onReady,
}: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      CharacterCount,
      Color,
      TextStyle,
      Highlight.configure({
        multicolor: true,
      }),
      SceneAnchor,
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onUpdate(editor.getHTML())
      if (onAnchorsChange) {
        onAnchorsChange(collectAnchorsFromEditor(editor))
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none min-h-[500px] max-w-none px-8 py-6',
      },
    },
  })

  const emitAnchors = useCallback(() => {
    if (!editor || !onAnchorsChange) return
    onAnchorsChange(collectAnchorsFromEditor(editor))
  }, [editor, onAnchorsChange])

  useEffect(() => {
    if (!editor) return

    const normalize = (value: string) => {
      if (!value) return ''
      const trimmed = value.replace(/\s+/g, '')
      if (trimmed === '<p></p>') return ''
      return value
    }

    const incoming = normalize(content)
    const current = normalize(editor.getHTML())

    if (incoming !== current) {
      editor.commands.setContent(incoming || '<p></p>', { emitUpdate: false })
      emitAnchors()
    }
  }, [editor, content, emitAnchors])

  const lastHighlightedRef = useRef<HTMLElement | null>(null)
  const highlightTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      const el = lastHighlightedRef.current
      if (el) {
        el.style.outline = el.dataset.sceneHighlightPrevOutline ?? ''
        el.style.outlineOffset = el.dataset.sceneHighlightPrevOutlineOffset ?? ''
        delete el.dataset.sceneHighlightPrevOutline
        delete el.dataset.sceneHighlightPrevOutlineOffset
        lastHighlightedRef.current = null
      }
      if (highlightTimeoutRef.current) {
        window.clearTimeout(highlightTimeoutRef.current)
        highlightTimeoutRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!editor) return

    const handleInsert: (event: Event) => void = (event) => {
      const detail = (event as CustomEvent<{ sceneId?: string }>).detail
      const sceneId = detail?.sceneId
      if (!sceneId) return

      editor.chain().focus().ensureSceneAnchor(sceneId).run()
      emitAnchors()
      onSceneFocusResult?.({ id: sceneId, found: true })
    }

    window.addEventListener('editor-insert-scene-anchor', handleInsert)
    return () => {
      window.removeEventListener('editor-insert-scene-anchor', handleInsert)
    }
  }, [editor, emitAnchors, onSceneFocusResult])

  useEffect(() => {
    if (!editor) return

    const clearHighlight = () => {
      const previous = lastHighlightedRef.current
      if (previous) {
        previous.style.outline = previous.dataset.sceneHighlightPrevOutline ?? ''
        previous.style.outlineOffset = previous.dataset.sceneHighlightPrevOutlineOffset ?? ''
        delete previous.dataset.sceneHighlightPrevOutline
        delete previous.dataset.sceneHighlightPrevOutlineOffset
        lastHighlightedRef.current = null
      }
      if (highlightTimeoutRef.current) {
        window.clearTimeout(highlightTimeoutRef.current)
        highlightTimeoutRef.current = null
      }
    }

    clearHighlight()

    if (!focusScene) {
      return
    }

    const searchTerms = [focusScene.title, focusScene.chapterTitle]
      .map((term) => term?.trim())
      .filter((term): term is string => Boolean(term?.length))

    let target: HTMLElement | null =
      editor.view.dom.querySelector(`[data-scene-anchor="true"][data-scene-id="${focusScene.id}"]`) || null

    if (target && target.dataset.sceneAnchor === 'true') {
      const parentBlock = target.closest('h1, h2, h3, h4, h5, h6, p, li, blockquote')
      if (parentBlock instanceof HTMLElement) {
        target = parentBlock
      }
    }

    if (!target && searchTerms.length > 0) {
      const candidates = editor.view.dom.querySelectorAll<HTMLElement>(
        'h1, h2, h3, h4, h5, h6, p, li, blockquote'
      )
      const loweredTerms = searchTerms.map((term) => term.toLowerCase())
      target = Array.from(candidates).find((element) => {
        const text = element.textContent?.toLowerCase() ?? ''
        return loweredTerms.some((term) => text.includes(term))
      }) as HTMLElement | null
    }

    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' })
      target.dataset.sceneHighlightPrevOutline = target.style.outline
      target.dataset.sceneHighlightPrevOutlineOffset = target.style.outlineOffset
      target.style.outline = '2px solid hsl(var(--primary))'
      target.style.outlineOffset = '4px'
      lastHighlightedRef.current = target
      highlightTimeoutRef.current = window.setTimeout(() => {
        if (lastHighlightedRef.current === target) {
          target.style.outline = target.dataset.sceneHighlightPrevOutline ?? ''
          target.style.outlineOffset = target.dataset.sceneHighlightPrevOutlineOffset ?? ''
          delete target.dataset.sceneHighlightPrevOutline
          delete target.dataset.sceneHighlightPrevOutlineOffset
          lastHighlightedRef.current = null
        }
      }, 2000)
      onSceneFocusResult?.({ id: focusScene.id, found: true })
    } else {
      onSceneFocusResult?.({ id: focusScene.id, found: false })
    }
  }, [editor, focusScene, onSceneFocusResult])

  useEffect(() => {
    emitAnchors()
  }, [emitAnchors])

  useEffect(() => {
    if (!editor || !onReady) {
      return
    }

    const api: TiptapEditorApi = {
      insertHtmlAtCursor: (html) => {
        try {
          if (!html || !editor) return
          if (editor.isDestroyed) {
            console.warn('TiptapEditor: Cannot insert, editor is destroyed')
            return
          }
          editor.chain().focus().deleteSelection().insertContent(html).run()
        } catch (error) {
          console.error('TiptapEditor: insertHtmlAtCursor error:', error)
        }
      },
      getSelectedText: () => {
        try {
          if (!editor || editor.isDestroyed) return ''
          const { state } = editor
          const { from, to } = state.selection
          return state.doc.textBetween(from, to, ' ')
        } catch (error) {
          console.error('TiptapEditor: getSelectedText error:', error)
          return ''
        }
      },
    }

    onReady(api)
    return () => {
      onReady(null)
    }
  }, [editor, onReady])

  if (!editor) {
    return null
  }

  return (
    <div className="border rounded-lg bg-background">
      {editable && (
        <div className="border-b bg-muted/30 p-2 flex flex-wrap gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={editor.isActive('bold') ? 'bg-muted' : ''}
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={editor.isActive('italic') ? 'bg-muted' : ''}
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={editor.isActive('strike') ? 'bg-muted' : ''}
          >
            <Strikethrough className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={editor.isActive('code') ? 'bg-muted' : ''}
          >
            <Code className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            className={editor.isActive('highlight') ? 'bg-muted' : ''}
          >
            <Highlighter className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-border my-auto mx-1" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={editor.isActive('heading', { level: 1 }) ? 'bg-muted' : ''}
          >
            <Heading1 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={editor.isActive('heading', { level: 2 }) ? 'bg-muted' : ''}
          >
            <Heading2 className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-border my-auto mx-1" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={editor.isActive('bulletList') ? 'bg-muted' : ''}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={editor.isActive('orderedList') ? 'bg-muted' : ''}
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={editor.isActive('blockquote') ? 'bg-muted' : ''}
          >
            <Quote className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-border my-auto mx-1" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
          >
            <Redo className="h-4 w-4" />
          </Button>
        </div>
      )}

      <EditorContent editor={editor} />

      {editable && (
        <div className="border-t bg-muted/30 p-2 flex justify-between text-sm text-muted-foreground">
          <div>
            {editor.storage.characterCount.characters()} characters
          </div>
          <div>
            {editor.storage.characterCount.words()} words
          </div>
        </div>
      )}

      {remoteContent && conflictVisible && (
        <Dialog open={conflictVisible} onOpenChange={(open) => !open && onCloseConflict?.()}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Changes detected elsewhere</DialogTitle>
              <DialogDescription>
                This document was modified in another session. Choose whether to keep your local edits or replace them with the latest saved version.
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[300px] overflow-auto rounded-md border bg-muted/40 p-3 text-sm font-mono">
              <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Latest saved version</div>
              <div
                className="prose prose-sm max-w-none text-foreground"
                dangerouslySetInnerHTML={{ __html: remoteContent.html }}
              />
            </div>
            <DialogFooter className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={onCloseConflict}>
                Keep my changes
              </Button>
              <Button onClick={onReplaceWithServer}>Replace with saved version</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
