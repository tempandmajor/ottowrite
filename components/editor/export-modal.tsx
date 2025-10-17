'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Input } from '@/components/ui/input'
import { exportDocument, ExportFormat } from '@/lib/export/utils'
import { FileDown, FileText, FileType, File, Film } from 'lucide-react'

interface ExportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  content: string | any[]
  isScreenplay: boolean
  userTier: string
}

const exportFormats = [
  {
    id: 'pdf' as ExportFormat,
    label: 'PDF',
    description: 'Portable Document Format',
    icon: FileText,
    tiers: ['free', 'hobbyist', 'professional', 'studio'],
  },
  {
    id: 'docx' as ExportFormat,
    label: 'Word Document',
    description: 'Microsoft Word (.docx)',
    icon: FileType,
    tiers: ['hobbyist', 'professional', 'studio'],
  },
  {
    id: 'epub' as ExportFormat,
    label: 'EPUB',
    description: 'Electronic publication format for e-readers',
    icon: FileText,
    tiers: ['hobbyist', 'professional', 'studio'],
  },
  {
    id: 'markdown' as ExportFormat,
    label: 'Markdown',
    description: 'Markdown format (.md)',
    icon: FileText,
    tiers: ['free', 'hobbyist', 'professional', 'studio'],
  },
  {
    id: 'txt' as ExportFormat,
    label: 'Plain Text',
    description: 'Plain text file (.txt)',
    icon: File,
    tiers: ['free', 'hobbyist', 'professional', 'studio'],
  },
  {
    id: 'fountain' as ExportFormat,
    label: 'Fountain',
    description: 'Fountain screenplay format',
    icon: Film,
    tiers: ['professional', 'studio'],
    screenplayOnly: true,
  },
  {
    id: 'fdx' as ExportFormat,
    label: 'Final Draft',
    description: 'Final Draft XML (.fdx)',
    icon: Film,
    tiers: ['professional', 'studio'],
    screenplayOnly: true,
  },
]

export function ExportModal({
  open,
  onOpenChange,
  title,
  content,
  isScreenplay,
  userTier,
}: ExportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf')
  const [authorName, setAuthorName] = useState('')
  const [isExporting, setIsExporting] = useState(false)

  const availableFormats = exportFormats.filter((format) => {
    // Check tier access
    if (!format.tiers.includes(userTier)) return false
    // Check if screenplay-only format but document is not screenplay
    if (format.screenplayOnly && !isScreenplay) return false
    return true
  })

  const handleExport = async () => {
    setIsExporting(true)
    try {
      await exportDocument({
        format: selectedFormat,
        title,
        content,
        author: authorName || undefined,
        isScreenplay,
      })
      onOpenChange(false)
    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export document. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Export Document</DialogTitle>
          <DialogDescription>
            Choose a format to export your document. Available formats depend on your subscription tier.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Author Name */}
          <div className="space-y-2">
            <Label htmlFor="author">Author Name (optional)</Label>
            <Input
              id="author"
              placeholder="Your name"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
            />
          </div>

          {/* Format Selection */}
          <div className="space-y-2">
            <Label>Export Format</Label>
            <RadioGroup value={selectedFormat} onValueChange={(value) => setSelectedFormat(value as ExportFormat)}>
              {availableFormats.map((format) => {
                const Icon = format.icon
                return (
                  <div key={format.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent">
                    <RadioGroupItem value={format.id} id={format.id} />
                    <Label htmlFor={format.id} className="flex items-center gap-3 cursor-pointer flex-1">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="font-medium">{format.label}</div>
                        <div className="text-sm text-muted-foreground">{format.description}</div>
                      </div>
                    </Label>
                  </div>
                )
              })}
            </RadioGroup>
          </div>

          {/* Upgrade Notice */}
          {userTier === 'free' && (
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p className="font-medium mb-1">Want more export formats?</p>
              <p className="text-muted-foreground">
                Upgrade to Hobbyist for DOCX and EPUB, or Professional for screenplay formats (Fountain, Final Draft).
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            <FileDown className="h-4 w-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
