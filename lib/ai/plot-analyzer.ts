import Anthropic from '@anthropic-ai/sdk'

export type AnalysisType = 'full' | 'timeline' | 'character' | 'logic' | 'quick'

export type IssueSeverity = 'critical' | 'major' | 'minor' | 'suggestion'

export type IssueCategory =
  | 'timeline'
  | 'character_continuity'
  | 'logic'
  | 'setup_payoff'
  | 'consistency'
  | 'other'

export type PlotIssue = {
  severity: IssueSeverity
  category: IssueCategory
  title: string
  description: string
  location?: string
  lineReference?: string
  suggestion?: string
}

export type PlotAnalysisResult = {
  issues: PlotIssue[]
  summary: string
  wordCount: number
  model: string
}

export type AnalysisOptions = {
  content: string
  analysisType: AnalysisType
  projectType?: string
  existingCharacters?: string[]
  existingLocations?: string[]
  previousContent?: string
}

const analysisPrompts: Record<AnalysisType, string> = {
  full: `Perform a comprehensive plot analysis. Check for:
1. **Timeline Issues** - Events out of order, impossible timelines, time travel inconsistencies
2. **Character Continuity** - Character knowledge they shouldn't have, personality shifts, forgotten traits
3. **Logic Gaps** - Unexplained events, contradictions, deus ex machina
4. **Setup/Payoff** - Chekhov's guns not fired, payoffs without setup, abandoned plot threads
5. **Consistency** - Setting details that change, rule-breaking, world-building contradictions

Be thorough but fair. Only flag genuine issues that would confuse readers.`,

  timeline: `Focus exclusively on timeline and chronology issues:
- Events happening in impossible order
- Time passing inconsistently
- Characters being in two places at once
- Date/time contradictions
- Age inconsistencies
- Flashback/flash-forward confusion

Trace the chronological order carefully and flag any impossibilities.`,

  character: `Focus exclusively on character continuity:
- Characters knowing information they shouldn't
- Personality changes without explanation
- Forgotten character traits or backstory
- Characters appearing in impossible places
- Relationship inconsistencies
- Character arc contradictions

Track each character's knowledge, location, and development carefully.`,

  logic: `Focus exclusively on logical consistency:
- Plot holes (events that don't make sense)
- Contradictions in world rules
- Impossible physics or magic
- Unexplained coincidences
- Deus ex machina solutions
- Causality violations

Question the internal logic rigorously but fairly.`,

  quick: `Perform a quick scan for obvious issues:
- Major timeline problems
- Glaring character contradictions
- Critical logic gaps
- Missing payoffs for major setups

Focus on high-severity issues only. Skip minor nitpicks.`,
}

export async function analyzePlotHoles(
  options: AnalysisOptions
): Promise<PlotAnalysisResult> {
  const { content, analysisType, projectType, existingCharacters, previousContent } = options

  // Initialize Anthropic client
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })

  // Count words
  const wordCount = content.split(/\s+/).length

  // Build context
  const contextInfo = []
  if (projectType) {
    contextInfo.push(`Project Type: ${projectType.replace('_', ' ')}`)
  }
  if (existingCharacters && existingCharacters.length > 0) {
    contextInfo.push(`Known Characters: ${existingCharacters.join(', ')}`)
  }
  if (previousContent) {
    contextInfo.push(`Previous Content Provided: Yes (for continuity checking)`)
  }

  const systemPrompt = `You are an expert story editor specializing in plot consistency and continuity. Your job is to identify plot holes, timeline issues, character continuity problems, and logical inconsistencies in manuscripts.

${analysisPrompts[analysisType]}

**Severity Levels:**
- **critical**: Story-breaking issues that confuse readers
- **major**: Significant problems that hurt credibility
- **minor**: Small inconsistencies worth noting
- **suggestion**: Potential improvements, not errors

**Important Guidelines:**
1. Only flag genuine issues, not stylistic choices
2. Consider genre conventions (e.g., fantasy can have magic)
3. Be specific about what's wrong and where
4. Provide actionable suggestions
5. Track continuity carefully across the entire text
6. Consider reader knowledge vs. character knowledge

Output your analysis as valid JSON with this structure:
{
  "summary": "Brief overview of findings (2-3 sentences)",
  "issues": [
    {
      "severity": "critical|major|minor|suggestion",
      "category": "timeline|character_continuity|logic|setup_payoff|consistency|other",
      "title": "Short issue title",
      "description": "Detailed explanation of the problem",
      "location": "Where in the text (e.g., 'Chapter 3, Scene 2')",
      "lineReference": "Relevant quote or line reference",
      "suggestion": "How to fix it"
    }
  ]
}`

  const userPrompt = `${contextInfo.length > 0 ? `CONTEXT:\n${contextInfo.join('\n')}\n\n` : ''}${
    previousContent
      ? `PREVIOUS CONTENT (for continuity reference):\n${previousContent.slice(0, 3000)}...\n\n---\n\n`
      : ''
  }CONTENT TO ANALYZE:\n\n${content}

Please analyze this content for plot holes and continuity issues. Return valid JSON only.`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514', // Claude 4.5 Sonnet
      max_tokens: 16000,
      temperature: 0.3, // Lower temperature for more consistent analysis
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    })

    // Extract JSON response
    const content_block = message.content[0]
    if (content_block.type !== 'text') {
      throw new Error('Unexpected response type from AI')
    }

    // Parse JSON
    const jsonMatch = content_block.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Could not parse AI response as JSON')
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      summary: string
      issues: PlotIssue[]
    }

    return {
      summary: parsed.summary,
      issues: parsed.issues || [],
      wordCount,
      model: 'claude-sonnet-4-20250514',
    }
  } catch (error) {
    console.error('Error analyzing plot holes:', error)
    throw new Error(
      `Failed to analyze plot: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

// Helper function to extract text content from document
export function extractTextContent(documentContent: any): string {
  if (!documentContent) return ''

  // Handle prose content (Tiptap HTML)
  if (documentContent.html) {
    // Strip HTML tags for analysis
    return documentContent.html
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim()
  }

  // Handle screenplay content
  if (documentContent.screenplay && Array.isArray(documentContent.screenplay)) {
    return documentContent.screenplay
      .map((element: any) => {
        if (element.type === 'scene' && element.content) {
          return `SCENE: ${element.content}\n`
        }
        if (element.content) {
          return `${element.content}\n`
        }
        return ''
      })
      .join('\n')
      .trim()
  }

  return ''
}

// Helper to format severity for display
export function getSeverityColor(severity: IssueSeverity): string {
  const colors: Record<IssueSeverity, string> = {
    critical: 'bg-red-100 text-red-800',
    major: 'bg-orange-100 text-orange-800',
    minor: 'bg-yellow-100 text-yellow-800',
    suggestion: 'bg-blue-100 text-blue-800',
  }
  return colors[severity] || 'bg-gray-100 text-gray-800'
}

// Helper to format category for display
export function getCategoryLabel(category: IssueCategory): string {
  const labels: Record<IssueCategory, string> = {
    timeline: 'Timeline',
    character_continuity: 'Character Continuity',
    logic: 'Logic',
    setup_payoff: 'Setup/Payoff',
    consistency: 'Consistency',
    other: 'Other',
  }
  return labels[category] || 'Other'
}
