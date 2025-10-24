'use client'

/* eslint-disable import/no-named-as-default */

import { useEffect, useRef, useCallback, useMemo } from 'react'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import Color from '@tiptap/extension-color'
import { TextStyle } from '@tiptap/extension-text-style'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
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
  Highlighter,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
} from 'lucide-react'
import { cn } from '@/lib/utils'

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
  editor: Editor | null
}

interface TiptapEditorProps {
  content: string
  onUpdate: (content: string) => void
  editable?: boolean
  placeholder?: string
  layoutMode?: 'page' | 'wide' | 'typewriter'
  theme?: 'serif' | 'sans'
  fontScale?: 'sm' | 'md' | 'lg'
  documentType?: string
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
  layoutMode = 'page',
  theme = 'sans',
  fontScale = 'md',
  documentType,
  focusScene = null,
  onSceneFocusResult,
  onAnchorsChange,
  remoteContent = null,
  conflictVisible = false,
  onReplaceWithServer,
  onCloseConflict,
  onReady,
}: TiptapEditorProps) {
  const computedEditorClass = useMemo(() => {
    const scaleClass =
      fontScale === 'sm'
        ? 'prose-base sm:prose-lg'
        : fontScale === 'lg'
          ? 'prose-xl sm:prose-2xl'
          : 'prose-lg sm:prose-xl'

    // Detect screenplay/script types that need monospace font
    const isScreenplayType = documentType === 'screenplay' ||
                             documentType === 'stage_play' ||
                             documentType === 'one_act_play' ||
                             documentType === 'musical' ||
                             documentType === 'radio_play'

    // Use monospace for screenplay types, serif/sans for others
    const fontClass = isScreenplayType
      ? 'font-mono prose-headings:font-mono prose-blockquote:font-mono'
      : theme === 'serif'
        ? 'font-serif prose-headings:font-serif prose-blockquote:font-serif'
        : 'font-sans'

    return cn(
      'editor-body prose max-w-none focus:outline-none leading-relaxed selection:bg-primary/20 selection:text-primary-foreground',
      scaleClass,
      fontClass,
      'prose-headings:font-semibold prose-headings:tracking-tight prose-p:leading-relaxed prose-li:leading-relaxed prose-blockquote:border-l-4 prose-blockquote:border-primary/50 prose-blockquote:bg-muted/50 prose-blockquote:pl-6 prose-strong:font-semibold'
    )
  }, [fontScale, theme, documentType])

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
      TextAlign.configure({
        types: ['heading', 'paragraph'],
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
        class: computedEditorClass,
      },
    },
  })

  const emitAnchors = useCallback(() => {
    if (!editor || !onAnchorsChange) return
    onAnchorsChange(collectAnchorsFromEditor(editor))
  }, [editor, onAnchorsChange])

  useEffect(() => {
    if (!editor) return
    editor.setOptions({
      editorProps: {
        ...editor.options.editorProps,
        attributes: {
          ...(editor.options.editorProps?.attributes ?? {}),
          class: computedEditorClass,
        },
      },
    })
  }, [editor, computedEditorClass])

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
      editor,
    }

    onReady(api)
    return () => {
      onReady(null)
    }
  }, [editor, onReady])

  const characterCount = editor?.storage.characterCount?.characters?.() ?? 0
  const wordCount = editor?.storage.characterCount?.words?.() ?? 0

  const maxWidthClass = useMemo(() => {
    switch (layoutMode) {
      case 'wide':
        return 'max-w-[1200px]'
      case 'typewriter':
        return 'max-w-[760px]'
      default:
        return 'max-w-[960px]'
    }
  }, [layoutMode])

  const outerPaddingClass = useMemo(() => (layoutMode === 'page' ? 'py-8 sm:py-10' : 'py-6'), [layoutMode])

  const pageFrameClass = useMemo(() => {
    switch (layoutMode) {
      case 'wide':
        return 'rounded-lg border border-border bg-white px-10 py-12 shadow-lg'
      case 'typewriter':
        return 'rounded-lg border border-border bg-white px-8 py-12 shadow-lg'
      default:
        return 'rounded-lg border border-border/60 bg-white px-12 py-14 shadow-[0_40px_120px_-60px_rgba(15,23,42,0.3)] sm:px-14 sm:py-16'
    }
  }, [layoutMode])

  // Subtle paper texture using SVG noise pattern
  const paperTextureStyle = useMemo(
    () => ({
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E")`,
    }),
    []
  )

  const toolbarWrapperClass = useMemo(
    () =>
      cn(
        'sticky top-0 z-10 mx-auto flex w-full flex-wrap items-center gap-2 rounded-md border border-border/30 bg-background/80 px-4 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-background/70',
        maxWidthClass
      ),
    [maxWidthClass]
  )

  const pageOuterClass = useMemo(
    () =>
      cn(
        'relative mx-auto w-full',
        maxWidthClass,
        outerPaddingClass,
        layoutMode === 'page' ? 'px-2 sm:px-4' : 'px-2'
      ),
    [layoutMode, maxWidthClass, outerPaddingClass]
  )

  const countersClass = useMemo(
    () =>
      cn(
        'mx-auto flex w-full items-center justify-between gap-4 text-xs text-muted-foreground',
        maxWidthClass,
        layoutMode === 'page' ? 'pb-8 px-2 sm:px-4' : 'pb-4 px-2'
      ),
    [layoutMode, maxWidthClass]
  )

  if (!editor) {
    return null
  }

  const currentAlignment = editor.isActive({ textAlign: 'right' })
    ? 'right'
    : editor.isActive({ textAlign: 'center' })
      ? 'center'
      : editor.isActive({ textAlign: 'justify' })
        ? 'justify'
        : 'left'

  return (
    <div className="flex flex-col gap-4">
      {editable && (
        <div className={toolbarWrapperClass}>
          <div className="flex flex-wrap items-center gap-0.5 rounded-md border border-border/50 bg-muted/50 p-0.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Bold"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={cn('h-7 rounded-sm transition-all duration-150', editor.isActive('bold') && 'bg-background shadow-sm')}
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Italic"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={cn('h-7 rounded-sm transition-all duration-150', editor.isActive('italic') && 'bg-background shadow-sm')}
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Strikethrough"
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={cn('h-7 rounded-sm transition-all duration-150', editor.isActive('strike') && 'bg-background shadow-sm')}
            >
              <Strikethrough className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Code"
              onClick={() => editor.chain().focus().toggleCode().run()}
              className={cn('h-7 rounded-sm transition-all duration-150', editor.isActive('code') && 'bg-background shadow-sm')}
            >
              <Code className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Highlight"
              onClick={() => editor.chain().focus().toggleHighlight().run()}
              className={cn('h-7 rounded-sm transition-all duration-150', editor.isActive('highlight') && 'bg-background shadow-sm')}
            >
              <Highlighter className="h-4 w-4" />
            </Button>
          </div>

          <div className="hidden h-5 w-px bg-border/50 sm:block" aria-hidden="true" />

          <div className="flex flex-wrap items-center gap-0.5 rounded-md border border-border/50 bg-muted/50 p-0.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Heading 1"
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className={cn('h-7 rounded-sm transition-all duration-150', editor.isActive('heading', { level: 1 }) && 'bg-background shadow-sm')}
            >
              <Heading1 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Heading 2"
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={cn('h-7 rounded-sm transition-all duration-150', editor.isActive('heading', { level: 2 }) && 'bg-background shadow-sm')}
            >
              <Heading2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Bullet list"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={cn('h-7 rounded-sm transition-all duration-150', editor.isActive('bulletList') && 'bg-background shadow-sm')}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Numbered list"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={cn('h-7 rounded-sm transition-all duration-150', editor.isActive('orderedList') && 'bg-background shadow-sm')}
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Quote"
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className={cn('h-7 rounded-sm transition-all duration-150', editor.isActive('blockquote') && 'bg-background shadow-sm')}
            >
              <Quote className="h-4 w-4" />
            </Button>
          </div>

          <div className="hidden h-5 w-px bg-border/50 sm:block" aria-hidden="true" />

          <div className="flex flex-wrap items-center gap-0.5 rounded-md border border-border/50 bg-muted/50 p-0.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Align left"
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              className={cn('h-7 rounded-sm transition-all duration-150', currentAlignment === 'left' && 'bg-background shadow-sm')}
            >
              <AlignLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Align center"
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              className={cn('h-7 rounded-sm transition-all duration-150', currentAlignment === 'center' && 'bg-background shadow-sm')}
            >
              <AlignCenter className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Align right"
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              className={cn('h-7 rounded-sm transition-all duration-150', currentAlignment === 'right' && 'bg-background shadow-sm')}
            >
              <AlignRight className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Justify"
              onClick={() => editor.chain().focus().setTextAlign('justify').run()}
              className={cn('h-7 rounded-sm transition-all duration-150', currentAlignment === 'justify' && 'bg-background shadow-sm')}
            >
              <AlignJustify className="h-4 w-4" />
            </Button>
          </div>

          <div className="hidden h-5 w-px bg-border/50 sm:block" aria-hidden="true" />

          <div className="flex flex-wrap items-center gap-0.5 rounded-md border border-border/50 bg-muted/50 p-0.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Undo"
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              className="h-7 rounded-sm transition-all duration-150"
            >
              <Undo className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Redo"
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              className="h-7 rounded-sm transition-all duration-150"
            >
              <Redo className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <div className={pageOuterClass}>
        <div className={cn('relative z-[1]', pageFrameClass)} style={paperTextureStyle}>
          <EditorContent editor={editor} />
        </div>
      </div>

      {editable && (
        <div className={countersClass}>
          <div>{characterCount.toLocaleString()} characters</div>
          <div>{wordCount.toLocaleString()} words</div>
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
            <div className="max-h-[300px] overflow-auto rounded-md border bg-muted/50 p-3 text-sm font-mono">
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
