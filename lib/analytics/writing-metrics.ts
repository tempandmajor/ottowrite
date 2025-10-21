/**
 * Writing Metrics Calculator
 * Analyzes text for readability, pacing, vocabulary diversity, and more
 */

export type WritingMetrics = {
  readability: {
    fleschKincaid: number // Reading ease score (0-100, higher = easier)
    gradeLevel: number // US grade level
    readingTime: number // Estimated reading time in minutes
  }
  sentences: {
    total: number
    avgLength: number // Average words per sentence
    avgLengthChars: number // Average characters per sentence
    shortest: number
    longest: number
    distribution: {
      short: number // 1-10 words
      medium: number // 11-20 words
      long: number // 21-30 words
      veryLong: number // 31+ words
    }
  }
  vocabulary: {
    uniqueWords: number
    totalWords: number
    diversity: number // Unique / Total (0-1)
    avgWordLength: number
    complexWords: number // 3+ syllables
  }
  pacing: {
    paragraphs: number
    avgWordsPerParagraph: number
    avgSentencesPerParagraph: number
    dialoguePercentage: number // Percentage of text that is dialogue
    actionToDescriptionRatio: number // Short sentences vs long sentences
  }
  composition: {
    words: number
    characters: number
    charactersNoSpaces: number
    paragraphs: number
    sentences: number
    dialogueLines: number
  }
}

/**
 * Count syllables in a word (approximate)
 */
function countSyllables(word: string): number {
  word = word.toLowerCase().trim()
  if (word.length <= 3) return 1

  // Remove silent e
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '')
  word = word.replace(/^y/, '')

  // Count vowel groups
  const matches = word.match(/[aeiouy]{1,2}/g)
  return matches ? matches.length : 1
}

/**
 * Calculate Flesch-Kincaid Reading Ease
 * Formula: 206.835 - 1.015 * (words/sentences) - 84.6 * (syllables/words)
 * Score: 0-100 (higher = easier to read)
 */
function calculateFleschKincaid(text: string, sentences: string[], words: string[]): number {
  if (sentences.length === 0 || words.length === 0) return 0

  const totalSyllables = words.reduce((sum, word) => sum + countSyllables(word), 0)
  const wordsPerSentence = words.length / sentences.length
  const syllablesPerWord = totalSyllables / words.length

  const score = 206.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord
  return Math.max(0, Math.min(100, Math.round(score * 10) / 10))
}

/**
 * Calculate grade level from Flesch-Kincaid
 * Formula: 0.39 * (words/sentences) + 11.8 * (syllables/words) - 15.59
 */
function calculateGradeLevel(sentences: string[], words: string[]): number {
  if (sentences.length === 0 || words.length === 0) return 0

  const totalSyllables = words.reduce((sum, word) => sum + countSyllables(word), 0)
  const wordsPerSentence = words.length / sentences.length
  const syllablesPerWord = totalSyllables / words.length

  const grade = 0.39 * wordsPerSentence + 11.8 * syllablesPerWord - 15.59
  return Math.max(0, Math.round(grade * 10) / 10)
}

/**
 * Detect if a line is dialogue
 */
function isDialogueLine(line: string): boolean {
  const trimmed = line.trim()
  // Starts with quote or has quotes and dialogue tags
  return (
    /^["']/.test(trimmed) ||
    /["'].*(?:said|asked|replied|shouted|whispered|exclaimed)/i.test(trimmed) ||
    /(?:said|asked|replied|shouted|whispered|exclaimed).*["']/i.test(trimmed)
  )
}

/**
 * Calculate comprehensive writing metrics
 */
export function calculateWritingMetrics(text: string): WritingMetrics {
  // Basic composition
  const characters = text.length
  const charactersNoSpaces = text.replace(/\s/g, '').length

  // Split into paragraphs (double newline or single newline with indent)
  const paragraphs = text
    .split(/\n\s*\n/)
    .filter((p) => p.trim().length > 0)

  // Split into sentences (. ! ? followed by space or end)
  const sentences = text
    .split(/[.!?]+(?:\s+|$)/)
    .filter((s) => s.trim().length > 0)

  // Extract words (alphanumeric sequences)
  const words = text
    .toLowerCase()
    .match(/\b[a-z0-9']+\b/g) || []

  // Unique words for diversity
  const uniqueWords = new Set(words)

  // Complex words (3+ syllables)
  const complexWords = words.filter((word) => countSyllables(word) >= 3)

  // Dialogue detection
  const lines = text.split(/\n/).filter((line) => line.trim().length > 0)
  const dialogueLines = lines.filter(isDialogueLine)
  const dialogueChars = dialogueLines.join('').length
  const dialoguePercentage = charactersNoSpaces > 0 ? (dialogueChars / charactersNoSpaces) * 100 : 0

  // Sentence length distribution
  const sentenceLengths = sentences.map((s) => {
    const sentenceWords = s.match(/\b[a-z0-9']+\b/gi) || []
    return sentenceWords.length
  })

  const distribution = {
    short: sentenceLengths.filter((len) => len <= 10).length,
    medium: sentenceLengths.filter((len) => len > 10 && len <= 20).length,
    long: sentenceLengths.filter((len) => len > 20 && len <= 30).length,
    veryLong: sentenceLengths.filter((len) => len > 30).length,
  }

  const avgSentenceLength = sentenceLengths.length > 0
    ? sentenceLengths.reduce((sum, len) => sum + len, 0) / sentenceLengths.length
    : 0

  const avgSentenceLengthChars = sentences.length > 0
    ? sentences.reduce((sum, s) => sum + s.trim().length, 0) / sentences.length
    : 0

  // Pacing: action (short sentences) vs description (long sentences)
  const shortSentences = distribution.short + distribution.medium
  const longSentences = distribution.long + distribution.veryLong
  const actionToDescriptionRatio = longSentences > 0 ? shortSentences / longSentences : shortSentences

  // Vocabulary metrics
  const avgWordLength = words.length > 0
    ? words.reduce((sum, word) => sum + word.length, 0) / words.length
    : 0

  const diversity = words.length > 0 ? uniqueWords.size / words.length : 0

  // Reading time (average 238 words per minute)
  const readingTime = Math.ceil(words.length / 238)

  return {
    readability: {
      fleschKincaid: calculateFleschKincaid(text, sentences, words),
      gradeLevel: calculateGradeLevel(sentences, words),
      readingTime,
    },
    sentences: {
      total: sentences.length,
      avgLength: Math.round(avgSentenceLength * 10) / 10,
      avgLengthChars: Math.round(avgSentenceLengthChars),
      shortest: sentenceLengths.length > 0 ? Math.min(...sentenceLengths) : 0,
      longest: sentenceLengths.length > 0 ? Math.max(...sentenceLengths) : 0,
      distribution,
    },
    vocabulary: {
      uniqueWords: uniqueWords.size,
      totalWords: words.length,
      diversity: Math.round(diversity * 1000) / 1000,
      avgWordLength: Math.round(avgWordLength * 10) / 10,
      complexWords: complexWords.length,
    },
    pacing: {
      paragraphs: paragraphs.length,
      avgWordsPerParagraph: paragraphs.length > 0
        ? Math.round((words.length / paragraphs.length) * 10) / 10
        : 0,
      avgSentencesPerParagraph: paragraphs.length > 0
        ? Math.round((sentences.length / paragraphs.length) * 10) / 10
        : 0,
      dialoguePercentage: Math.round(dialoguePercentage * 10) / 10,
      actionToDescriptionRatio: Math.round(actionToDescriptionRatio * 10) / 10,
    },
    composition: {
      words: words.length,
      characters,
      charactersNoSpaces,
      paragraphs: paragraphs.length,
      sentences: sentences.length,
      dialogueLines: dialogueLines.length,
    },
  }
}

/**
 * Get readability interpretation
 */
export function getReadabilityLevel(score: number): {
  level: string
  description: string
  color: string
} {
  if (score >= 90) {
    return {
      level: 'Very Easy',
      description: '5th grade',
      color: 'text-green-500',
    }
  } else if (score >= 80) {
    return {
      level: 'Easy',
      description: '6th grade',
      color: 'text-green-500',
    }
  } else if (score >= 70) {
    return {
      level: 'Fairly Easy',
      description: '7th grade',
      color: 'text-blue-500',
    }
  } else if (score >= 60) {
    return {
      level: 'Standard',
      description: '8th-9th grade',
      color: 'text-blue-500',
    }
  } else if (score >= 50) {
    return {
      level: 'Fairly Difficult',
      description: '10th-12th grade',
      color: 'text-orange-500',
    }
  } else if (score >= 30) {
    return {
      level: 'Difficult',
      description: 'College',
      color: 'text-orange-500',
    }
  } else {
    return {
      level: 'Very Difficult',
      description: 'College graduate',
      color: 'text-red-500',
    }
  }
}

/**
 * Get vocabulary diversity interpretation
 */
export function getVocabularyLevel(diversity: number): {
  level: string
  description: string
  color: string
} {
  if (diversity >= 0.7) {
    return {
      level: 'Excellent',
      description: 'Highly varied vocabulary',
      color: 'text-green-500',
    }
  } else if (diversity >= 0.5) {
    return {
      level: 'Good',
      description: 'Varied vocabulary',
      color: 'text-blue-500',
    }
  } else if (diversity >= 0.3) {
    return {
      level: 'Average',
      description: 'Some repetition',
      color: 'text-orange-500',
    }
  } else {
    return {
      level: 'Low',
      description: 'Repetitive vocabulary',
      color: 'text-red-500',
    }
  }
}
