/**
 * Status Bar Component
 * Displays real-time metrics at the bottom of the editor
 * TICKET-EDITOR-001: Status Bar with Real-time Metrics
 */

'use client'

import { cn } from '@/lib/utils'

export interface CursorPosition {
  paragraph: number
  line: number
  column: number
  scene?: string
  chapter?: string
}

export interface SelectionStats {
  words: number
  characters: number
  readingTime: number // minutes
}

export interface StatusBarProps {
  cursorPosition?: CursorPosition
  selection?: SelectionStats
  sessionWordCount: number
  totalWordCount: number
  targetWordCount?: number
  readingTime: number // minutes
  onJumpToSection?: (section: string) => void
  className?: string
}

/**
 * Format reading time for display
 */
function formatReadingTime(minutes: number): string {
  if (minutes < 1) return '< 1 min'
  if (minutes === 1) return '1 min'
  if (minutes < 60) return `${minutes} min`

  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60

  if (mins === 0) return `${hours} hr`
  return `${hours} hr ${mins} min`
}

/**
 * Status Bar Component
 * Shows cursor position, selection stats, session progress, and reading time
 */
export function StatusBar({
  cursorPosition,
  selection,
  sessionWordCount,
  totalWordCount,
  targetWordCount,
  readingTime,
  onJumpToSection,
  className,
}: StatusBarProps) {
  const progress = targetWordCount ? Math.round((totalWordCount / targetWordCount) * 100) : null

  return (
    <div
      className={cn(
        'border-t bg-muted/30 backdrop-blur-sm px-4 py-1.5 text-xs text-muted-foreground',
        'flex items-center justify-between gap-4',
        className
      )}
    >
      {/* Left: Position info */}
      <div className="flex items-center gap-4 min-w-0">
        {cursorPosition && (
          <button
            onClick={() => {
              if (cursorPosition.scene && onJumpToSection) {
                onJumpToSection(cursorPosition.scene)
              }
            }}
            className={cn(
              'hover:text-foreground transition-colors truncate',
              cursorPosition.scene && onJumpToSection && 'cursor-pointer'
            )}
            disabled={!cursorPosition.scene || !onJumpToSection}
          >
            {cursorPosition.chapter && cursorPosition.scene ? (
              <>
                <span className="font-medium">{cursorPosition.chapter}</span>
                <span className="mx-1">›</span>
                <span className="font-medium">{cursorPosition.scene}</span>
                <span className="mx-1">›</span>
              </>
            ) : null}
            <span>
              Para {cursorPosition.paragraph}, Ln {cursorPosition.line}, Col {cursorPosition.column}
            </span>
          </button>
        )}

        {selection && selection.words > 0 && (
          <span className="text-primary font-medium">
            {selection.words.toLocaleString()} word{selection.words !== 1 ? 's' : ''} selected
            <span className="text-muted-foreground ml-1">
              ({formatReadingTime(selection.readingTime)} read)
            </span>
          </span>
        )}
      </div>

      {/* Right: Stats */}
      <div className="flex items-center gap-4 shrink-0">
        {/* Session word count */}
        {sessionWordCount > 0 && (
          <span className="hidden sm:inline">
            <span className="text-green-600 dark:text-green-400">+{sessionWordCount.toLocaleString()}</span>
            <span className="ml-1">this session</span>
          </span>
        )}

        {/* Reading time */}
        <span className="hidden md:inline">
          📖 {formatReadingTime(readingTime)} read
        </span>

        {/* Word count with progress */}
        <span className="font-medium">
          {totalWordCount.toLocaleString()}
          {targetWordCount ? (
            <>
              <span className="text-muted-foreground"> / </span>
              {targetWordCount.toLocaleString()}
              <span className="text-muted-foreground ml-1">
                ({progress}%)
              </span>
            </>
          ) : (
            <span className="text-muted-foreground ml-1">words</span>
          )}
        </span>
      </div>
    </div>
  )
}
