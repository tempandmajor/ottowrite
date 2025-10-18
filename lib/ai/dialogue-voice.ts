import { generateWithClaude } from '@/lib/ai/service'

export type DialogueVoiceRequest = {
  characterName: string
  projectType: string
  genre?: string[] | null
  voiceDescription?: string | null
  dialogueSamples: string[]
  targetPassage: string
}

export type DialogueVoiceIssue = {
  category: string
  description: string
  severity: 'critical' | 'major' | 'minor' | 'note'
  suggestion?: string
}

export type DialogueVoiceResult = {
  voiceProfile: {
    tone: string
    pacing: string
    vocabulary: string
    signatureTraits: string[]
  }
  comparison: {
    matchesVoice: boolean
    confidence: number
    overallAssessment: string
    issues: DialogueVoiceIssue[]
  }
  suggestedRevision: string
  rawText: string
}

export async function analyzeDialogueVoice(
  request: DialogueVoiceRequest
): Promise<DialogueVoiceResult> {
  const {
    characterName,
    projectType,
    genre,
    voiceDescription,
    dialogueSamples,
    targetPassage,
  } = request

  if (!characterName || dialogueSamples.length === 0 || !targetPassage) {
    throw new Error('Character name, dialogue samples, and target passage are required')
  }

  const samplesText = dialogueSamples
    .map((sample, index) => `Sample ${index + 1}:\n${sample.trim()}`)
    .join('\n\n')

  const contextParts = [
    `Project type: ${projectType}`,
    genre && genre.length > 0 ? `Genre: ${genre.join(', ')}` : null,
    voiceDescription ? `Voice description: ${voiceDescription}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  const prompt = `You are an expert story editor focusing on dialogue voice consistency.
Character: ${characterName}
${contextParts}

Reference dialogue samples:
${samplesText}

Target passage to evaluate:
${targetPassage}

Analyse how well the target passage matches the established voice in the samples.

Respond ONLY with valid JSON using the following schema:
{
  "voiceProfile": {
    "tone": "overall tone summary",
    "pacing": "summary of rhythm/pacing",
    "vocabulary": "notes on word choice",
    "signatureTraits": ["distinctive trait 1", "trait 2"]
  },
  "comparison": {
    "matchesVoice": true,
    "confidence": 0.0,
    "overallAssessment": "short paragraph assessment",
    "issues": [
      {
        "category": "tone|vocabulary|pacing|voice_break|other",
        "severity": "critical|major|minor|note",
        "description": "issue explanation",
        "suggestion": "optional rewrite guidance"
      }
    ]
  },
  "suggestedRevision": "If needed, provide a rewritten version of the target passage that fits the character's voice. Otherwise return the original passage."
}`

  const response = await generateWithClaude(prompt, undefined, 1200)

  const content = response.content.trim()
  let parsed: DialogueVoiceResult | null = null

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}$/)
    if (!jsonMatch) {
      throw new Error('AI response did not contain JSON')
    }
    parsed = JSON.parse(jsonMatch[0]) as DialogueVoiceResult
  } catch (error) {
    console.error('Failed to parse dialogue voice analysis JSON:', error, content)
    throw new Error('Failed to parse AI response for dialogue analysis')
  }

  // Ensure required fields exist and normalise severities
  const issues =
    parsed?.comparison?.issues?.map((issue) => ({
      ...issue,
      severity: (issue.severity || 'note').toLowerCase() as DialogueVoiceIssue['severity'],
    })) ?? []

  return {
    voiceProfile: parsed?.voiceProfile ?? {
      tone: '',
      pacing: '',
      vocabulary: '',
      signatureTraits: [],
    },
    comparison: {
      matchesVoice: Boolean(parsed?.comparison?.matchesVoice),
      confidence: Number(parsed?.comparison?.confidence ?? 0),
      overallAssessment: parsed?.comparison?.overallAssessment ?? '',
      issues,
    },
    suggestedRevision: parsed?.suggestedRevision ?? targetPassage,
    rawText: content,
  }
}
