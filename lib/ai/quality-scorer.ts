/**
 * Quality Scoring System for AI-generated content
 * Provides multi-dimensional quality assessment for ensemble suggestions
 */

export type QualityScores = {
  coherence: number // 0-100: Logical flow and consistency
  creativity: number // 0-100: Originality and inventiveness
  accuracy: number // 0-100: Factual correctness and precision
  grammar: number // 0-100: Language quality and style
  overall: number // 0-100: Weighted average
}

export type QualityScoringOptions = {
  weights?: {
    coherence?: number
    creativity?: number
    accuracy?: number
    grammar?: number
  }
  context?: string
  prompt?: string
}

const DEFAULT_WEIGHTS = {
  coherence: 0.3,
  creativity: 0.25,
  accuracy: 0.25,
  grammar: 0.2,
}

/**
 * Calculate coherence score based on text structure and logical flow
 */
function calculateCoherenceScore(text: string, context?: string): number {
  let score = 50 // Base score

  // Check for minimum length (too short = less coherent)
  const wordCount = text.trim().split(/\s+/).length
  if (wordCount < 10) return 20
  if (wordCount >= 50) score += 10

  // Check for proper sentence structure
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0)
  if (sentences.length >= 2) score += 10
  if (sentences.length >= 5) score += 5

  // Check for paragraph breaks (indicates structure)
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0)
  if (paragraphs.length > 1) score += 10

  // Check for transition words (indicates flow)
  const transitionWords = [
    'however', 'therefore', 'furthermore', 'meanwhile', 'consequently',
    'moreover', 'nevertheless', 'additionally', 'thus', 'hence',
    'then', 'next', 'finally', 'first', 'second', 'also', 'but'
  ]
  const lowerText = text.toLowerCase()
  const transitionsFound = transitionWords.filter((word) =>
    lowerText.includes(word)
  ).length
  score += Math.min(transitionsFound * 3, 15)

  // Penalize excessive repetition
  const words = text.toLowerCase().split(/\s+/)
  const uniqueWords = new Set(words.filter(w => w.length > 3))
  const repetitionRatio = uniqueWords.size / Math.max(words.length, 1)
  if (repetitionRatio < 0.3) score -= 15
  else if (repetitionRatio > 0.6) score += 10

  // Context consistency bonus
  if (context && context.length > 0) {
    const contextWords = new Set(
      context.toLowerCase().split(/\s+/).filter(w => w.length > 4)
    )
    const textWords = new Set(
      text.toLowerCase().split(/\s+/).filter(w => w.length > 4)
    )
    const overlap = [...contextWords].filter(w => textWords.has(w)).length
    if (overlap > 3) score += 10
  }

  return Math.max(0, Math.min(100, score))
}

/**
 * Calculate creativity score based on word variety and stylistic elements
 */
function calculateCreativityScore(text: string): number {
  let score = 50 // Base score

  const words = text.split(/\s+/)
  const wordCount = words.length

  if (wordCount < 10) return 20

  // Vocabulary richness (unique words ratio)
  const uniqueWords = new Set(words.map(w => w.toLowerCase()))
  const vocabularyRichness = uniqueWords.size / wordCount
  if (vocabularyRichness > 0.7) score += 20
  else if (vocabularyRichness > 0.5) score += 10
  else if (vocabularyRichness < 0.3) score -= 10

  // Check for descriptive language (adjectives/adverbs indicators)
  const descriptivePatterns = /\b(very|quite|extremely|incredibly|beautifully|carefully|slowly|quickly|ly\b)/gi
  const descriptiveMatches = text.match(descriptivePatterns) || []
  score += Math.min(descriptiveMatches.length * 2, 15)

  // Check for dialogue (creativity in narrative)
  const hasDialogue = /[""].*?[""]|'.*?'/.test(text)
  if (hasDialogue) score += 10

  // Check for varied sentence structure
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  if (sentences.length > 0) {
    const avgSentenceLength = wordCount / sentences.length
    // Ideal range: 15-25 words per sentence
    if (avgSentenceLength >= 15 && avgSentenceLength <= 25) score += 10

    // Sentence length variety
    const lengths = sentences.map(s => s.trim().split(/\s+/).length)
    const variance = lengths.reduce((sum, len) => {
      const diff = len - avgSentenceLength
      return sum + diff * diff
    }, 0) / lengths.length
    if (variance > 20) score += 10 // Good variety
  }

  // Check for metaphors/similes (basic detection)
  const figurativePatterns = /\b(like|as if|as though|似乎|metaphor|simile)\b/gi
  const figurativeMatches = text.match(figurativePatterns) || []
  if (figurativeMatches.length > 0) score += 10

  // Penalize overly simple or repetitive language
  const simpleWords = words.filter(w => w.length <= 3).length
  if (simpleWords / wordCount > 0.6) score -= 15

  return Math.max(0, Math.min(100, score))
}

/**
 * Calculate accuracy score based on factual consistency and precision
 */
function calculateAccuracyScore(text: string, prompt?: string): number {
  let score = 70 // Base score (generous, as we can't fact-check without external data)

  // Check for hedging language (indicates uncertainty, which can affect accuracy)
  const hedgingWords = [
    'maybe', 'perhaps', 'possibly', 'probably', 'might', 'could',
    'seems', 'appears', 'likely', 'uncertain'
  ]
  const lowerText = text.toLowerCase()
  const hedgingCount = hedgingWords.filter(word =>
    lowerText.includes(word)
  ).length
  if (hedgingCount > 5) score -= 15
  else if (hedgingCount <= 2) score += 5

  // Check for contradictions (simple pattern matching)
  const contradictions = [
    /but.*however/i,
    /always.*never/i,
    /all.*none/i,
    /everything.*nothing/i,
  ]
  const hasContradiction = contradictions.some(pattern => pattern.test(text))
  if (hasContradiction) score -= 20

  // Check for specific details (numbers, dates, names - indicates precision)
  const hasNumbers = /\b\d+\b/.test(text)
  const hasProperNouns = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/.test(text)
  if (hasNumbers) score += 5
  if (hasProperNouns) score += 5

  // Prompt relevance
  if (prompt && prompt.length > 0) {
    const promptWords = new Set(
      prompt.toLowerCase().split(/\s+/).filter(w => w.length > 3)
    )
    const textWords = new Set(
      text.toLowerCase().split(/\s+/).filter(w => w.length > 3)
    )
    const relevance = [...promptWords].filter(w => textWords.has(w)).length / Math.max(promptWords.size, 1)
    if (relevance > 0.5) score += 10
    else if (relevance < 0.2) score -= 15
  }

  // Check for vague language
  const vagueWords = ['thing', 'stuff', 'something', 'someone', 'somehow', 'somewhere']
  const vagueCount = vagueWords.filter(word => lowerText.includes(word)).length
  if (vagueCount > 3) score -= 10

  return Math.max(0, Math.min(100, score))
}

/**
 * Calculate grammar and style score
 */
function calculateGrammarScore(text: string): number {
  let score = 75 // Base score (generous, as we can't run full grammar check)

  // Check for basic capitalization
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  let properlyCapitalized = 0
  sentences.forEach(sentence => {
    const trimmed = sentence.trim()
    if (trimmed.length > 0 && /^[A-Z]/.test(trimmed)) {
      properlyCapitalized++
    }
  })
  const capitalizationRatio = properlyCapitalized / Math.max(sentences.length, 1)
  if (capitalizationRatio > 0.9) score += 10
  else if (capitalizationRatio < 0.5) score -= 15

  // Check for proper punctuation
  const hasPunctuation = /[.!?]$/.test(text.trim())
  if (hasPunctuation) score += 5
  else score -= 10

  // Check for excessive punctuation
  const exclamationCount = (text.match(/!/g) || []).length
  if (exclamationCount > text.length / 50) score -= 10

  // Check for run-on sentences (very long sentences)
  const avgSentenceLength = text.split(/\s+/).length / Math.max(sentences.length, 1)
  if (avgSentenceLength > 40) score -= 10
  else if (avgSentenceLength >= 15 && avgSentenceLength <= 30) score += 5

  // Check for common grammar mistakes (simple patterns)
  const grammarIssues = [
    /\bi\b(?!\s+[A-Z])/g, // lowercase 'i' not followed by capital
    /\s{2,}/g, // multiple spaces
    /[a-z][A-Z]/g, // missing space between words
  ]
  grammarIssues.forEach(pattern => {
    const matches = text.match(pattern) || []
    score -= Math.min(matches.length * 3, 15)
  })

  // Check for paragraph structure
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0)
  if (paragraphs.length > 1) score += 5

  return Math.max(0, Math.min(100, score))
}

/**
 * Calculate overall quality score with weighted components
 */
export function calculateQualityScores(
  text: string,
  options: QualityScoringOptions = {}
): QualityScores {
  const { weights = DEFAULT_WEIGHTS, context, prompt } = options

  // Validate text
  if (!text || text.trim().length === 0) {
    return {
      coherence: 0,
      creativity: 0,
      accuracy: 0,
      grammar: 0,
      overall: 0,
    }
  }

  // Calculate individual scores
  const coherence = calculateCoherenceScore(text, context)
  const creativity = calculateCreativityScore(text)
  const accuracy = calculateAccuracyScore(text, prompt)
  const grammar = calculateGrammarScore(text)

  // Calculate weighted overall score
  const overall = Math.round(
    coherence * (weights.coherence ?? DEFAULT_WEIGHTS.coherence) +
    creativity * (weights.creativity ?? DEFAULT_WEIGHTS.creativity) +
    accuracy * (weights.accuracy ?? DEFAULT_WEIGHTS.accuracy) +
    grammar * (weights.grammar ?? DEFAULT_WEIGHTS.grammar)
  )

  return {
    coherence: Math.round(coherence),
    creativity: Math.round(creativity),
    accuracy: Math.round(accuracy),
    grammar: Math.round(grammar),
    overall: Math.max(0, Math.min(100, overall)),
  }
}

/**
 * Score multiple suggestions and rank them
 */
export function scoreAndRankSuggestions<T extends { content: string }>(
  suggestions: T[],
  options: QualityScoringOptions = {}
): Array<T & { scores: QualityScores; rank: number }> {
  const scored = suggestions.map((suggestion) => ({
    ...suggestion,
    scores: calculateQualityScores(suggestion.content, options),
  }))

  // Sort by overall score (descending)
  const ranked = scored.sort((a, b) => b.scores.overall - a.scores.overall)

  // Add rank
  return ranked.map((item, index) => ({
    ...item,
    rank: index + 1,
  }))
}

/**
 * Get a human-readable quality rating
 */
export function getQualityRating(score: number): string {
  if (score >= 90) return 'Excellent'
  if (score >= 80) return 'Very Good'
  if (score >= 70) return 'Good'
  if (score >= 60) return 'Fair'
  if (score >= 50) return 'Acceptable'
  return 'Needs Improvement'
}
