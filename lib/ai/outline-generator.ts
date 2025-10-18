import Anthropic from '@anthropic-ai/sdk'

export type OutlineFormat = 'chapter_summary' | 'scene_by_scene' | 'treatment' | 'beat_outline' | 'custom'

export type OutlineGenerationOptions = {
  premise: string
  format: OutlineFormat
  projectType: string
  genre?: string[] | null
  additionalContext?: string
  existingContent?: any
}

export type OutlineSection = {
  type: 'chapter' | 'scene' | 'act' | 'sequence' | 'custom'
  order: number
  title: string
  description: string
  notes?: string
  wordCountTarget?: number
  pageCountTarget?: number
  characters?: string[]
  locations?: string[]
  plotPoints?: string[]
}

export type GeneratedOutline = {
  title: string
  sections: OutlineSection[]
  model: string
}

// Format-specific prompts
const formatPrompts: Record<OutlineFormat, string> = {
  chapter_summary: `Generate a chapter-by-chapter outline. For each chapter, provide:
- Chapter number and title
- Brief description (2-3 sentences) of what happens
- Key plot points and character developments
- Approximate word count target (based on typical chapter length)

Structure each chapter to advance the story while maintaining pacing.`,

  scene_by_scene: `Generate a detailed scene-by-scene breakdown. For each scene, provide:
- Scene number and title
- Location and time of day
- Characters present
- Scene objective and conflict
- Key dialogue or action beats
- How it advances the plot
- Approximate page count (screenplay) or word count (prose)

Focus on visual storytelling and dramatic structure.`,

  treatment: `Generate a treatment (narrative prose outline). Create a flowing narrative description that includes:
- Opening sequence and hook
- Character introductions and motivations
- Major plot points and turning points
- Act structure and pacing
- Thematic elements
- Climax and resolution
- Overall tone and style

Write in present tense, vivid prose that conveys the story's emotional journey.`,

  beat_outline: `Generate a beat-based outline using story structure principles. For each beat, provide:
- Beat name and structural position (e.g., "Inciting Incident - 12%")
- What happens at this story milestone
- Character state/arc at this point
- Thematic significance
- Page/chapter target

Use appropriate structure (Save the Cat, Hero's Journey, Three-Act, etc.) based on the project type.`,

  custom: `Generate a flexible outline structure. Organize the story in the way that best serves the narrative, which might include:
- Acts, sequences, or movements
- Key story moments and transitions
- Character arcs and relationships
- Thematic through-lines
- Subplots and B-stories

Adapt the structure to the specific needs of this project.`,
}

export async function generateOutline(
  options: OutlineGenerationOptions
): Promise<GeneratedOutline> {
  const {
    premise,
    format,
    projectType,
    genre,
    additionalContext,
    existingContent,
  } = options

  // Initialize Anthropic client with API key from environment
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })

  // Build context about the project
  const genreText = genre && genre.length > 0 ? genre.join(', ') : 'general'
  const projectTypeLabel = projectType.replace('_', ' ')

  // Determine appropriate target counts based on project type
  const targetInfo = getTargetInfo(projectType, format)

  // Build the prompt
  const systemPrompt = `You are an expert story development assistant specializing in creating detailed, professional outlines for writers. You understand narrative structure, pacing, character development, and genre conventions.

Your task is to generate a ${format.replace('_', ' ')} outline for a ${projectTypeLabel} project.

${formatPrompts[format]}

Guidelines:
- Be specific and actionable
- Consider genre conventions for ${genreText}
- Maintain proper pacing and story structure
- Include enough detail to guide writing without being prescriptive
- Target ${targetInfo}
- Each section should feel complete but leave room for creative discovery

Output your response as a valid JSON object with this structure:
{
  "title": "Outline Title",
  "sections": [
    {
      "type": "chapter|scene|act|sequence|custom",
      "order": 1,
      "title": "Section Title",
      "description": "Detailed description of what happens",
      "notes": "Optional notes about tone, themes, or approach",
      "wordCountTarget": 3000,
      "pageCountTarget": 12,
      "characters": ["Character names present"],
      "locations": ["Where it takes place"],
      "plotPoints": ["Key story beats"]
    }
  ]
}`

  const userPrompt = `Project Type: ${projectTypeLabel}
Genre: ${genreText}
Format: ${format.replace('_', ' ')}

PREMISE:
${premise}

${additionalContext ? `ADDITIONAL CONTEXT:\n${additionalContext}\n\n` : ''}${
    existingContent
      ? `EXISTING CONTENT TO CONSIDER:\n${JSON.stringify(existingContent, null, 2).slice(0, 1000)}...\n\n`
      : ''
  }Generate a comprehensive ${format.replace('_', ' ')} outline that brings this premise to life.`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514', // Claude 4.5 Sonnet
      max_tokens: 16000,
      temperature: 0.7,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    })

    // Extract the JSON response
    const content = message.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from AI')
    }

    // Parse the JSON response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Could not parse AI response as JSON')
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      title: string
      sections: OutlineSection[]
    }

    return {
      title: parsed.title,
      sections: parsed.sections,
      model: 'claude-sonnet-4-20250514',
    }
  } catch (error) {
    console.error('Error generating outline with AI:', error)
    throw new Error(
      `Failed to generate outline: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

function getTargetInfo(projectType: string, format: OutlineFormat): string {
  const targets: Record<string, Record<OutlineFormat, string>> = {
    screenplay: {
      chapter_summary: '90-120 pages total, organized into sequences',
      scene_by_scene: '40-60 scenes, 2-3 pages per scene on average',
      treatment: '10-15 pages of narrative prose',
      beat_outline: '12-15 major story beats following screenplay structure',
      custom: '120 pages total, standard screenplay format',
    },
    novel: {
      chapter_summary: '80,000-100,000 words, 25-30 chapters',
      scene_by_scene: '60-80 scenes, 2-4 scenes per chapter',
      treatment: '5,000-8,000 word narrative outline',
      beat_outline: '15-20 major story beats following novel structure',
      custom: '80,000-100,000 words total',
    },
    series: {
      chapter_summary: '300,000+ words across multiple books, focus on first book structure',
      scene_by_scene: '200+ scenes total, break down first book in detail',
      treatment: '15,000-20,000 word series bible and first book outline',
      beat_outline: 'Series arc with 5-7 major turning points, plus first book detail',
      custom: 'Multi-book series structure',
    },
    play: {
      chapter_summary: '2-3 acts, 90-120 minutes stage time',
      scene_by_scene: '12-20 scenes across 2-3 acts',
      treatment: '8-12 pages describing the dramatic action',
      beat_outline: '10-12 major dramatic beats',
      custom: '90-120 minutes of stage time',
    },
    short_story: {
      chapter_summary: '3,000-7,500 words, 3-5 major sections',
      scene_by_scene: '5-10 scenes total',
      treatment: '1,000-2,000 word narrative outline',
      beat_outline: '5-8 key story beats',
      custom: '3,000-7,500 words total',
    },
  }

  return targets[projectType]?.[format] || 'appropriate length for the format'
}

// Helper function to convert outline to document sections
export function outlineToDocumentSections(outline: GeneratedOutline) {
  return outline.sections.map((section) => ({
    title: section.title,
    description: section.description,
    type: section.type,
    wordCountTarget: section.wordCountTarget || 0,
    pageCountTarget: section.pageCountTarget || 0,
    metadata: {
      characters: section.characters || [],
      locations: section.locations || [],
      plotPoints: section.plotPoints || [],
      notes: section.notes || '',
    },
  }))
}
