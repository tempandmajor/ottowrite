/**
 * Layout Shortcuts Hook
 *
 * Provides keyboard shortcuts for switching workspace layouts:
 * - Cmd+1 / Ctrl+1: Writer mode (editor only)
 * - Cmd+2 / Ctrl+2: Planner mode (outline + editor)
 * - Cmd+3 / Ctrl+3: Assistant mode (editor + AI)
 * - Cmd+4 / Ctrl+4: Full mode (outline + editor + AI)
 *
 * Usage:
 * ```tsx
 * useLayoutShortcuts((preset) => {
 *   console.log('Switched to', preset)
 * })
 * ```
 */

import { useEffect } from 'react'
import { WorkspaceLayoutPreset, setLayoutPreset } from '@/lib/editor/workspace-state'

export function useLayoutShortcuts(onPresetChange?: (preset: WorkspaceLayoutPreset) => void) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd (Mac) or Ctrl (Windows/Linux)
      const isMod = e.metaKey || e.ctrlKey

      if (!isMod) return

      let preset: WorkspaceLayoutPreset | null = null

      switch (e.key) {
        case '1':
          preset = 'writer'
          break
        case '2':
          preset = 'planner'
          break
        case '3':
          preset = 'assistant'
          break
        case '4':
          preset = 'full'
          break
        default:
          return
      }

      if (preset) {
        e.preventDefault()
        e.stopPropagation()

        // Apply the preset
        setLayoutPreset(preset)

        // Notify callback
        onPresetChange?.(preset)

        // Dispatch custom event for workspace to react
        window.dispatchEvent(
          new CustomEvent('workspace-layout-changed', {
            detail: { preset, source: 'keyboard' },
          })
        )
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onPresetChange])
}

/**
 * Hook that listens for layout changes from any source
 * (keyboard shortcuts, buttons, etc.)
 */
export function useLayoutChangeListener(
  callback: (preset: WorkspaceLayoutPreset, source: 'keyboard' | 'button' | 'other') => void
) {
  useEffect(() => {
    const handleLayoutChange = (e: CustomEvent) => {
      const { preset, source = 'other' } = e.detail
      callback(preset, source)
    }

    window.addEventListener('workspace-layout-changed', handleLayoutChange as EventListener)

    return () => {
      window.removeEventListener('workspace-layout-changed', handleLayoutChange as EventListener)
    }
  }, [callback])
}
