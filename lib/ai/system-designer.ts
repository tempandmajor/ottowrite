import { generateWithClaude } from '@/lib/ai/service'
import type { SystemDesign } from '@/components/world/system-designer'

type GenerateSystemDesignParams = {
  projectId: string
  type: 'magic' | 'technology'
  prompt: string
  existingNotes?: string
}

const OUTPUT_SCHEMA = `{
  "rules": "How the system works at a high level",
  "costs": "What it costs users to wield it",
  "limitations": "Hard limits and what it cannot do",
  "failureModes": "How it breaks or backlash occurs",
  "applications": "Notable everyday and dramatic uses",
  "conflicts": "Story conflicts or hooks arising from it",
  "tags": ["concise", "tags"]
}`

export async function generateSystemDesign({ projectId, type, prompt, existingNotes }: GenerateSystemDesignParams): Promise<SystemDesign> {
  const systemMessage = `You are an expert narrative designer building ${type === 'magic' ? 'magic systems' : 'speculative technologies'} for writers.
Structure your answer thoughtfully so authors can paste results into a world bible.`

  const userMessage = `Project ID: ${projectId}
System type: ${type}

Design brief:
${prompt.trim()}

${existingNotes ? `Existing notes to respect:
${existingNotes.trim()}
` : ''}
Return ONLY valid JSON matching this schema:
${OUTPUT_SCHEMA}`

  const response = await generateWithClaude(userMessage, systemMessage, 1600)
  const text = response.content.trim()

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}$/)
    if (!jsonMatch) {
      throw new Error('AI response did not include JSON output.')
    }
    const parsed = JSON.parse(jsonMatch[0]) as SystemDesign

    return {
      rules: parsed.rules?.trim() ?? '',
      costs: parsed.costs?.trim() ?? '',
      limitations: parsed.limitations?.trim() ?? '',
      failureModes: parsed.failureModes?.trim() ?? '',
      applications: parsed.applications?.trim() ?? '',
      conflicts: parsed.conflicts?.trim() ?? '',
      tags: Array.isArray(parsed.tags) ? parsed.tags.filter(Boolean) : [],
    }
  } catch (error) {
    console.error('Failed to parse system design response:', error, text)
    throw new Error('AI generation returned an unexpected format. Try a different prompt.')
  }
}
