/**
 * PDF Export Dialog
 * UI for exporting documents to PDF with format options
 */

'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { FileDown, Loader2 } from 'lucide-react'
import { exportToPDF, downloadPDF, type PDFFormat, type PDFOptions, type PDFChapter } from '@/lib/export/pdf-generator'

export type PDFExportDialogProps = {
  documentTitle: string
  documentContent: string
  chapters?: PDFChapter[]
  wordCount?: number
  trigger?: React.ReactNode
}

export function PDFExportDialog({
  documentTitle,
  documentContent,
  chapters,
  wordCount,
  trigger,
}: PDFExportDialogProps) {
  const [open, setOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // Export options
  const [format, setFormat] = useState<PDFFormat>('manuscript')
  const [title, setTitle] = useState(documentTitle)
  const [author, setAuthor] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [contactInfo, setContactInfo] = useState('')
  const [includeCoverPage, setIncludeCoverPage] = useState(true)
  const [includeTOC, setIncludeTOC] = useState(false)
  const [pageNumbering, setPageNumbering] = useState(true)

  const handleExport = async () => {
    setIsExporting(true)

    try {
      // Prepare chapters
      let pdfChapters: PDFChapter[]

      if (chapters && chapters.length > 0) {
        pdfChapters = chapters
      } else {
        // Split content into chapters if not provided
        // Simple split by "Chapter" headings or use whole document
        const chapterMatches = documentContent.match(/^(Chapter\s+\d+.*?)$/gim)

        if (chapterMatches && chapterMatches.length > 0) {
          pdfChapters = []
          const parts = documentContent.split(/^(Chapter\s+\d+.*?)$/gim).filter(Boolean)

          for (let i = 0; i < parts.length; i += 2) {
            if (i + 1 < parts.length) {
              pdfChapters.push({
                title: parts[i].trim(),
                content: parts[i + 1].trim(),
              })
            }
          }
        } else {
          // No chapters found - use entire document
          pdfChapters = [{
            title: '',
            content: documentContent,
          }]
        }
      }

      // Build options
      const options: PDFOptions = {
        format,
        title,
        author: author || undefined,
        subtitle: subtitle || undefined,
        contactInfo: contactInfo || undefined,
        wordCount,
        includeCoverPage,
        includeTOC: includeTOC && pdfChapters.length > 1,
        pageNumbering,
      }

      // Generate PDF
      const blob = await exportToPDF(pdfChapters, options)

      // Download
      const filename = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${format}`
      downloadPDF(blob, filename)

      setOpen(false)
    } catch (error) {
      console.error('[PDFExport] Error:', error)
      alert('Failed to generate PDF. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <FileDown className="h-4 w-4" />
            Export to PDF
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export to PDF</DialogTitle>
          <DialogDescription>
            Choose your format and customize the export settings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div className="space-y-2">
            <Label htmlFor="format">Format</Label>
            <Select value={format} onValueChange={(value) => setFormat(value as PDFFormat)}>
              <SelectTrigger id="format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manuscript">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Standard Manuscript</span>
                    <span className="text-xs text-gray-500">
                      Courier 12pt, double-spaced, industry standard
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="screenplay">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Screenplay</span>
                    <span className="text-xs text-gray-500">
                      Courier 12pt, screenplay format margins
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="novel">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Novel</span>
                    <span className="text-xs text-gray-500">
                      Times 11pt, book-style formatting
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="custom">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Custom</span>
                    <span className="text-xs text-gray-500">
                      Default formatting, customize as needed
                    </span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Document Info */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Document Information</h4>

            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter document title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="author">Author</Label>
              <Input
                id="author"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Your name"
              />
            </div>

            {format === 'manuscript' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="subtitle">Subtitle</Label>
                  <Input
                    id="subtitle"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="Optional subtitle"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact">Contact Information</Label>
                  <Textarea
                    id="contact"
                    value={contactInfo}
                    onChange={(e) => setContactInfo(e.target.value)}
                    placeholder="Email, phone, address (one per line)"
                    className="h-20"
                  />
                </div>
              </>
            )}

            {wordCount && (
              <div className="text-sm text-gray-600">
                Word count: {wordCount.toLocaleString()} words
              </div>
            )}
          </div>

          <Separator />

          {/* Export Options */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Export Options</h4>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="cover"
                checked={includeCoverPage}
                onCheckedChange={(checked) => setIncludeCoverPage(checked as boolean)}
              />
              <Label htmlFor="cover" className="cursor-pointer">
                Include cover page
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="toc"
                checked={includeTOC}
                onCheckedChange={(checked) => setIncludeTOC(checked as boolean)}
                disabled={!chapters || chapters.length <= 1}
              />
              <Label htmlFor="toc" className={chapters && chapters.length > 1 ? "cursor-pointer" : "cursor-not-allowed opacity-50"}>
                Include table of contents
                {(!chapters || chapters.length <= 1) && " (requires multiple chapters)"}
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="pagenum"
                checked={pageNumbering}
                onCheckedChange={(checked) => setPageNumbering(checked as boolean)}
              />
              <Label htmlFor="pagenum" className="cursor-pointer">
                Include page numbers
              </Label>
            </div>
          </div>

          <Separator />

          {/* Format Info */}
          <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg text-sm">
            <h5 className="font-medium mb-2">Format Details:</h5>
            {format === 'manuscript' && (
              <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                <li>• Courier 12pt font (industry standard)</li>
                <li>• Double-spaced lines</li>
                <li>• 1.25&rdquo; left/right margins, 1&rdquo; top/bottom</li>
                <li>• Header with author, title, and page number</li>
                <li>• First line indent (0.5&rdquo;)</li>
              </ul>
            )}
            {format === 'screenplay' && (
              <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                <li>• Courier 12pt font</li>
                <li>• Single-spaced with scene spacing</li>
                <li>• 1.5&rdquo; left margin, 1&rdquo; right margin</li>
                <li>• Screenplay-style formatting</li>
              </ul>
            )}
            {format === 'novel' && (
              <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                <li>• Times New Roman 11pt font</li>
                <li>• 1.5x line spacing</li>
                <li>• 1&rdquo; margins all around</li>
                <li>• First line indent (0.5&rdquo;)</li>
                <li>• Paragraph spacing</li>
              </ul>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isExporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting || !title}>
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4 mr-2" />
                Export PDF
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
