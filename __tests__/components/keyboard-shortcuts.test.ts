/**
 * @jest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react'
import { useState, useEffect, useCallback, useRef } from 'react'

describe('Keyboard Shortcuts Handler', () => {
  // Mock the keyboard handler behavior
  function useKeyboardShortcuts() {
    const [focusMode, setFocusMode] = useState(false)
    const [structureSidebarOpen, setStructureSidebarOpen] = useState(true)
    const [showAI, setShowAI] = useState(true)
    const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
    const [showVersionHistory, setShowVersionHistory] = useState(false)
    const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)

    // Use ref to persist across renders
    const previousRailsRef = useRef<{ outline: boolean; ai: boolean }>({ outline: true, ai: true })

    const toggleFocusMode = useCallback(() => {
      setFocusMode((prevFocus) => !prevFocus)
      setStructureSidebarOpen((prevOutline) => {
        setShowAI((prevAI) => {
          if (!focusMode) {
            // Entering focus mode: save current states
            previousRailsRef.current = {
              outline: prevOutline,
              ai: prevAI,
            }
            // Return false to hide both
            return false
          } else {
            // Exiting focus mode: restore AI
            return previousRailsRef.current.ai
          }
        })
        if (!focusMode) {
          // Entering: hide outline
          return false
        } else {
          // Exiting: restore outline
          return previousRailsRef.current.outline
        }
      })
    }, [focusMode])

    useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        const key = event.key.toLowerCase()
        if (event.ctrlKey && event.shiftKey) {
          switch (key) {
            case 'f':
              event.preventDefault()
              toggleFocusMode()
              break
            case 'o':
              event.preventDefault()
              setFocusMode(false)
              setStructureSidebarOpen((prev) => !prev)
              break
            case 'a':
              event.preventDefault()
              setFocusMode(false)
              setShowAI((prev) => !prev)
              break
            case 'h':
              event.preventDefault()
              setShowVersionHistory(true)
              break
            case '?':
              event.preventDefault()
              setShowKeyboardHelp(true)
              break
            default:
          }
        } else if (event.ctrlKey && key === 'k') {
          event.preventDefault()
          setCommandPaletteOpen(true)
        }
      }

      window.addEventListener('keydown', handleKeyDown)
      return () => {
        window.removeEventListener('keydown', handleKeyDown)
      }
    }, [toggleFocusMode])

    return {
      focusMode,
      structureSidebarOpen,
      showAI,
      commandPaletteOpen,
      showVersionHistory,
      showKeyboardHelp,
      setFocusMode,
      setStructureSidebarOpen,
      setShowAI,
      setCommandPaletteOpen,
      setShowVersionHistory,
      setShowKeyboardHelp,
    }
  }

  // Helper to simulate keyboard event
  const pressKey = (key: string, options: { ctrl?: boolean; shift?: boolean } = {}) => {
    const event = new KeyboardEvent('keydown', {
      key,
      ctrlKey: options.ctrl ?? false,
      shiftKey: options.shift ?? false,
      bubbles: true,
      cancelable: true,
    })
    window.dispatchEvent(event)
  }

  describe('Focus Mode Toggle (Ctrl+Shift+F)', () => {
    it('should enter focus mode and hide both sidebars', () => {
      const { result } = renderHook(() => useKeyboardShortcuts())

      // Initial state: both sidebars visible
      expect(result.current.structureSidebarOpen).toBe(true)
      expect(result.current.showAI).toBe(true)
      expect(result.current.focusMode).toBe(false)

      // Press Ctrl+Shift+F
      act(() => {
        pressKey('f', { ctrl: true, shift: true })
      })

      // Should enter focus mode and hide sidebars
      expect(result.current.focusMode).toBe(true)
      expect(result.current.structureSidebarOpen).toBe(false)
      expect(result.current.showAI).toBe(false)
    })

    it('should exit focus mode and restore both sidebars', () => {
      const { result } = renderHook(() => useKeyboardShortcuts())

      // Enter focus mode first
      act(() => {
        pressKey('f', { ctrl: true, shift: true })
      })
      expect(result.current.focusMode).toBe(true)

      // Exit focus mode
      act(() => {
        pressKey('f', { ctrl: true, shift: true })
      })

      // Should exit focus mode and restore sidebars
      expect(result.current.focusMode).toBe(false)
      expect(result.current.structureSidebarOpen).toBe(true)
      expect(result.current.showAI).toBe(true)
    })

    it('should work when command palette is open', () => {
      const { result } = renderHook(() => useKeyboardShortcuts())

      // Open command palette first
      act(() => {
        pressKey('k', { ctrl: true })
      })
      expect(result.current.commandPaletteOpen).toBe(true)

      // Try to toggle focus mode with palette open
      act(() => {
        pressKey('f', { ctrl: true, shift: true })
      })

      // Should still enter focus mode
      expect(result.current.focusMode).toBe(true)
      expect(result.current.structureSidebarOpen).toBe(false)
      expect(result.current.showAI).toBe(false)
    })

    it('should work when version history is open', () => {
      const { result } = renderHook(() => useKeyboardShortcuts())

      // Open version history first
      act(() => {
        pressKey('h', { ctrl: true, shift: true })
      })
      expect(result.current.showVersionHistory).toBe(true)

      // Try to toggle focus mode with history open
      act(() => {
        pressKey('f', { ctrl: true, shift: true })
      })

      // Should still enter focus mode
      expect(result.current.focusMode).toBe(true)
      expect(result.current.structureSidebarOpen).toBe(false)
      expect(result.current.showAI).toBe(false)
    })

    it('should work when keyboard help is open', () => {
      const { result } = renderHook(() => useKeyboardShortcuts())

      // Open keyboard help first
      act(() => {
        pressKey('?', { ctrl: true, shift: true })
      })
      expect(result.current.showKeyboardHelp).toBe(true)

      // Try to toggle focus mode with help open
      act(() => {
        pressKey('f', { ctrl: true, shift: true })
      })

      // Should still enter focus mode
      expect(result.current.focusMode).toBe(true)
      expect(result.current.structureSidebarOpen).toBe(false)
      expect(result.current.showAI).toBe(false)
    })

    it('should save panel state when entering focus mode', () => {
      const { result } = renderHook(() => useKeyboardShortcuts())

      // Verify initial state
      expect(result.current.structureSidebarOpen).toBe(true)
      expect(result.current.showAI).toBe(true)

      // Enter focus mode - state is saved here
      act(() => {
        pressKey('f', { ctrl: true, shift: true })
      })

      // Verify focus mode active and panels hidden
      expect(result.current.focusMode).toBe(true)
      expect(result.current.structureSidebarOpen).toBe(false)
      expect(result.current.showAI).toBe(false)
    })

    it('should restore panel state when exiting focus mode', () => {
      const { result } = renderHook(() => useKeyboardShortcuts())

      // Start with both panels visible
      expect(result.current.structureSidebarOpen).toBe(true)
      expect(result.current.showAI).toBe(true)

      // Enter focus mode
      act(() => {
        pressKey('f', { ctrl: true, shift: true })
      })

      // Exit focus mode
      act(() => {
        pressKey('f', { ctrl: true, shift: true })
      })

      // Both panels should be restored
      expect(result.current.focusMode).toBe(false)
      expect(result.current.structureSidebarOpen).toBe(true)
      expect(result.current.showAI).toBe(true)
    })

    it('should work correctly with rapid toggle sequences', () => {
      const { result } = renderHook(() => useKeyboardShortcuts())

      // Toggle sequence: enter, exit, enter, exit
      act(() => {
        pressKey('f', { ctrl: true, shift: true }) // Enter
      })
      expect(result.current.focusMode).toBe(true)

      act(() => {
        pressKey('f', { ctrl: true, shift: true }) // Exit
      })
      expect(result.current.focusMode).toBe(false)
      expect(result.current.structureSidebarOpen).toBe(true)
      expect(result.current.showAI).toBe(true)

      act(() => {
        pressKey('f', { ctrl: true, shift: true }) // Enter again
      })
      expect(result.current.focusMode).toBe(true)
    })
  })

  describe('Outline Toggle (Ctrl+Shift+O)', () => {
    it('should toggle outline sidebar', () => {
      const { result } = renderHook(() => useKeyboardShortcuts())

      expect(result.current.structureSidebarOpen).toBe(true)

      // Press Ctrl+Shift+O
      act(() => {
        pressKey('o', { ctrl: true, shift: true })
      })

      expect(result.current.structureSidebarOpen).toBe(false)

      // Press again
      act(() => {
        pressKey('o', { ctrl: true, shift: true })
      })

      expect(result.current.structureSidebarOpen).toBe(true)
    })

    it('should exit focus mode when toggling outline', () => {
      const { result } = renderHook(() => useKeyboardShortcuts())

      // Enter focus mode
      act(() => {
        pressKey('f', { ctrl: true, shift: true })
      })
      expect(result.current.focusMode).toBe(true)

      // Toggle outline
      act(() => {
        pressKey('o', { ctrl: true, shift: true })
      })

      // Should exit focus mode
      expect(result.current.focusMode).toBe(false)
    })
  })

  describe('AI Assistant Toggle (Ctrl+Shift+A)', () => {
    it('should toggle AI assistant', () => {
      const { result } = renderHook(() => useKeyboardShortcuts())

      expect(result.current.showAI).toBe(true)

      // Press Ctrl+Shift+A
      act(() => {
        pressKey('a', { ctrl: true, shift: true })
      })

      expect(result.current.showAI).toBe(false)

      // Press again
      act(() => {
        pressKey('a', { ctrl: true, shift: true })
      })

      expect(result.current.showAI).toBe(true)
    })

    it('should exit focus mode when toggling AI', () => {
      const { result } = renderHook(() => useKeyboardShortcuts())

      // Enter focus mode
      act(() => {
        pressKey('f', { ctrl: true, shift: true })
      })
      expect(result.current.focusMode).toBe(true)

      // Toggle AI
      act(() => {
        pressKey('a', { ctrl: true, shift: true })
      })

      // Should exit focus mode
      expect(result.current.focusMode).toBe(false)
    })
  })

  describe('Version History (Ctrl+Shift+H)', () => {
    it('should open version history', () => {
      const { result } = renderHook(() => useKeyboardShortcuts())

      expect(result.current.showVersionHistory).toBe(false)

      // Press Ctrl+Shift+H
      act(() => {
        pressKey('h', { ctrl: true, shift: true })
      })

      expect(result.current.showVersionHistory).toBe(true)
    })

    it('should open version history even in focus mode', () => {
      const { result } = renderHook(() => useKeyboardShortcuts())

      // Enter focus mode
      act(() => {
        pressKey('f', { ctrl: true, shift: true })
      })
      expect(result.current.focusMode).toBe(true)

      // Open version history
      act(() => {
        pressKey('h', { ctrl: true, shift: true })
      })

      // Should open history and stay in focus mode
      expect(result.current.showVersionHistory).toBe(true)
      expect(result.current.focusMode).toBe(true)
    })
  })

  describe('Keyboard Help (Ctrl+Shift+?)', () => {
    it('should open keyboard shortcuts help', () => {
      const { result } = renderHook(() => useKeyboardShortcuts())

      expect(result.current.showKeyboardHelp).toBe(false)

      // Press Ctrl+Shift+?
      act(() => {
        pressKey('?', { ctrl: true, shift: true })
      })

      expect(result.current.showKeyboardHelp).toBe(true)
    })

    it('should open help even in focus mode', () => {
      const { result } = renderHook(() => useKeyboardShortcuts())

      // Enter focus mode
      act(() => {
        pressKey('f', { ctrl: true, shift: true })
      })
      expect(result.current.focusMode).toBe(true)

      // Open help
      act(() => {
        pressKey('?', { ctrl: true, shift: true })
      })

      // Should open help and stay in focus mode
      expect(result.current.showKeyboardHelp).toBe(true)
      expect(result.current.focusMode).toBe(true)
    })
  })

  describe('Command Palette (Ctrl+K)', () => {
    it('should open command palette', () => {
      const { result } = renderHook(() => useKeyboardShortcuts())

      expect(result.current.commandPaletteOpen).toBe(false)

      // Press Ctrl+K
      act(() => {
        pressKey('k', { ctrl: true })
      })

      expect(result.current.commandPaletteOpen).toBe(true)
    })

    it('should open palette even in focus mode', () => {
      const { result } = renderHook(() => useKeyboardShortcuts())

      // Enter focus mode
      act(() => {
        pressKey('f', { ctrl: true, shift: true })
      })
      expect(result.current.focusMode).toBe(true)

      // Open command palette
      act(() => {
        pressKey('k', { ctrl: true })
      })

      // Should open palette and stay in focus mode
      expect(result.current.commandPaletteOpen).toBe(true)
      expect(result.current.focusMode).toBe(true)
    })
  })

  describe('Keyboard Shortcut Conflicts', () => {
    it('should not trigger without Ctrl key', () => {
      const { result } = renderHook(() => useKeyboardShortcuts())

      // Press F without Ctrl+Shift
      act(() => {
        pressKey('f')
      })

      // Should not enter focus mode
      expect(result.current.focusMode).toBe(false)
    })

    it('should not trigger with only Ctrl (no Shift)', () => {
      const { result } = renderHook(() => useKeyboardShortcuts())

      // Press Ctrl+F (browser find)
      act(() => {
        pressKey('f', { ctrl: true })
      })

      // Should not enter focus mode
      expect(result.current.focusMode).toBe(false)
    })

    it('should not trigger with only Shift (no Ctrl)', () => {
      const { result } = renderHook(() => useKeyboardShortcuts())

      // Press Shift+F
      act(() => {
        pressKey('f', { shift: true })
      })

      // Should not enter focus mode
      expect(result.current.focusMode).toBe(false)
    })

    it('should handle multiple rapid keypresses', () => {
      const { result } = renderHook(() => useKeyboardShortcuts())

      // Rapidly toggle focus mode
      act(() => {
        pressKey('f', { ctrl: true, shift: true })
        pressKey('f', { ctrl: true, shift: true })
        pressKey('f', { ctrl: true, shift: true })
      })

      // Should be in focus mode (odd number of toggles)
      expect(result.current.focusMode).toBe(true)
    })
  })
})
