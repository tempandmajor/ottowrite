'use client'

import { useState, useRef, useEffect, KeyboardEvent, useCallback, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type ElementType = 'scene' | 'action' | 'character' | 'dialogue' | 'parenthetical' | 'transition'

export type ScreenplayElement = {
  id: string
  type: ElementType
  content: string
}

export type ScreenplayEditorApi = {
  insertTextAtCursor: (text: string) => void
  getSelectedText: () => string
}

interface ScreenplayEditorProps {
  content: ScreenplayElement[]
  onUpdate: (content: ScreenplayElement[]) => void
  editable?: boolean
  onReady?: (api: ScreenplayEditorApi | null) => void
}

export function ScreenplayEditor({
  content,
  onUpdate,
  editable = true,
  onReady,
}: ScreenplayEditorProps) {
  const ELEMENT_LAYOUT: Record<
    ElementType,
    { container: string; textarea: string; background?: string; rowLength: number }
  > = useMemo(
    () => ({
      scene: {
        container: 'justify-start',
        textarea: 'w-full text-left font-semibold uppercase tracking-[0.25em]',
        background: 'bg-amber-50/60',
        rowLength: 52,
      },
      action: {
        container: 'justify-start',
        textarea: 'w-full text-left leading-relaxed',
        rowLength: 68,
      },
      character: {
        container: 'justify-center',
        textarea: 'w-[45%] mx-auto text-center uppercase font-semibold tracking-[0.15em]',
        rowLength: 38,
      },
      dialogue: {
        container: 'justify-center',
        textarea: 'w-[65%] mx-auto text-left leading-relaxed',
        rowLength: 42,
      },
      parenthetical: {
        container: 'justify-center',
        textarea: 'w-[50%] mx-auto text-center italic leading-snug',
        rowLength: 30,
      },
      transition: {
        container: 'justify-end',
        textarea: 'w-[40%] ml-auto text-right uppercase font-semibold tracking-[0.2em]',
        rowLength: 34,
      },
    }),
    []
  )

  const generateElementId = useCallback(
    () =>
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : Date.now().toString(),
    []
  )

  const createDefaultElement = useCallback(
    (): ScreenplayElement => ({
      id: generateElementId(),
      type: 'scene',
      content: '',
    }),
    [generateElementId]
  )

  const normalizeElements = useCallback(
    (items: ScreenplayElement[]) => {
      const base = items.length > 0 ? items : [createDefaultElement()]
      return base.map((item) => ({
        ...item,
        id: item.id || generateElementId(),
        content: item.content ?? (item as any).text ?? '',
      }))
    },
    [createDefaultElement, generateElementId]
  )

  const [elements, setElements] = useState<ScreenplayElement[]>(normalizeElements(content))
  const inputRefs = useRef<(HTMLTextAreaElement | null)[]>([])
  const elementsRef = useRef(elements)
  const selectionRef = useRef<{ index: number | null; start: number; end: number }>({
    index: null,
    start: 0,
    end: 0,
  })

  const updateElements = useCallback(
    (updater: (current: ScreenplayElement[]) => ScreenplayElement[]) => {
      setElements((prev) => {
        const next = updater(prev)
        onUpdate(next)
        return next
      })
    },
    [onUpdate]
  )

  useEffect(() => {
    const incoming = normalizeElements(content)
    const incomingString = JSON.stringify(incoming)
    const currentString = JSON.stringify(elements)

    if (incomingString !== currentString) {
      setElements(incoming)
    }
  }, [content, elements, normalizeElements])

  useEffect(() => {
    elementsRef.current = elements
  }, [elements])

  const rememberSelection = useCallback((index: number, target: HTMLTextAreaElement) => {
    const start = target.selectionStart ?? target.value.length
    const end = target.selectionEnd ?? target.value.length
    selectionRef.current = { index, start, end }
  }, [])

  const focusAndSetSelection = useCallback((index: number, position: number) => {
    const target = inputRefs.current[index]
    if (!target) return
    target.focus()
    target.setSelectionRange(position, position)
    selectionRef.current = { index, start: position, end: position }
  }, [])

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>, index: number) => {
    const element = elements[index]

    if ((e.metaKey || e.ctrlKey) && !e.altKey) {
      const shortcutMap: Record<string, ElementType> = {
        Digit1: 'scene',
        Digit2: 'action',
        Digit3: 'character',
        Digit4: 'dialogue',
        Digit5: 'parenthetical',
        Digit6: 'transition',
      }
      const nextType = shortcutMap[e.code]
      if (nextType) {
        e.preventDefault()
        const formatted = formatContent(element.content, nextType)
        updateElements((current) => {
          const next = [...current]
          next[index] = { ...next[index], type: nextType, content: formatted }
          return next
        })
        requestAnimationFrame(() => {
          const target = inputRefs.current[index]
          if (target) {
            const caret = target.selectionStart ?? target.value.length
            focusAndSetSelection(index, caret)
          }
        })
        return
      }
    }

    // Tab - cycle through element types
    if (e.key === 'Tab') {
      e.preventDefault()
      const types: ElementType[] = ['scene', 'action', 'character', 'dialogue', 'parenthetical', 'transition']
      const currentIndex = types.indexOf(element.type)
      const nextType = types[(currentIndex + 1) % types.length]

      updateElements((current) => {
        const next = [...current]
        next[index] = {
          ...next[index],
          type: nextType,
          content: formatContent(next[index].content, nextType),
        }
        return next
      })
    }

    // Enter - create new element
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()

      const newElement: ScreenplayElement = {
        id: generateElementId(),
        type: getNextElementType(element.type),
        content: '',
      }

      updateElements((current) => [
        ...current.slice(0, index + 1),
        newElement,
        ...current.slice(index + 1),
      ])

      setTimeout(() => {
        focusAndSetSelection(index + 1, 0)
      }, 0)
    }

    // Backspace on empty element - delete it
    if (e.key === 'Backspace' && element.content === '' && elements.length > 1) {
      e.preventDefault()
      const nextIndex = Math.max(0, index - 1)
      updateElements((current) => current.filter((_, i) => i !== index))
      setTimeout(() => {
        focusAndSetSelection(nextIndex, inputRefs.current[nextIndex]?.value.length ?? 0)
      }, 0)
    }
  }

  const handleChange = (index: number, value: string) => {
    updateElements((current) => {
      const next = [...current]
      next[index] = { ...next[index], content: value }
      return next
    })
  }

  const formatContent = useCallback((value: string, type: ElementType) => {
    const normalized = value.replace(/\r\n/g, '\n')
    switch (type) {
      case 'scene': {
        const cleaned = normalized.replace(/\s+/g, ' ').trim().toUpperCase()
        return cleaned
      }
      case 'character': {
        const cleaned = normalized.replace(/\s+/g, ' ').trim().toUpperCase()
        return cleaned
      }
      case 'transition': {
        let cleaned = normalized.replace(/\s+/g, ' ').trim().toUpperCase()
        if (cleaned && !cleaned.endsWith(':')) {
          cleaned += ':'
        }
        return cleaned
      }
      case 'parenthetical': {
        const inner = normalized.replace(/^\((.*)\)$/s, '$1').trim()
        return inner ? `(${inner})` : ''
      }
      default:
        return normalized
    }
  }, [])

  const estimateRows = useCallback(
    (text: string, type: ElementType) => {
      const layout = ELEMENT_LAYOUT[type]
      const maxLength = layout?.rowLength ?? 60
      const lines = text.split('\n').reduce((sum, line) => {
        const length = line.trim().length || 1
        return sum + Math.max(1, Math.ceil(length / maxLength))
      }, 0)
      return Math.max(1, lines)
    },
    [ELEMENT_LAYOUT]
  )

  const insertTextAtCursor = useCallback(
    (rawText: string) => {
      const normalized = rawText.replace(/\r\n/g, '\n')
      if (!normalized.trim()) return

      const { index, start, end } = selectionRef.current
      const currentElements = elementsRef.current

      if (index != null && currentElements[index]) {
        const target = currentElements[index]

        // Check if text contains paragraph breaks
        const hasParagraphBreaks = /\n{2,}/.test(normalized)

        if (hasParagraphBreaks) {
          // Split into segments
          const segments = normalized
            .split(/\n{2,}/)
            .map((segment) => segment.trim())
            .filter(Boolean)

          if (segments.length === 0) return

          // Insert first segment at cursor position
          const firstSegment = segments[0]
          const before = target.content.slice(0, start)
          const after = target.content.slice(end)
          const updatedContent = formatContent(`${before}${firstSegment}${after}`, target.type)

          // Create new elements for remaining segments
          const newElements = segments.slice(1).map((segment) => ({
            id: generateElementId(),
            type: 'action' as ElementType,
            content: formatContent(segment, 'action'),
          }))

          updateElements((current) => {
            const next = [...current]
            next[index] = { ...next[index], content: updatedContent }
            // Insert new elements after current element
            next.splice(index + 1, 0, ...newElements)
            return next
          })

          requestAnimationFrame(() => {
            // Focus last created element
            const lastIndex = index + newElements.length
            focusAndSetSelection(lastIndex, inputRefs.current[lastIndex]?.value.length ?? 0)
          })
          return
        }

        // Single paragraph - insert inline at cursor
        const before = target.content.slice(0, start)
        const after = target.content.slice(end)
        const nextContent = formatContent(`${before}${normalized}${after}`, target.type)

        updateElements((current) => {
          const next = [...current]
          next[index] = { ...next[index], content: nextContent }
          return next
        })

        requestAnimationFrame(() => {
          const caret = start + normalized.length
          focusAndSetSelection(index, caret)
        })
        return
      }

      // No cursor position - append to end
      const segments = normalized
        .split(/\n{2,}/)
        .map((segment) => segment.trim())
        .filter(Boolean)

      if (segments.length === 0) {
        return
      }

      const insertionStartIndex = elementsRef.current.length

      updateElements((current) => [
        ...current,
        ...segments.map((segment) => ({
          id: generateElementId(),
          type: 'action' as ElementType,
          content: formatContent(segment, 'action'),
        })),
      ])

      requestAnimationFrame(() => {
        focusAndSetSelection(insertionStartIndex, inputRefs.current[insertionStartIndex]?.value.length ?? 0)
      })
    },
    [focusAndSetSelection, formatContent, generateElementId, updateElements]
  )

  const getSelectedText = useCallback(() => {
    const { index, start, end } = selectionRef.current
    if (index == null) return ''
    const target = elementsRef.current[index]
    if (!target) return ''
    if (start === end) return ''
    return target.content.slice(start, end)
  }, [])

  const getNextElementType = (currentType: ElementType): ElementType => {
    switch (currentType) {
      case 'scene':
        return 'action'
      case 'action':
        return 'character'
      case 'character':
        return 'dialogue'
      case 'dialogue':
        return 'action'
      case 'parenthetical':
        return 'dialogue'
      case 'transition':
        return 'scene'
      default:
        return 'action'
    }
  }

  const getPlaceholder = (type: ElementType): string => {
    switch (type) {
      case 'scene':
        return 'INT./EXT. LOCATION - DAY/NIGHT'
      case 'action':
        return 'Action description...'
      case 'character':
        return 'CHARACTER NAME'
      case 'dialogue':
        return 'Dialogue...'
      case 'parenthetical':
        return '(action)'
      case 'transition':
        return 'CUT TO:'
      default:
        return 'Type here...'
    }
  }

  // Calculate page count (1 page ≈ 1 minute screen time)
  const totalLines = elements.reduce((sum, el) => {
    const lines = Math.max(1, Math.ceil(el.content.length / 60))
    return sum + lines
  }, 0)
  const pageCount = Math.max(1, Math.ceil(totalLines / 55)) // ~55 lines per page

  useEffect(() => {
    if (!onReady) return
    onReady({
      insertTextAtCursor,
      getSelectedText,
    })
    return () => {
      onReady(null)
    }
  }, [getSelectedText, insertTextAtCursor, onReady])

  return (
    <Card className="bg-white p-8 min-h-[800px]">
      {/* Screenplay Header */}
      <div className="mb-8 pb-4 border-b border-gray-300">
        <div className="flex justify-between items-center text-sm text-gray-600">
          <div>
            <span className="font-semibold">Format:</span> Screenplay
          </div>
          <div>
            <span className="font-semibold">Pages:</span> {pageCount}
            <span className="ml-4 text-gray-400">≈ {pageCount} min screen time</span>
          </div>
        </div>
      </div>

      {/* Screenplay Content */}
      <div className="space-y-1 font-mono text-[12pt] leading-relaxed">
        {elements.map((element, index) => {
          const layout = ELEMENT_LAYOUT[element.type]
          return (
            <div key={element.id} className="relative group">
              <div
                className={cn(
                  'flex items-start px-2 py-1 transition-colors rounded-md',
                  layout?.container ?? 'justify-start',
                  layout?.background ?? ''
                )}
              >
                <textarea
                  ref={(el) => {
                    inputRefs.current[index] = el
                  }}
                  value={element.content}
                  onChange={(e) => handleChange(index, formatContent(e.target.value, element.type))}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  onFocus={(e) => rememberSelection(index, e.currentTarget)}
                  onClick={(e) => rememberSelection(index, e.currentTarget)}
                  onKeyUp={(e) => rememberSelection(index, e.currentTarget)}
                  onSelect={(e) => rememberSelection(index, e.currentTarget)}
                  placeholder={getPlaceholder(element.type)}
                  disabled={!editable}
                  className={cn(
                    'bg-transparent border-none outline-none resize-none overflow-hidden placeholder-gray-400 focus:bg-muted/30 focus:outline-none min-h-[1.5rem] whitespace-pre-wrap leading-relaxed text-[12pt] transition-colors rounded-md px-1 py-0.5',
                    layout?.textarea ?? 'w-full'
                  )}
                  rows={estimateRows(element.content, element.type)}
                />
              </div>

            {/* Element type indicator */}
            {editable && (
              <div className="absolute -left-24 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-xs text-gray-400 uppercase">{element.type}</span>
              </div>
            )}
            </div>
          )
        })}
      </div>

      {/* Help Text */}
      {editable && (
        <div className="mt-8 pt-4 border-t border-gray-200 text-sm text-gray-500">
          <p className="mb-2"><strong>Keyboard Shortcuts:</strong></p>
          <ul className="space-y-1 ml-4">
            <li>• <kbd className="px-2 py-1 bg-gray-100 rounded">TAB</kbd> - Cycle element type</li>
            <li>• <kbd className="px-2 py-1 bg-gray-100 rounded">ENTER</kbd> - New element</li>
            <li>• <kbd className="px-2 py-1 bg-gray-100 rounded">BACKSPACE</kbd> (on empty line) - Delete element</li>
            <li>
              • <kbd className="px-2 py-1 bg-gray-100 rounded">⌘ / Ctrl</kbd>
              <span className="mx-1">+</span>
              <kbd className="px-2 py-1 bg-gray-100 rounded">1</kbd>-<kbd className="px-2 py-1 bg-gray-100 rounded">6</kbd>
              <span className="ml-1">Jump to Scene, Action, Character, Dialogue, Parenthetical, Transition</span>
            </li>
          </ul>
        </div>
      )}
    </Card>
  )
}
