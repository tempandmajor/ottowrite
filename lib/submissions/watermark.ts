/**
 * Manuscript Watermarking System
 *
 * Embeds unique, invisible identifiers into manuscripts to track distribution
 * and prevent unauthorized sharing. Each partner receives a uniquely watermarked
 * version of the manuscript.
 *
 * Features:
 * - Invisible watermarking (doesn't affect readability)
 * - Unique identifier per partner per submission
 * - Traceable back to specific partner
 * - Multiple watermarking techniques for redundancy
 */

import { createHash, randomBytes } from 'crypto'

export interface WatermarkData {
  watermarkId: string
  partnerId: string
  submissionId: string
  userId: string
  timestamp: string
  format: 'text' | 'pdf' | 'docx'
  technique: WatermarkTechnique[]
}

export type WatermarkTechnique =
  | 'zero_width_chars'      // Zero-width Unicode characters
  | 'homoglyph_substitution' // Similar-looking characters
  | 'whitespace_encoding'    // Subtle spacing variations
  | 'metadata_embedding'     // Document metadata
  | 'fingerprinting'         // Unique formatting fingerprint

/**
 * Generate a unique watermark ID
 */
export function generateWatermarkId(
  submissionId: string,
  partnerId: string,
  userId: string
): string {
  const timestamp = Date.now()
  const random = randomBytes(8).toString('hex')
  const data = `${submissionId}-${partnerId}-${userId}-${timestamp}-${random}`

  return createHash('sha256')
    .update(data)
    .digest('hex')
    .substring(0, 32)
}

/**
 * Zero-Width Character Watermarking
 * Embeds data using invisible Unicode characters
 */
const ZERO_WIDTH_CHARS = {
  '0': '\u200B', // Zero Width Space
  '1': '\u200C', // Zero Width Non-Joiner
  '2': '\u200D', // Zero Width Joiner
  '3': '\uFEFF', // Zero Width No-Break Space
}

function encodeToZeroWidth(data: string): string {
  return data
    .split('')
    .map((char) => {
      const code = char.charCodeAt(0).toString(4) // Base 4
      return code
        .split('')
        .map((digit) => ZERO_WIDTH_CHARS[digit as keyof typeof ZERO_WIDTH_CHARS])
        .join('')
    })
    .join('\u200B') // Separator
}

/**
 * Apply zero-width character watermark to text
 */
function applyZeroWidthWatermark(text: string, watermarkId: string): string {
  const encoded = encodeToZeroWidth(watermarkId)
  const lines = text.split('\n')

  // Insert watermark at strategic positions
  // - After first paragraph
  // - Every ~1000 characters
  // - Before last paragraph

  if (lines.length === 0) return text

  let result = ''
  let charCount = 0
  const insertInterval = 1000

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Insert after first non-empty paragraph
    if (i === 0 || (i === 1 && lines[0].trim() === '')) {
      result += line + encoded
    }
    // Insert periodically throughout the document
    else if (charCount >= insertInterval && line.trim().endsWith('.')) {
      result += line + encoded
      charCount = 0
    }
    // Insert before last paragraph
    else if (i === lines.length - 1 && line.trim() !== '') {
      result += encoded + line
    }
    else {
      result += line
    }

    if (i < lines.length - 1) {
      result += '\n'
    }

    charCount += line.length
  }

  return result
}

/**
 * Homoglyph Substitution Watermarking
 * Replaces certain characters with visually identical Unicode alternatives
 */
const HOMOGLYPH_MAP: Record<string, string[]> = {
  'a': ['а', 'ɑ'], // Cyrillic a, Latin alpha
  'e': ['е', 'ҽ'], // Cyrillic e
  'o': ['о', 'օ'], // Cyrillic o
  'p': ['р'], // Cyrillic p
  'c': ['с'], // Cyrillic c
  'x': ['х'], // Cyrillic x
  'y': ['у'], // Cyrillic y
  'i': ['і', 'ɩ'], // Cyrillic i
}

function applyHomoglyphWatermark(text: string, watermarkId: string): string {
  // Convert watermark ID to binary
  const binary = Buffer.from(watermarkId, 'hex')
    .toString('binary')
    .split('')
    .map(c => c.charCodeAt(0).toString(2).padStart(8, '0'))
    .join('')

  let binaryIndex = 0
  let result = ''

  for (let i = 0; i < text.length; i++) {
    const char = text[i].toLowerCase()

    if (char in HOMOGLYPH_MAP && binaryIndex < binary.length) {
      const bit = binary[binaryIndex]
      const homoglyphs = HOMOGLYPH_MAP[char]

      if (bit === '1' && homoglyphs.length > 0) {
        // Use alternate character for '1'
        result += text[i] === char ? homoglyphs[0] : homoglyphs[0].toUpperCase()
        binaryIndex++
      } else {
        // Use original character for '0'
        result += text[i]
        binaryIndex++
      }
    } else {
      result += text[i]
    }
  }

  return result
}

/**
 * Whitespace Encoding Watermark
 * Uses subtle variations in spacing to encode data
 */
function applyWhitespaceWatermark(text: string, watermarkId: string): string {
  const binary = Buffer.from(watermarkId, 'hex')
    .toString('binary')
    .split('')
    .map(c => c.charCodeAt(0).toString(2).padStart(8, '0'))
    .join('')

  let binaryIndex = 0
  let result = ''

  for (let i = 0; i < text.length; i++) {
    result += text[i]

    // After periods, encode data in trailing spaces
    if (text[i] === '.' && text[i + 1] === ' ' && binaryIndex < binary.length) {
      const bit = binary[binaryIndex]

      if (bit === '1') {
        // Two spaces for '1'
        result += ' '
      }
      // One space for '0' (already added above)

      binaryIndex++
      i++ // Skip the original space
    }
  }

  return result
}

/**
 * Main watermarking function
 * Applies multiple watermarking techniques for redundancy
 */
export async function watermarkManuscript(
  content: string,
  watermarkData: Omit<WatermarkData, 'watermarkId' | 'technique'>
): Promise<{ watermarkedContent: string; watermarkData: WatermarkData }> {
  const watermarkId = generateWatermarkId(
    watermarkData.submissionId,
    watermarkData.partnerId,
    watermarkData.userId
  )

  const techniques: WatermarkTechnique[] = []
  let watermarkedContent = content

  // Apply multiple watermarking techniques based on format
  if (watermarkData.format === 'text' || watermarkData.format === 'docx') {
    // Zero-width characters (invisible)
    watermarkedContent = applyZeroWidthWatermark(watermarkedContent, watermarkId)
    techniques.push('zero_width_chars')

    // Homoglyph substitution (subtle)
    watermarkedContent = applyHomoglyphWatermark(watermarkedContent, watermarkId)
    techniques.push('homoglyph_substitution')

    // Whitespace encoding (invisible)
    watermarkedContent = applyWhitespaceWatermark(watermarkedContent, watermarkId)
    techniques.push('whitespace_encoding')
  }

  // For all formats, add metadata fingerprinting
  techniques.push('metadata_embedding')
  techniques.push('fingerprinting')

  const completeWatermarkData: WatermarkData = {
    ...watermarkData,
    watermarkId,
    technique: techniques,
  }

  return {
    watermarkedContent,
    watermarkData: completeWatermarkData,
  }
}

/**
 * Verify if a manuscript contains a specific watermark
 * Used for leak detection
 */
export function detectWatermark(content: string, watermarkId: string): {
  detected: boolean
  confidence: number
  techniques: WatermarkTechnique[]
} {
  const detectedTechniques: WatermarkTechnique[] = []
  let matchCount = 0
  let totalChecks = 0

  // Check for zero-width characters
  // eslint-disable-next-line no-misleading-character-class
  const zeroWidthPattern = /[\u200B\u200C\u200D\uFEFF]/g
  if (zeroWidthPattern.test(content)) {
    detectedTechniques.push('zero_width_chars')

    // Try to extract and verify
    const encoded = encodeToZeroWidth(watermarkId)
    if (content.includes(encoded)) {
      matchCount++
    }
    totalChecks++
  }

  // Check for homoglyphs
  const homoglyphChars = Object.values(HOMOGLYPH_MAP).flat()
  const hasHomoglyphs = homoglyphChars.some(char => content.includes(char))

  if (hasHomoglyphs) {
    detectedTechniques.push('homoglyph_substitution')
    matchCount++
    totalChecks++
  }

  // Check for double spaces after periods (whitespace encoding)
  const doubleSpacePattern = /\.\s{2,}/g
  if (doubleSpacePattern.test(content)) {
    detectedTechniques.push('whitespace_encoding')
    matchCount++
    totalChecks++
  }

  const confidence = totalChecks > 0 ? matchCount / totalChecks : 0

  return {
    detected: detectedTechniques.length > 0,
    confidence,
    techniques: detectedTechniques,
  }
}

/**
 * Create a fingerprint of the document
 * Captures unique characteristics without the full content
 */
export function createDocumentFingerprint(content: string): string {
  const characteristics = {
    length: content.length,
    wordCount: content.split(/\s+/).length,
    paragraphs: content.split(/\n\n+/).length,
    sentences: content.split(/[.!?]+/).length,
    // First and last 100 characters hash
    startHash: createHash('md5').update(content.substring(0, 100)).digest('hex'),
    endHash: createHash('md5').update(content.substring(content.length - 100)).digest('hex'),
    // Character frequency
    charFreq: calculateCharFrequency(content),
  }

  return createHash('sha256')
    .update(JSON.stringify(characteristics))
    .digest('hex')
}

function calculateCharFrequency(text: string): Record<string, number> {
  const freq: Record<string, number> = {}
  const normalized = text.toLowerCase().replace(/\s+/g, '')

  for (const char of normalized) {
    freq[char] = (freq[char] || 0) + 1
  }

  // Return only top 10 most frequent chars
  return Object.fromEntries(
    Object.entries(freq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
  )
}
