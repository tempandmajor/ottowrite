/**
 * Analytics Metrics Calculator
 *
 * Calculates various writing analytics metrics from document snapshots.
 */

import type { DocumentSnapshot } from '@/lib/snapshots/snapshot-manager'
import type {
  SnapshotAnalysisMetrics,
  SnapshotComparisonMetrics,
  WritingVelocityMetrics,
  StructureAnalysisMetrics,
} from './worker-contract'

/**
 * Strip HTML tags from text
 */
function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Count sentences in text
 */
function countSentences(text: string): number {
  const sentences = text.match(/[.!?]+/g)
  return sentences ? sentences.length : 0
}

/**
 * Count paragraphs in text
 */
function countParagraphs(text: string): number {
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0)
  return paragraphs.length
}

/**
 * Calculate Flesch Reading Ease score
 * https://en.wikipedia.org/wiki/Flesch%E2%80%93Kincaid_readability_tests
 */
function calculateReadability(text: string, words: number, sentences: number): number {
  if (words === 0 || sentences === 0) return 0

  const syllables = estimateSyllables(text)
  const averageWordsPerSentence = words / sentences
  const averageSyllablesPerWord = syllables / words

  const score = 206.835 - 1.015 * averageWordsPerSentence - 84.6 * averageSyllablesPerWord

  // Clamp to 0-100
  return Math.max(0, Math.min(100, score))
}

/**
 * Estimate syllable count (simplified)
 */
function estimateSyllables(text: string): number {
  const words = text.toLowerCase().split(/\s+/)
  let syllables = 0

  for (const word of words) {
    // Count vowel groups
    const vowelGroups = word.match(/[aeiouy]+/g)
    syllables += vowelGroups ? vowelGroups.length : 0

    // Adjust for silent e
    if (word.endsWith('e')) syllables--

    // Minimum 1 syllable per word
    if (syllables < 1) syllables = 1
  }

  return syllables
}

/**
 * Calculate reading time in minutes
 */
function calculateReadingTime(words: number): number {
  const wordsPerMinute = 250
  return words / wordsPerMinute
}

/**
 * Get word frequency
 */
function getWordFrequency(text: string): Map<string, number> {
  const words = text
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3) // Filter short words
    .filter((w) => !/^[0-9]+$/.test(w)) // Filter numbers

  const frequency = new Map<string, number>()

  for (const word of words) {
    frequency.set(word, (frequency.get(word) || 0) + 1)
  }

  return frequency
}

/**
 * Detect content type percentages (dialogue, action, description)
 */
/**
 * Analyze a single snapshot
 */
export function analyzeSnapshot(snapshot: DocumentSnapshot): SnapshotAnalysisMetrics {
  const html = snapshot.content.html || ''
  const text = stripHtml(html)
  const words = text.split(/\s+/).filter((w) => w.length > 0)
  const wordCount = words.length
  const characterCount = text.length
  const sentences = countSentences(text)
  const paragraphs = countParagraphs(text)
  const sentenceList = text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0)

  const passiveSentenceRegex = /\b(?:is|are|was|were|be|been|being|am)\b\s+(?:\w+ed|\w+en)\b/i
  const passiveSentenceCount = sentenceList.filter((sentence) =>
    passiveSentenceRegex.test(sentence)
  ).length
  const passiveVoicePercentage =
    sentenceList.length > 0 ? (passiveSentenceCount / sentenceList.length) * 100 : 0

  const dialogueMatches =
    html.match(/["“”‘’][^"“”‘’]+["“”‘’]/g) ?? []
  const dialogueWords = dialogueMatches.reduce((total, fragment) => {
    const cleaned = fragment.replace(/["“”‘’]/g, ' ').trim()
    return total + cleaned.split(/\s+/).filter(Boolean).length
  }, 0)
  const dialoguePercentage = wordCount > 0 ? (dialogueWords / wordCount) * 100 : 0

  const actionSentences = sentenceList.filter((sentence) =>
    /\b\w+(?:ed|ing)\b/.test(sentence)
  ).length
  const nonDialogueShare = Math.max(0, 100 - dialoguePercentage)
  const actionRatio = sentenceList.length > 0 ? actionSentences / sentenceList.length : 0
  const actionPercentage = Math.min(nonDialogueShare, actionRatio * nonDialogueShare)
  const descriptionPercentage = Math.max(0, nonDialogueShare - actionPercentage)

  const frequency = getWordFrequency(text)
  const topWords = Array.from(frequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word, count]) => ({ word, count }))

  const sceneCount = snapshot.metadata.sceneCount || 0
  const chapterCount = Array.isArray(snapshot.content.structure)
    ? snapshot.content.structure.length
    : 0

  return {
    wordCount,
    characterCount,
    paragraphCount: paragraphs,
    sentenceCount: sentences,
    averageWordsPerSentence: sentences > 0 ? wordCount / sentences : 0,
    averageWordsPerParagraph: paragraphs > 0 ? wordCount / paragraphs : 0,
    readabilityScore: calculateReadability(text, wordCount, sentences),
    readingTimeMinutes: calculateReadingTime(wordCount),

    sceneCount,
    chapterCount,
    averageSceneLength: sceneCount > 0 ? wordCount / sceneCount : 0,

    dialoguePercentage: Math.min(100, Math.max(0, dialoguePercentage)),
    actionPercentage: Math.min(100, Math.max(0, actionPercentage)),
    descriptionPercentage: Math.min(100, Math.max(0, descriptionPercentage)),
    passiveVoicePercentage: Math.min(100, Math.max(0, passiveVoicePercentage)),

    uniqueWords: frequency.size,
    vocabularyRichness: wordCount > 0 ? frequency.size / wordCount : 0,
    topWords,

    analyzedAt: new Date().toISOString(),
  }
}

/**
 * Compare two snapshots
 */
export function compareSnapshots(
  from: DocumentSnapshot,
  to: DocumentSnapshot
): SnapshotComparisonMetrics {
  const fromText = stripHtml(from.content.html || '')
  const toText = stripHtml(to.content.html || '')

  const fromWords = fromText.split(/\s+/).filter((w) => w.length > 0)
  const toWords = toText.split(/\s+/).filter((w) => w.length > 0)

  const netWordChange = toWords.length - fromWords.length
  const wordsAdded = Math.max(0, netWordChange)
  const wordsRemoved = Math.max(0, -netWordChange)
  const wordsChanged = Math.abs(netWordChange)

  const fromScenes = from.metadata.sceneCount || 0
  const toScenes = to.metadata.sceneCount || 0

  const scenesAdded = Math.max(0, toScenes - fromScenes)
  const scenesRemoved = Math.max(0, fromScenes - toScenes)
  const scenesModified = Math.min(fromScenes, toScenes)

  const fromTime = new Date(from.metadata.timestamp).getTime()
  const toTime = new Date(to.metadata.timestamp).getTime()
  const timeBetweenSnapshots = toTime - fromTime

  const hoursElapsed = timeBetweenSnapshots / (1000 * 60 * 60)
  const writingVelocity = hoursElapsed > 0 ? Math.abs(netWordChange) / hoursElapsed : 0

  // Heuristic for major vs minor changes
  const changePercentage = fromWords.length > 0 ? (wordsChanged / fromWords.length) * 100 : 0
  const majorRevisions = changePercentage > 20 ? 1 : 0
  const minorEdits = changePercentage <= 20 && changePercentage > 0 ? 1 : 0

  return {
    wordsAdded,
    wordsRemoved,
    wordsChanged,
    netWordChange,

    scenesAdded,
    scenesRemoved,
    scenesModified,

    timeBetweenSnapshots,
    writingVelocity,

    majorRevisions,
    minorEdits,

    fromTimestamp: from.metadata.timestamp.toISOString(),
    toTimestamp: to.metadata.timestamp.toISOString(),
    analyzedAt: new Date().toISOString(),
  }
}

/**
 * Calculate writing velocity from multiple snapshots
 */
export function calculateWritingVelocity(
  snapshots: DocumentSnapshot[],
  startTime: Date,
  endTime: Date
): WritingVelocityMetrics {
  // Sort by timestamp
  const sorted = [...snapshots].sort(
    (a, b) => a.metadata.timestamp.getTime() - b.metadata.timestamp.getTime()
  )

  const sessions: Array<{
    startTime: string
    endTime: string
    wordsWritten: number
    wordsPerHour: number
  }> = []

  let totalWords = 0
  const hourlyStats = new Map<number, number>()

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    const curr = sorted[i]

    const prevWords = prev.metadata.wordCount
    const currWords = curr.metadata.wordCount
    const wordsWritten = Math.max(0, currWords - prevWords)

    const prevTime = prev.metadata.timestamp.getTime()
    const currTime = curr.metadata.timestamp.getTime()
    const hourElapsed = (currTime - prevTime) / (1000 * 60 * 60)

    const wordsPerHour = hourElapsed > 0 ? wordsWritten / hourElapsed : 0

    sessions.push({
      startTime: prev.metadata.timestamp.toISOString(),
      endTime: curr.metadata.timestamp.toISOString(),
      wordsWritten,
      wordsPerHour,
    })

    totalWords += wordsWritten

    // Track hourly stats
    const hour = curr.metadata.timestamp.getHours()
    hourlyStats.set(hour, (hourlyStats.get(hour) || 0) + wordsWritten)
  }

  const totalMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60)
  const averageWordsPerHour = totalMinutes > 0 ? (totalWords / totalMinutes) * 60 : 0
  const peakWordsPerHour = sessions.length > 0 ? Math.max(...sessions.map((s) => s.wordsPerHour)) : 0

  // Find most/least productive hours
  let mostProductiveHour = 0
  let leastProductiveHour = 0
  let maxWords = 0
  let minWords = Infinity

  for (const [hour, words] of hourlyStats.entries()) {
    if (words > maxWords) {
      maxWords = words
      mostProductiveHour = hour
    }
    if (words < minWords) {
      minWords = words
      leastProductiveHour = hour
    }
  }

  const averageSessionLength = sessions.length > 0
    ? sessions.reduce((sum, s) => {
        const start = new Date(s.startTime).getTime()
        const end = new Date(s.endTime).getTime()
        return sum + (end - start) / (1000 * 60)
      }, 0) / sessions.length
    : 0

  return {
    totalWordsWritten: totalWords,
    totalTimeMinutes: totalMinutes,
    averageWordsPerHour,
    peakWordsPerHour,
    sessions,
    mostProductiveHourOfDay: mostProductiveHour,
    leastProductiveHourOfDay: leastProductiveHour,
    averageSessionLength,
    analyzedAt: new Date().toISOString(),
  }
}

/**
 * Analyze document structure
 */
export function analyzeStructure(snapshot: DocumentSnapshot): StructureAnalysisMetrics {
  const structure = snapshot.content.structure
  const sceneAnchors = snapshot.sceneAnchors || []

  if (!Array.isArray(structure)) {
    return {
      totalScenes: 0,
      totalChapters: 0,
      averageScenesPerChapter: 0,
      scenes: [],
      chapters: [],
      pacingScore: 0,
      structureBalance: 0,
      analyzedAt: new Date().toISOString(),
    }
  }

  const chapters = structure.map((chapter, index) => ({
    id: chapter.id || `chapter-${index}`,
    sceneCount: chapter.scenes?.length || 0,
    wordCount: 0, // Would need to calculate from content
    position: index,
  }))

  const scenes = sceneAnchors.map((sceneId, index) => ({
    id: sceneId || `scene-${index}`,
    wordCount: 0, // Would need to calculate from content
    position: index,
    hasDialogue: true, // Placeholder - would need content analysis
    hasAction: true,
    hasDescription: true,
  }))

  const totalScenes = scenes.length
  const totalChapters = chapters.length
  const averageScenesPerChapter = totalChapters > 0 ? totalScenes / totalChapters : 0

  // Calculate pacing score based on scene length variance
  const sceneLengths = scenes.map((s) => s.wordCount)
  const avgSceneLength = sceneLengths.length > 0
    ? sceneLengths.reduce((sum, len) => sum + len, 0) / sceneLengths.length
    : 0

  const variance = sceneLengths.length > 0
    ? sceneLengths.reduce((sum, len) => sum + Math.pow(len - avgSceneLength, 2), 0) / sceneLengths.length
    : 0

  const stdDev = Math.sqrt(variance)
  const coefficientOfVariation = avgSceneLength > 0 ? stdDev / avgSceneLength : 0

  // Lower CV = better pacing (more consistent scene lengths)
  const pacingScore = Math.max(0, 100 - coefficientOfVariation * 100)

  // Structure balance based on chapter size variance
  const chapterSizes = chapters.map((c) => c.wordCount)
  const avgChapterSize = chapterSizes.length > 0
    ? chapterSizes.reduce((sum, size) => sum + size, 0) / chapterSizes.length
    : 0

  const chapterVariance = chapterSizes.length > 0
    ? chapterSizes.reduce((sum, size) => sum + Math.pow(size - avgChapterSize, 2), 0) / chapterSizes.length
    : 0

  const chapterStdDev = Math.sqrt(chapterVariance)
  const chapterCV = avgChapterSize > 0 ? chapterStdDev / avgChapterSize : 0

  const structureBalance = Math.max(0, 100 - chapterCV * 100)

  return {
    totalScenes,
    totalChapters,
    averageScenesPerChapter,
    scenes,
    chapters,
    pacingScore,
    structureBalance,
    analyzedAt: new Date().toISOString(),
  }
}
