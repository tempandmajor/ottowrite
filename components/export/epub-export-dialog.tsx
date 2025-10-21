/**
 * EPUB Export Dialog
 * UI for exporting documents to EPUB 3.0 format
 */

'use client'

import { useState, useRef } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FileDown, Loader2, Upload, X, BookOpen, AlertCircle, CheckCircle } from 'lucide-react'
import {
  exportToEPUB,
  downloadEPUB,
  validateEPUBOptions,
  type EPUBMetadata,
  type EPUBChapter,
  type EPUBCoverImage,
  type EPUBOptions
} from '@/lib/export/epub-generator'
import { stripHtml } from '@/lib/utils/text-diff'

export type EPUBExportDialogProps = {
  documentTitle: string
  documentContent: string
  chapters?: Array<{ title: string; content: string }>
  trigger?: React.ReactNode
}

export function EPUBExportDialog({
  documentTitle,
  documentContent,
  chapters,
  trigger,
}: EPUBExportDialogProps) {
  const [open, setOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Metadata state
  const [title, setTitle] = useState(documentTitle)
  const [author, setAuthor] = useState('')
  const [publisher, setPublisher] = useState('')
  const [description, setDescription] = useState('')
  const [isbn, setIsbn] = useState('')
  const [subjects, setSubjects] = useState('')
  const [rights, setRights] = useState('')
  const [language, setLanguage] = useState('en')

  // Cover image state
  const [coverImage, setCoverImage] = useState<EPUBCoverImage | null>(null)
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null)

  // Options
  const [includeTOC, setIncludeTOC] = useState(true)

  // Handle cover image upload
  const handleCoverImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setValidationErrors(['Cover image must be an image file (JPEG or PNG)'])
      return
    }

    if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
      setValidationErrors(['Cover image must be JPEG or PNG format'])
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setValidationErrors(['Cover image must be less than 5MB'])
      return
    }

    try {
      const arrayBuffer = await file.arrayBuffer()
      const mimeType = file.type as EPUBCoverImage['mimeType']
      const extension = file.type === 'image/jpeg' ? 'jpg' : 'png'

      setCoverImage({
        data: arrayBuffer,
        mimeType,
        extension,
      })

      // Create preview
      const blob = new Blob([arrayBuffer], { type: file.type })
      const url = URL.createObjectURL(blob)
      setCoverImagePreview(url)

      setValidationErrors([])
    } catch (error) {
      console.error('[EPUBExport] Error reading image:', error)
      setValidationErrors(['Failed to read image file'])
    }
  }

  // Remove cover image
  const handleRemoveCoverImage = () => {
    setCoverImage(null)
    if (coverImagePreview) {
      URL.revokeObjectURL(coverImagePreview)
      setCoverImagePreview(null)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Prepare chapters
  const prepareChapters = (): EPUBChapter[] => {
    if (chapters && chapters.length > 0) {
      return chapters.map((chapter, index) => ({
        id: `chapter-${index + 1}`,
        title: chapter.title || `Chapter ${index + 1}`,
        content: typeof chapter.content === 'string' ? stripHtml(chapter.content) : chapter.content,
        order: index + 1,
      }))
    }

    // Split content by chapter headings
    const chapterMatches = documentContent.match(/^(Chapter\s+\d+.*?)$/gim)

    if (chapterMatches && chapterMatches.length > 0) {
      const epubChapters: EPUBChapter[] = []
      const parts = documentContent.split(/^(Chapter\s+\d+.*?)$/gim).filter(Boolean)

      let chapterIndex = 1
      for (let i = 0; i < parts.length; i += 2) {
        if (i + 1 < parts.length) {
          epubChapters.push({
            id: `chapter-${chapterIndex}`,
            title: parts[i].trim(),
            content: stripHtml(parts[i + 1].trim()),
            order: chapterIndex,
          })
          chapterIndex++
        }
      }

      return epubChapters
    }

    // No chapters found - use entire document as single chapter
    return [{
      id: 'chapter-1',
      title: title,
      content: stripHtml(documentContent),
      order: 1,
    }]
  }

  // Validate and export
  const handleExport = async () => {
    setValidationErrors([])
    setIsExporting(true)

    try {
      // Prepare metadata
      const metadata: EPUBMetadata = {
        title: title.trim(),
        author: author.trim() || undefined,
        publisher: publisher.trim() || undefined,
        description: description.trim() || undefined,
        language: language || 'en',
        isbn: isbn.trim() || undefined,
        subjects: subjects ? subjects.split(',').map(s => s.trim()).filter(Boolean) : undefined,
        rights: rights.trim() || undefined,
      }

      // Prepare chapters
      const epubChapters = prepareChapters()

      // Build options
      const options: EPUBOptions = {
        metadata,
        chapters: epubChapters,
        coverImage: coverImage || undefined,
        includeTableOfContents: includeTOC,
        validateStructure: true,
      }

      // Validate
      const validation = validateEPUBOptions(options)
      if (!validation.valid) {
        setValidationErrors(validation.errors)
        return
      }

      // Generate EPUB
      const blob = await exportToEPUB(options)

      // Download
      const filename = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`
      downloadEPUB(blob, filename)

      // Clean up
      handleRemoveCoverImage()
      setOpen(false)
    } catch (error) {
      console.error('[EPUBExport] Error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate EPUB'
      setValidationErrors([errorMessage])
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Export to EPUB
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export to EPUB 3.0</DialogTitle>
          <DialogDescription>
            Create an EPUB file for e-readers with metadata and cover image
          </DialogDescription>
        </DialogHeader>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-6 py-4">
          {/* Required Metadata */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Required Information</h4>

            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter book title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="author">Author</Label>
              <Input
                id="author"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Author name"
              />
            </div>
          </div>

          <Separator />

          {/* Cover Image */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Cover Image (Optional)</h4>

            {!coverImage ? (
              <div className="space-y-2">
                <Label htmlFor="cover">Upload Cover Image</Label>
                <div className="flex items-center gap-2">
                  <Input
                    ref={fileInputRef}
                    id="cover"
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={handleCoverImageChange}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Accepts JPEG or PNG images (max 5MB)
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-start gap-4">
                  {coverImagePreview && (
                    <div className="relative w-32 h-48 border rounded-lg overflow-hidden">
                      <img
                        src={coverImagePreview}
                        alt="Cover preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">Cover image uploaded</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveCoverImage}
                      className="gap-2"
                    >
                      <X className="h-4 w-4" />
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Optional Metadata */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Additional Metadata (Optional)</h4>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="publisher">Publisher</Label>
                <Input
                  id="publisher"
                  value={publisher}
                  onChange={(e) => setPublisher(e.target.value)}
                  placeholder="Publisher name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="isbn">ISBN</Label>
                <Input
                  id="isbn"
                  value={isbn}
                  onChange={(e) => setIsbn(e.target.value)}
                  placeholder="978-0-123456-78-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description or synopsis"
                className="h-20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subjects">Subjects/Genres</Label>
              <Input
                id="subjects"
                value={subjects}
                onChange={(e) => setSubjects(e.target.value)}
                placeholder="Fiction, Mystery, Thriller (comma-separated)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rights">Copyright/Rights</Label>
              <Input
                id="rights"
                value={rights}
                onChange={(e) => setRights(e.target.value)}
                placeholder="© 2025 Author Name. All rights reserved."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Input
                id="language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                placeholder="en"
                maxLength={2}
              />
              <p className="text-xs text-muted-foreground">
                2-letter language code (e.g., en, es, fr)
              </p>
            </div>
          </div>

          <Separator />

          {/* Export Options */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Export Options</h4>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="toc"
                checked={includeTOC}
                onCheckedChange={(checked) => setIncludeTOC(checked as boolean)}
              />
              <Label htmlFor="toc" className="cursor-pointer">
                Include table of contents
              </Label>
            </div>
          </div>

          <Separator />

          {/* Format Info */}
          <div className="bg-muted p-4 rounded-lg text-sm space-y-2">
            <h5 className="font-medium">EPUB 3.0 Format:</h5>
            <ul className="space-y-1 text-muted-foreground">
              <li>• Compatible with most e-readers and apps (Kindle, Apple Books, Google Play Books)</li>
              <li>• Includes navigation and table of contents</li>
              <li>• Supports reflowable text for different screen sizes</li>
              <li>• Cover image displayed in e-reader library</li>
              <li>• Metadata embedded for better organization</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isExporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting || !title.trim()}>
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating EPUB...
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4 mr-2" />
                Export EPUB
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
