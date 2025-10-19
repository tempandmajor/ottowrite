import { diffWords, type Change } from 'diff'

/**
 * Strip HTML tags and decode HTML entities for plain text comparison.
 * Works in both browser and server environments.
 *
 * @param html - HTML string to strip
 * @param preserveWhitespace - Whether to preserve multiple spaces (default: false)
 * @returns Plain text content
 */
export function stripHtml(html: string, preserveWhitespace: boolean = false): string {
  // Server-side or basic HTML stripping
  let text = html
    // Remove script and style tags entirely
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    // Remove all HTML tags
    .replace(/<[^>]+>/g, ' ')
    // Decode common HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")

  // Normalize whitespace unless preserving
  if (!preserveWhitespace) {
    text = text.replace(/\s+/g, ' ')
  }

  return text.trim()
}

/**
 * Strip HTML using browser DOM for more accurate parsing.
 * Falls back to regex-based stripping if DOM is unavailable.
 *
 * @param html - HTML string to strip
 * @returns Plain text content
 */
export function stripHtmlWithDOM(html: string): string {
  // Browser environment - use DOM for accurate parsing
  if (typeof document !== 'undefined') {
    const tmp = document.createElement('div')
    tmp.innerHTML = html
    return tmp.textContent || tmp.innerText || ''
  }

  // Fallback to regex-based stripping
  return stripHtml(html)
}

/**
 * Split text into sentences based on common sentence terminators.
 *
 * @param text - Text to split
 * @returns Array of sentences
 */
export function splitSentences(text: string): string[] {
  return text
    .split(/[.!?]+\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/**
 * Count words in text, excluding empty strings.
 *
 * @param text - Text to count words in
 * @returns Word count
 */
export function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0).length
}

/**
 * Compute word-level diff between two texts.
 *
 * @param oldText - Original text
 * @param newText - New text to compare
 * @returns Array of diff changes
 */
export function computeWordDiff(oldText: string, newText: string): Change[] {
  return diffWords(oldText, newText)
}

/**
 * Statistics about changes between two texts.
 */
export interface DiffStats {
  /** Number of words added */
  additions: number
  /** Number of words removed */
  deletions: number
  /** Number of unchanged words */
  unchanged: number
  /** Total changes (additions + deletions) */
  totalChanges: number
  /** Percentage of text changed (0-100) */
  changePercentage: number
}

/**
 * Calculate statistics from a diff result.
 *
 * @param diff - Diff result from computeWordDiff
 * @returns Statistics about the changes
 */
export function calculateDiffStats(diff: Change[]): DiffStats {
  let additions = 0
  let deletions = 0
  let unchanged = 0

  diff.forEach((part) => {
    const wordCount = countWords(part.value)

    if (part.added) {
      additions += wordCount
    } else if (part.removed) {
      deletions += wordCount
    } else {
      unchanged += wordCount
    }
  })

  const totalWords = additions + deletions + unchanged
  const totalChanges = additions + deletions
  const changePercentage = totalWords > 0 ? (totalChanges / totalWords) * 100 : 0

  return {
    additions,
    deletions,
    unchanged,
    totalChanges,
    changePercentage,
  }
}

/**
 * Compare two HTML documents and return diff with statistics.
 * Strips HTML before comparison for accurate text-based diffing.
 *
 * @param oldHtml - Original HTML content
 * @param newHtml - New HTML content
 * @param useDOMParsing - Use DOM-based HTML stripping (browser only)
 * @returns Diff changes and statistics
 */
export function compareHtmlDocuments(
  oldHtml: string,
  newHtml: string,
  useDOMParsing: boolean = false
): { diff: Change[]; stats: DiffStats } {
  const stripFn = useDOMParsing ? stripHtmlWithDOM : stripHtml
  const oldText = stripFn(oldHtml)
  const newText = stripFn(newHtml)
  const diff = computeWordDiff(oldText, newText)
  const stats = calculateDiffStats(diff)

  return { diff, stats }
}

/**
 * Render diff as colored text for terminal/logging.
 *
 * @param diff - Diff result from computeWordDiff
 * @returns Formatted string with ANSI colors
 */
export function renderDiffForTerminal(diff: Change[]): string {
  // ANSI color codes
  const RESET = '\x1b[0m'
  const GREEN = '\x1b[32m'
  const RED = '\x1b[31m'

  return diff
    .map((part) => {
      if (part.added) {
        return `${GREEN}+${part.value}${RESET}`
      }
      if (part.removed) {
        return `${RED}-${part.value}${RESET}`
      }
      return part.value
    })
    .join('')
}

/**
 * Check if two HTML documents are significantly different.
 *
 * @param oldHtml - Original HTML
 * @param newHtml - New HTML
 * @param threshold - Minimum percentage change to be considered different (default: 1%)
 * @returns True if documents differ by more than threshold
 */
export function hasSignificantChanges(
  oldHtml: string,
  newHtml: string,
  threshold: number = 1
): boolean {
  const { stats } = compareHtmlDocuments(oldHtml, newHtml)
  return stats.changePercentage >= threshold
}
