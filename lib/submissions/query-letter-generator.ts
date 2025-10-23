/**
 * Query Letter Generator
 *
 * Generates professional query letters for manuscript submissions using AI.
 * Follows industry best practices for literary agent queries.
 */

import { generateWithAI, type AIModel, type AIResponse } from '@/lib/ai/service'

export interface QueryLetterGenerationRequest {
  title: string
  genre: string
  wordCount: number
  manuscriptType: string
  synopsis: string
  authorName?: string
  previousPublications?: string
  targetAgent?: string
  model?: AIModel
}

export interface QueryLetterGenerationResponse {
  queryLetter: string
  aiResponse: AIResponse
}

/**
 * Generate a professional query letter based on manuscript details
 */
export async function generateQueryLetter(
  request: QueryLetterGenerationRequest
): Promise<QueryLetterGenerationResponse> {
  const {
    title,
    genre,
    wordCount,
    manuscriptType,
    synopsis,
    authorName,
    previousPublications,
    targetAgent,
    model = 'claude-sonnet-4.5', // Claude is best for creative writing
  } = request

  // Construct the context for the AI
  const context = buildQueryLetterContext()

  // Construct the generation prompt
  const prompt = buildQueryLetterPrompt({
    title,
    genre,
    wordCount,
    manuscriptType,
    synopsis,
    authorName,
    previousPublications,
    targetAgent,
  })

  // Generate with AI
  const aiResponse = await generateWithAI({
    model,
    prompt,
    context,
    maxTokens: 1500, // Query letters are typically 250-400 words
  })

  return {
    queryLetter: aiResponse.content,
    aiResponse,
  }
}

/**
 * Build context for query letter generation
 * Includes industry best practices and formatting guidelines
 */
function buildQueryLetterContext(): string {
  return `You are a professional literary agent consultant specializing in query letter writing.
Your expertise includes:
- Understanding query letter structure and industry standards
- Crafting compelling hooks and story pitches
- Maintaining professional tone while showcasing voice
- Following agent submission guidelines
- Creating personalized, authentic letters

Query Letter Best Practices:
1. Keep it to one page (250-400 words)
2. Start with a personalized greeting (if agent name provided)
3. Open with a strong hook - the story's most compelling element
4. Provide genre, word count, and manuscript type
5. Summarize the story in 2-3 paragraphs (focus on protagonist, conflict, stakes)
6. Keep it in present tense
7. Show your unique voice but maintain professionalism
8. End with a brief author bio (credentials, publications, relevant background)
9. Thank them for their time and consideration
10. No rhetorical questions or clichés

Query Letter Structure:
- Paragraph 1: Personalization + Hook + Housekeeping (genre, word count, type)
- Paragraph 2-3: Story summary (protagonist, conflict, stakes)
- Paragraph 4: Author bio (relevant credentials only)
- Closing: Thank you + contact information placeholder

Tone Guidelines:
- Professional but not stiff
- Confident but not arrogant
- Enthusiastic but not desperate
- Clear and concise
- Show your unique writing voice`
}

/**
 * Build the generation prompt with manuscript details
 */
function buildQueryLetterPrompt(details: {
  title: string
  genre: string
  wordCount: number
  manuscriptType: string
  synopsis: string
  authorName?: string
  previousPublications?: string
  targetAgent?: string
}): string {
  const {
    title,
    genre,
    wordCount,
    manuscriptType,
    synopsis,
    authorName,
    previousPublications,
    targetAgent,
  } = details

  let prompt = `Write a professional query letter for a manuscript with the following details:

Title: ${title}
Genre: ${genre}
Word Count: ${wordCount.toLocaleString()} words
Type: ${manuscriptType}

Story Synopsis:
${synopsis}
`

  if (targetAgent) {
    prompt += `\nTarget Agent: ${targetAgent}
(Include a personalized greeting and mention why this agent is a good fit)`
  } else {
    prompt += `\n(Use "Dear Agent" as greeting since no specific agent is targeted)`
  }

  if (authorName) {
    prompt += `\n\nAuthor Name: ${authorName}`
  }

  if (previousPublications) {
    prompt += `\n\nPrevious Publications/Credentials:
${previousPublications}`
  } else {
    prompt += `\n\n(This is the author's first submission - focus on the story's strengths and relevant background if applicable)`
  }

  prompt += `

Generate a compelling query letter that:
1. Hooks the agent immediately with the most interesting aspect of the story
2. Clearly conveys the genre, word count, and manuscript type
3. Summarizes the story focusing on the protagonist, their conflict, and the stakes
4. Maintains a professional yet engaging tone that shows the author's unique voice
5. Includes a brief author bio (even if it's minimal)
6. Stays within 250-400 words
7. Uses present tense for the story description
8. Ends with appropriate closing and "[Author contact information]" placeholder

Output only the query letter text, no additional commentary.`

  return prompt
}

/**
 * Validate query letter generation request
 */
export function validateQueryLetterRequest(
  request: Partial<QueryLetterGenerationRequest>
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

  if (!request.synopsis || request.synopsis.trim().length < 100) {
    errors.push('Synopsis must be at least 100 characters')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Extract key story elements from synopsis for better query generation
 * This helps identify protagonist, conflict, and stakes
 */
export function analyzeSynopsis(synopsis: string): {
  protagonist?: string
  conflict?: string
  stakes?: string
} {
  // This is a simple heuristic-based extraction
  // In a production system, you might use NLP or a separate AI call

  const sentences = synopsis.split(/[.!?]+/).filter((s) => s.trim().length > 0)

  // First sentence often introduces protagonist
  const protagonist = sentences[0]?.trim() || undefined

  // Middle sentences often describe conflict
  const conflict = sentences.slice(1, -1).join('. ').trim() || undefined

  // Last sentence often reveals stakes
  const stakes = sentences[sentences.length - 1]?.trim() || undefined

  return { protagonist, conflict, stakes }
}
