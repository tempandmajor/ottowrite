/**
 * Command Palette Component
 * Provides quick access to actions, navigation, and document switching
 */

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  FileText,
  Search,
  PanelLeftOpen,
  Sparkles,
  History,
  FileDown,
  Maximize2,
  Clock,
  Loader2,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow'
import type { Chapter } from '@/components/editor/chapter-sidebar'

type CommandAction = 'toggle-outline' | 'toggle-ai' | 'toggle-focus' | 'version-history' | 'export' | 'plot-analysis' | 'navigate-document' | 'navigate-scene'

type CommandItem = {
  id: string
  label: string
  description?: string
  icon: React.ReactNode
  shortcut?: string
  action: CommandAction
  category: 'Navigation' | 'Actions' | 'Panels' | 'Recent Documents' | 'Scenes'
  metadata?: {
    documentId?: string
    sceneId?: string
    chapterTitle?: string
  }
}

type RecentDocument = {
  id: string
  title: string
  updatedAt: string
}

export type CommandPaletteProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  structure: Chapter[]
  activeSceneId: string | null
  recentDocuments: RecentDocument[]
  recentsLoading: boolean
  cmdKey?: string
  documentId?: string
  onToggleOutline: () => void
  onToggleAI: () => void
  onToggleFocus: () => void
  onShowVersionHistory: () => void
  onShowExport: () => void
  onNavigateToScene: (sceneId: string) => void
}

export function CommandPalette({
  open,
  onOpenChange,
  structure,
  activeSceneId,
  recentDocuments,
  recentsLoading,
  cmdKey = 'Ctrl',
  documentId,
  onToggleOutline,
  onToggleAI,
  onToggleFocus,
  onShowVersionHistory,
  onShowExport,
  onNavigateToScene,
}: CommandPaletteProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Build static command items
  const staticCommands = useMemo<CommandItem[]>(() => {
    const commands: CommandItem[] = [
      // Panels
      {
        id: 'toggle-outline',
        label: 'Toggle Outline Sidebar',
        description: 'Show or hide the chapter/scene outline',
        icon: <PanelLeftOpen className="h-4 w-4" />,
        shortcut: `${cmdKey}+Shift+O`,
        action: 'toggle-outline',
        category: 'Panels',
      },
      {
        id: 'toggle-ai',
        label: 'Toggle AI Assistant',
        description: 'Show or hide the AI writing assistant',
        icon: <Sparkles className="h-4 w-4" />,
        shortcut: `${cmdKey}+Shift+A`,
        action: 'toggle-ai',
        category: 'Panels',
      },
      // Navigation
      {
        id: 'toggle-focus',
        label: 'Toggle Focus Mode',
        description: 'Enter distraction-free writing mode',
        icon: <Maximize2 className="h-4 w-4" />,
        shortcut: `${cmdKey}+Shift+F`,
        action: 'toggle-focus',
        category: 'Navigation',
      },
      // Actions
      {
        id: 'plot-analysis',
        label: 'Plot Analysis',
        description: 'Analyze plot structure and pacing',
        icon: <Search className="h-4 w-4" />,
        action: 'plot-analysis',
        category: 'Actions',
      },
      {
        id: 'version-history',
        label: 'View Version History',
        description: 'Browse and restore previous versions',
        icon: <History className="h-4 w-4" />,
        shortcut: `${cmdKey}+Shift+H`,
        action: 'version-history',
        category: 'Actions',
      },
      {
        id: 'export',
        label: 'Export Document',
        description: 'Export to PDF, DOCX, or other formats',
        icon: <FileDown className="h-4 w-4" />,
        action: 'export',
        category: 'Actions',
      },
    ]

    return commands
  }, [cmdKey])

  // Build scene navigation commands
  const sceneCommands = useMemo<CommandItem[]>(() => {
    const commands: CommandItem[] = []

    for (const chapter of structure) {
      if (chapter.scenes && chapter.scenes.length > 0) {
        for (const scene of chapter.scenes) {
          commands.push({
            id: `scene-${scene.id}`,
            label: scene.title || 'Untitled Scene',
            description: `In ${chapter.title || 'Untitled Chapter'}`,
            icon: <FileText className="h-4 w-4" />,
            action: 'navigate-scene',
            category: 'Scenes',
            metadata: {
              sceneId: scene.id,
              chapterTitle: chapter.title ?? undefined,
            },
          })
        }
      }
    }

    return commands
  }, [structure])

  // Build recent documents commands
  const recentCommands = useMemo<CommandItem[]>(() => {
    return recentDocuments.map((doc) => ({
      id: `doc-${doc.id}`,
      label: doc.title,
      description: `Last edited ${formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}`,
      icon: <Clock className="h-4 w-4" />,
      action: 'navigate-document' as CommandAction,
      category: 'Recent Documents' as const,
      metadata: {
        documentId: doc.id,
      },
    }))
  }, [recentDocuments])

  // Combine all commands
  const allCommands = useMemo(() => {
    return [...staticCommands, ...sceneCommands, ...recentCommands]
  }, [staticCommands, sceneCommands, recentCommands])

  // Filter commands based on query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) {
      return allCommands
    }

    const lowerQuery = query.toLowerCase()
    return allCommands.filter((cmd) => {
      const labelMatch = cmd.label.toLowerCase().includes(lowerQuery)
      const descriptionMatch = cmd.description?.toLowerCase().includes(lowerQuery) ?? false
      const categoryMatch = cmd.category.toLowerCase().includes(lowerQuery)
      return labelMatch || descriptionMatch || categoryMatch
    })
  }, [query, allCommands])

  // Group filtered commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {}

    for (const cmd of filteredCommands) {
      if (!groups[cmd.category]) {
        groups[cmd.category] = []
      }
      groups[cmd.category].push(cmd)
    }

    return groups
  }, [filteredCommands])

  // Category order
  const categoryOrder = ['Panels', 'Navigation', 'Actions', 'Scenes', 'Recent Documents']

  // Reset selection when filtered results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [filteredCommands])

  // Reset query when dialog closes
  useEffect(() => {
    if (!open) {
      setQuery('')
      setSelectedIndex(0)
    }
  }, [open])

  // Execute command
  const executeCommand = useCallback(
    (cmd: CommandItem) => {
      switch (cmd.action) {
        case 'toggle-outline':
          onToggleOutline()
          break
        case 'toggle-ai':
          onToggleAI()
          break
        case 'toggle-focus':
          onToggleFocus()
          break
        case 'plot-analysis':
          if (documentId) {
            router.push(`/dashboard/editor/${documentId}/plot-analysis`)
          }
          break
        case 'version-history':
          onShowVersionHistory()
          break
        case 'export':
          onShowExport()
          break
        case 'navigate-scene':
          if (cmd.metadata?.sceneId) {
            onNavigateToScene(cmd.metadata.sceneId)
          }
          break
        case 'navigate-document':
          if (cmd.metadata?.documentId) {
            router.push(`/dashboard/editor/${cmd.metadata.documentId}`)
          }
          break
      }
      onOpenChange(false)
    },
    [
      onToggleOutline,
      onToggleAI,
      onToggleFocus,
      onShowVersionHistory,
      onShowExport,
      onNavigateToScene,
      documentId,
      router,
      onOpenChange,
    ]
  )

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, filteredCommands.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter' && filteredCommands[selectedIndex]) {
        e.preventDefault()
        executeCommand(filteredCommands[selectedIndex])
      }
    },
    [filteredCommands, selectedIndex, executeCommand]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="text-lg">Command Palette</DialogTitle>
          <DialogDescription>
            Quick actions, navigation, and document switching
          </DialogDescription>
        </DialogHeader>

        {/* Search Input */}
        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input
              placeholder="Type a command or search..."
              aria-label="Search commands"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-10"
            />
          </div>
        </div>

        {/* Commands List */}
        <div className="max-h-[400px] overflow-y-auto border-t">
          {recentsLoading && recentCommands.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading recent documents...
            </div>
          ) : filteredCommands.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
              <p className="text-sm font-medium text-foreground mb-1">No commands found</p>
              <p className="text-xs text-muted-foreground max-w-[280px]">
                Try a different search term or clear your search to see all available commands.
              </p>
            </div>
          ) : (
            <div className="p-2">
              {categoryOrder.map((category) => {
                const commands = groupedCommands[category]
                if (!commands || commands.length === 0) return null

                return (
                  <div key={category} className="mb-4 last:mb-0">
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                      {category}
                    </div>
                    <div className="space-y-1">
                      {commands.map((cmd) => {
                        const globalIndex = filteredCommands.indexOf(cmd)
                        const isSelected = globalIndex === selectedIndex
                        const isActive = cmd.metadata?.sceneId === activeSceneId

                        return (
                          <button
                            key={cmd.id}
                            onClick={() => executeCommand(cmd)}
                            onMouseEnter={() => setSelectedIndex(globalIndex)}
                            className={cn(
                              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
                              'hover:bg-accent',
                              isSelected && 'bg-accent',
                              isActive && 'border border-primary/30 bg-primary/5'
                            )}
                          >
                            <div className="flex-shrink-0 text-muted-foreground">
                              {cmd.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium truncate">
                                  {cmd.label}
                                </span>
                                {isActive && (
                                  <Badge variant="secondary" className="text-xs px-1.5 py-0">
                                    Current
                                  </Badge>
                                )}
                              </div>
                              {cmd.description && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {cmd.description}
                                </p>
                              )}
                            </div>
                            {cmd.shortcut && (
                              <div className="flex-shrink-0 text-xs text-muted-foreground font-mono">
                                {cmd.shortcut}
                              </div>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-4 py-3 text-xs text-muted-foreground bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-background border rounded-md">↑↓</kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-background border rounded-md">Enter</kbd>
                Select
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-background border rounded-md">Esc</kbd>
                Close
              </span>
            </div>
            <div>
              {filteredCommands.length} {filteredCommands.length === 1 ? 'command' : 'commands'}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
