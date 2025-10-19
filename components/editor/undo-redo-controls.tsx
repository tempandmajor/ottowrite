'use client'

import { Button } from '@/components/ui/button'
import { Undo2, Redo2, History } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { UndoRedoEntry } from '@/lib/undo-redo/undo-redo-manager'
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow'

export type UndoRedoControlsProps = {
  canUndo: boolean
  canRedo: boolean
  undoStackSize: number
  redoStackSize: number
  onUndo: () => void
  onRedo: () => void
  getUndoHistory?: () => UndoRedoEntry[]
  getRedoHistory?: () => UndoRedoEntry[]
  variant?: 'default' | 'compact'
}

export function UndoRedoControls({
  canUndo,
  canRedo,
  undoStackSize,
  redoStackSize,
  onUndo,
  onRedo,
  getUndoHistory,
  getRedoHistory,
  variant = 'default',
}: UndoRedoControlsProps) {
  const undoHistory = getUndoHistory?.() ?? []
  const redoHistory = getRedoHistory?.() ?? []

  const formatTimestamp = (timestamp: Date) => {
    try {
      return formatDistanceToNow(timestamp, { addSuffix: true })
    } catch {
      return 'Unknown time'
    }
  }

  const formatWordDelta = (delta: number) => {
    if (delta === 0) return ''
    return delta > 0 ? `+${delta} words` : `${delta} words`
  }

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-1">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onUndo}
                disabled={!canUndo}
                className="h-8 w-8"
              >
                <Undo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Undo (Cmd+Z)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onRedo}
                disabled={!canRedo}
                className="h-8 w-8"
              >
                <Redo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Redo (Cmd+Shift+Z)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {/* Undo with history dropdown */}
      <div className="flex items-center">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onUndo}
                disabled={!canUndo}
                className="rounded-r-none border-r-0"
              >
                <Undo2 className="mr-2 h-4 w-4" />
                Undo
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Undo last change (Cmd+Z)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {undoStackSize > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={!canUndo}
                className="rounded-l-none px-2"
              >
                <History className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-80">
              <DropdownMenuLabel>
                Undo History ({undoStackSize} {undoStackSize === 1 ? 'change' : 'changes'})
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-96 overflow-y-auto">
                {undoHistory.slice(0, 20).map((entry, _index) => (
                  <DropdownMenuItem
                    key={entry.id}
                    className="flex flex-col items-start gap-1 py-2"
                    disabled
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="font-medium text-sm">
                        {entry.description || 'Document change'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatWordDelta(entry.wordCountDelta)}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(entry.timestamp)}
                    </span>
                  </DropdownMenuItem>
                ))}
                {undoStackSize > 20 && (
                  <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                    ... and {undoStackSize - 20} more
                  </DropdownMenuItem>
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Redo with history dropdown */}
      <div className="flex items-center">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onRedo}
                disabled={!canRedo}
                className={redoStackSize > 0 ? 'rounded-r-none border-r-0' : ''}
              >
                <Redo2 className="mr-2 h-4 w-4" />
                Redo
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Redo last undone change (Cmd+Shift+Z)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {redoStackSize > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={!canRedo}
                className="rounded-l-none px-2"
              >
                <History className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-80">
              <DropdownMenuLabel>
                Redo History ({redoStackSize} {redoStackSize === 1 ? 'change' : 'changes'})
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-96 overflow-y-auto">
                {redoHistory.slice(0, 20).map((entry, _index) => (
                  <DropdownMenuItem
                    key={entry.id}
                    className="flex flex-col items-start gap-1 py-2"
                    disabled
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="font-medium text-sm">
                        {entry.description || 'Document change'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatWordDelta(entry.wordCountDelta)}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(entry.timestamp)}
                    </span>
                  </DropdownMenuItem>
                ))}
                {redoStackSize > 20 && (
                  <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                    ... and {redoStackSize - 20} more
                  </DropdownMenuItem>
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  )
}
