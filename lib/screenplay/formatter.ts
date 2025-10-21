/**
 * Screenplay Formatting Engine
 * Industry-standard screenplay formatting (Final Draft/Fountain compatible)
 *
 * Standard Format:
 * - Scene Headings: ALL CAPS, margin left 1.5"
 * - Action: margin left 1.5", right 7.5"
 * - Character: ALL CAPS, margin left 3.7"
 * - Dialogue: margin left 2.5", right 6.0"
 * - Parenthetical: margin left 3.1", right 5.7"
 * - Transition: ALL CAPS, margin left 6.0", right aligned
 *
 * Page: 8.5" x 11", Courier 12pt
 */

export type ScreenplayElementType =
  | 'scene-heading'
  | 'action'
  | 'character'
  | 'dialogue'
  | 'parenthetical'
  | 'transition'
  | 'note'

export type ScreenplayElement = {
  type: ScreenplayElementType
  text: string
  dualDialogue?: boolean // For dual dialogue formatting
}

export type ScreenplayMargins = {
  left: number // inches
  right: number // inches
  top?: number // inches
  bottom?: number // inches
}

// Industry-standard margins (in inches)
export const SCREENPLAY_MARGINS: Record<ScreenplayElementType, ScreenplayMargins> = {
  'scene-heading': { left: 1.5, right: 7.5, top: 0.5, bottom: 0.5 },
  action: { left: 1.5, right: 7.5 },
  character: { left: 3.7, right: 7.5 },
  dialogue: { left: 2.5, right: 6.0 },
  parenthetical: { left: 3.1, right: 5.7 },
  transition: { left: 6.0, right: 7.5 },
  note: { left: 1.5, right: 7.5 },
}

// Scene heading patterns
const SCENE_HEADING_PATTERNS = [
  /^(INT|EXT|INT\.\/EXT|EXT\.\/INT|I\/E|E\/I)\./i,
  /^(INTERIOR|EXTERIOR)/i,
]

// Transition patterns
const TRANSITION_PATTERNS = [
  /^(FADE IN:|FADE OUT\.|CUT TO:|DISSOLVE TO:|MATCH CUT TO:)$/i,
  /^(FADE TO BLACK\.|SMASH CUT TO:|JUMP CUT TO:)$/i,
  /^(WIPE TO:|IRIS IN:|IRIS OUT:)$/i,
]

// Common transitions
export const COMMON_TRANSITIONS = [
  'FADE IN:',
  'FADE OUT.',
  'CUT TO:',
  'DISSOLVE TO:',
  'MATCH CUT TO:',
  'SMASH CUT TO:',
  'JUMP CUT TO:',
  'FADE TO BLACK.',
  'WIPE TO:',
]

/**
 * Detect element type from text content
 */
export function detectElementType(text: string, previousType?: ScreenplayElementType): ScreenplayElementType {
  const trimmed = text.trim()

  // Empty line or whitespace
  if (!trimmed) return 'action'

  // Scene heading (INT./EXT.)
  if (SCENE_HEADING_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return 'scene-heading'
  }

  // Transition (ALL CAPS ending with : or .)
  if (TRANSITION_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return 'transition'
  }

  // Character name (ALL CAPS, optionally with (V.O.) or (O.S.))
  if (/^[A-Z][A-Z\s'.]+(\s+\([A-Z.]+\))?$/.test(trimmed) && trimmed.length < 40) {
    return 'character'
  }

  // Parenthetical (wrapped in parentheses)
  if (/^\(.+\)$/.test(trimmed)) {
    return 'parenthetical'
  }

  // Dialogue (follows character or parenthetical)
  if (previousType === 'character' || previousType === 'parenthetical' || previousType === 'dialogue') {
    return 'dialogue'
  }

  // Default to action
  return 'action'
}

/**
 * Auto-format text based on detected type
 */
export function autoFormatElement(text: string, type: ScreenplayElementType): string {
  const trimmed = text.trim()

  switch (type) {
    case 'scene-heading':
      return trimmed.toUpperCase()

    case 'character':
      // Remove extra spaces, convert to uppercase
      return trimmed.replace(/\s+/g, ' ').toUpperCase()

    case 'transition':
      return trimmed.toUpperCase()

    case 'dialogue':
    case 'action':
    case 'parenthetical':
    case 'note':
      // Keep original case
      return trimmed

    default:
      return trimmed
  }
}

/**
 * Parse screenplay text into elements
 */
export function parseScreenplay(text: string): ScreenplayElement[] {
  const lines = text.split('\n')
  const elements: ScreenplayElement[] = []
  let previousType: ScreenplayElementType | undefined

  for (const line of lines) {
    const trimmed = line.trim()

    // Skip completely empty lines (they become action breaks)
    if (!trimmed) {
      if (elements.length > 0 && elements[elements.length - 1].type !== 'action') {
        elements.push({ type: 'action', text: '' })
      }
      previousType = undefined
      continue
    }

    const type = detectElementType(trimmed, previousType)
    const formatted = autoFormatElement(trimmed, type)

    elements.push({ type, text: formatted })
    previousType = type
  }

  return elements
}

/**
 * Convert elements back to text
 */
export function elementsToText(elements: ScreenplayElement[]): string {
  return elements.map((el) => el.text).join('\n')
}

/**
 * Format element for display (with margins)
 */
export function formatElementForDisplay(element: ScreenplayElement): {
  text: string
  marginLeft: number
  marginRight: number
  fontWeight?: 'normal' | 'bold'
  textTransform?: 'uppercase' | 'none'
} {
  const margins = SCREENPLAY_MARGINS[element.type]

  return {
    text: element.text,
    marginLeft: margins.left,
    marginRight: 8.5 - margins.right, // Page width - right margin
    fontWeight: element.type === 'scene-heading' ? 'bold' : 'normal',
    textTransform: ['scene-heading', 'character', 'transition'].includes(element.type) ? 'uppercase' : 'none',
  }
}

/**
 * Extract character names from screenplay
 */
export function extractCharacterNames(elements: ScreenplayElement[]): string[] {
  const names = new Set<string>()

  for (const element of elements) {
    if (element.type === 'character') {
      // Remove (V.O.), (O.S.), etc.
      const cleanName = element.text.replace(/\s+\([^)]+\)$/, '').trim()
      names.add(cleanName)
    }
  }

  return Array.from(names).sort()
}

/**
 * Get autocomplete suggestions for character names
 */
export function getCharacterSuggestions(
  input: string,
  existingCharacters: string[]
): string[] {
  const upperInput = input.toUpperCase()

  return existingCharacters
    .filter((name) => name.startsWith(upperInput))
    .slice(0, 10)
}

/**
 * Insert character extension (V.O., O.S., CONT'D)
 */
export function addCharacterExtension(
  characterName: string,
  extension: 'V.O.' | 'O.S.' | "CONT'D"
): string {
  // Remove existing extension if present
  const cleanName = characterName.replace(/\s+\([^)]+\)$/, '').trim()
  return `${cleanName} (${extension})`
}

/**
 * Validate screenplay formatting
 */
export function validateScreenplay(elements: ScreenplayElement[]): {
  valid: boolean
  errors: Array<{ line: number; message: string }>
} {
  const errors: Array<{ line: number; message: string }> = []

  elements.forEach((element, index) => {
    const lineNum = index + 1

    // Check for dialogue without character
    if (element.type === 'dialogue') {
      const previousElement = elements[index - 1]
      if (!previousElement || (previousElement.type !== 'character' && previousElement.type !== 'parenthetical')) {
        errors.push({
          line: lineNum,
          message: 'Dialogue must follow a character name or parenthetical',
        })
      }
    }

    // Check for orphaned parenthetical
    if (element.type === 'parenthetical') {
      const previousElement = elements[index - 1]
      if (!previousElement || (previousElement.type !== 'character' && previousElement.type !== 'dialogue')) {
        errors.push({
          line: lineNum,
          message: 'Parenthetical must follow a character name or dialogue',
        })
      }
    }

    // Check scene heading format
    if (element.type === 'scene-heading') {
      if (!SCENE_HEADING_PATTERNS.some((pattern) => pattern.test(element.text))) {
        errors.push({
          line: lineNum,
          message: 'Scene heading should start with INT., EXT., INT./EXT., or I/E',
        })
      }
    }
  })

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Count screenplay pages (approximate)
 * Industry standard: ~55 lines per page
 */
export function estimatePageCount(elements: ScreenplayElement[]): number {
  let lineCount = 0

  for (const element of elements) {
    switch (element.type) {
      case 'scene-heading': {
        lineCount += 2 // Scene heading + blank line
        break
      }
      case 'action': {
        // Count wrapped lines (assuming ~60 chars per line)
        const actionLines = Math.ceil(element.text.length / 60)
        lineCount += actionLines + 1 // + blank line
        break
      }
      case 'character': {
        lineCount += 1
        break
      }
      case 'dialogue': {
        // Dialogue is narrower, ~35 chars per line
        const dialogueLines = Math.ceil(element.text.length / 35)
        lineCount += dialogueLines
        break
      }
      case 'parenthetical': {
        lineCount += 1
        break
      }
      case 'transition': {
        lineCount += 2 // Transition + blank line
        break
      }
      default: {
        lineCount += 1
      }
    }
  }

  // Industry standard: ~55 lines per page
  return Math.ceil(lineCount / 55)
}
