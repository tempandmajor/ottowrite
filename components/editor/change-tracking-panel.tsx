/**
 * Change Tracking Panel
 * Displays tracked changes with accept/reject workflow
 */

'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Check,
  X,
  Trash2,
  Clock,
  Edit,
  Plus,
  Minus,
  MessageSquare,
  History,
  Filter,
} from 'lucide-react'
import { useChangeTracking, type DocumentChange, type ChangeType } from '@/hooks/use-change-tracking'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

export type ChangeTrackingPanelProps = {
  documentId: string
  userId: string
  enabled?: boolean
  onAcceptChange?: (change: DocumentChange) => void
  onRejectChange?: (change: DocumentChange) => void
}

export function ChangeTrackingPanel({
  documentId,
  userId,
  enabled = true,
  onAcceptChange,
  onRejectChange,
}: ChangeTrackingPanelProps) {
  const [selectedTab, setSelectedTab] = useState<'pending' | 'accepted' | 'rejected' | 'all'>('pending')
  const [reviewingChangeId, setReviewingChangeId] = useState<string | null>(null)

  const {
    changes,
    loading,
    pendingCount,
    changesByType,
    reviewChange,
    deleteChange,
    fetchHistory,
  } = useChangeTracking({
    documentId,
    enabled,
  })

  // Filter changes by selected tab
  const filteredChanges = useMemo(() => {
    if (selectedTab === 'all') return changes
    return changes.filter((c) => c.status === selectedTab)
  }, [changes, selectedTab])

  // Handle accept
  const handleAccept = async (change: DocumentChange) => {
    setReviewingChangeId(change.id)
    const result = await reviewChange(change.id, 'accept')
    setReviewingChangeId(null)

    if (result) {
      onAcceptChange?.(result)
    }
  }

  // Handle reject
  const handleReject = async (change: DocumentChange) => {
    setReviewingChangeId(change.id)
    const result = await reviewChange(change.id, 'reject')
    setReviewingChangeId(null)

    if (result) {
      onRejectChange?.(result)
    }
  }

  // Handle delete
  const handleDelete = async (changeId: string) => {
    await deleteChange(changeId)
  }

  // Handle view history
  const handleViewHistory = async (changeId: string) => {
    await fetchHistory(changeId)
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Track Changes</CardTitle>
            <CardDescription>Review insertions, deletions, and modifications</CardDescription>
          </div>
          {pendingCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {pendingCount} pending
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden flex flex-col">
        <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as any)} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pending">
              Pending
              {pendingCount > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                  {pendingCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="accepted">Accepted</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-auto mt-4">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-sm text-muted-foreground">Loading changes...</p>
              </div>
            ) : filteredChanges.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <Filter className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No {selectedTab === 'all' ? '' : selectedTab} changes</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredChanges.map((change) => (
                  <ChangeItem
                    key={change.id}
                    change={change}
                    userId={userId}
                    isReviewing={reviewingChangeId === change.id}
                    onAccept={handleAccept}
                    onReject={handleReject}
                    onDelete={handleDelete}
                    onViewHistory={handleViewHistory}
                  />
                ))}
              </div>
            )}
          </div>
        </Tabs>

        <Separator className="my-4" />

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <Plus className="h-3.5 w-3.5 text-green-600" />
            <span className="text-muted-foreground">{changesByType.insertions.length} insertions</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Minus className="h-3.5 w-3.5 text-red-600" />
            <span className="text-muted-foreground">{changesByType.deletions.length} deletions</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Edit className="h-3.5 w-3.5 text-blue-600" />
            <span className="text-muted-foreground">{changesByType.modifications.length} edits</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Individual change item component
 */
type ChangeItemProps = {
  change: DocumentChange
  userId: string
  isReviewing: boolean
  onAccept: (change: DocumentChange) => void
  onReject: (change: DocumentChange) => void
  onDelete: (changeId: string) => void
  onViewHistory: (changeId: string) => void
}

function ChangeItem({
  change,
  userId,
  isReviewing,
  onAccept,
  onReject,
  onDelete,
  onViewHistory,
}: ChangeItemProps) {
  const isOwnChange = change.user_id === userId
  const isPending = change.status === 'pending'

  // Get change type icon and color
  const { icon: ChangeIcon, color, label } = getChangeTypeInfo(change.change_type)

  return (
    <div className={cn(
      'p-3 rounded-lg border transition-colors',
      change.status === 'accepted' && 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900',
      change.status === 'rejected' && 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900',
      change.status === 'pending' && 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900'
    )}>
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <ChangeIcon className={cn('h-4 w-4', color)} />
          <Badge variant="outline" className="text-xs">
            {label}
          </Badge>
          <Badge variant={change.status === 'pending' ? 'secondary' : 'outline'} className="text-xs capitalize">
            {change.status}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          {isPending && !isOwnChange && (
            <>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-100"
                onClick={() => onAccept(change)}
                disabled={isReviewing}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-100"
                onClick={() => onReject(change)}
                disabled={isReviewing}
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          )}
          {isPending && isOwnChange && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(change.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={() => onViewHistory(change.id)}
          >
            <History className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content preview */}
      <div className="mb-2">
        {change.change_type === 'deletion' && change.original_content && (
          <div className="text-sm line-through text-red-700 dark:text-red-400 font-mono bg-red-50 dark:bg-red-950/30 px-2 py-1 rounded">
            {truncateText(change.original_content, 100)}
          </div>
        )}
        {change.change_type === 'insertion' && (
          <div className="text-sm text-green-700 dark:text-green-400 font-mono bg-green-50 dark:bg-green-950/30 px-2 py-1 rounded">
            {truncateText(change.content, 100)}
          </div>
        )}
        {change.change_type === 'modification' && (
          <div className="space-y-1">
            {change.original_content && (
              <div className="text-sm line-through text-red-700 dark:text-red-400 font-mono bg-red-50 dark:bg-red-950/30 px-2 py-1 rounded">
                {truncateText(change.original_content, 100)}
              </div>
            )}
            <div className="text-sm text-green-700 dark:text-green-400 font-mono bg-green-50 dark:bg-green-950/30 px-2 py-1 rounded">
              {truncateText(change.content, 100)}
            </div>
          </div>
        )}
      </div>

      {/* Comment */}
      {change.comment && (
        <div className="flex items-start gap-2 mb-2 text-xs text-muted-foreground">
          <MessageSquare className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <p className="italic">&ldquo;{change.comment}&rdquo;</p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>{change.author?.email || 'Unknown'}</span>
          <span>•</span>
          <Clock className="h-3 w-3" />
          <span>{formatDistanceToNow(new Date(change.created_at), { addSuffix: true })}</span>
        </div>
        <div>
          Position: {change.start_position}-{change.end_position}
        </div>
      </div>

      {/* Reviewer info */}
      {change.reviewed_by && change.reviewer && (
        <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
          Reviewed by {change.reviewer.email} {formatDistanceToNow(new Date(change.reviewed_at!), { addSuffix: true })}
        </div>
      )}
    </div>
  )
}

// Helper functions
function getChangeTypeInfo(type: ChangeType): { icon: any; color: string; label: string } {
  switch (type) {
    case 'insertion':
      return { icon: Plus, color: 'text-green-600', label: 'Insertion' }
    case 'deletion':
      return { icon: Minus, color: 'text-red-600', label: 'Deletion' }
    case 'modification':
      return { icon: Edit, color: 'text-blue-600', label: 'Modification' }
  }
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}
