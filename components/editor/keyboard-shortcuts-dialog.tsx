/**
 * Keyboard Shortcuts Help Dialog
 * Shows all available keyboard shortcuts in the editor
 */

'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Keyboard } from 'lucide-react'

type KeyboardShortcut = {
  keys: string[]
  description: string
  category: 'Navigation' | 'Editor' | 'Panels' | 'Actions'
}

const shortcuts: KeyboardShortcut[] = [
  // Navigation
  {
    keys: ['Ctrl', 'Shift', 'F'],
    description: 'Toggle focus mode (distraction-free writing)',
    category: 'Navigation',
  },
  {
    keys: ['Ctrl', 'K'],
    description: 'Open command palette',
    category: 'Navigation',
  },

  // Panels
  {
    keys: ['Ctrl', 'Shift', 'O'],
    description: 'Toggle outline sidebar',
    category: 'Panels',
  },
  {
    keys: ['Ctrl', 'Shift', 'A'],
    description: 'Toggle AI assistant panel',
    category: 'Panels',
  },

  // Actions
  {
    keys: ['Ctrl', 'Shift', 'H'],
    description: 'Open version history',
    category: 'Actions',
  },
  {
    keys: ['Ctrl', 'S'],
    description: 'Save document (auto-saves every 3s)',
    category: 'Actions',
  },

  // Editor
  {
    keys: ['Ctrl', 'B'],
    description: 'Bold text',
    category: 'Editor',
  },
  {
    keys: ['Ctrl', 'I'],
    description: 'Italic text',
    category: 'Editor',
  },
  {
    keys: ['Ctrl', 'U'],
    description: 'Underline text',
    category: 'Editor',
  },
  {
    keys: ['Ctrl', 'Z'],
    description: 'Undo',
    category: 'Editor',
  },
  {
    keys: ['Ctrl', 'Y'],
    description: 'Redo',
    category: 'Editor',
  },
  {
    keys: ['Ctrl', 'Shift', 'Z'],
    description: 'Redo (alternative)',
    category: 'Editor',
  },
]

// macOS-specific note
const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().includes('MAC')

export type KeyboardShortcutsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function KeyboardShortcutsDialog({ open, onOpenChange }: KeyboardShortcutsDialogProps) {
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = []
    }
    acc[shortcut.category].push(shortcut)
    return acc
  }, {} as Record<string, KeyboardShortcut[]>)

  const categories = ['Navigation', 'Panels', 'Actions', 'Editor'] as const

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-primary" />
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
          </div>
          <DialogDescription>
            {isMac
              ? 'Note: On macOS, use Cmd instead of Ctrl for most shortcuts. However, Ctrl+Shift+[key] combinations use Ctrl as shown to avoid conflicts with system shortcuts.'
              : 'Press these key combinations to quickly access editor features.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {categories.map((category) => {
            const categoryShortcuts = groupedShortcuts[category]
            if (!categoryShortcuts || categoryShortcuts.length === 0) return null

            return (
              <div key={category}>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">{category}</h3>
                <div className="space-y-2">
                  {categoryShortcuts.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between gap-4 rounded-lg border bg-muted/30 px-4 py-2.5"
                    >
                      <span className="text-sm flex-1">{shortcut.description}</span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, keyIndex) => (
                          <span key={keyIndex} className="flex items-center gap-1">
                            <Badge
                              variant="secondary"
                              className="font-mono text-xs px-2 py-0.5 bg-background"
                            >
                              {key}
                            </Badge>
                            {keyIndex < shortcut.keys.length - 1 && (
                              <span className="text-muted-foreground text-xs">+</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-6 rounded-lg border bg-blue-50/50 dark:bg-blue-950/20 p-4">
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">Pro tip:</strong> Most shortcuts can be customized
            in Settings. Press{' '}
            <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-background border rounded">
              Ctrl
            </kbd>{' '}
            +{' '}
            <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-background border rounded">
              Shift
            </kbd>{' '}
            +{' '}
            <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-background border rounded">
              ?
            </kbd>{' '}
            anytime to see this help.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
