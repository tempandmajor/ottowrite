'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Clock, RotateCcw, Eye, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

type Version = {
  id: string
  version_number: number
  title: string
  content: any
  word_count: number
  change_summary: string | null
  created_at: string
}

interface VersionHistoryProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  documentId: string
  onRestoreVersion: (content: any, title: string) => void
}

export function VersionHistory({
  open,
  onOpenChange,
  documentId,
  onRestoreVersion,
}: VersionHistoryProps) {
  const [versions, setVersions] = useState<Version[]>([])
  const [loading, setLoading] = useState(false)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const { toast } = useToast()

  const loadVersions = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('document_versions')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error

      setVersions(data || [])
    } catch (error) {
      console.error('Error loading versions:', error)
      toast({
        title: 'Error',
        description: 'Failed to load version history',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [documentId, toast])

  useEffect(() => {
    if (open) {
      loadVersions()
    }
  }, [open, loadVersions])

  const handleRestore = async (version: Version) => {
    setRestoringId(version.id)
    try {
      await onRestoreVersion(version.content, version.title)
      onOpenChange(false)
      toast({
        title: 'Version Restored',
        description: `Restored to version ${version.version_number} from ${formatDate(version.created_at)}`,
      })
    } finally {
      setRestoringId(null)
    }
  }

  const handlePreview = (version: Version) => {
    setSelectedVersion(version)
    setPreviewOpen(true)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getPreviewText = (content: any): string => {
    if (typeof content === 'string') {
      return content.replace(/<[^>]*>/g, ' ').substring(0, 200)
    } else if (content?.html) {
      return content.html.replace(/<[^>]*>/g, ' ').substring(0, 200)
    } else if (content?.screenplay && Array.isArray(content.screenplay)) {
      return content.screenplay
        .map((el: any) => el.content)
        .join(' ')
        .substring(0, 200)
    }
    return 'No preview available'
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Version History</DialogTitle>
            <DialogDescription>
              View and restore previous versions of your document.
              {versions.length > 0 && ` ${versions.length} version${versions.length > 1 ? 's' : ''} available.`}
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading versions...</p>
            </div>
          ) : versions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Clock className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No version history yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Versions are automatically saved when you edit your document
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {versions.map((version) => (
                  <div
                    key={version.id}
                    className="border rounded-lg p-4 hover:bg-accent transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm">
                            Version {version.version_number}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(version.created_at)}
                          </span>
                        </div>
                        <p className="text-sm font-medium mb-1">{version.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {getPreviewText(version.content)}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span>{version.word_count.toLocaleString()} words</span>
                          {version.change_summary && (
                            <span className="truncate">• {version.change_summary}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePreview(version)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestore(version)}
                          disabled={restoringId === version.id}
                        >
                          {restoringId === version.id ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <RotateCcw className="h-4 w-4 mr-1" />
                          )}
                          {restoringId === version.id ? 'Restoring...' : 'Restore'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              {selectedVersion && `Version ${selectedVersion.version_number} Preview`}
            </DialogTitle>
            <DialogDescription>
              {selectedVersion && formatDate(selectedVersion.created_at)}
            </DialogDescription>
          </DialogHeader>
          {selectedVersion && (
            <ScrollArea className="h-[500px]">
              <div className="prose prose-sm max-w-none p-4">
                <h2>{selectedVersion.title}</h2>
                <div
                  dangerouslySetInnerHTML={{
                    __html: selectedVersion.content?.html || getPreviewText(selectedVersion.content),
                  }}
                />
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
