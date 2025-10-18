import { generateWithGPT5 } from '@/lib/ai/service'

export type CoverageReport = {
  logline: string
  synopsis: {
    onePage: string
    twoPage: string
  }
  genre: {
    primary: string
    subgenres: string[]
    tone: string
    audience: string[]
  }
  coverageNotes: {
    summary: string
    strengths: string[]
    weaknesses: string[]
    characterNotes: string[]
    plotNotes: string[]
    dialogueNotes: string[]
    pacingNotes: string[]
    additionalNotes: string[]
  }
  marketability: {
    assessment: string
    audienceSegments: string[]
    comparableTitles: string[]
    budgetEstimate: string
    distributionNotes: string[]
    riskFactors: string[]
  }
  verdict: {
    rating: 'pass' | 'consider' | 'recommend'
    explanation: string
    scores: {
      concept: number
      character: number
      structure: number
      dialogue: number
      writing: number
      marketability: number
    }
  }
}

export type CoverageResult = {
  report: CoverageReport
  model: 'gpt-5'
  usage: {
    inputTokens: number
    outputTokens: number
    totalCost: number
  }
}

export type GenerateCoverageParams = {
  projectId: string
  scriptTitle: string
  scriptText: string
  format: 'feature' | 'pilot' | 'episode' | 'short' | 'limited_series' | 'other'
  genreTags?: string[]
  existingLogline?: string
  developmentNotes?: string
}

const OUTPUT_SCHEMA = `{
  "logline": "One-sentence logline written in industry style.",
  "synopsis": {
    "onePage": "Concise one-page coverage synopsis (~450 words).",
    "twoPage": "Expanded two-page synopsis (~900 words) highlighting acts and key turns."
  },
  "genre": {
    "primary": "Primary genre label.",
    "subgenres": ["comma separated subgenre list"],
    "tone": "Description of tone and style.",
    "audience": ["target audience segments"]
  },
  "coverageNotes": {
    "summary": "Paragraph summarising overall impressions.",
    "strengths": ["bullet strength"],
    "weaknesses": ["bullet weakness"],
    "characterNotes": ["observations about character arcs and relationships"],
    "plotNotes": ["observations about structure and pacing"],
    "dialogueNotes": ["observations about dialogue"],
    "pacingNotes": ["observations about pacing"],
    "additionalNotes": ["misc or production notes"]
  },
  "marketability": {
    "assessment": "Overall commercial analysis.",
    "audienceSegments": ["segments"],
    "comparableTitles": ["title - year"],
    "budgetEstimate": "Low / Mid / High with rationale.",
    "distributionNotes": ["release strategy ideas"],
    "riskFactors": ["potential challenges"]
  },
  "verdict": {
    "rating": "pass | consider | recommend",
    "explanation": "Explain the verdict plainly.",
    "scores": {
      "concept": 1-10,
      "character": 1-10,
      "structure": 1-10,
      "dialogue": 1-10,
      "writing": 1-10,
      "marketability": 1-10
    }
  }
}`

function toStringArray(value: unknown): string[] {
  if (!value) return []
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : String(item)))
      .filter((item) => item.length > 0)
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
  }
  return []
}

function toScore(value: unknown): number {
  const numeric = Number(value)
  if (Number.isFinite(numeric)) {
    return Math.min(10, Math.max(1, Math.round(numeric)))
  }
  return 5
}

function sanitizeCoverage(raw: any): CoverageReport {
  return {
    logline: typeof raw?.logline === 'string' ? raw.logline.trim() : '',
    synopsis: {
      onePage: typeof raw?.synopsis?.onePage === 'string' ? raw.synopsis.onePage.trim() : '',
      twoPage: typeof raw?.synopsis?.twoPage === 'string' ? raw.synopsis.twoPage.trim() : '',
    },
    genre: {
      primary:
        typeof raw?.genre?.primary === 'string'
          ? raw.genre.primary.trim()
          : '',
      subgenres: toStringArray(raw?.genre?.subgenres),
      tone: typeof raw?.genre?.tone === 'string' ? raw.genre.tone.trim() : '',
      audience: toStringArray(raw?.genre?.audience),
    },
    coverageNotes: {
      summary:
        typeof raw?.coverageNotes?.summary === 'string'
          ? raw.coverageNotes.summary.trim()
          : '',
      strengths: toStringArray(raw?.coverageNotes?.strengths),
      weaknesses: toStringArray(raw?.coverageNotes?.weaknesses),
      characterNotes: toStringArray(raw?.coverageNotes?.characterNotes),
      plotNotes: toStringArray(raw?.coverageNotes?.plotNotes),
      dialogueNotes: toStringArray(raw?.coverageNotes?.dialogueNotes),
      pacingNotes: toStringArray(raw?.coverageNotes?.pacingNotes),
      additionalNotes: toStringArray(raw?.coverageNotes?.additionalNotes),
    },
    marketability: {
      assessment:
        typeof raw?.marketability?.assessment === 'string'
          ? raw.marketability.assessment.trim()
          : '',
      audienceSegments: toStringArray(raw?.marketability?.audienceSegments),
      comparableTitles: toStringArray(raw?.marketability?.comparableTitles),
      budgetEstimate:
        typeof raw?.marketability?.budgetEstimate === 'string'
          ? raw.marketability.budgetEstimate.trim()
          : '',
      distributionNotes: toStringArray(raw?.marketability?.distributionNotes),
      riskFactors: toStringArray(raw?.marketability?.riskFactors),
    },
    verdict: {
      rating:
        raw?.verdict?.rating === 'recommend' ||
        raw?.verdict?.rating === 'consider' ||
        raw?.verdict?.rating === 'pass'
          ? raw.verdict.rating
          : 'consider',
      explanation:
        typeof raw?.verdict?.explanation === 'string'
          ? raw.verdict.explanation.trim()
          : '',
      scores: {
        concept: toScore(raw?.verdict?.scores?.concept),
        character: toScore(raw?.verdict?.scores?.character),
        structure: toScore(raw?.verdict?.scores?.structure),
        dialogue: toScore(raw?.verdict?.scores?.dialogue),
        writing: toScore(raw?.verdict?.scores?.writing),
        marketability: toScore(raw?.verdict?.scores?.marketability),
      },
    },
  }
}

export async function generateCoverageReport({
  projectId,
  scriptTitle,
  scriptText,
  format,
  genreTags,
  existingLogline,
  developmentNotes,
}: GenerateCoverageParams): Promise<CoverageResult> {
  const systemPrompt = `You are a senior professional script reader delivering Hollywood-standard coverage.
Respond ONLY with valid JSON matching this schema:
${OUTPUT_SCHEMA}`

  const userPrompt = `Project ID: ${projectId}
Title: ${scriptTitle}
Format: ${format}
${genreTags && genreTags.length > 0 ? `Genre tags: ${genreTags.join(', ')}` : ''}
${existingLogline ? `Existing logline to refine: ${existingLogline}` : ''}
${developmentNotes ? `Development notes from writer: ${developmentNotes}` : ''}

Script excerpt:
${scriptText.trim()}
`

  const response = await generateWithGPT5(userPrompt, systemPrompt, 2800)
  const rawText = response.content.trim()

  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}$/)
    if (!jsonMatch) {
      throw new Error('AI response missing JSON payload.')
    }
    const parsed = JSON.parse(jsonMatch[0])
    const report = sanitizeCoverage(parsed)

    return {
      report,
      model: 'gpt-5',
      usage: response.usage,
    }
  } catch (error) {
    console.error('Failed to parse coverage response:', error, rawText)
    throw new Error('AI generation returned an unexpected format. Try adjusting your prompt or script length.')
  }
}
