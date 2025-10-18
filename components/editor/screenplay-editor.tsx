'use client'

import { useState, useRef, useEffect, KeyboardEvent, useCallback } from 'react'
import { Card } from '@/components/ui/card'

type ElementType = 'scene' | 'action' | 'character' | 'dialogue' | 'parenthetical' | 'transition'

type ScreenplayElement = {
  id: string
  type: ElementType
  content: string
}

interface ScreenplayEditorProps {
  content: ScreenplayElement[]
  onUpdate: (content: ScreenplayElement[]) => void
  editable?: boolean
}

export function ScreenplayEditor({
  content,
  onUpdate,
  editable = true,
}: ScreenplayEditorProps) {
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

  useEffect(() => {
    const incoming = normalizeElements(content)
    const incomingString = JSON.stringify(incoming)
    const currentString = JSON.stringify(elements)

    if (incomingString !== currentString) {
      setElements(incoming)
    }
  }, [content, elements, normalizeElements])

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>, index: number) => {
    const element = elements[index]

    // Tab - cycle through element types
    if (e.key === 'Tab') {
      e.preventDefault()
      const types: ElementType[] = ['scene', 'action', 'character', 'dialogue', 'parenthetical', 'transition']
      const currentIndex = types.indexOf(element.type)
      const nextType = types[(currentIndex + 1) % types.length]

      const newElements = [...elements]
      newElements[index] = { ...element, type: nextType }
      setElements(newElements)
      onUpdate(newElements)
    }

    // Enter - create new element
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()

      const newElement: ScreenplayElement = {
        id: generateElementId(),
        type: getNextElementType(element.type),
        content: '',
      }

      const newElements = [
        ...elements.slice(0, index + 1),
        newElement,
        ...elements.slice(index + 1),
      ]

      setElements(newElements)
      onUpdate(newElements)

      setTimeout(() => {
        inputRefs.current[index + 1]?.focus()
      }, 0)
    }

    // Backspace on empty element - delete it
    if (e.key === 'Backspace' && element.content === '' && elements.length > 1) {
      e.preventDefault()

      const newElements = elements.filter((_, i) => i !== index)
      setElements(newElements)
      onUpdate(newElements)

      setTimeout(() => {
        inputRefs.current[Math.max(0, index - 1)]?.focus()
      }, 0)
    }
  }

  const handleChange = (index: number, value: string) => {
    const newElements = [...elements]
    newElements[index] = { ...newElements[index], content: value }
    setElements(newElements)
    onUpdate(newElements)
  }

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

  const getElementStyle = (type: ElementType): string => {
    switch (type) {
      case 'scene':
        return 'font-bold uppercase'
      case 'action':
        return ''
      case 'character':
        return 'ml-[30%] uppercase font-semibold'
      case 'dialogue':
        return 'ml-[15%] mr-[20%]'
      case 'parenthetical':
        return 'ml-[25%] mr-[30%] italic'
      case 'transition':
        return 'ml-auto text-right uppercase font-semibold'
      default:
        return ''
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

  const formatContent = (value: string, type: ElementType): string => {
    if (type === 'scene' || type === 'character' || type === 'transition') {
      return value.toUpperCase()
    }
    return value
  }

  // Calculate page count (1 page ≈ 1 minute screen time)
  const totalLines = elements.reduce((sum, el) => {
    const lines = Math.max(1, Math.ceil(el.content.length / 60))
    return sum + lines
  }, 0)
  const pageCount = Math.max(1, Math.ceil(totalLines / 55)) // ~55 lines per page

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
        {elements.map((element, index) => (
          <div key={element.id} className="relative group">
            <div className={`flex items-start ${getElementStyle(element.type)}`}>
              <textarea
                ref={(el) => {
                  inputRefs.current[index] = el
                }}
                value={element.content}
                onChange={(e) => handleChange(index, formatContent(e.target.value, element.type))}
                onKeyDown={(e) => handleKeyDown(e, index)}
                placeholder={getPlaceholder(element.type)}
                disabled={!editable}
                className="w-full bg-transparent border-none outline-none resize-none overflow-hidden placeholder-gray-400 focus:bg-gray-50 min-h-[1.5rem]"
                rows={Math.max(1, Math.ceil(element.content.length / 60))}
              />
            </div>

            {/* Element type indicator */}
            {editable && (
              <div className="absolute -left-24 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-xs text-gray-400 uppercase">{element.type}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Help Text */}
      {editable && (
        <div className="mt-8 pt-4 border-t border-gray-200 text-sm text-gray-500">
          <p className="mb-2"><strong>Keyboard Shortcuts:</strong></p>
          <ul className="space-y-1 ml-4">
            <li>• <kbd className="px-2 py-1 bg-gray-100 rounded">TAB</kbd> - Cycle element type</li>
            <li>• <kbd className="px-2 py-1 bg-gray-100 rounded">ENTER</kbd> - New element</li>
            <li>• <kbd className="px-2 py-1 bg-gray-100 rounded">BACKSPACE</kbd> (on empty line) - Delete element</li>
          </ul>
        </div>
      )}
    </Card>
  )
}
