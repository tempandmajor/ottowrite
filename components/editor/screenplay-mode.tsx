'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Film,
  FileText,
  Download,
  Type,
  ChevronRight,
  Info,
} from 'lucide-react'
import {
  type ScreenplayElement,
  type ScreenplayElementType,
  parseScreenplay,
  elementsToText,
  formatElementForDisplay,
  extractCharacterNames,
  getCharacterSuggestions,
  addCharacterExtension,
  validateScreenplay,
  estimatePageCount,
  detectElementType,
  autoFormatElement,
  COMMON_TRANSITIONS,
} from '@/lib/screenplay/formatter'
import { cn } from '@/lib/utils'

type ScreenplayModeProps = {
  initialContent?: string
  onContentChange?: (content: string) => void
  onExport?: (format: 'pdf' | 'fountain') => void
}

export function ScreenplayMode({
  initialContent = '',
  onContentChange,
  onExport,
}: ScreenplayModeProps) {
  const [elements, setElements] = useState<ScreenplayElement[]>([])
  const [currentElementIndex, setCurrentElementIndex] = useState(0)
  const [characterNames, setCharacterNames] = useState<string[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0)
  const [pageCount, setPageCount] = useState(0)
  const [validationErrors, setValidationErrors] = useState<Array<{ line: number; message: string }>>([])

  const editorRef = useRef<HTMLDivElement>(null)
  const currentInputRef = useRef<HTMLTextAreaElement>(null)

  // Parse initial content
  useEffect(() => {
    if (initialContent) {
      const parsed = parseScreenplay(initialContent)
      setElements(parsed)
      setCharacterNames(extractCharacterNames(parsed))
      setPageCount(estimatePageCount(parsed))
    }
  }, [initialContent])

  // Update content when elements change
  useEffect(() => {
    const text = elementsToText(elements)
    onContentChange?.(text)
    setPageCount(estimatePageCount(elements))

    // Validate screenplay
    const validation = validateScreenplay(elements)
    setValidationErrors(validation.errors)
  }, [elements, onContentChange])

  // Handle element text change
  const handleElementChange = useCallback((index: number, text: string) => {
    setElements((prev) => {
      const newElements = [...prev]
      const element = newElements[index]
      element.text = text

      // Auto-detect type based on content
      const previousType = index > 0 ? newElements[index - 1].type : undefined
      const detectedType = detectElementType(text, previousType)

      // Only auto-format if type changed or on specific triggers
      if (detectedType !== element.type) {
        element.type = detectedType
        element.text = autoFormatElement(text, detectedType)
      }

      return newElements
    })

    // Update character suggestions for character elements
    const currentElement = elements[index]
    if (currentElement?.type === 'character' || text.match(/^[A-Z]/)) {
      const matchingSuggestions = getCharacterSuggestions(text.toUpperCase(), characterNames)
      setSuggestions(matchingSuggestions)
      setShowSuggestions(matchingSuggestions.length > 0 && text.length > 0)
      setSelectedSuggestionIndex(0)
    } else {
      setShowSuggestions(false)
    }
  }, [elements, characterNames])

  // Handle element type change (manual override)
  const handleElementTypeChange = useCallback((index: number, type: ScreenplayElementType) => {
    setElements((prev) => {
      const newElements = [...prev]
      newElements[index].type = type
      newElements[index].text = autoFormatElement(newElements[index].text, type)
      return newElements
    })
  }, [])

  // Handle Enter key
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault()

      // If suggestions are shown, accept selected suggestion
      if (showSuggestions && suggestions.length > 0) {
        const selected = suggestions[selectedSuggestionIndex]
        setElements((prev) => {
          const newElements = [...prev]
          newElements[index].text = selected
          return newElements
        })
        setShowSuggestions(false)

        // Move to next element (dialogue)
        setTimeout(() => {
          const nextIndex = index + 1
          if (nextIndex < elements.length) {
            setCurrentElementIndex(nextIndex)
          } else {
            // Create new dialogue element
            setElements((prev) => [...prev, { type: 'dialogue', text: '' }])
            setCurrentElementIndex(nextIndex)
          }
        }, 0)
        return
      }

      // Create new element based on current type
      const currentElement = elements[index]
      let newType: ScreenplayElementType = 'action'

      if (currentElement.type === 'scene-heading' || currentElement.type === 'transition') {
        newType = 'action'
      } else if (currentElement.type === 'character') {
        newType = 'dialogue'
      } else if (currentElement.type === 'dialogue' || currentElement.type === 'parenthetical') {
        newType = 'dialogue'
      } else {
        newType = 'action'
      }

      setElements((prev) => {
        const newElements = [...prev]
        newElements.splice(index + 1, 0, { type: newType, text: '' })
        return newElements
      })

      setCurrentElementIndex(index + 1)
    } else if (e.key === 'ArrowUp' && showSuggestions) {
      e.preventDefault()
      setSelectedSuggestionIndex((prev) => Math.max(0, prev - 1))
    } else if (e.key === 'ArrowDown' && showSuggestions) {
      e.preventDefault()
      setSelectedSuggestionIndex((prev) => Math.min(suggestions.length - 1, prev + 1))
    } else if (e.key === 'Escape' && showSuggestions) {
      setShowSuggestions(false)
    } else if (e.key === 'Tab') {
      e.preventDefault()

      // Cycle through element types
      const currentElement = elements[index]
      const types: ScreenplayElementType[] = ['action', 'scene-heading', 'character', 'dialogue', 'parenthetical', 'transition']
      const currentIndex = types.indexOf(currentElement.type)
      const nextType = types[(currentIndex + 1) % types.length]
      handleElementTypeChange(index, nextType)
    }
  }, [showSuggestions, suggestions, selectedSuggestionIndex, elements, handleElementTypeChange])

  // Insert common transition
  const insertTransition = useCallback((transition: string) => {
    setElements((prev) => [
      ...prev,
      { type: 'transition', text: transition },
      { type: 'action', text: '' },
    ])
    setCurrentElementIndex(elements.length + 1)
  }, [elements.length])

  // Add character extension
  const addExtension = useCallback((extension: 'V.O.' | 'O.S.' | "CONT'D") => {
    const currentElement = elements[currentElementIndex]
    if (currentElement?.type === 'character') {
      const updated = addCharacterExtension(currentElement.text, extension)
      handleElementChange(currentElementIndex, updated)
    }
  }, [currentElementIndex, elements, handleElementChange])

  // Export screenplay
  const handleExport = useCallback((format: 'pdf' | 'fountain') => {
    onExport?.(format)
  }, [onExport])

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <Card className="border-b rounded-none">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Film className="h-5 w-5" />
              <CardTitle>Screenplay Mode</CardTitle>
              <Badge variant="outline">Courier 12pt</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{pageCount} pages</Badge>
              {validationErrors.length > 0 && (
                <Badge variant="destructive">{validationErrors.length} errors</Badge>
              )}
            </div>
          </div>
          <CardDescription>Industry-standard screenplay formatting</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Common transitions */}
            <div className="flex items-center gap-1">
              <Type className="h-4 w-4 text-muted-foreground" />
              {COMMON_TRANSITIONS.slice(0, 4).map((transition) => (
                <Button
                  key={transition}
                  variant="outline"
                  size="sm"
                  onClick={() => insertTransition(transition)}
                >
                  {transition}
                </Button>
              ))}
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Character extensions */}
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={() => addExtension('V.O.')}>
                V.O.
              </Button>
              <Button variant="outline" size="sm" onClick={() => addExtension('O.S.')}>
                O.S.
              </Button>
              <Button variant="outline" size="sm" onClick={() => addExtension("CONT'D")}>
                CONT&apos;D
              </Button>
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Export */}
            <Button variant="outline" size="sm" onClick={() => handleExport('pdf')}>
              <Download className="h-4 w-4 mr-1" />
              Export PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport('fountain')}>
              <FileText className="h-4 w-4 mr-1" />
              Export Fountain
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Editor */}
      <div className="flex-1 overflow-auto bg-white dark:bg-gray-900 p-8">
        <div
          ref={editorRef}
          className="max-w-[8.5in] mx-auto bg-white dark:bg-gray-950 shadow-lg min-h-[11in] p-12"
          style={{ fontFamily: 'Courier, monospace', fontSize: '12pt' }}
        >
          {elements.map((element, index) => {
            const formatted = formatElementForDisplay(element)
            const hasError = validationErrors.some((err) => err.line === index + 1)

            return (
              <div
                key={index}
                className={cn(
                  'relative mb-2',
                  currentElementIndex === index && 'ring-2 ring-blue-500 rounded',
                  hasError && 'ring-2 ring-red-500 rounded'
                )}
                style={{
                  marginLeft: `${formatted.marginLeft}in`,
                  marginRight: `${formatted.marginRight}in`,
                }}
              >
                {/* Element type badge */}
                <div className="absolute -left-20 top-0 flex items-center gap-1">
                  <Select
                    value={element.type}
                    onValueChange={(value) => handleElementTypeChange(index, value as ScreenplayElementType)}
                  >
                    <SelectTrigger className="w-28 h-6 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scene-heading">Scene</SelectItem>
                      <SelectItem value="action">Action</SelectItem>
                      <SelectItem value="character">Character</SelectItem>
                      <SelectItem value="dialogue">Dialogue</SelectItem>
                      <SelectItem value="parenthetical">Wrylies</SelectItem>
                      <SelectItem value="transition">Transition</SelectItem>
                    </SelectContent>
                  </Select>
                  {hasError && (
                    <div title={validationErrors.find((err) => err.line === index + 1)?.message}>
                      <Info className="h-4 w-4 text-red-500" />
                    </div>
                  )}
                </div>

                {/* Element input */}
                <textarea
                  ref={currentElementIndex === index ? currentInputRef : null}
                  value={element.text}
                  onChange={(e) => handleElementChange(index, e.target.value)}
                  onFocus={() => setCurrentElementIndex(index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  className={cn(
                    'w-full bg-transparent border-none resize-none focus:outline-none',
                    formatted.fontWeight === 'bold' && 'font-bold',
                    formatted.textTransform === 'uppercase' && 'uppercase'
                  )}
                  style={{
                    fontFamily: 'Courier, monospace',
                    fontSize: '12pt',
                    lineHeight: '1.5',
                    minHeight: '1.5rem',
                  }}
                  rows={1}
                  placeholder={
                    element.type === 'scene-heading'
                      ? 'INT. LOCATION - DAY'
                      : element.type === 'character'
                      ? 'CHARACTER NAME'
                      : element.type === 'dialogue'
                      ? 'Character dialogue...'
                      : element.type === 'transition'
                      ? 'CUT TO:'
                      : 'Action or description...'
                  }
                />

                {/* Autocomplete suggestions */}
                {showSuggestions && currentElementIndex === index && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border shadow-lg rounded-md z-10 max-w-xs">
                    {suggestions.map((suggestion, suggestionIndex) => (
                      <button
                        key={suggestion}
                        type="button"
                        className={cn(
                          'px-3 py-2 w-full text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700',
                          selectedSuggestionIndex === suggestionIndex && 'bg-blue-100 dark:bg-blue-900'
                        )}
                        onClick={() => {
                          handleElementChange(index, suggestion)
                          setShowSuggestions(false)
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <ChevronRight className="h-4 w-4" />
                          <span className="font-mono">{suggestion}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {/* Add new element button */}
          <Button
            variant="ghost"
            className="w-full mt-4"
            onClick={() => {
              setElements((prev) => [...prev, { type: 'action', text: '' }])
              setCurrentElementIndex(elements.length)
            }}
          >
            + Add Element
          </Button>
        </div>
      </div>

      {/* Keyboard shortcuts help */}
      <div className="border-t p-2 bg-muted/50 text-xs text-muted-foreground">
        <div className="flex items-center gap-4 justify-center">
          <span><kbd>Enter</kbd> New element</span>
          <span><kbd>Tab</kbd> Change type</span>
          <span><kbd>↑↓</kbd> Navigate suggestions</span>
          <span><kbd>Esc</kbd> Close suggestions</span>
        </div>
      </div>
    </div>
  )
}
