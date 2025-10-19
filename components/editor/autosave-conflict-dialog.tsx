'use client'

import { useState, useMemo } from 'react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertTriangle, Check, X, FileText, Clock } from 'lucide-react'
import { stripHtmlWithDOM, computeWordDiff, calculateDiffStats } from '@/lib/utils/text-diff'

type AutosaveConflictDialogProps = {
  open: boolean
  localContent: string
  serverContent: string
  localWordCount?: number
  serverWordCount?: number
  onKeepLocal: () => void
  onUseServer: () => void
  onCancel: () => void
}

export function AutosaveConflictDialog({
  open,
  localContent,
  serverContent,
  localWordCount,
  serverWordCount,
  onKeepLocal,
  onUseServer,
  onCancel,
}: AutosaveConflictDialogProps) {
  const [selectedView, setSelectedView] = useState<'diff' | 'local' | 'server'>('diff')

  const localText = useMemo(() => stripHtmlWithDOM(localContent), [localContent])
  const serverText = useMemo(() => stripHtmlWithDOM(serverContent), [serverContent])

  const diff = useMemo(() => {
    return computeWordDiff(serverText, localText)
  }, [localText, serverText])

  const stats = useMemo(() => {
    return calculateDiffStats(diff)
  }, [diff])

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <DialogTitle>Autosave Conflict Detected</DialogTitle>
          </div>
          <DialogDescription>
            This document was edited in another session or tab. Review the changes below and choose which
            version to keep.
          </DialogDescription>
        </DialogHeader>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 border-blue-200 bg-blue-50/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-900">Your Local Changes</span>
              <Badge variant="outline" className="bg-blue-100 text-blue-900 border-blue-300">
                Current
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-blue-700">
              <FileText className="h-3.5 w-3.5" />
              {localWordCount != null ? `${localWordCount.toLocaleString()} words` : 'Word count unavailable'}
            </div>
            {stats.additions > 0 && (
              <div className="mt-2 text-xs text-emerald-700">+{stats.additions} words added</div>
            )}
          </Card>

          <Card className="p-4 border-purple-200 bg-purple-50/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-purple-900">Server Version</span>
              <Badge variant="outline" className="bg-purple-100 text-purple-900 border-purple-300">
                Latest Saved
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-purple-700">
              <Clock className="h-3.5 w-3.5" />
              {serverWordCount != null ? `${serverWordCount.toLocaleString()} words` : 'Word count unavailable'}
            </div>
            {stats.deletions > 0 && (
              <div className="mt-2 text-xs text-red-700">-{stats.deletions} words removed vs local</div>
            )}
          </Card>
        </div>

        {/* Content Tabs */}
        <Tabs value={selectedView} onValueChange={(v) => setSelectedView(v as any)} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="diff">
              Diff View
              {stats.additions + stats.deletions > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {stats.additions + stats.deletions}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="local">Your Version</TabsTrigger>
            <TabsTrigger value="server">Server Version</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-auto border rounded-lg bg-background p-4 mt-4 min-h-0">
            <TabsContent value="diff" className="mt-0 h-full">
              <div className="prose prose-sm max-w-none">
                <div className="font-mono text-sm whitespace-pre-wrap leading-relaxed">
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
            </TabsContent>

            <TabsContent value="local" className="mt-0 h-full">
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap leading-relaxed text-sm">{localText}</div>
              </div>
            </TabsContent>

            <TabsContent value="server" className="mt-0 h-full">
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap leading-relaxed text-sm">{serverText}</div>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-3 h-3 bg-emerald-100 border border-emerald-300 rounded"></span>
              Added
            </span>
            <span className="inline-flex items-center gap-1 ml-3">
              <span className="inline-block w-3 h-3 bg-red-100 border border-red-300 rounded"></span>
              Removed
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onCancel}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button variant="outline" onClick={onUseServer} className="border-purple-300 hover:bg-purple-50">
              <Clock className="mr-2 h-4 w-4" />
              Use Server Version
            </Button>
            <Button onClick={onKeepLocal} className="bg-blue-600 hover:bg-blue-700">
              <Check className="mr-2 h-4 w-4" />
              Keep My Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
