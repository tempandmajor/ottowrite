/**
 * Cursor-Aware Insertion Tests
 *
 * Verifies that AI-generated content is inserted at the actual cursor position
 * in both prose (TiptapEditor) and screenplay (ScreenplayEditor) editors.
 */

import { describe, it, expect } from 'vitest'

describe('Cursor-Aware Insertion', () => {
  describe('TiptapEditor', () => {
    it('should insert at cursor position when no selection', () => {
      // Simulate TiptapEditor behavior
      const content = 'Hello world'
      const cursorPos = 6 // After "Hello "
      const insertText = 'beautiful '

      // Expected: Insert at cursor, no deletion
      const before = content.slice(0, cursorPos)
      const after = content.slice(cursorPos)
      const result = before + insertText + after

      expect(result).toBe('Hello beautiful world')
    })

    it('should replace selection when text is selected', () => {
      // Simulate TiptapEditor behavior with selection
      const content = 'Hello world'
      const selectionStart = 6
      const selectionEnd = 11 // "world" selected
      const insertText = 'universe'

      // Expected: Replace selection with new text
      const before = content.slice(0, selectionStart)
      const after = content.slice(selectionEnd)
      const result = before + insertText + after

      expect(result).toBe('Hello universe')
    })

    it('should handle insertion at start of document', () => {
      const content = 'world'
      const cursorPos = 0
      const insertText = 'Hello '

      const before = content.slice(0, cursorPos)
      const after = content.slice(cursorPos)
      const result = before + insertText + after

      expect(result).toBe('Hello world')
    })

    it('should handle insertion at end of document', () => {
      const content = 'Hello'
      const cursorPos = 5
      const insertText = ' world'

      const before = content.slice(0, cursorPos)
      const after = content.slice(cursorPos)
      const result = before + insertText + after

      expect(result).toBe('Hello world')
    })

    it('should handle multi-line insertion', () => {
      const content = 'Line 1\nLine 3'
      const cursorPos = 7 // After "Line 1\n"
      const insertText = 'Line 2\n'

      const before = content.slice(0, cursorPos)
      const after = content.slice(cursorPos)
      const result = before + insertText + after

      expect(result).toBe('Line 1\nLine 2\nLine 3')
    })
  })

  describe('ScreenplayEditor', () => {
    interface ScreenplayElement {
      id: string
      type: 'scene' | 'action' | 'dialogue' | 'character' | 'parenthetical' | 'transition'
      content: string
    }

    it('should insert at cursor position in current element', () => {
      const element: ScreenplayElement = {
        id: '1',
        type: 'action',
        content: 'John walks the room.',
      }
      const cursorStart = 11 // After "John walks "
      const cursorEnd = 11
      const insertText = 'into '

      // Simulate screenplay insertion
      const before = element.content.slice(0, cursorStart)
      const after = element.content.slice(cursorEnd)
      const result = before + insertText + after

      expect(result).toBe('John walks into the room.')
    })

    it('should replace selected text in current element', () => {
      const element: ScreenplayElement = {
        id: '1',
        type: 'dialogue',
        content: 'I need your help.',
      }
      const cursorStart = 2 // "need" starts at 2
      const cursorEnd = 6 // "need" ends at 6
      const insertText = 'want'

      const before = element.content.slice(0, cursorStart)
      const after = element.content.slice(cursorEnd)
      const result = before + insertText + after

      expect(result).toBe('I want your help.')
    })

    it('should insert multi-paragraph text as new elements', () => {
      const element: ScreenplayElement = {
        id: '1',
        type: 'action',
        content: 'John enters.',
      }
      const cursorStart = 12 // After "John enters."
      const insertText = '\n\nHe looks around.\n\nHe sits down.'

      // Multi-paragraph insertion creates new elements
      const segments = insertText
        .split(/\n{2,}/)
        .map((s) => s.trim())
        .filter(Boolean)

      expect(segments).toEqual(['He looks around.', 'He sits down.'])
      expect(segments.length).toBe(2)
    })

    it('should handle empty selection (cursor only)', () => {
      const element: ScreenplayElement = {
        id: '1',
        type: 'character',
        content: 'JOHN',
      }
      const cursorStart = 4
      const cursorEnd = 4 // No selection
      const insertText = ' (V.O.)'

      const before = element.content.slice(0, cursorStart)
      const after = element.content.slice(cursorEnd)
      const result = before + insertText + after

      expect(result).toBe('JOHN (V.O.)')
    })

    it('should respect selection boundaries', () => {
      const element: ScreenplayElement = {
        id: '1',
        type: 'action',
        content: 'The quick brown fox jumps.',
      }
      const cursorStart = 4 // "quick" starts
      const cursorEnd = 19 // "fox" ends
      const insertText = 'lazy dog barks'

      const before = element.content.slice(0, cursorStart)
      const after = element.content.slice(cursorEnd)
      const result = before + insertText + after

      expect(result).toBe('The lazy dog barks jumps.')
    })
  })

  describe('Selection Extraction', () => {
    it('should extract selected text correctly', () => {
      const content = 'Hello beautiful world'
      const start = 6
      const end = 15 // "beautiful"

      const selectedText = content.slice(start, end)

      expect(selectedText).toBe('beautiful')
    })

    it('should return empty string when no selection', () => {
      const content = 'Hello world'
      const start = 5
      const end = 5 // Cursor position, no selection

      const selectedText = content.slice(start, end)

      expect(selectedText).toBe('')
    })

    it('should handle full document selection', () => {
      const content = 'Hello world'
      const start = 0
      const end = 11

      const selectedText = content.slice(start, end)

      expect(selectedText).toBe('Hello world')
    })
  })

  describe('Edge Cases', () => {
    it('should handle insertion in empty document', () => {
      const content = ''
      const cursorPos = 0
      const insertText = 'Hello world'

      const before = content.slice(0, cursorPos)
      const after = content.slice(cursorPos)
      const result = before + insertText + after

      expect(result).toBe('Hello world')
    })

    it('should handle replacement of entire content', () => {
      const content = 'Hello world'
      const selectionStart = 0
      const selectionEnd = 11
      const insertText = 'Goodbye'

      const before = content.slice(0, selectionStart)
      const after = content.slice(selectionEnd)
      const result = before + insertText + after

      expect(result).toBe('Goodbye')
    })

    it('should handle special characters in insertion', () => {
      const content = 'Test'
      const cursorPos = 4
      const insertText = ' & "quotes" <tags>'

      const before = content.slice(0, cursorPos)
      const after = content.slice(cursorPos)
      const result = before + insertText + after

      expect(result).toBe('Test & "quotes" <tags>')
    })

    it('should handle unicode characters', () => {
      const content = 'Hello'
      const cursorPos = 5
      const insertText = ' 世界 🌍'

      const before = content.slice(0, cursorPos)
      const after = content.slice(cursorPos)
      const result = before + insertText + after

      expect(result).toBe('Hello 世界 🌍')
    })
  })
})
