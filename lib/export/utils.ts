import jsPDF from 'jspdf'
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } from 'docx'
import { saveAs } from 'file-saver'

export type ExportFormat = 'pdf' | 'docx' | 'markdown' | 'txt' | 'fountain' | 'fdx'

export interface ExportOptions {
  format: ExportFormat
  title: string
  content: string | any[] // HTML string for prose, screenplay array for screenplay
  author?: string
  isScreenplay?: boolean
}

/**
 * Strip HTML tags and return plain text
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Export document as PDF
 */
export async function exportToPDF(options: ExportOptions): Promise<void> {
  const { title, content, author, isScreenplay } = options

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 72 // 1 inch margin
  const maxWidth = pageWidth - margin * 2
  let y = margin

  // Title page
  doc.setFontSize(24)
  doc.text(title, pageWidth / 2, pageHeight / 3, { align: 'center' })

  if (author) {
    doc.setFontSize(14)
    doc.text(`by ${author}`, pageWidth / 2, pageHeight / 3 + 40, { align: 'center' })
  }

  doc.addPage()
  y = margin

  if (isScreenplay && Array.isArray(content)) {
    // Screenplay formatting
    doc.setFontSize(12)
    doc.setFont('courier')

    for (const element of content) {
      const { type, content: text } = element

      if (y > pageHeight - margin) {
        doc.addPage()
        y = margin
      }

      let indent = margin
      const textWidth = maxWidth

      switch (type) {
        case 'scene':
          doc.setFont('courier', 'bold')
          indent = margin
          break
        case 'action':
          doc.setFont('courier', 'normal')
          indent = margin
          break
        case 'character':
          doc.setFont('courier', 'bold')
          indent = margin + 180
          break
        case 'dialogue':
          doc.setFont('courier', 'normal')
          indent = margin + 90
          break
        case 'parenthetical':
          doc.setFont('courier', 'italic')
          indent = margin + 120
          break
        case 'transition':
          doc.setFont('courier', 'bold')
          indent = pageWidth - margin - 200
          break
      }

      const lines = doc.splitTextToSize(text, textWidth - (indent - margin))
      doc.text(lines, indent, y)
      y += lines.length * 14 + 8
    }
  } else {
    // Prose formatting
    const plainText = typeof content === 'string' ? stripHtml(content) : ''
    doc.setFontSize(12)
    doc.setFont('times', 'normal')

    const lines = doc.splitTextToSize(plainText, maxWidth)

    for (const line of lines) {
      if (y > pageHeight - margin) {
        doc.addPage()
        y = margin
      }
      doc.text(line, margin, y)
      y += 16
    }
  }

  doc.save(`${title}.pdf`)
}

/**
 * Export document as DOCX
 */
export async function exportToDOCX(options: ExportOptions): Promise<void> {
  const { title, content, author, isScreenplay } = options

  const children: Paragraph[] = []

  // Title page
  children.push(
    new Paragraph({
      text: title,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  )

  if (author) {
    children.push(
      new Paragraph({
        text: `by ${author}`,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      })
    )
  }

  children.push(
    new Paragraph({
      text: '',
      pageBreakBefore: true,
    })
  )

  if (isScreenplay && Array.isArray(content)) {
    // Screenplay formatting
    for (const element of content) {
      const { type, content: text } = element

      let indent = 0
      let alignment = AlignmentType.LEFT
      let bold = false

      switch (type) {
        case 'scene':
          bold = true
          break
        case 'character':
          indent = 2160 // 3 inches
          bold = true
          break
        case 'dialogue':
          indent = 1080 // 1.5 inches
          break
        case 'parenthetical':
          indent = 1440 // 2 inches
          break
        case 'transition':
          alignment = AlignmentType.RIGHT
          bold = true
          break
      }

      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: text,
              font: 'Courier New',
              size: 24, // 12pt
              bold,
            }),
          ],
          indent: { left: indent },
          alignment,
          spacing: { after: 120 },
        })
      )
    }
  } else {
    // Prose formatting
    const plainText = typeof content === 'string' ? stripHtml(content) : ''
    const paragraphs = plainText.split('\n\n')

    for (const para of paragraphs) {
      if (para.trim()) {
        children.push(
          new Paragraph({
            text: para.trim(),
            spacing: { after: 240 },
          })
        )
      }
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  })

  const blob = await Packer.toBlob(doc)
  saveAs(blob, `${title}.docx`)
}

/**
 * Export document as Markdown
 */
export function exportToMarkdown(options: ExportOptions): void {
  const { title, content, author, isScreenplay } = options

  let markdown = `# ${title}\n\n`

  if (author) {
    markdown += `**by ${author}**\n\n---\n\n`
  }

  if (isScreenplay && Array.isArray(content)) {
    // Screenplay to markdown
    for (const element of content) {
      const { type, content: text } = element

      switch (type) {
        case 'scene':
          markdown += `\n### ${text}\n\n`
          break
        case 'action':
          markdown += `${text}\n\n`
          break
        case 'character':
          markdown += `**${text}**\n\n`
          break
        case 'dialogue':
          markdown += `> ${text}\n\n`
          break
        case 'parenthetical':
          markdown += `*(${text})*\n\n`
          break
        case 'transition':
          markdown += `*${text}*\n\n`
          break
      }
    }
  } else {
    // Prose to markdown (keep basic HTML structure)
    const plainText = typeof content === 'string' ? stripHtml(content) : ''
    markdown += plainText
  }

  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
  saveAs(blob, `${title}.md`)
}

/**
 * Export document as plain text
 */
export function exportToTXT(options: ExportOptions): void {
  const { title, content, author, isScreenplay } = options

  let text = `${title}\n`
  if (author) {
    text += `by ${author}\n`
  }
  text += `\n${'='.repeat(50)}\n\n`

  if (isScreenplay && Array.isArray(content)) {
    for (const element of content) {
      text += `${element.content}\n\n`
    }
  } else {
    const plainText = typeof content === 'string' ? stripHtml(content) : ''
    text += plainText
  }

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  saveAs(blob, `${title}.txt`)
}

/**
 * Export screenplay as Fountain format
 */
export function exportToFountain(options: ExportOptions): void {
  const { title, content, author } = options

  if (!Array.isArray(content)) {
    throw new Error('Fountain export only supports screenplay format')
  }

  let fountain = `Title: ${title}\n`
  if (author) {
    fountain += `Author: ${author}\n`
  }
  fountain += `\n`

  for (const element of content) {
    const { type, content: text } = element

    switch (type) {
      case 'scene':
        fountain += `${text}\n\n`
        break
      case 'action':
        fountain += `${text}\n\n`
        break
      case 'character':
        fountain += `${text.toUpperCase()}\n`
        break
      case 'dialogue':
        fountain += `${text}\n\n`
        break
      case 'parenthetical':
        fountain += `(${text})\n`
        break
      case 'transition':
        fountain += `${text.toUpperCase()}\n\n`
        break
    }
  }

  const blob = new Blob([fountain], { type: 'text/plain;charset=utf-8' })
  saveAs(blob, `${title}.fountain`)
}

/**
 * Export screenplay as Final Draft XML (.fdx)
 */
export function exportToFDX(options: ExportOptions): void {
  const { title, content, author } = options

  if (!Array.isArray(content)) {
    throw new Error('FDX export only supports screenplay format')
  }

  let fdx = `<?xml version="1.0" encoding="UTF-8"?>
<FinalDraft DocumentType="Script" Template="No" Version="1">
  <Content>
    <TitlePage>
      <Content>
        <Paragraph Type="Title">
          <Text>${escapeXml(title)}</Text>
        </Paragraph>`

  if (author) {
    fdx += `
        <Paragraph Type="Authors">
          <Text>by</Text>
        </Paragraph>
        <Paragraph Type="Authors">
          <Text>${escapeXml(author)}</Text>
        </Paragraph>`
  }

  fdx += `
      </Content>
    </TitlePage>
    <Body>`

  for (const element of content) {
    const { type, content: text } = element

    let fdxType = 'Action'
    switch (type) {
      case 'scene':
        fdxType = 'Scene Heading'
        break
      case 'action':
        fdxType = 'Action'
        break
      case 'character':
        fdxType = 'Character'
        break
      case 'dialogue':
        fdxType = 'Dialogue'
        break
      case 'parenthetical':
        fdxType = 'Parenthetical'
        break
      case 'transition':
        fdxType = 'Transition'
        break
    }

    fdx += `
      <Paragraph Type="${fdxType}">
        <Text>${escapeXml(text)}</Text>
      </Paragraph>`
  }

  fdx += `
    </Body>
  </Content>
</FinalDraft>`

  const blob = new Blob([fdx], { type: 'application/xml;charset=utf-8' })
  saveAs(blob, `${title}.fdx`)
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Main export function that routes to the appropriate exporter
 */
export async function exportDocument(options: ExportOptions): Promise<void> {
  switch (options.format) {
    case 'pdf':
      return exportToPDF(options)
    case 'docx':
      return exportToDOCX(options)
    case 'markdown':
      return exportToMarkdown(options)
    case 'txt':
      return exportToTXT(options)
    case 'fountain':
      return exportToFountain(options)
    case 'fdx':
      return exportToFDX(options)
    default:
      throw new Error(`Unsupported export format: ${options.format}`)
  }
}
