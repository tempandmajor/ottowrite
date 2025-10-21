/**
 * EPUB 3.0 Generation Library
 * Features:
 * - EPUB 3.0 format with metadata
 * - Cover image support
 * - Chapter navigation and TOC
 * - Multi-chapter support
 * - Basic validation
 */

import JSZip from 'jszip'
import { saveAs } from 'file-saver'

export type EPUBMetadata = {
  title: string
  author?: string
  publisher?: string
  description?: string
  language?: string
  isbn?: string
  publicationDate?: Date
  subjects?: string[] // Categories/genres
  rights?: string // Copyright info
}

export type EPUBChapter = {
  id: string
  title: string
  content: string // HTML content
  order: number
}

export type EPUBCoverImage = {
  data: Blob | ArrayBuffer
  mimeType: 'image/jpeg' | 'image/png'
  extension: 'jpg' | 'png'
}

export type EPUBOptions = {
  metadata: EPUBMetadata
  chapters: EPUBChapter[]
  coverImage?: EPUBCoverImage
  includeTableOfContents?: boolean
  validateStructure?: boolean
}

export class EPUBGenerator {
  private zip: JSZip
  private options: Required<EPUBOptions>
  private bookId: string

  constructor(options: EPUBOptions) {
    this.zip = new JSZip()
    this.bookId = `urn:uuid:${crypto.randomUUID()}`

    this.options = {
      ...options,
      includeTableOfContents: options.includeTableOfContents ?? true,
      validateStructure: options.validateStructure ?? true,
      metadata: {
        language: 'en',
        ...options.metadata,
      },
    } as Required<EPUBOptions>

    // Validate before generation
    if (this.options.validateStructure) {
      this.validate()
    }
  }

  /**
   * Validate EPUB structure
   */
  private validate(): void {
    const { metadata, chapters } = this.options

    if (!metadata.title?.trim()) {
      throw new Error('EPUB validation failed: Title is required')
    }

    if (!chapters || chapters.length === 0) {
      throw new Error('EPUB validation failed: At least one chapter is required')
    }

    // Check for duplicate chapter IDs
    const ids = new Set<string>()
    for (const chapter of chapters) {
      if (!chapter.id?.trim()) {
        throw new Error('EPUB validation failed: Chapter ID is required')
      }
      if (ids.has(chapter.id)) {
        throw new Error(`EPUB validation failed: Duplicate chapter ID: ${chapter.id}`)
      }
      ids.add(chapter.id)

      if (!chapter.title?.trim()) {
        throw new Error(`EPUB validation failed: Chapter title is required for ${chapter.id}`)
      }
    }

    // Validate cover image if provided
    if (this.options.coverImage) {
      const validTypes: Array<EPUBCoverImage['mimeType']> = ['image/jpeg', 'image/png']
      if (!validTypes.includes(this.options.coverImage.mimeType)) {
        throw new Error('EPUB validation failed: Cover image must be JPEG or PNG')
      }
    }
  }

  /**
   * Generate EPUB file
   */
  async generate(): Promise<Blob> {
    // Create required EPUB structure
    this.addMimetype()
    this.addContainerXML()
    this.addContentOPF()
    this.addNavigationDocument()
    this.addStylesheet()
    await this.addCoverImage()
    this.addChapters()

    // Generate ZIP file
    return await this.zip.generateAsync({
      type: 'blob',
      mimeType: 'application/epub+zip',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 }
    })
  }

  /**
   * Add mimetype file (must be first, uncompressed)
   */
  private addMimetype(): void {
    this.zip.file('mimetype', 'application/epub+zip', {
      compression: 'STORE' // Uncompressed as per EPUB spec
    })
  }

  /**
   * Add META-INF/container.xml
   */
  private addContainerXML(): void {
    const containerXML = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`

    this.zip.folder('META-INF')?.file('container.xml', containerXML)
  }

  /**
   * Add OEBPS/content.opf (Package Document)
   */
  private addContentOPF(): void {
    const { metadata, chapters, coverImage } = this.options
    const modifiedDate = new Date().toISOString().split('.')[0] + 'Z'

    // Build metadata section
    let metadataXML = `  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">${this.bookId}</dc:identifier>
    <dc:title>${this.escapeXml(metadata.title)}</dc:title>`

    if (metadata.author) {
      metadataXML += `\n    <dc:creator>${this.escapeXml(metadata.author)}</dc:creator>`
    }

    if (metadata.publisher) {
      metadataXML += `\n    <dc:publisher>${this.escapeXml(metadata.publisher)}</dc:publisher>`
    }

    if (metadata.description) {
      metadataXML += `\n    <dc:description>${this.escapeXml(metadata.description)}</dc:description>`
    }

    metadataXML += `\n    <dc:language>${metadata.language}</dc:language>`

    if (metadata.isbn) {
      metadataXML += `\n    <dc:identifier id="isbn">${metadata.isbn}</dc:identifier>`
    }

    if (metadata.publicationDate) {
      const dateStr = metadata.publicationDate.toISOString().split('T')[0]
      metadataXML += `\n    <dc:date>${dateStr}</dc:date>`
    }

    if (metadata.subjects && metadata.subjects.length > 0) {
      for (const subject of metadata.subjects) {
        metadataXML += `\n    <dc:subject>${this.escapeXml(subject)}</dc:subject>`
      }
    }

    if (metadata.rights) {
      metadataXML += `\n    <dc:rights>${this.escapeXml(metadata.rights)}</dc:rights>`
    }

    metadataXML += `\n    <meta property="dcterms:modified">${modifiedDate}</meta>`

    if (coverImage) {
      metadataXML += `\n    <meta name="cover" content="cover-image"/>`
    }

    metadataXML += `\n  </metadata>`

    // Build manifest section
    let manifestXML = `  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="stylesheet" href="stylesheet.css" media-type="text/css"/>`

    if (coverImage) {
      manifestXML += `\n    <item id="cover-image" href="cover.${coverImage.extension}" media-type="${coverImage.mimeType}" properties="cover-image"/>
    <item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>`
    }

    for (const chapter of chapters) {
      manifestXML += `\n    <item id="${chapter.id}" href="${chapter.id}.xhtml" media-type="application/xhtml+xml"/>`
    }

    manifestXML += `\n  </manifest>`

    // Build spine section
    let spineXML = `  <spine>`

    if (coverImage) {
      spineXML += `\n    <itemref idref="cover"/>`
    }

    // Sort chapters by order
    const sortedChapters = [...chapters].sort((a, b) => a.order - b.order)
    for (const chapter of sortedChapters) {
      spineXML += `\n    <itemref idref="${chapter.id}"/>`
    }

    spineXML += `\n  </spine>`

    // Combine all sections
    const contentOPF = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">
${metadataXML}
${manifestXML}
${spineXML}
</package>`

    this.zip.folder('OEBPS')?.file('content.opf', contentOPF)
  }

  /**
   * Add OEBPS/nav.xhtml (Navigation Document)
   */
  private addNavigationDocument(): void {
    const { metadata, chapters, coverImage } = this.options
    const sortedChapters = [...chapters].sort((a, b) => a.order - b.order)

    let tocItems = ''

    if (coverImage) {
      tocItems += `      <li><a href="cover.xhtml">Cover</a></li>\n`
    }

    for (const chapter of sortedChapters) {
      tocItems += `      <li><a href="${chapter.id}.xhtml">${this.escapeXml(chapter.title)}</a></li>\n`
    }

    const navXHTML = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>${this.escapeXml(metadata.title)} - Table of Contents</title>
  <meta charset="UTF-8"/>
  <link rel="stylesheet" type="text/css" href="stylesheet.css"/>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>Table of Contents</h1>
    <ol>
${tocItems}    </ol>
  </nav>
</body>
</html>`

    this.zip.folder('OEBPS')?.file('nav.xhtml', navXHTML)
  }

  /**
   * Add OEBPS/stylesheet.css
   */
  private addStylesheet(): void {
    const stylesheet = `/* EPUB 3.0 Stylesheet */

body {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 1em;
  line-height: 1.6;
  margin: 1.5em;
  text-align: justify;
}

h1 {
  font-size: 2em;
  font-weight: bold;
  margin: 1em 0 0.5em;
  text-align: left;
  page-break-before: always;
}

h2 {
  font-size: 1.5em;
  font-weight: bold;
  margin: 1em 0 0.5em;
  text-align: left;
}

h3 {
  font-size: 1.2em;
  font-weight: bold;
  margin: 1em 0 0.5em;
  text-align: left;
}

p {
  margin: 0 0 1em;
  text-indent: 1.5em;
}

p:first-of-type,
p.no-indent {
  text-indent: 0;
}

.author {
  text-align: center;
  font-style: italic;
  margin: 0.5em 0 2em;
  text-indent: 0;
}

.center {
  text-align: center;
  text-indent: 0;
}

.scene-break {
  text-align: center;
  margin: 1em 0;
  text-indent: 0;
}

/* Navigation */
nav#toc h1 {
  text-align: center;
  page-break-before: auto;
}

nav#toc ol {
  list-style-type: none;
  padding: 0;
}

nav#toc li {
  margin: 0.5em 0;
}

nav#toc a {
  text-decoration: none;
  color: inherit;
}

/* Cover page */
.cover-image {
  text-align: center;
  margin: 0;
  padding: 0;
}

.cover-image img {
  max-width: 100%;
  max-height: 100%;
}

/* Responsive */
@media screen and (max-width: 600px) {
  body {
    margin: 1em;
    font-size: 0.9em;
  }

  h1 {
    font-size: 1.5em;
  }

  h2 {
    font-size: 1.3em;
  }
}`

    this.zip.folder('OEBPS')?.file('stylesheet.css', stylesheet)
  }

  /**
   * Add cover image and cover page
   */
  private async addCoverImage(): Promise<void> {
    const { coverImage, metadata } = this.options

    if (!coverImage) return

    // Add cover image file
    this.zip.folder('OEBPS')?.file(`cover.${coverImage.extension}`, coverImage.data)

    // Add cover.xhtml
    const coverXHTML = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>${this.escapeXml(metadata.title)} - Cover</title>
  <meta charset="UTF-8"/>
  <link rel="stylesheet" type="text/css" href="stylesheet.css"/>
</head>
<body>
  <div class="cover-image">
    <img src="cover.${coverImage.extension}" alt="${this.escapeXml(metadata.title)} - Cover" />
  </div>
</body>
</html>`

    this.zip.folder('OEBPS')?.file('cover.xhtml', coverXHTML)
  }

  /**
   * Add all chapter files
   */
  private addChapters(): void {
    const { chapters, metadata } = this.options

    for (const chapter of chapters) {
      const chapterXHTML = this.createChapterXHTML(chapter, metadata.title)
      this.zip.folder('OEBPS')?.file(`${chapter.id}.xhtml`, chapterXHTML)
    }
  }

  /**
   * Create XHTML for a single chapter
   */
  private createChapterXHTML(chapter: EPUBChapter, bookTitle: string): string {
    // Clean and prepare HTML content
    let cleanContent = chapter.content.trim()

    // Wrap plain paragraphs in <p> tags if needed
    if (!cleanContent.startsWith('<')) {
      const paragraphs = cleanContent.split('\n\n').filter(p => p.trim())
      cleanContent = paragraphs.map(p => `    <p>${this.escapeXml(p.trim())}</p>`).join('\n')
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>${this.escapeXml(bookTitle)} - ${this.escapeXml(chapter.title)}</title>
  <meta charset="UTF-8"/>
  <link rel="stylesheet" type="text/css" href="stylesheet.css"/>
</head>
<body>
  <section epub:type="chapter" id="${chapter.id}">
    <h1>${this.escapeXml(chapter.title)}</h1>
${cleanContent}
  </section>
</body>
</html>`
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }
}

/**
 * Export document to EPUB 3.0
 */
export async function exportToEPUB(options: EPUBOptions): Promise<Blob> {
  const generator = new EPUBGenerator(options)
  return await generator.generate()
}

/**
 * Download EPUB file
 */
export function downloadEPUB(blob: Blob, filename: string): void {
  const cleanFilename = filename.endsWith('.epub') ? filename : `${filename}.epub`
  saveAs(blob, cleanFilename)
}

/**
 * Validate EPUB structure (basic validation)
 */
export function validateEPUBOptions(options: EPUBOptions): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!options.metadata?.title?.trim()) {
    errors.push('Title is required')
  }

  if (!options.chapters || options.chapters.length === 0) {
    errors.push('At least one chapter is required')
  }

  if (options.chapters) {
    const ids = new Set<string>()
    options.chapters.forEach((chapter, index) => {
      if (!chapter.id?.trim()) {
        errors.push(`Chapter ${index + 1} is missing an ID`)
      } else if (ids.has(chapter.id)) {
        errors.push(`Duplicate chapter ID: ${chapter.id}`)
      } else {
        ids.add(chapter.id)
      }

      if (!chapter.title?.trim()) {
        errors.push(`Chapter ${index + 1} (${chapter.id}) is missing a title`)
      }

      if (chapter.order === undefined || chapter.order === null) {
        errors.push(`Chapter ${index + 1} (${chapter.id}) is missing an order`)
      }
    })
  }

  if (options.coverImage) {
    const validTypes: Array<EPUBCoverImage['mimeType']> = ['image/jpeg', 'image/png']
    if (!validTypes.includes(options.coverImage.mimeType)) {
      errors.push('Cover image must be JPEG or PNG')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
