'use client'

import { useState, useMemo, useCallback } from 'react'
import type { Change } from 'diff'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertTriangle,
  Check,
  X,
  FileText,
  Clock,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  ArrowLeftRight,
  Info,
} from 'lucide-react'
import { stripHtmlWithDOM, computeWordDiff, calculateDiffStats } from '@/lib/utils/text-diff'
import { cn } from '@/lib/utils'

type ConflictResolutionMode = 'overview' | 'side-by-side' | 'selective-merge'

type ConflictChunk = {
  id: string
  type: 'added' | 'removed' | 'unchanged'
  localValue: string
  serverValue: string
  selected: 'local' | 'server' | 'both' | 'neither'
  lineStart: number
  lineEnd: number
}

type ConflictResolutionPanelProps = {
  open: boolean
  localContent: string
  serverContent: string
  localWordCount?: number
  serverWordCount?: number
  onResolve: (resolvedContent: string, resolution: 'local' | 'server' | 'merged') => void
  onRetryWithServer: () => void
  onCancel: () => void
}

export function ConflictResolutionPanel({
  open,
  localContent,
  serverContent,
  localWordCount,
  serverWordCount,
  onResolve,
  onRetryWithServer,
  onCancel,
}: ConflictResolutionPanelProps) {
  const [mode, setMode] = useState<ConflictResolutionMode>('overview')
  const [conflictChunks, setConflictChunks] = useState<ConflictChunk[]>([])
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0)

  const localText = useMemo(() => stripHtmlWithDOM(localContent), [localContent])
  const serverText = useMemo(() => stripHtmlWithDOM(serverContent), [serverContent])

  const diff = useMemo(() => {
    return computeWordDiff(serverText, localText)
  }, [localText, serverText])

  const stats = useMemo(() => {
    return calculateDiffStats(diff)
  }, [diff])

  // Generate conflict chunks for selective merge
  const generateConflictChunks = useCallback((): ConflictChunk[] => {
    const chunks: ConflictChunk[] = []
    let lineCounter = 0

    diff.forEach((part, index) => {
      const lines = part.value.split('\n')
      const lineStart = lineCounter
      const lineEnd = lineCounter + lines.length - 1

      if (part.added || part.removed) {
        chunks.push({
          id: `chunk-${index}`,
          type: part.added ? 'added' : 'removed',
          localValue: part.added ? part.value : '',
          serverValue: part.removed ? part.value : '',
          selected: part.added ? 'local' : 'server',
          lineStart,
          lineEnd,
        })
      }

      lineCounter += lines.length
    })

    return chunks
  }, [diff])

  // Initialize chunks when entering selective merge mode
  const enterSelectiveMergeMode = useCallback(() => {
    const chunks = generateConflictChunks()
    setConflictChunks(chunks)
    setCurrentChunkIndex(0)
    setMode('selective-merge')
  }, [generateConflictChunks])

  // Toggle chunk selection
  const toggleChunkSelection = useCallback(
    (chunkId: string, selection: 'local' | 'server' | 'both' | 'neither') => {
      setConflictChunks((prev) =>
        prev.map((chunk) => (chunk.id === chunkId ? { ...chunk, selected: selection } : chunk))
      )
    },
    []
  )

  // Build merged content from chunk selections
  const buildMergedContent = useCallback((): string => {
    let result = ''
    let diffIndex = 0

    diff.forEach((part) => {
      if (part.added || part.removed) {
        const chunk = conflictChunks[diffIndex]
        if (chunk) {
          if (chunk.selected === 'local' && chunk.localValue) {
            result += chunk.localValue
          } else if (chunk.selected === 'server' && chunk.serverValue) {
            result += chunk.serverValue
          } else if (chunk.selected === 'both') {
            result += chunk.serverValue + chunk.localValue
          }
          // 'neither' means skip both
          diffIndex++
        }
      } else {
        result += part.value
      }
    })

    return result
  }, [diff, conflictChunks])

  // Navigate between conflict chunks
  const navigateToChunk = useCallback(
    (direction: 'prev' | 'next') => {
      if (direction === 'prev' && currentChunkIndex > 0) {
        setCurrentChunkIndex(currentChunkIndex - 1)
      } else if (direction === 'next' && currentChunkIndex < conflictChunks.length - 1) {
        setCurrentChunkIndex(currentChunkIndex + 1)
      }
    },
    [currentChunkIndex, conflictChunks.length]
  )

  // Resolve with merged content
  const handleMergeResolve = useCallback(() => {
    const mergedContent = buildMergedContent()
    onResolve(mergedContent, 'merged')
  }, [buildMergedContent, onResolve])

  const conflictCount = useMemo(() => {
    return diff.filter((part) => part.added || part.removed).length
  }, [diff])

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <DialogTitle>Resolve Document Conflict</DialogTitle>
            </div>
            {mode !== 'overview' && (
              <Button variant="ghost" size="sm" onClick={() => setMode('overview')}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back to Overview
              </Button>
            )}
          </div>
          <DialogDescription>
            {mode === 'overview' &&
              'This document was edited in another session. Choose how to resolve the conflict.'}
            {mode === 'side-by-side' && 'Compare changes side-by-side to decide which version to keep.'}
            {mode === 'selective-merge' &&
              'Review each conflict and choose which changes to keep or combine.'}
          </DialogDescription>
        </DialogHeader>

        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 border-blue-200 bg-blue-50/50">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-blue-900">Your Local Version</span>
              <Badge variant="outline" className="bg-blue-100 text-blue-900 border-blue-300 text-xs">
                Current
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-blue-700">
              <FileText className="h-3 w-3" />
              {localWordCount != null ? `${localWordCount.toLocaleString()} words` : 'Unknown'}
            </div>
            {stats.additions > 0 && (
              <div className="mt-1 text-xs text-emerald-700">+{stats.additions} words added</div>
            )}
          </Card>

          <Card className="p-3 border-purple-200 bg-purple-50/50">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-purple-900">Server Version</span>
              <Badge variant="outline" className="bg-purple-100 text-purple-900 border-purple-300 text-xs">
                Latest Saved
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-purple-700">
              <Clock className="h-3 w-3" />
              {serverWordCount != null ? `${serverWordCount.toLocaleString()} words` : 'Unknown'}
            </div>
            {stats.deletions > 0 && (
              <div className="mt-1 text-xs text-red-700">-{stats.deletions} words vs local</div>
            )}
          </Card>

          <Card className="p-3 border-amber-200 bg-amber-50/50">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-amber-900">Conflicts Detected</span>
              <Badge variant="outline" className="bg-amber-100 text-amber-900 border-amber-300 text-xs">
                {conflictCount}
              </Badge>
            </div>
            <div className="text-xs text-amber-700 mt-1">
              {stats.changePercentage.toFixed(1)}% of content differs
            </div>
            <div className="text-xs text-amber-700">
              {stats.totalChanges} word{stats.totalChanges !== 1 ? 's' : ''} changed
            </div>
          </Card>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {mode === 'overview' && (
            <OverviewMode
              diff={diff}
              localText={localText}
              serverText={serverText}
              stats={stats}
              onSwitchToSideBySide={() => setMode('side-by-side')}
              onSwitchToSelectiveMerge={enterSelectiveMergeMode}
            />
          )}

          {mode === 'side-by-side' && (
            <SideBySideMode localText={localText} serverText={serverText} diff={diff} />
          )}

          {mode === 'selective-merge' && (
            <SelectiveMergeMode
              chunks={conflictChunks}
              currentChunkIndex={currentChunkIndex}
              onToggleSelection={toggleChunkSelection}
              onNavigate={navigateToChunk}
              diff={diff}
            />
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onRetryWithServer}>
              <RotateCcw className="mr-2 h-3.5 w-3.5" />
              Retry with Server Version
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onCancel}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button variant="outline" onClick={() => onResolve(serverContent, 'server')}>
              <Clock className="mr-2 h-4 w-4" />
              Use Server
            </Button>
            {mode === 'selective-merge' && conflictChunks.length > 0 && (
              <Button onClick={handleMergeResolve} className="bg-purple-600 hover:bg-purple-700">
                <ArrowLeftRight className="mr-2 h-4 w-4" />
                Apply Merged Changes
              </Button>
            )}
            <Button onClick={() => onResolve(localContent, 'local')} className="bg-blue-600 hover:bg-blue-700">
              <Check className="mr-2 h-4 w-4" />
              Keep My Version
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Overview Mode Component
function OverviewMode({
  diff,
  _localText,
  _serverText,
  _stats,
  onSwitchToSideBySide,
  onSwitchToSelectiveMerge,
}: {
  diff: Change[]
  _localText: string
  _serverText: string
  _stats: ReturnType<typeof calculateDiffStats>
  onSwitchToSideBySide: () => void
  onSwitchToSelectiveMerge: () => void
}) {
  return (
    <div className="space-y-4 h-full flex flex-col">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Choose your resolution strategy: view changes side-by-side, selectively merge specific changes, or use
          one version entirely.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-2 gap-4 flex-1">
        <Card
          className="p-4 cursor-pointer hover:border-blue-400 transition-colors"
          onClick={onSwitchToSideBySide}
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-sm">Side-by-Side Comparison</h4>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            View both versions side-by-side to carefully compare all changes before deciding.
          </p>
          <Button size="sm" variant="outline" className="w-full">
            Compare Versions
          </Button>
        </Card>

        <Card
          className="p-4 cursor-pointer hover:border-purple-400 transition-colors"
          onClick={onSwitchToSelectiveMerge}
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-sm">Selective Merge</h4>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Review each conflict individually and choose which changes to keep or combine.
          </p>
          <Button size="sm" variant="outline" className="w-full">
            Merge Selectively
          </Button>
        </Card>
      </div>

      <div className="flex-1 overflow-auto border rounded-lg bg-background p-4">
        <div className="prose prose-sm max-w-none">
          <h4 className="text-sm font-medium mb-2">Quick Preview (Unified Diff)</h4>
          <div className="font-mono text-xs whitespace-pre-wrap leading-relaxed">
            {diff.map((part, index) => {
              if (part.added) {
                return (
                  <span key={index} className="bg-emerald-100 text-emerald-900 px-0.5">
                    {part.value}
                  </span>
                )
              }
              if (part.removed) {
                return (
                  <span key={index} className="bg-red-100 text-red-900 line-through px-0.5">
                    {part.value}
                  </span>
                )
              }
              return (
                <span key={index} className="text-foreground">
                  {part.value}
                </span>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// Side-by-Side Mode Component
function SideBySideMode({ _localText, _serverText, diff }: { _localText: string; _serverText: string; diff: Change[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 h-full">
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-blue-900">Your Local Version</h4>
          <Badge variant="outline" className="bg-blue-100 text-blue-900 border-blue-300">
            Current
          </Badge>
        </div>
        <ScrollArea className="flex-1 border rounded-lg bg-blue-50/30 p-4">
          <div className="font-mono text-xs whitespace-pre-wrap leading-relaxed">
            {diff.map((part, index) => {
              if (part.added) {
                return (
                  <span key={index} className="bg-emerald-200 text-emerald-900 px-0.5">
                    {part.value}
                  </span>
                )
              }
              if (part.removed) {
                return null // Don't show removed parts in local view
              }
              return (
                <span key={index} className="text-foreground">
                  {part.value}
                </span>
              )
            })}
          </div>
        </ScrollArea>
      </div>

      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-purple-900">Server Version</h4>
          <Badge variant="outline" className="bg-purple-100 text-purple-900 border-purple-300">
            Latest Saved
          </Badge>
        </div>
        <ScrollArea className="flex-1 border rounded-lg bg-purple-50/30 p-4">
          <div className="font-mono text-xs whitespace-pre-wrap leading-relaxed">
            {diff.map((part, index) => {
              if (part.removed) {
                return (
                  <span key={index} className="bg-red-200 text-red-900 px-0.5">
                    {part.value}
                  </span>
                )
              }
              if (part.added) {
                return null // Don't show added parts in server view
              }
              return (
                <span key={index} className="text-foreground">
                  {part.value}
                </span>
              )
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}

// Selective Merge Mode Component
function SelectiveMergeMode({
  chunks,
  currentChunkIndex,
  onToggleSelection,
  onNavigate,
  _diff,
}: {
  chunks: ConflictChunk[]
  currentChunkIndex: number
  onToggleSelection: (chunkId: string, selection: 'local' | 'server' | 'both' | 'neither') => void
  onNavigate: (direction: 'prev' | 'next') => void
  _diff: Change[]
}) {
  const currentChunk = chunks[currentChunkIndex]

  if (chunks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-2">
          <Info className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No conflicts to resolve</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            Conflict {currentChunkIndex + 1} of {chunks.length}
          </Badge>
          <span className="text-xs text-muted-foreground">
            Lines {currentChunk.lineStart}-{currentChunk.lineEnd}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onNavigate('prev')}
            disabled={currentChunkIndex === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onNavigate('next')}
            disabled={currentChunkIndex === chunks.length - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 flex-1">
        {currentChunk.type === 'removed' && (
          <Card
            className={cn(
              'p-4 cursor-pointer transition-all',
              currentChunk.selected === 'server' && 'ring-2 ring-purple-500 bg-purple-50'
            )}
            onClick={() => onToggleSelection(currentChunk.id, 'server')}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-purple-900">Server Content (Remove)</h4>
              {currentChunk.selected === 'server' && <Check className="h-4 w-4 text-purple-600" />}
            </div>
            <div className="font-mono text-xs bg-red-100 text-red-900 p-2 rounded whitespace-pre-wrap">
              {currentChunk.serverValue}
            </div>
          </Card>
        )}

        {currentChunk.type === 'added' && (
          <Card
            className={cn(
              'p-4 cursor-pointer transition-all',
              currentChunk.selected === 'local' && 'ring-2 ring-blue-500 bg-blue-50'
            )}
            onClick={() => onToggleSelection(currentChunk.id, 'local')}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-blue-900">Local Content (Add)</h4>
              {currentChunk.selected === 'local' && <Check className="h-4 w-4 text-blue-600" />}
            </div>
            <div className="font-mono text-xs bg-emerald-100 text-emerald-900 p-2 rounded whitespace-pre-wrap">
              {currentChunk.localValue}
            </div>
          </Card>
        )}

        <div className="space-y-2">
          <h4 className="text-sm font-medium">Resolution Options</h4>
          <div className="space-y-2">
            <Button
              size="sm"
              variant="outline"
              className="w-full justify-start"
              onClick={() => onToggleSelection(currentChunk.id, 'local')}
            >
              <Check className={cn('mr-2 h-4 w-4', currentChunk.selected === 'local' && 'text-blue-600')} />
              Keep Local Changes
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="w-full justify-start"
              onClick={() => onToggleSelection(currentChunk.id, 'server')}
            >
              <Check className={cn('mr-2 h-4 w-4', currentChunk.selected === 'server' && 'text-purple-600')} />
              Keep Server Version
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="w-full justify-start"
              onClick={() => onToggleSelection(currentChunk.id, 'both')}
            >
              <Check className={cn('mr-2 h-4 w-4', currentChunk.selected === 'both' && 'text-emerald-600')} />
              Keep Both (Combine)
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="w-full justify-start"
              onClick={() => onToggleSelection(currentChunk.id, 'neither')}
            >
              <X className={cn('mr-2 h-4 w-4', currentChunk.selected === 'neither' && 'text-red-600')} />
              Discard Both
            </Button>
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-1">
        <h4 className="text-xs font-medium text-muted-foreground">All Conflicts Summary</h4>
        <div className="flex flex-wrap gap-1">
          {chunks.map((chunk, index) => (
            <Button
              key={chunk.id}
              size="sm"
              variant={index === currentChunkIndex ? 'default' : 'outline'}
              className={cn(
                'h-6 w-6 p-0',
                chunk.selected === 'local' && 'bg-blue-100 border-blue-300',
                chunk.selected === 'server' && 'bg-purple-100 border-purple-300',
                chunk.selected === 'both' && 'bg-emerald-100 border-emerald-300',
                chunk.selected === 'neither' && 'bg-red-100 border-red-300'
              )}
              onClick={() => onNavigate(index > currentChunkIndex ? 'next' : 'prev')}
            >
              {index + 1}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
