/**
 * Dialogue Voice Analysis AI Service
 *
 * Analyzes character dialogue to detect:
 * - Vocabulary patterns and consistency
 * - Speech patterns and rhythm
 * - Character voice uniqueness
 * - Dialogue authenticity
 * - Inconsistencies with character profile
 */

import { generateWithAI } from './service'

export type DialogueSample = {
  text: string
  context?: string
  sceneDescription?: string
  emotionalState?: string
}

export type VoicePattern = {
  vocabularyLevel: 'simple' | 'moderate' | 'complex' | 'academic'
  sentenceStructure: 'short' | 'varied' | 'long' | 'complex'
  formalityLevel: 'casual' | 'neutral' | 'formal' | 'very-formal'
  emotionalRange: 'monotone' | 'moderate' | 'expressive' | 'dramatic'
  speechPatterns: string[]
  commonPhrases: string[]
  vocabularyTics: string[]
  speechRhythm: string
}

export type DialogueIssue = {
  type: 'vocabulary' | 'pattern' | 'consistency' | 'authenticity' | 'character-mismatch'
  severity: 'minor' | 'moderate' | 'major'
  description: string
  example: string
  suggestion: string
  location?: string
}

export type VoiceAnalysisResult = {
  overallScore: number // 0-100, how consistent/authentic the voice is
  voicePattern: VoicePattern
  uniquenessScore: number // 0-100, how distinct this character sounds
  consistencyScore: number // 0-100, how consistent across samples
  issues: DialogueIssue[]
  strengths: string[]
  characterization: string
  recommendations: string[]
}

/**
 * Analyze dialogue samples to establish character voice pattern
 */
export async function analyzeCharacterVoice(params: {
  characterName: string
  characterProfile: {
    personality?: string[]
    age?: number
    background?: string
    education?: string
    occupation?: string
  }
  dialogueSamples: DialogueSample[]
}): Promise<VoiceAnalysisResult> {
  const { characterName, characterProfile, dialogueSamples } = params

  if (dialogueSamples.length === 0) {
    throw new Error('At least one dialogue sample is required')
  }

  // Combine all dialogue samples
  const combinedDialogue = dialogueSamples
    .map((sample, idx) => {
      let text = `Sample ${idx + 1}:\n${sample.text}`
      if (sample.context) {
        text = `Context: ${sample.context}\n${text}`
      }
      return text
    })
    .join('\n\n---\n\n')

  const prompt = `You are an expert dialogue coach and character development specialist. Analyze the following dialogue samples for the character "${characterName}".

CHARACTER PROFILE:
${characterProfile.age ? `Age: ${characterProfile.age}` : ''}
${characterProfile.background ? `Background: ${characterProfile.background}` : ''}
${characterProfile.education ? `Education: ${characterProfile.education}` : ''}
${characterProfile.occupation ? `Occupation: ${characterProfile.occupation}` : ''}
${characterProfile.personality ? `Personality Traits: ${characterProfile.personality.join(', ')}` : ''}

DIALOGUE SAMPLES:
${combinedDialogue}

Analyze this character's dialogue voice and provide a comprehensive assessment. Return ONLY valid JSON (no markdown) with this exact structure:

{
  "overallScore": <0-100, overall voice quality>,
  "voicePattern": {
    "vocabularyLevel": "<simple|moderate|complex|academic>",
    "sentenceStructure": "<short|varied|long|complex>",
    "formalityLevel": "<casual|neutral|formal|very-formal>",
    "emotionalRange": "<monotone|moderate|expressive|dramatic>",
    "speechPatterns": ["list of recurring speech patterns"],
    "commonPhrases": ["frequently used phrases or expressions"],
    "vocabularyTics": ["distinctive words or verbal habits"],
    "speechRhythm": "description of pacing and rhythm"
  },
  "uniquenessScore": <0-100, how distinct this voice is>,
  "consistencyScore": <0-100, how consistent across samples>,
  "issues": [
    {
      "type": "<vocabulary|pattern|consistency|authenticity|character-mismatch>",
      "severity": "<minor|moderate|major>",
      "description": "what's wrong",
      "example": "specific example from dialogue",
      "suggestion": "how to fix it",
      "location": "which sample (optional)"
    }
  ],
  "strengths": ["list of what works well in this voice"],
  "characterization": "1-2 sentence summary of the character's voice",
  "recommendations": ["actionable suggestions to improve dialogue"]
}

Focus on:
1. Does the vocabulary match the character's education/background?
2. Are speech patterns consistent across all samples?
3. Does the voice feel authentic and distinct?
4. Are there any inconsistencies with the character profile?
5. What makes this character's voice unique?`

  const response = await generateWithAI({
    model: 'claude-sonnet-4.5', // Best for creative/character analysis
    prompt,
    maxTokens: 3000,
  })

  try {
    const result = JSON.parse(response.content)
    return result as VoiceAnalysisResult
  } catch (error) {
    console.error('Failed to parse dialogue analysis:', error)
    console.error('Raw response:', response.content)
    throw new Error('Failed to parse dialogue analysis response')
  }
}

/**
 * Compare new dialogue against established voice pattern
 */
export async function validateDialogueAgainstVoice(params: {
  characterName: string
  establishedVoice: VoicePattern
  newDialogue: string
  context?: string
}): Promise<{
  matchScore: number // 0-100, how well it matches the established voice
  issues: DialogueIssue[]
  verdict: 'perfect' | 'good' | 'needs-work' | 'off-voice'
  explanation: string
}> {
  const { characterName, establishedVoice, newDialogue, context } = params

  const prompt = `You are a dialogue consistency expert. Compare this new dialogue against the character's established voice pattern.

CHARACTER: ${characterName}

ESTABLISHED VOICE PATTERN:
- Vocabulary Level: ${establishedVoice.vocabularyLevel}
- Sentence Structure: ${establishedVoice.sentenceStructure}
- Formality: ${establishedVoice.formalityLevel}
- Emotional Range: ${establishedVoice.emotionalRange}
- Speech Patterns: ${establishedVoice.speechPatterns.join(', ')}
- Common Phrases: ${establishedVoice.commonPhrases.join(', ')}
- Vocabulary Tics: ${establishedVoice.vocabularyTics.join(', ')}
- Speech Rhythm: ${establishedVoice.speechRhythm}

NEW DIALOGUE TO VALIDATE:
${context ? `Context: ${context}\n` : ''}${newDialogue}

Return ONLY valid JSON (no markdown):
{
  "matchScore": <0-100>,
  "issues": [
    {
      "type": "<vocabulary|pattern|consistency|authenticity|character-mismatch>",
      "severity": "<minor|moderate|major>",
      "description": "what doesn't match",
      "example": "specific problematic phrase",
      "suggestion": "how to fix it"
    }
  ],
  "verdict": "<perfect|good|needs-work|off-voice>",
  "explanation": "1-2 sentence summary of whether this sounds like the character"
}`

  const response = await generateWithAI({
    model: 'claude-sonnet-4.5',
    prompt,
    maxTokens: 1500,
  })

  try {
    return JSON.parse(response.content)
  } catch (error) {
    console.error('Failed to parse dialogue validation:', error)
    throw new Error('Failed to parse dialogue validation response')
  }
}

/**
 * Suggest dialogue revisions to match character voice
 */
export async function suggestVoiceCorrection(params: {
  characterName: string
  voicePattern: VoicePattern
  problematicDialogue: string
  context?: string
}): Promise<{
  original: string
  revised: string[]
  explanation: string
  keyChanges: string[]
}> {
  const { characterName, voicePattern, problematicDialogue, context } = params

  const prompt = `You are a dialogue editor. Revise this dialogue to match the character's established voice.

CHARACTER: ${characterName}

VOICE PATTERN:
- Vocabulary: ${voicePattern.vocabularyLevel}
- Structure: ${voicePattern.sentenceStructure}
- Formality: ${voicePattern.formalityLevel}
- Patterns: ${voicePattern.speechPatterns.join(', ')}

${context ? `CONTEXT: ${context}\n` : ''}
DIALOGUE TO FIX:
"${problematicDialogue}"

Provide 2-3 alternative versions that match this character's voice better. Return ONLY valid JSON:
{
  "original": "${problematicDialogue}",
  "revised": ["version 1", "version 2", "version 3"],
  "explanation": "why these versions are better",
  "keyChanges": ["specific changes made"]
}`

  const response = await generateWithAI({
    model: 'claude-sonnet-4.5',
    prompt,
    maxTokens: 1000,
  })

  try {
    return JSON.parse(response.content)
  } catch (error) {
    console.error('Failed to parse dialogue correction:', error)
    throw new Error('Failed to parse dialogue correction response')
  }
}
