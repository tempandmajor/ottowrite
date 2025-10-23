/**
 * Synopsis Generator
 *
 * Generates professional synopses for manuscript submissions using AI.
 * Follows industry best practices for synopsis writing.
 */

import { generateWithAI, type AIModel, type AIResponse } from '@/lib/ai/service'

export interface SynopsisGenerationRequest {
  title: string
  genre: string
  wordCount: number
  manuscriptType: string
  storyDescription: string
  targetLength?: 'short' | 'medium' | 'long' // 1-page, 2-page, or 3-5 page
  includeSubplots?: boolean
  model?: AIModel
}

export interface SynopsisGenerationResponse {
  synopsis: string
  aiResponse: AIResponse
}

/**
 * Generate a professional synopsis based on story description
 */
export async function generateSynopsis(
  request: SynopsisGenerationRequest
): Promise<SynopsisGenerationResponse> {
  const {
    title,
    genre,
    wordCount,
    manuscriptType,
    storyDescription,
    targetLength = 'medium',
    includeSubplots = true,
    model = 'claude-sonnet-4.5', // Claude is best for creative writing
  } = request

  // Construct the context for the AI
  const context = buildSynopsisContext()

  // Construct the generation prompt
  const prompt = buildSynopsisPrompt({
    title,
    genre,
    wordCount,
    manuscriptType,
    storyDescription,
    targetLength,
    includeSubplots,
  })

  // Determine token limit based on target length
  const maxTokens = getMaxTokensForLength(targetLength)

  // Generate with AI
  const aiResponse = await generateWithAI({
    model,
    prompt,
    context,
    maxTokens,
  })

  return {
    synopsis: aiResponse.content,
    aiResponse,
  }
}

/**
 * Build context for synopsis generation
 * Includes industry best practices and formatting guidelines
 */
function buildSynopsisContext(): string {
  return `You are a professional literary consultant specializing in synopsis writing for manuscript submissions.
Your expertise includes:
- Understanding synopsis structure and industry standards
- Crafting compelling story summaries that showcase plot and character arcs
- Maintaining present tense throughout
- Revealing the complete story including the ending
- Balancing detail with conciseness
- Highlighting emotional beats and stakes

Synopsis Best Practices:
1. Always use present tense (not past tense)
2. Reveal the ENTIRE plot including the ending - no cliffhangers
3. Focus on the main character's journey and transformation
4. Include major plot points and turning points
5. Show cause and effect relationships
6. Reveal character motivations and internal conflicts
7. Include key subplots that affect the main story
8. Maintain chronological order
9. Be specific - use character names, not "the protagonist"
10. Show the stakes - what happens if the character fails
11. Write in third person even if book is first person
12. Keep paragraphs focused on one scene/event each
13. Use active voice and strong verbs
14. No rhetorical questions or teasing language
15. Professional tone - this is not marketing copy

Synopsis Length Guidelines:
- Short (1 page): 500-750 words, main plot only, key turning points
- Medium (2 pages): 1000-1500 words, main plot + major subplots, character arcs
- Long (3-5 pages): 2000-3000 words, detailed plot, all subplots, full character development

Synopsis Structure:
1. Opening: Introduce protagonist, setting, initial situation
2. Inciting Incident: What disrupts the protagonist's world
3. Rising Action: Major obstacles and complications
4. Midpoint: Major revelation or turning point
5. Climax: Final confrontation or decision point
6. Resolution: How the story ends and character transformation

What to Include:
- Protagonist's goal, motivation, and stakes
- Main antagonist and their role
- Key supporting characters (if space allows)
- Major plot twists and reveals
- Emotional journey and character growth
- Ending and resolution

What to Exclude:
- Minor characters that don't affect the plot
- Excessive world-building details
- Chapter-by-chapter breakdown
- Marketing language or hooks
- Your opinion about the story
- Questions or teasing language`
}

/**
 * Build the generation prompt with story details
 */
function buildSynopsisPrompt(details: {
  title: string
  genre: string
  wordCount: number
  manuscriptType: string
  storyDescription: string
  targetLength: 'short' | 'medium' | 'long'
  includeSubplots: boolean
}): string {
  const {
    title,
    genre,
    wordCount,
    manuscriptType,
    storyDescription,
    targetLength,
    includeSubplots,
  } = details

  const lengthGuidance = {
    short: '500-750 words (1 page), focusing on main plot only with key turning points',
    medium: '1000-1500 words (2 pages), including main plot and major subplots',
    long: '2000-3000 words (3-5 pages), with detailed plot, all subplots, and full character development',
  }

  let prompt = `Write a professional synopsis for a manuscript with the following details:

Title: ${title}
Genre: ${genre}
Word Count: ${wordCount.toLocaleString()} words
Type: ${manuscriptType}

Target Synopsis Length: ${lengthGuidance[targetLength]}

Story Description:
${storyDescription}
`

  if (includeSubplots) {
    prompt += `\n\nInclude major subplots that significantly impact the main story arc.`
  } else {
    prompt += `\n\nFocus only on the main plot line.`
  }

  prompt += `

Generate a professional synopsis that:
1. Uses present tense throughout
2. Reveals the COMPLETE story including the ending
3. Follows chronological order
4. Shows the protagonist's journey from beginning to end
5. Includes all major plot points and turning points
6. Reveals character motivations and internal conflicts
7. Shows cause and effect relationships
8. Uses specific character names (infer from description)
9. Demonstrates the stakes and emotional journey
10. Maintains a professional, straightforward tone
11. Stays within the target word count range

Structure the synopsis with clear paragraphs:
- Opening paragraph: Setup and protagonist introduction
- Middle paragraphs: Major plot developments in sequence
- Final paragraph: Climax and resolution with character transformation

Output only the synopsis text, no additional commentary or meta-text.`

  return prompt
}

/**
 * Get maximum tokens based on target length
 */
function getMaxTokensForLength(length: 'short' | 'medium' | 'long'): number {
  switch (length) {
    case 'short':
      return 1200 // ~750 words
    case 'medium':
      return 2400 // ~1500 words
    case 'long':
      return 4800 // ~3000 words
    default:
      return 2400
  }
}

/**
 * Validate synopsis generation request
 */
export function validateSynopsisRequest(
  request: Partial<SynopsisGenerationRequest>
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!request.title || request.title.trim().length === 0) {
    errors.push('Title is required')
  }

  if (!request.genre || request.genre.trim().length === 0) {
    errors.push('Genre is required')
  }

  if (!request.wordCount || request.wordCount <= 0) {
    errors.push('Word count must be greater than 0')
  }

  if (!request.manuscriptType || request.manuscriptType.trim().length === 0) {
    errors.push('Manuscript type is required')
  }

  if (!request.storyDescription || request.storyDescription.trim().length < 100) {
    errors.push('Story description must be at least 100 characters')
  }

  if (
    request.targetLength &&
    !['short', 'medium', 'long'].includes(request.targetLength)
  ) {
    errors.push('Target length must be short, medium, or long')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Extract story elements from description for better synopsis generation
 */
export function analyzeStoryDescription(description: string): {
  hasProtagonist?: boolean
  hasConflict?: boolean
  hasEnding?: boolean
  estimatedCompleteness: 'minimal' | 'partial' | 'complete'
} {
  const lowerDesc = description.toLowerCase()

  // Heuristics to detect story elements
  const hasProtagonist =
    lowerDesc.includes('protagonist') ||
    lowerDesc.includes('main character') ||
    /\b(he|she|they)\b/.test(lowerDesc)

  const hasConflict =
    lowerDesc.includes('must') ||
    lowerDesc.includes('conflict') ||
    lowerDesc.includes('struggle') ||
    lowerDesc.includes('against') ||
    lowerDesc.includes('battle') ||
    lowerDesc.includes('fight')

  const hasEnding =
    lowerDesc.includes('ends') ||
    lowerDesc.includes('finally') ||
    lowerDesc.includes('resolves') ||
    lowerDesc.includes('resolution') ||
    lowerDesc.includes('conclusion')

  let estimatedCompleteness: 'minimal' | 'partial' | 'complete' = 'minimal'
  const elementCount = [hasProtagonist, hasConflict, hasEnding].filter(Boolean).length

  if (elementCount >= 3) {
    estimatedCompleteness = 'complete'
  } else if (elementCount >= 2) {
    estimatedCompleteness = 'partial'
  }

  return {
    hasProtagonist,
    hasConflict,
    hasEnding,
    estimatedCompleteness,
  }
}

/**
 * Estimate word count of synopsis from token count
 */
export function estimateWordCount(tokens: number): number {
  // Rough estimate: 1 token ≈ 0.75 words
  return Math.round(tokens * 0.75)
}

/**
 * Validate synopsis output meets requirements
 */
export function validateSynopsisOutput(
  synopsis: string,
  targetLength: 'short' | 'medium' | 'long'
): { valid: boolean; issues: string[] } {
  const issues: string[] = []

  // Check word count
  const wordCount = synopsis.split(/\s+/).length
  const ranges = {
    short: { min: 400, max: 900 },
    medium: { min: 900, max: 1700 },
    long: { min: 1700, max: 3500 },
  }

  const range = ranges[targetLength]
  if (wordCount < range.min) {
    issues.push(`Synopsis is too short (${wordCount} words, minimum ${range.min})`)
  } else if (wordCount > range.max) {
    issues.push(`Synopsis is too long (${wordCount} words, maximum ${range.max})`)
  }

  // Check for past tense (basic heuristic)
  const pastTenseWords = synopsis.match(/\b(was|were|had|did|went|came|said)\b/gi)
  if (pastTenseWords && pastTenseWords.length > wordCount * 0.1) {
    issues.push('Synopsis may contain excessive past tense (should be present tense)')
  }

  // Check for question marks (shouldn't have them)
  if (synopsis.includes('?')) {
    issues.push('Synopsis should not contain questions')
  }

  // Check for cliffhanger language
  const cliffhangerPhrases = [
    'will they',
    'can they',
    'find out',
    'discover what happens',
    'read to find out',
  ]
  const hasCliffhanger = cliffhangerPhrases.some((phrase) =>
    synopsis.toLowerCase().includes(phrase)
  )
  if (hasCliffhanger) {
    issues.push('Synopsis should reveal the ending, not tease it')
  }

  return {
    valid: issues.length === 0,
    issues,
  }
}
