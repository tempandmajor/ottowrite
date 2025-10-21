/**
 * PDF Export Generator
 * Supports multiple formats: manuscript, screenplay, novel
 * Features: cover pages, table of contents, custom formatting
 */

import { jsPDF } from 'jspdf'

export type PDFFormat = 'manuscript' | 'screenplay' | 'novel' | 'custom'

export type PDFOptions = {
  format: PDFFormat

  // Document metadata
  title: string
  author?: string
  wordCount?: number

  // Cover page options
  includeCoverPage?: boolean
  subtitle?: string
  contactInfo?: string

  // Table of contents
  includeTOC?: boolean

  // Formatting options
  fontSize?: number
  fontFamily?: 'Times' | 'Courier' | 'Helvetica'
  lineHeight?: number
  pageNumbering?: boolean
  pageNumberFormat?: 'arabic' | 'roman'
  startPageNumber?: number

  // Margins (in inches)
  marginTop?: number
  marginBottom?: number
  marginLeft?: number
  marginRight?: number

  // Custom options
  customSettings?: {
    firstLineIndent?: number
    paragraphSpacing?: number
    sceneBreak?: string
    chapterFormat?: string
  }
}

export type PDFChapter = {
  title: string
  content: string
  pageNumber?: number
}

const POINTS_PER_INCH = 72

// Format presets
const FORMAT_PRESETS: Record<PDFFormat, Partial<PDFOptions>> = {
  manuscript: {
    fontSize: 12,
    fontFamily: 'Courier',
    lineHeight: 24, // Double-spaced
    marginTop: 1,
    marginBottom: 1,
    marginLeft: 1.25,
    marginRight: 1.25,
    pageNumbering: true,
    customSettings: {
      firstLineIndent: 0.5,
      paragraphSpacing: 0,
      sceneBreak: '# # #',
    },
  },
  screenplay: {
    fontSize: 12,
    fontFamily: 'Courier',
    lineHeight: 12,
    marginTop: 1,
    marginBottom: 0.5,
    marginLeft: 1.5,
    marginRight: 1,
    pageNumbering: true,
    customSettings: {
      firstLineIndent: 0,
      paragraphSpacing: 12,
    },
  },
  novel: {
    fontSize: 11,
    fontFamily: 'Times',
    lineHeight: 16,
    marginTop: 1,
    marginBottom: 1,
    marginLeft: 1,
    marginRight: 1,
    pageNumbering: true,
    customSettings: {
      firstLineIndent: 0.5,
      paragraphSpacing: 12,
    },
  },
  custom: {},
}

export class PDFGenerator {
  private pdf: jsPDF
  private options: Required<PDFOptions>
  private currentY: number
  private pageWidth: number
  private pageHeight: number
  private currentPage: number
  private chapters: PDFChapter[]
  private tocEntries: { title: string; page: number }[]

  constructor(options: PDFOptions) {
    // Merge with format preset
    const preset = FORMAT_PRESETS[options.format] || {}
    this.options = {
      ...preset,
      ...options,
      includeCoverPage: options.includeCoverPage ?? true,
      includeTOC: options.includeTOC ?? true,
      fontSize: options.fontSize ?? preset.fontSize ?? 12,
      fontFamily: options.fontFamily ?? preset.fontFamily ?? 'Times',
      lineHeight: options.lineHeight ?? preset.lineHeight ?? 16,
      pageNumbering: options.pageNumbering ?? preset.pageNumbering ?? true,
      pageNumberFormat: options.pageNumberFormat ?? 'arabic',
      startPageNumber: options.startPageNumber ?? 1,
      marginTop: options.marginTop ?? preset.marginTop ?? 1,
      marginBottom: options.marginBottom ?? preset.marginBottom ?? 1,
      marginLeft: options.marginLeft ?? preset.marginLeft ?? 1,
      marginRight: options.marginRight ?? preset.marginRight ?? 1,
      customSettings: {
        ...preset.customSettings,
        ...options.customSettings,
      },
      subtitle: options.subtitle,
      contactInfo: options.contactInfo,
      author: options.author,
      wordCount: options.wordCount,
    } as Required<PDFOptions>

    // Initialize jsPDF (8.5 x 11 inches)
    this.pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'letter',
    })

    this.pageWidth = this.pdf.internal.pageSize.getWidth()
    this.pageHeight = this.pdf.internal.pageSize.getHeight()
    this.currentY = this.options.marginTop * POINTS_PER_INCH
    this.currentPage = 1
    this.chapters = []
    this.tocEntries = []

    // Remove the default first page
    this.pdf.deletePage(1)
  }

  /**
   * Generate PDF from chapters
   */
  async generate(chapters: PDFChapter[]): Promise<Blob> {
    this.chapters = chapters

    // Add cover page
    if (this.options.includeCoverPage) {
      this.addCoverPage()
    }

    // Add table of contents (placeholder - we'll fill it later)
    let tocPageCount = 0
    if (this.options.includeTOC) {
      tocPageCount = this.addTOCPlaceholder()
    }

    // Add chapters
    for (const chapter of chapters) {
      this.addChapter(chapter)
    }

    // Go back and fill in TOC with actual page numbers
    if (this.options.includeTOC && this.tocEntries.length > 0) {
      this.fillTOC(tocPageCount)
    }

    // Return PDF as blob
    return this.pdf.output('blob')
  }

  /**
   * Add cover page
   */
  private addCoverPage(): void {
    this.pdf.addPage()
    this.currentPage++

    const centerX = this.pageWidth / 2
    let y = this.pageHeight / 3

    // Title
    this.pdf.setFontSize(24)
    this.pdf.setFont(this.options.fontFamily, 'bold')
    const titleLines = this.pdf.splitTextToSize(this.options.title, this.pageWidth - 144)
    titleLines.forEach((line: string) => {
      this.pdf.text(line, centerX, y, { align: 'center' })
      y += 36
    })

    // Subtitle
    if (this.options.subtitle) {
      y += 24
      this.pdf.setFontSize(16)
      this.pdf.setFont(this.options.fontFamily, 'normal')
      const subtitleLines = this.pdf.splitTextToSize(this.options.subtitle, this.pageWidth - 144)
      subtitleLines.forEach((line: string) => {
        this.pdf.text(line, centerX, y, { align: 'center' })
        y += 24
      })
    }

    // Author
    if (this.options.author) {
      y += 48
      this.pdf.setFontSize(14)
      this.pdf.setFont(this.options.fontFamily, 'normal')
      this.pdf.text(`by ${this.options.author}`, centerX, y, { align: 'center' })
    }

    // Word count (for manuscripts)
    if (this.options.wordCount && this.options.format === 'manuscript') {
      y += 24
      this.pdf.setFontSize(12)
      this.pdf.text(`Approximately ${this.options.wordCount.toLocaleString()} words`, centerX, y, { align: 'center' })
    }

    // Contact info (bottom of page)
    if (this.options.contactInfo) {
      const bottomY = this.pageHeight - this.options.marginBottom * POINTS_PER_INCH - 72
      this.pdf.setFontSize(11)
      const contactLines = this.options.contactInfo.split('\n')
      let contactY = bottomY
      contactLines.forEach((line) => {
        this.pdf.text(line, centerX, contactY, { align: 'center' })
        contactY += 14
      })
    }
  }

  /**
   * Add table of contents placeholder
   */
  private addTOCPlaceholder(): number {
    this.pdf.addPage()
    this.currentPage++

    this.currentY = this.options.marginTop * POINTS_PER_INCH + 72

    this.pdf.setFontSize(18)
    this.pdf.setFont(this.options.fontFamily, 'bold')
    this.pdf.text('Table of Contents', this.options.marginLeft * POINTS_PER_INCH, this.currentY)

    // Estimate pages needed (we'll recreate later with actual page numbers)
    const estimatedLines = Math.max(this.chapters.length, 10)
    const linesPerPage = Math.floor((this.pageHeight - (this.options.marginTop + this.options.marginBottom) * POINTS_PER_INCH) / 16)
    const pagesNeeded = Math.ceil(estimatedLines / linesPerPage)

    // Add placeholder pages
    for (let i = 1; i < pagesNeeded; i++) {
      this.pdf.addPage()
      this.currentPage++
    }

    return pagesNeeded
  }

  /**
   * Fill in table of contents with actual page numbers
   */
  private fillTOC(tocPageCount: number): void {
    // Go back to TOC pages
    const tocStartPage = this.options.includeCoverPage ? 2 : 1

    // Delete old TOC pages
    for (let i = 0; i < tocPageCount; i++) {
      this.pdf.deletePage(tocStartPage)
    }

    // Insert new TOC page
    this.pdf.insertPage(tocStartPage)
    this.pdf.setPage(tocStartPage)

    let y = this.options.marginTop * POINTS_PER_INCH + 72

    this.pdf.setFontSize(18)
    this.pdf.setFont(this.options.fontFamily, 'bold')
    this.pdf.text('Table of Contents', this.options.marginLeft * POINTS_PER_INCH, y)

    y += 36

    this.pdf.setFontSize(this.options.fontSize)
    this.pdf.setFont(this.options.fontFamily, 'normal')

    const leftMargin = this.options.marginLeft * POINTS_PER_INCH
    const rightMargin = this.pageWidth - this.options.marginRight * POINTS_PER_INCH

    for (const entry of this.tocEntries) {
      if (y > this.pageHeight - this.options.marginBottom * POINTS_PER_INCH) {
        this.pdf.addPage()
        this.pdf.setPage(this.pdf.getNumberOfPages())
        y = this.options.marginTop * POINTS_PER_INCH
      }

      const pageNumText = entry.page.toString()
      const pageNumWidth = this.pdf.getTextWidth(pageNumText)

      // Title on left
      const maxTitleWidth = rightMargin - leftMargin - pageNumWidth - 20
      const titleText = this.truncateText(entry.title, maxTitleWidth)
      this.pdf.text(titleText, leftMargin, y)

      // Page number on right
      this.pdf.text(pageNumText, rightMargin - pageNumWidth, y)

      y += this.options.lineHeight
    }

    // Return to last page
    this.pdf.setPage(this.pdf.getNumberOfPages())
  }

  /**
   * Add a chapter
   */
  private addChapter(chapter: PDFChapter): void {
    // Add new page for chapter
    this.pdf.addPage()
    this.currentPage++
    this.currentY = this.options.marginTop * POINTS_PER_INCH

    // Record page number for TOC
    const chapterPage = this.currentPage - (this.options.includeCoverPage ? 1 : 0) - (this.options.includeTOC ? 1 : 0)
    this.tocEntries.push({
      title: chapter.title,
      page: chapterPage,
    })

    // Chapter title
    if (chapter.title) {
      this.pdf.setFontSize(this.options.fontSize + 4)
      this.pdf.setFont(this.options.fontFamily, 'bold')

      const chapterTitle = this.options.customSettings.chapterFormat
        ? this.options.customSettings.chapterFormat.replace('{title}', chapter.title)
        : chapter.title

      this.pdf.text(chapterTitle, this.options.marginLeft * POINTS_PER_INCH, this.currentY)
      this.currentY += this.options.lineHeight * 2

      this.pdf.setFontSize(this.options.fontSize)
      this.pdf.setFont(this.options.fontFamily, 'normal')
    }

    // Chapter content
    this.addContent(chapter.content)

    // Add page numbers
    if (this.options.pageNumbering) {
      this.addPageNumber()
    }
  }

  /**
   * Add content with proper formatting
   */
  private addContent(content: string): void {
    const paragraphs = content.split('\n\n')
    const leftMargin = this.options.marginLeft * POINTS_PER_INCH
    const rightMargin = this.pageWidth - this.options.marginRight * POINTS_PER_INCH
    const maxWidth = rightMargin - leftMargin
    const bottomMargin = this.pageHeight - this.options.marginBottom * POINTS_PER_INCH

    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i].trim()
      if (!paragraph) continue

      // Check for scene breaks
      if (this.options.customSettings.sceneBreak && paragraph === this.options.customSettings.sceneBreak) {
        this.currentY += this.options.lineHeight
        this.pdf.text(paragraph, this.pageWidth / 2, this.currentY, { align: 'center' })
        this.currentY += this.options.lineHeight * 2
        continue
      }

      // First line indent (except for first paragraph)
      const indent = (i > 0 && this.options.customSettings.firstLineIndent)
        ? this.options.customSettings.firstLineIndent * POINTS_PER_INCH
        : 0

      // Split paragraph into lines
      const lines = this.pdf.splitTextToSize(paragraph, maxWidth - indent)

      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex]

        // Check if we need a new page
        if (this.currentY + this.options.lineHeight > bottomMargin) {
          if (this.options.pageNumbering) {
            this.addPageNumber()
          }

          this.pdf.addPage()
          this.currentPage++
          this.currentY = this.options.marginTop * POINTS_PER_INCH
        }

        // Add indent only to first line
        const lineIndent = lineIndex === 0 ? indent : 0
        this.pdf.text(line, leftMargin + lineIndent, this.currentY)
        this.currentY += this.options.lineHeight
      }

      // Paragraph spacing
      if (this.options.customSettings.paragraphSpacing) {
        this.currentY += this.options.customSettings.paragraphSpacing
      }
    }
  }

  /**
   * Add page number
   */
  private addPageNumber(): void {
    const pageNum = this.currentPage - (this.options.includeCoverPage ? 1 : 0) - (this.options.includeTOC ? 1 : 0)

    if (pageNum < this.options.startPageNumber) return

    let pageText: string
    if (this.options.pageNumberFormat === 'roman') {
      pageText = this.toRoman(pageNum)
    } else {
      pageText = pageNum.toString()
    }

    const pageNumY = this.pageHeight - (this.options.marginBottom * POINTS_PER_INCH / 2)

    // Manuscript format: top right with author/title
    if (this.options.format === 'manuscript') {
      const headerY = this.options.marginTop * POINTS_PER_INCH / 2
      const rightX = this.pageWidth - this.options.marginRight * POINTS_PER_INCH

      const headerText = this.options.author
        ? `${this.options.author} / ${this.truncateText(this.options.title, 200)} / ${pageText}`
        : `${this.truncateText(this.options.title, 250)} / ${pageText}`

      this.pdf.setFontSize(this.options.fontSize)
      this.pdf.text(headerText, rightX, headerY, { align: 'right' })
    } else {
      // Center bottom for other formats
      this.pdf.text(pageText, this.pageWidth / 2, pageNumY, { align: 'center' })
    }
  }

  /**
   * Truncate text to fit width
   */
  private truncateText(text: string, maxWidth: number): string {
    let truncated = text
    while (this.pdf.getTextWidth(truncated) > maxWidth && truncated.length > 0) {
      truncated = truncated.slice(0, -1)
    }
    return truncated.length < text.length ? truncated + '...' : truncated
  }

  /**
   * Convert number to Roman numerals
   */
  private toRoman(num: number): string {
    const lookup: Record<string, number> = {
      M: 1000, CM: 900, D: 500, CD: 400, C: 100, XC: 90,
      L: 50, XL: 40, X: 10, IX: 9, V: 5, IV: 4, I: 1,
    }

    let roman = ''
    for (const i in lookup) {
      while (num >= lookup[i]) {
        roman += i
        num -= lookup[i]
      }
    }
    return roman
  }
}

/**
 * Export document to PDF
 */
export async function exportToPDF(
  chapters: PDFChapter[],
  options: PDFOptions
): Promise<Blob> {
  const generator = new PDFGenerator(options)
  return await generator.generate(chapters)
}

/**
 * Download PDF
 */
export function downloadPDF(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
