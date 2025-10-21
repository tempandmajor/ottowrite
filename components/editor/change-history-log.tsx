/**
 * Change History Log
 * Displays audit trail of change actions
 */

'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Check,
  X,
  FileText,
  MessageSquare,
  Clock,
  User,
} from 'lucide-react'
import { type ChangeHistoryEntry } from '@/hooks/use-change-tracking'
import { formatDistanceToNow, format } from 'date-fns'

export type ChangeHistoryLogProps = {
  documentId: string
  changeId?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ChangeHistoryLog({
  documentId,
  changeId,
  open,
  onOpenChange,
}: ChangeHistoryLogProps) {
  const [history, setHistory] = useState<ChangeHistoryEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return

    const fetchHistory = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          documentId,
          ...(changeId && { changeId }),
        })

        const response = await fetch(`/api/changes/history?${params}`)
        if (!response.ok) {
          throw new Error('Failed to fetch history')
        }

        const data = await response.json()
        setHistory(data.history || [])
      } catch (error) {
        console.error('Error fetching history:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchHistory()
  }, [documentId, changeId, open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Change History</DialogTitle>
          <DialogDescription>
            {changeId ? 'Activity log for this change' : 'All change activity for this document'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-sm text-muted-foreground">Loading history...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <FileText className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No history entries</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((entry, index) => (
                <HistoryEntry
                  key={entry.id}
                  entry={entry}
                  isFirst={index === 0}
                  isLast={index === history.length - 1}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Individual history entry component
 */
type HistoryEntryProps = {
  entry: ChangeHistoryEntry
  isFirst: boolean
  isLast: boolean
}

function HistoryEntry({ entry, isFirst, isLast }: HistoryEntryProps) {
  const { icon: ActionIcon, color, label, bgColor } = getActionInfo(entry.action)

  return (
    <div className="relative pl-8 pb-4">
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-4 top-8 bottom-0 w-px bg-border" />
      )}

      {/* Icon */}
      <div className={`absolute left-0 top-0 flex items-center justify-center w-8 h-8 rounded-full ${bgColor}`}>
        <ActionIcon className={`h-4 w-4 ${color}`} />
      </div>

      {/* Content */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant={isFirst ? 'default' : 'secondary'} className="text-xs">
            {label}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <User className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-medium">{entry.user?.email || 'Unknown user'}</span>
        </div>

        {entry.comment && (
          <div className="flex items-start gap-2 text-sm">
            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <p className="italic text-muted-foreground">&ldquo;{entry.comment}&rdquo;</p>
          </div>
        )}

        {entry.snapshot && Object.keys(entry.snapshot).length > 0 && (
          <Card className="mt-2">
            <CardContent className="p-3">
              <p className="text-xs font-medium mb-2">Details</p>
              <div className="space-y-1 text-xs text-muted-foreground">
                {Object.entries(entry.snapshot).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                    <span className="font-mono">{JSON.stringify(value)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {format(new Date(entry.created_at), 'PPpp')}
        </div>
      </div>
    </div>
  )
}

// Helper function
function getActionInfo(action: string): { icon: any; color: string; label: string; bgColor: string } {
  switch (action) {
    case 'created':
      return {
        icon: FileText,
        color: 'text-blue-600',
        label: 'Created',
        bgColor: 'bg-blue-100 dark:bg-blue-950',
      }
    case 'accepted':
      return {
        icon: Check,
        color: 'text-green-600',
        label: 'Accepted',
        bgColor: 'bg-green-100 dark:bg-green-950',
      }
    case 'rejected':
      return {
        icon: X,
        color: 'text-red-600',
        label: 'Rejected',
        bgColor: 'bg-red-100 dark:bg-red-950',
      }
    case 'commented':
      return {
        icon: MessageSquare,
        color: 'text-purple-600',
        label: 'Commented',
        bgColor: 'bg-purple-100 dark:bg-purple-950',
      }
    default:
      return {
        icon: FileText,
        color: 'text-gray-600',
        label: action,
        bgColor: 'bg-gray-100 dark:bg-gray-950',
      }
  }
}
