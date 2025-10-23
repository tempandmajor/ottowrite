/**
 * Hook to track editor status for status bar
 * Tracks cursor position, selection, session word count
 * TICKET-EDITOR-001: Status Bar with Real-time Metrics
 */

import { useEffect, useState, useCallback } from 'react'
import type { Editor } from '@tiptap/react'
import type { CursorPosition, SelectionStats } from '@/components/editor/status-bar'

interface EditorStatusOptions {
  editor: Editor | null
  documentId: string
  initialWordCount: number
}

interface EditorStatus {
  cursorPosition: CursorPosition | undefined
  selection: SelectionStats | undefined
  sessionWordCount: number
}

/**
 * Calculate cursor position from Tiptap editor state
 */
function calculateCursorPosition(editor: Editor): CursorPosition | undefined {
  try {
    const { from } = editor.state.selection

    // Calculate paragraph number (block-level nodes)
    let paragraph = 0
    editor.state.doc.descendants((node, pos) => {
      if (pos < from && node.isBlock && node.type.name === 'paragraph') {
        paragraph++
      }
    })

    // Calculate line number within the document
    const textBefore = editor.state.doc.textBetween(0, from, '\n')
    const line = textBefore.split('\n').length

    // Calculate column number (position within current line)
    const lineStart = textBefore.lastIndexOf('\n') + 1
    const column = from - lineStart + 1

    return {
      paragraph: paragraph + 1, // 1-indexed
      line,
      column,
      // TODO: Extract scene/chapter from document structure
      scene: undefined,
      chapter: undefined,
    }
  } catch (error) {
    console.error('Error calculating cursor position:', error)
    return undefined
  }
}

/**
 * Calculate selection statistics
 */
function calculateSelectionStats(editor: Editor): SelectionStats | undefined {
  try {
    const { from, to } = editor.state.selection

    // No selection
    if (from === to) {
      return undefined
    }

    const text = editor.state.doc.textBetween(from, to, ' ')
    const words = text.trim().split(/\s+/).filter(Boolean).length
    const characters = text.length

    // Calculate reading time (225 words per minute)
    const readingTime = Math.max(1, Math.ceil(words / 225))

    return {
      words,
      characters,
      readingTime,
    }
  } catch (error) {
    console.error('Error calculating selection stats:', error)
    return undefined
  }
}

/**
 * Hook to track editor status for status bar
 */
export function useEditorStatus({ editor, documentId, initialWordCount }: EditorStatusOptions): EditorStatus {
  const [cursorPosition, setCursorPosition] = useState<CursorPosition | undefined>(undefined)
  const [selection, setSelection] = useState<SelectionStats | undefined>(undefined)
  const [sessionWordCount, setSessionWordCount] = useState(0)

  // Initialize session tracking
  useEffect(() => {
    if (!documentId) return

    const sessionKey = `editor-session-${documentId}`
    const stored = localStorage.getItem(sessionKey)

    if (stored) {
      try {
        const data = JSON.parse(stored)
        const sessionDate = new Date(data.startedAt)
        const now = new Date()

        // Session is valid if started today
        if (
          sessionDate.getDate() === now.getDate() &&
          sessionDate.getMonth() === now.getMonth() &&
          sessionDate.getFullYear() === now.getFullYear()
        ) {
          setSessionWordCount(Math.max(0, initialWordCount - data.initialWordCount))
        } else {
          // New day, start new session
          localStorage.setItem(
            sessionKey,
            JSON.stringify({
              startedAt: now.toISOString(),
              initialWordCount,
            })
          )
          setSessionWordCount(0)
        }
      } catch {
        // Invalid data, reset
        localStorage.setItem(
          sessionKey,
          JSON.stringify({
            startedAt: new Date().toISOString(),
            initialWordCount,
          })
        )
        setSessionWordCount(0)
      }
    } else {
      // First time, create session
      localStorage.setItem(
        sessionKey,
        JSON.stringify({
          startedAt: new Date().toISOString(),
          initialWordCount,
        })
      )
      setSessionWordCount(0)
    }
  }, [documentId, initialWordCount])

  // Update session word count when initial word count changes
  useEffect(() => {
    if (!documentId) return

    const sessionKey = `editor-session-${documentId}`
    const stored = localStorage.getItem(sessionKey)

    if (stored) {
      try {
        const data = JSON.parse(stored)
        setSessionWordCount(Math.max(0, initialWordCount - data.initialWordCount))
      } catch {
        // Ignore errors
      }
    }
  }, [documentId, initialWordCount])

  // Track cursor position and selection changes
  const updateStatus = useCallback(() => {
    if (!editor) return

    // Update cursor position
    const position = calculateCursorPosition(editor)
    setCursorPosition(position)

    // Update selection stats
    const stats = calculateSelectionStats(editor)
    setSelection(stats)
  }, [editor])

  useEffect(() => {
    if (!editor) return

    // Update immediately
    updateStatus()

    // Listen to selection updates
    const handleUpdate = () => {
      updateStatus()
    }

    editor.on('selectionUpdate', handleUpdate)
    editor.on('update', handleUpdate)

    return () => {
      editor.off('selectionUpdate', handleUpdate)
      editor.off('update', handleUpdate)
    }
  }, [editor, updateStatus])

  return {
    cursorPosition,
    selection,
    sessionWordCount,
  }
}
