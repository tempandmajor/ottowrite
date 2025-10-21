/**
 * Screenplay PDF Export
 * Industry-standard screenplay formatting for PDF export
 * Compatible with Final Draft, Celtx, and other industry tools
 */

import type { ScreenplayElement } from '@/lib/screenplay/formatter'
import { SCREENPLAY_MARGINS } from '@/lib/screenplay/formatter'

// PDF dimensions (in points, 72 points = 1 inch)
const PAGE_WIDTH = 8.5 * 72 // 612 points
const PAGE_HEIGHT = 11 * 72 // 792 points
const FONT_SIZE = 12
const LINE_HEIGHT = 12 * 1.5 // 18 points (1.5x font size)

type PDFLine = {
  text: string
  x: number
  y: number
  fontSize: number
  fontWeight: 'normal' | 'bold'
  uppercase: boolean
}

/**
 * Generate screenplay PDF content
 * This returns a data structure that can be used with jsPDF or similar libraries
 */
export function generateScreenplayPDF(
  elements: ScreenplayElement[],
  options: {
    title?: string
    author?: string
    contact?: string
  } = {}
): {
  title?: string
  author?: string
  contact?: string
  pages: PDFLine[][]
  pageCount: number
} {
  const lines: PDFLine[] = []
  let currentY = 72 // Start 1 inch from top

  // Title page (if title provided)
  if (options.title) {
    lines.push({
      text: options.title,
      x: PAGE_WIDTH / 2,
      y: PAGE_HEIGHT / 2 - 50,
      fontSize: 14,
      fontWeight: 'bold',
      uppercase: true,
    })

    if (options.author) {
      lines.push({
        text: `by`,
        x: PAGE_WIDTH / 2,
        y: PAGE_HEIGHT / 2 - 20,
        fontSize: 12,
        fontWeight: 'normal',
        uppercase: false,
      })
      lines.push({
        text: options.author,
        x: PAGE_WIDTH / 2,
        y: PAGE_HEIGHT / 2,
        fontSize: 12,
        fontWeight: 'normal',
        uppercase: false,
      })
    }

    if (options.contact) {
      lines.push({
        text: options.contact,
        x: 72,
        y: PAGE_HEIGHT - 72,
        fontSize: 10,
        fontWeight: 'normal',
        uppercase: false,
      })
    }

    // Start screenplay on page 2
    currentY = 72
  }

  // Process each element
  for (const element of elements) {
    const margins = SCREENPLAY_MARGINS[element.type]
    const leftMargin = margins.left * 72
    const rightMargin = margins.right * 72
    const maxWidth = rightMargin - leftMargin

    // Check if we need a new page
    if (currentY > PAGE_HEIGHT - 72) {
      // Add page break marker
      lines.push({
        text: '__PAGE_BREAK__',
        x: 0,
        y: currentY,
        fontSize: 0,
        fontWeight: 'normal',
        uppercase: false,
      })
      currentY = 72
    }

    // Add spacing before certain elements
    if (element.type === 'scene-heading') {
      currentY += LINE_HEIGHT // Extra space before scene heading
    }

    // Word wrap the text
    const wrappedLines = wrapText(element.text, maxWidth, FONT_SIZE)

    for (const line of wrappedLines) {
      // Right-align transitions
      const x = element.type === 'transition'
        ? rightMargin - getTextWidth(line, FONT_SIZE)
        : leftMargin

      lines.push({
        text: line,
        x,
        y: currentY,
        fontSize: FONT_SIZE,
        fontWeight: element.type === 'scene-heading' ? 'bold' : 'normal',
        uppercase: ['scene-heading', 'character', 'transition'].includes(element.type),
      })

      currentY += LINE_HEIGHT
    }

    // Add spacing after certain elements
    if (element.type === 'scene-heading' || element.type === 'transition' || element.type === 'action') {
      currentY += LINE_HEIGHT / 2 // Half line break
    }
  }

  // Split into pages
  const pages: PDFLine[][] = []
  let currentPage: PDFLine[] = []

  for (const line of lines) {
    if (line.text === '__PAGE_BREAK__') {
      if (currentPage.length > 0) {
        pages.push(currentPage)
        currentPage = []
      }
    } else {
      currentPage.push(line)
    }
  }

  if (currentPage.length > 0) {
    pages.push(currentPage)
  }

  return {
    title: options.title,
    author: options.author,
    contact: options.contact,
    pages,
    pageCount: pages.length,
  }
}

/**
 * Word wrap text to fit within max width
 */
function wrapText(text: string, maxWidth: number, fontSize: number): string[] {
  if (!text.trim()) return ['']

  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    const testWidth = getTextWidth(testLine, fontSize)

    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = testLine
    }
  }

  if (currentLine) {
    lines.push(currentLine)
  }

  return lines.length > 0 ? lines : ['']
}

/**
 * Calculate text width for Courier font (monospace)
 * Courier average character width: ~0.6 * font size
 */
function getTextWidth(text: string, fontSize: number): number {
  return text.length * fontSize * 0.6
}

/**
 * Export to Fountain format (.fountain)
 * Fountain is a plain-text markup language for screenplays
 */
export function exportToFountain(elements: ScreenplayElement[]): string {
  const lines: string[] = []

  for (let i = 0; i < elements.length; i++) {
    const element = elements[i]
    const previousElement = i > 0 ? elements[i - 1] : null

    // Add blank line before scene headings and transitions
    if ((element.type === 'scene-heading' || element.type === 'transition') && previousElement) {
      lines.push('')
    }

    switch (element.type) {
      case 'scene-heading':
        // Fountain: Scene headings start with INT, EXT, INT./EXT, or I/E
        lines.push(element.text)
        break

      case 'action':
        // Fountain: Action is regular text
        lines.push(element.text)
        break

      case 'character':
        // Fountain: Character names are preceded by a blank line and ALL CAPS
        if (previousElement && previousElement.type !== 'character') {
          lines.push('')
        }
        lines.push(element.text)
        break

      case 'dialogue':
        // Fountain: Dialogue follows character name
        lines.push(element.text)
        break

      case 'parenthetical':
        // Fountain: Parentheticals are wrapped in ()
        lines.push(element.text)
        break

      case 'transition':
        // Fountain: Transitions end with TO: and are preceded by >
        lines.push(`> ${element.text}`)
        break

      default:
        lines.push(element.text)
    }
  }

  return lines.join('\n')
}

/**
 * Import from Fountain format
 */
export function importFromFountain(fountainText: string): ScreenplayElement[] {
  const lines = fountainText.split('\n')
  const elements: ScreenplayElement[] = []
  let previousType: string | undefined

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // Skip blank lines (they're used for formatting)
    if (!trimmed) {
      previousType = undefined
      continue
    }

    // Detect element type
    let type: ScreenplayElement['type'] = 'action'

    // Transition (starts with >)
    if (trimmed.startsWith('>')) {
      type = 'transition'
      elements.push({
        type,
        text: trimmed.substring(1).trim(),
      })
    }
    // Scene heading
    else if (/^(INT|EXT|INT\.\/EXT|EXT\.\/INT|I\/E|E\/I)\./i.test(trimmed)) {
      type = 'scene-heading'
      elements.push({ type, text: trimmed })
    }
    // Character (ALL CAPS, not following dialogue)
    else if (/^[A-Z][A-Z\s'.]+(\s+\([A-Z.]+\))?$/.test(trimmed) && trimmed.length < 40 && previousType !== 'dialogue') {
      type = 'character'
      elements.push({ type, text: trimmed })
    }
    // Parenthetical
    else if (/^\(.+\)$/.test(trimmed)) {
      type = 'parenthetical'
      elements.push({ type, text: trimmed })
    }
    // Dialogue (follows character or parenthetical)
    else if (previousType === 'character' || previousType === 'parenthetical' || previousType === 'dialogue') {
      type = 'dialogue'
      elements.push({ type, text: trimmed })
    }
    // Default to action
    else {
      type = 'action'
      elements.push({ type, text: trimmed })
    }

    previousType = type
  }

  return elements
}

/**
 * Generate PDF metadata for jsPDF
 */
export function generatePDFMetadata(options: {
  title?: string
  author?: string
}) {
  return {
    title: options.title || 'Untitled Screenplay',
    author: options.author || 'Unknown',
    subject: 'Screenplay',
    keywords: 'screenplay, script, film',
    creator: 'OttoWrite',
  }
}
