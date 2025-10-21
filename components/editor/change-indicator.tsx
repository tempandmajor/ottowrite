/**
 * Change Indicator Component
 * Visual indicators for tracked insertions/deletions in editor
 */

'use client'

import { type DocumentChange } from '@/hooks/use-change-tracking'
import { cn } from '@/lib/utils'

export type ChangeIndicatorProps = {
  changes: DocumentChange[]
  content: string
  className?: string
}

/**
 * Renders content with visual change indicators
 */
export function ChangeIndicator({ changes, content, className }: ChangeIndicatorProps) {
  // Sort changes by position
  const sortedChanges = [...changes].sort((a, b) => a.start_position - b.start_position)

  // Build segments with change annotations
  const segments: Array<{
    text: string
    change?: DocumentChange
  }> = []

  let lastPosition = 0

  for (const change of sortedChanges) {
    // Add text before this change
    if (change.start_position > lastPosition) {
      segments.push({
        text: content.slice(lastPosition, change.start_position),
      })
    }

    // Add the change
    if (change.change_type === 'insertion') {
      segments.push({
        text: change.content,
        change,
      })
      lastPosition = change.start_position
    } else if (change.change_type === 'deletion') {
      // Show deletion marker
      segments.push({
        text: change.original_content || '[deleted]',
        change,
      })
      lastPosition = change.end_position
    } else if (change.change_type === 'modification') {
      segments.push({
        text: change.content,
        change,
      })
      lastPosition = change.end_position
    }
  }

  // Add remaining text
  if (lastPosition < content.length) {
    segments.push({
      text: content.slice(lastPosition),
    })
  }

  return (
    <div className={cn('whitespace-pre-wrap', className)}>
      {segments.map((segment, index) => {
        if (!segment.change) {
          return <span key={index}>{segment.text}</span>
        }

        return (
          <ChangeSegment
            key={index}
            text={segment.text}
            change={segment.change}
          />
        )
      })}
    </div>
  )
}

/**
 * Individual change segment
 */
type ChangeSegmentProps = {
  text: string
  change: DocumentChange
}

function ChangeSegment({ text, change }: ChangeSegmentProps) {
  const getClassName = () => {
    const baseClasses = 'relative inline'

    // Status-based styling
    if (change.status === 'accepted') {
      return cn(
        baseClasses,
        change.change_type === 'insertion' && 'bg-green-100 dark:bg-green-950/30 text-green-900 dark:text-green-100',
        change.change_type === 'deletion' && 'bg-red-100 dark:bg-red-950/30 text-red-900 dark:text-red-100 line-through',
        change.change_type === 'modification' && 'bg-blue-100 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100'
      )
    }

    if (change.status === 'rejected') {
      return cn(
        baseClasses,
        'opacity-50 line-through'
      )
    }

    // Pending changes - more vibrant highlighting
    return cn(
      baseClasses,
      change.change_type === 'insertion' && 'bg-green-200 dark:bg-green-900/50 text-green-900 dark:text-green-100 border-b-2 border-green-600',
      change.change_type === 'deletion' && 'bg-red-200 dark:bg-red-900/50 text-red-900 dark:text-red-100 line-through border-b-2 border-red-600',
      change.change_type === 'modification' && 'bg-blue-200 dark:bg-blue-900/50 text-blue-900 dark:text-blue-100 border-b-2 border-blue-600'
    )
  }

  return (
    <span
      className={getClassName()}
      title={`${change.change_type} by ${change.author?.email || 'Unknown'} - ${change.status}`}
      data-change-id={change.id}
    >
      {text}
    </span>
  )
}

/**
 * Simple badge component for showing change count
 */
export function ChangeCountBadge({ changes, type }: { changes: DocumentChange[]; type?: 'insertion' | 'deletion' | 'modification' }) {
  const filtered = type ? changes.filter(c => c.change_type === type) : changes
  const pending = filtered.filter(c => c.status === 'pending')

  if (pending.length === 0) return null

  const getColor = () => {
    switch (type) {
      case 'insertion':
        return 'bg-green-500'
      case 'deletion':
        return 'bg-red-500'
      case 'modification':
        return 'bg-blue-500'
      default:
        return 'bg-yellow-500'
    }
  }

  return (
    <span className={cn('inline-flex items-center justify-center h-5 min-w-5 px-1.5 text-xs font-medium text-white rounded-full', getColor())}>
      {pending.length}
    </span>
  )
}
