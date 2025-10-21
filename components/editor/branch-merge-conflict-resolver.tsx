/**
 * Branch Merge Conflict Resolver
 * Side-by-side conflict resolution UI with preview
 */

'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  ArrowRight,
  GitMerge,
  Check,
  AlertTriangle,
  Eye,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { stripHtmlWithDOM, computeWordDiff, calculateDiffStats } from '@/lib/utils/text-diff'

type ConflictType = 'html' | 'screenplay'

type Conflict = {
  type: ConflictType
  field: string
  sourceValue: any
  targetValue: any
  stats?: {
    additions: number
    deletions: number
    totalChanges: number
    changePercentage: number
  }
}

type ConflictResolution = 'source' | 'target' | 'both' | 'custom'

type BranchMergeConflictResolverProps = {
  open: boolean
  onClose: () => void
  sourceBranchName: string
  targetBranchName: string
  conflicts: Conflict[]
  onResolve: (resolvedContent: any) => void
}

export function BranchMergeConflictResolver({
  open,
  onClose,
  sourceBranchName,
  targetBranchName,
  conflicts,
  onResolve,
}: BranchMergeConflictResolverProps) {
  const [currentConflictIndex, setCurrentConflictIndex] = useState(0)
  const [resolutions, setResolutions] = useState<Record<number, ConflictResolution>>(
    () => Object.fromEntries(conflicts.map((_, index) => [index, 'source' as ConflictResolution]))
  )
  const [resolving, setResolving] = useState(false)

  const currentConflict = conflicts[currentConflictIndex]

  // Extract text from conflict values for comparison
  const { sourceText, targetText } = useMemo(() => {
    if (!currentConflict) return { sourceText: '', targetText: '' }

    if (currentConflict.type === 'html') {
      return {
        sourceText: stripHtmlWithDOM(currentConflict.sourceValue),
        targetText: stripHtmlWithDOM(currentConflict.targetValue),
      }
    }

    if (currentConflict.type === 'screenplay') {
      const sourceElements = Array.isArray(currentConflict.sourceValue)
        ? currentConflict.sourceValue
        : []
      const targetElements = Array.isArray(currentConflict.targetValue)
        ? currentConflict.targetValue
        : []

      return {
        sourceText: sourceElements.map((el: any) => el?.content ?? el?.text ?? '').join('\n\n'),
        targetText: targetElements.map((el: any) => el?.content ?? el?.text ?? '').join('\n\n'),
      }
    }

    return { sourceText: '', targetText: '' }
  }, [currentConflict])

  // Compute diff for preview
  const diff = useMemo(() => {
    return computeWordDiff(targetText, sourceText)
  }, [sourceText, targetText])

  const stats = useMemo(() => {
    return calculateDiffStats(diff)
  }, [diff])

  // Generate preview of merged content based on current resolutions
  const mergedPreview = useMemo(() => {
    const resolution = resolutions[currentConflictIndex]

    if (resolution === 'source') {
      return sourceText
    } else if (resolution === 'target') {
      return targetText
    } else if (resolution === 'both') {
      return `${targetText}\n\n${sourceText}`
    }

    return sourceText // default
  }, [currentConflictIndex, resolutions, sourceText, targetText])

  const handleResolutionChange = useCallback((resolution: ConflictResolution) => {
    setResolutions((prev) => ({
      ...prev,
      [currentConflictIndex]: resolution,
    }))
  }, [currentConflictIndex])

  const handleNavigate = useCallback((direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentConflictIndex > 0) {
      setCurrentConflictIndex(currentConflictIndex - 1)
    } else if (direction === 'next' && currentConflictIndex < conflicts.length - 1) {
      setCurrentConflictIndex(currentConflictIndex + 1)
    }
  }, [currentConflictIndex, conflicts.length])

  const handleResolveAll = useCallback(async () => {
    setResolving(true)
    try {
      // Build merged content based on all resolutions
      const mergedContent: any = {}

      conflicts.forEach((conflict, index) => {
        const resolution = resolutions[index]
        const field = conflict.field

        if (resolution === 'source') {
          mergedContent[field] = conflict.sourceValue
        } else if (resolution === 'target') {
          mergedContent[field] = conflict.targetValue
        } else if (resolution === 'both') {
          // Merge both values
          if (conflict.type === 'html') {
            mergedContent[field] = conflict.targetValue + '\n' + conflict.sourceValue
          } else if (conflict.type === 'screenplay') {
            const targetArray = Array.isArray(conflict.targetValue) ? conflict.targetValue : []
            const sourceArray = Array.isArray(conflict.sourceValue) ? conflict.sourceValue : []
            mergedContent[field] = [...targetArray, ...sourceArray]
          }
        }
      })

      onResolve(mergedContent)
    } catch (error) {
      console.error('Error resolving conflicts:', error)
    } finally {
      setResolving(false)
    }
  }, [conflicts, resolutions, onResolve])

  const allResolved = useMemo(() => {
    return conflicts.every((_, index) => resolutions[index] !== undefined)
  }, [conflicts, resolutions])

  if (!currentConflict) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitMerge className="h-5 w-5 text-amber-600" />
              <DialogTitle>Resolve Merge Conflicts</DialogTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-amber-50 text-amber-900 border-amber-300">
                {currentConflictIndex + 1} of {conflicts.length}
              </Badge>
            </div>
          </div>
          <DialogDescription>
            Merging <span className="font-medium">{sourceBranchName}</span> into{' '}
            <span className="font-medium">{targetBranchName}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Navigation */}
        <div className="flex items-center justify-between py-2 border-y">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleNavigate('prev')}
            disabled={currentConflictIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>

          <div className="flex gap-1">
            {conflicts.map((_, index) => (
              <button
                key={index}
                className={cn(
                  'h-2 w-8 rounded transition-colors',
                  index === currentConflictIndex
                    ? 'bg-primary'
                    : resolutions[index]
                    ? 'bg-green-500'
                    : 'bg-muted'
                )}
                onClick={() => setCurrentConflictIndex(index)}
                aria-label={`Go to conflict ${index + 1}`}
              />
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleNavigate('next')}
            disabled={currentConflictIndex === conflicts.length - 1}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        {/* Stats Summary */}
        <Alert className="border-amber-200 bg-amber-50/50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-sm text-amber-900">
            <strong>{stats.totalChanges} changes</strong> detected ({stats.additions} additions,{' '}
            {stats.deletions} deletions) • {stats.changePercentage.toFixed(1)}% of content differs
          </AlertDescription>
        </Alert>

        {/* Main Content */}
        <Tabs defaultValue="side-by-side" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="side-by-side">Side-by-Side</TabsTrigger>
            <TabsTrigger value="preview">
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="side-by-side" className="flex-1 overflow-hidden mt-0">
            <div className="grid grid-cols-2 gap-4 h-full">
              {/* Target (Current) */}
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium">{targetBranchName}</h4>
                    <Badge variant="outline" className="text-xs">
                      Current
                    </Badge>
                  </div>
                  <Button
                    variant={resolutions[currentConflictIndex] === 'target' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleResolutionChange('target')}
                  >
                    {resolutions[currentConflictIndex] === 'target' && (
                      <Check className="h-4 w-4 mr-1" />
                    )}
                    Use This
                  </Button>
                </div>
                <ScrollArea className="flex-1 border rounded-lg bg-blue-50/30 p-4">
                  <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed">
                    {targetText}
                  </pre>
                </ScrollArea>
              </div>

              {/* Source (Incoming) */}
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium">{sourceBranchName}</h4>
                    <Badge variant="outline" className="text-xs">
                      Incoming
                    </Badge>
                  </div>
                  <Button
                    variant={resolutions[currentConflictIndex] === 'source' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleResolutionChange('source')}
                  >
                    {resolutions[currentConflictIndex] === 'source' && (
                      <Check className="h-4 w-4 mr-1" />
                    )}
                    Use This
                  </Button>
                </div>
                <ScrollArea className="flex-1 border rounded-lg bg-green-50/30 p-4">
                  <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed">
                    {sourceText}
                  </pre>
                </ScrollArea>
              </div>
            </div>

            {/* Both Option */}
            <div className="mt-4 flex items-center justify-center">
              <Button
                variant={resolutions[currentConflictIndex] === 'both' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleResolutionChange('both')}
                className="gap-2"
              >
                {resolutions[currentConflictIndex] === 'both' && (
                  <Check className="h-4 w-4" />
                )}
                <ArrowLeft className="h-4 w-4" />
                Keep Both
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="flex-1 overflow-hidden mt-0">
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium">Merged Result Preview</h4>
                <Badge variant="secondary">
                  {resolutions[currentConflictIndex] === 'source' && 'Using incoming changes'}
                  {resolutions[currentConflictIndex] === 'target' && 'Using current version'}
                  {resolutions[currentConflictIndex] === 'both' && 'Keeping both versions'}
                </Badge>
              </div>
              <ScrollArea className="flex-1 border rounded-lg bg-purple-50/30 p-4">
                <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed">
                  {mergedPreview}
                </pre>
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <DialogFooter className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {Object.values(resolutions).filter(Boolean).length} of {conflicts.length} conflicts
            resolved
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleResolveAll}
              disabled={!allResolved || resolving}
              className="bg-green-600 hover:bg-green-700"
            >
              {resolving ? 'Resolving...' : 'Resolve & Merge'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
