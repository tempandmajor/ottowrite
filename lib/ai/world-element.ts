import { generateWithClaude } from '@/lib/ai/service'

export type WorldElementType =
  | 'location'
  | 'culture'
  | 'faction'
  | 'magic_system'
  | 'technology'
  | 'history'
  | 'language'
  | 'artifact'
  | 'other'

export type GenerateWorldElementParams = {
  projectType: string
  genre?: string[] | null
  type: WorldElementType
  prompt: string
  existingElements?: Array<{ name: string; type: string; summary?: string }>
}

export type GeneratedWorldElement = {
  name: string
  summary: string
  description: string
  tags: string[]
  properties: Record<string, unknown>
  related?: Array<{ name: string; relationship: string }>
}

const TYPE_DESCRIPTIONS: Record<WorldElementType, string> = {
  location:
    'Places, settlements, regions, or realms. Include geography, purpose, and atmosphere.',
  culture:
    'Societies, groups, or species. Include customs, values, power structures, and conflicts.',
  faction:
    'Organizations, guilds, orders, or political groups. Include goals, leadership, resources.',
  magic_system:
    'Magic or supernatural systems. Include rules, costs, limitations, manifestations.',
  technology:
    'Technologies or scientific breakthroughs. Include function, availability, limitations.',
  history:
    'Historical events or eras. Include causes, key figures, outcomes, cultural impact.',
  language:
    'Languages or communication systems. Include phonetics, writing, quirks, cultural significance.',
  artifact:
    'Items of power or importance. Include origin, abilities, limitations, and story role.',
  other:
    'Freeform world element. Provide whatever is necessary for the story.',
}

const OUTPUT_SCHEMA = `{
  "name": "Element name",
  "summary": "Short pitch (2 sentences)",
  "description": "Detailed description in 3-5 paragraphs",
  "tags": ["tag1", "tag2"],
  "properties": {
    "key": "value",
    "optional": ["structured", "data"]
  },
  "related": [
    {
      "name": "Related element name",
      "relationship": "How it connects"
    }
  ]
}`

export async function generateWorldElement(
  params: GenerateWorldElementParams
): Promise<GeneratedWorldElement> {
  const { projectType, genre, type, prompt, existingElements } = params

  const systemContext = `You are an imaginative world-building assistant for an AI-native writing platform.
Generate cohesive, story-ready world elements tailored to the author's project.`

  const instructions = `Project type: ${projectType}
Genre: ${genre && genre.length > 0 ? genre.join(', ') : 'General'}
Element type: ${type}
Type guidance: ${TYPE_DESCRIPTIONS[type]}

User prompt:
${prompt}

$${existingElements && existingElements.length > 0 ? `Existing elements to avoid contradictions:
${existingElements
      .map((element) => `- ${element.name} (${element.type}): ${element.summary ?? 'No summary'}`)
      .join('\n')}
` : ''}Ensure the new element fits coherently with any existing entries. Be concrete and evocative while leaving room for expansion.
Return ONLY JSON matching this schema:
${OUTPUT_SCHEMA}`

  const response = await generateWithClaude(instructions, systemContext, 2000)
  const text = response.content.trim()

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}$/)
    if (!jsonMatch) {
      throw new Error('Could not extract JSON from AI response')
    }
    const parsed = JSON.parse(jsonMatch[0]) as GeneratedWorldElement

    return {
      name: parsed.name?.trim() || 'Untitled element',
      summary: parsed.summary?.trim() || '',
      description: parsed.description?.trim() || '',
      tags: Array.isArray(parsed.tags) ? parsed.tags.filter(Boolean) : [],
      properties:
        parsed.properties && typeof parsed.properties === 'object' ? parsed.properties : {},
      related: Array.isArray(parsed.related) ? parsed.related : [],
    }
  } catch (error) {
    console.error('Failed to parse world element generation response:', error, text)
    throw new Error('AI generation returned an unexpected format. Please try again.')
  }
}
