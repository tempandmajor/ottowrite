export type ReadabilityMetrics = {
  fleschKincaid: number
  passiveVoicePercent: number
  dialoguePercent: number
  avgSentenceLength: number
  clicheMatches: string[]
}

const clicheList = [
  'at the end of the day',
  'avoid like the plague',
  'crystal clear',
  'light at the end of the tunnel',
  'in the nick of time',
  'fit as a fiddle',
  'brave as a lion',
  'cold as ice',
]

export function computeReadabilityMetrics(text: string): ReadabilityMetrics {
  const sentences = splitSentences(text)
  const words = splitWords(text)
  const syllables = countSyllables(words)

  const avgSentenceLength = sentences.length > 0 ? words.length / sentences.length : 0
  const fleschKincaid =
    sentences.length > 0
      ? 206.835 - 1.015 * avgSentenceLength - 84.6 * (syllables / Math.max(words.length, 1))
      : 0

  const passiveMatches = text.match(/\b(be|is|was|were|been|being)\b\s+(\w+ed)\b/gi) ?? []
  const passiveVoicePercent = words.length > 0 ? (passiveMatches.length / words.length) * 1000 : 0

  const dialogueParts = text.match(/"[^"]+"|‘[^’]+’|“[^”]+”/g) ?? []
  const dialogueLength = dialogueParts.reduce((total, fragment) => total + fragment.split(/\s+/).length, 0)
  const dialoguePercent = words.length > 0 ? (dialogueLength / words.length) * 100 : 0

  const clicheMatches: string[] = []
  const lower = text.toLowerCase()
  clicheList.forEach((phrase) => {
    if (lower.includes(phrase)) {
      clicheMatches.push(phrase)
    }
  })

  return {
    fleschKincaid: Number(fleschKincaid.toFixed(2)),
    passiveVoicePercent: Number(passiveVoicePercent.toFixed(2)),
    dialoguePercent: Number(dialoguePercent.toFixed(2)),
    avgSentenceLength: Number(avgSentenceLength.toFixed(2)),
    clicheMatches,
  }
}

function splitSentences(text: string) {
  return text
    .split(/[.!?]+\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function splitWords(text: string) {
  return text
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zA-Z']/g, ''))
    .filter(Boolean)
}

function countSyllables(words: string[]) {
  return words.reduce((total, word) => total + syllablesInWord(word), 0)
}

function syllablesInWord(word: string) {
  const normalized = word.toLowerCase()
  if (normalized.length <= 3) return 1
  const vowels = normalized.match(/[aeiouy]{1,2}/g)
  let count = vowels ? vowels.length : 1
  count -= normalized.endsWith('e') ? 1 : 0
  return Math.max(count, 1)
}
