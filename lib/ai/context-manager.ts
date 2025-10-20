import { formatDistanceToNow } from 'date-fns'

export type StoryBibleImportance = 'main' | 'supporting' | 'minor'

export type StoryBibleEntry = {
  id: string
  name: string
  entityType: 'character' | 'location' | 'faction' | 'object' | 'concept'
  summary: string
  traits?: string[]
  lastKnownStatus?: string
  importance: StoryBibleImportance
  updatedAt?: string
  tags?: string[]
}

export type TimelineEvent = {
  id: string
  title: string
  summary: string
  timestamp: string
  importance: 'major' | 'minor'
  location?: string
}

export type ContextExcerpt = {
  id: string
  label: string
  content: string
  source: 'scene' | 'chapter' | 'note' | 'analysis'
  createdAt: string
}

export type ProjectMetadata = {
  projectId: string
  title: string
  genre?: string
  pov?: string
  tone?: string
  setting?: string
}

export type ContextBundle = {
  project: ProjectMetadata | null
  storyBible: StoryBibleEntry[]
  timeline: TimelineEvent[]
  recentExcerpts: ContextExcerpt[]
  warnings: string[]
}

export type BuildContextParams = {
  project?: ProjectMetadata | null
  storyBible?: StoryBibleEntry[]
  timeline?: TimelineEvent[]
  recentExcerpts?: ContextExcerpt[]
  tokenBudget?: number
}

export type ContextPromptOptions = {
  maxTokens: number
  reserveTokens?: number
  includeTimeline?: boolean
  includeExcerpts?: boolean
}

export type GeneratedContext = {
  prompt: string
  usedTokens: number
  omittedEntries: Array<StoryBibleEntry | TimelineEvent | ContextExcerpt>
}

export type ContextPreview = {
  project: ProjectMetadata | null
  topCharacters: StoryBibleEntry[]
  topLocations: StoryBibleEntry[]
  upcomingEvents: TimelineEvent[]
  recentExcerpts: ContextExcerpt[]
}

const IMPORTANCE_WEIGHT: Record<StoryBibleImportance, number> = {
  main: 3,
  supporting: 2,
  minor: 1,
}

const EVENT_WEIGHT = {
  major: 2,
  minor: 1,
} as const

export function buildContextBundle(params: BuildContextParams): ContextBundle {
  const {
    project = null,
    storyBible = [],
    timeline = [],
    recentExcerpts = [],
    tokenBudget = 4000,
  } = params

  const bundle: ContextBundle = {
    project,
    storyBible: [...storyBible],
    timeline: [...timeline],
    recentExcerpts: [...recentExcerpts],
    warnings: [],
  }

  const totalTokensEstimate =
    estimateEntriesTokens(bundle.storyBible) +
    estimateTimelineTokens(bundle.timeline) +
    estimateExcerptsTokens(bundle.recentExcerpts)

  if (totalTokensEstimate > tokenBudget) {
    bundle.storyBible = pruneStoryBible(bundle.storyBible, Math.floor(tokenBudget * 0.6))
    bundle.timeline = pruneTimeline(bundle.timeline, Math.floor(tokenBudget * 0.25))
    bundle.recentExcerpts = pruneExcerpts(bundle.recentExcerpts, Math.floor(tokenBudget * 0.15))
    bundle.warnings.push(
      `Context trimmed to fit token budget (~${tokenBudget} tokens). Some lower-priority entries were omitted.`
    )
  }

  return bundle
}

export function generateContextPrompt(
  bundle: ContextBundle,
  options: ContextPromptOptions
): GeneratedContext {
  const {
    maxTokens,
    reserveTokens = 0,
    includeTimeline = true,
    includeExcerpts = true,
  } = options

  const sections: string[] = []
  const omitted: Array<StoryBibleEntry | TimelineEvent | ContextExcerpt> = []

  if (bundle.project) {
    sections.push(renderProjectMetadata(bundle.project))
  }

  const { rendered: storyBibleSection, omittedEntries: omittedBible } = renderStoryBible(
    bundle.storyBible,
    maxTokens - reserveTokens
  )
  sections.push(storyBibleSection)
  omitted.push(...omittedBible)

  if (includeTimeline) {
    const { rendered, omittedEntries } = renderTimeline(
      bundle.timeline,
      maxTokens - reserveTokens - estimateTokens(sections.join('\n\n'))
    )
    if (rendered) {
      sections.push(rendered)
    }
    omitted.push(...omittedEntries)
  }

  if (includeExcerpts) {
    const { rendered, omittedEntries } = renderExcerpts(
      bundle.recentExcerpts,
      maxTokens - reserveTokens - estimateTokens(sections.join('\n\n'))
    )
    if (rendered) {
      sections.push(rendered)
    }
    omitted.push(...omittedEntries)
  }

  const prompt = sections.filter(Boolean).join('\n\n')
  return {
    prompt,
    usedTokens: estimateTokens(prompt),
    omittedEntries: omitted,
  }
}

export function buildContextPreview(bundle: ContextBundle, maxPerCategory = 3): ContextPreview {
  const topCharacters = bundle.storyBible
    .filter((entry) => entry.entityType === 'character')
    .sort((a, b) => scoreStoryBible(b) - scoreStoryBible(a))
    .slice(0, maxPerCategory)

  const topLocations = bundle.storyBible
    .filter((entry) => entry.entityType === 'location')
    .sort((a, b) => scoreStoryBible(b) - scoreStoryBible(a))
    .slice(0, maxPerCategory)

  const upcomingEvents = [...bundle.timeline]
    .sort((a, b) => getEventTime(a) - getEventTime(b))
    .slice(0, maxPerCategory)

  const recentExcerpts = [...bundle.recentExcerpts]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, maxPerCategory)

  return {
    project: bundle.project,
    topCharacters,
    topLocations,
    upcomingEvents,
    recentExcerpts,
  }
}

function pruneStoryBible(entries: StoryBibleEntry[], tokenBudget: number): StoryBibleEntry[] {
  const sorted = [...entries].sort((a, b) => scoreStoryBible(b) - scoreStoryBible(a))
  const kept: StoryBibleEntry[] = []
  let tokens = 0
  for (const entry of sorted) {
    const entryTokens = estimateTokens(entry.summary) + (entry.traits?.length ?? 0) * 4
    if (tokens + entryTokens > tokenBudget) {
      continue
    }
    kept.push(entry)
    tokens += entryTokens
  }
  return kept
}

function pruneTimeline(events: TimelineEvent[], tokenBudget: number): TimelineEvent[] {
  const sorted = [...events].sort((a, b) => {
    const importanceDiff = EVENT_WEIGHT[b.importance] - EVENT_WEIGHT[a.importance]
    return importanceDiff !== 0 ? importanceDiff : getEventTime(a) - getEventTime(b)
  })
  const kept: TimelineEvent[] = []
  let tokens = 0
  for (const event of sorted) {
    const eventTokens = estimateTokens(event.summary) + 6
    if (tokens + eventTokens > tokenBudget) {
      continue
    }
    kept.push(event)
    tokens += eventTokens
  }
  return kept.sort((a, b) => getEventTime(a) - getEventTime(b))
}

function pruneExcerpts(excerpts: ContextExcerpt[], tokenBudget: number): ContextExcerpt[] {
  const sorted = [...excerpts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  const kept: ContextExcerpt[] = []
  let tokens = 0
  for (const excerpt of sorted) {
    const excerptTokens = estimateTokens(excerpt.content)
    if (tokens + excerptTokens > tokenBudget) {
      continue
    }
    kept.push(excerpt)
    tokens += excerptTokens
  }
  return kept
}

function renderProjectMetadata(project: ProjectMetadata): string {
  const lines = [`PROJECT: ${project.title}`]
  if (project.genre) lines.push(`Genre: ${project.genre}`)
  if (project.pov) lines.push(`POV: ${project.pov}`)
  if (project.tone) lines.push(`Tone: ${project.tone}`)
  if (project.setting) lines.push(`Setting: ${project.setting}`)
  return lines.join('\n')
}

function renderStoryBible(
  entries: StoryBibleEntry[],
  tokenBudget: number
): { rendered: string; omittedEntries: StoryBibleEntry[] } {
  const grouped = groupByEntityType(entries)
  const sections: string[] = []
  const omitted: StoryBibleEntry[] = []

  for (const [entityType, items] of grouped) {
    let section = `STORY BIBLE – ${entityType.toUpperCase()}`
    for (const entry of items) {
      const traits = entry.traits?.length ? `Traits: ${entry.traits.join(', ')}\n` : ''
      const status = entry.lastKnownStatus ? `Status: ${entry.lastKnownStatus}\n` : ''
      const body = `${entry.name}\n${traits}${status}Summary: ${entry.summary}`
      const entryTokens = estimateTokens(section + '\n' + body)
      if (entryTokens > tokenBudget) {
        omitted.push(entry)
        continue
      }
      section += `\n\n${body}`
      tokenBudget -= estimateTokens(body)
    }
    if (section !== `STORY BIBLE – ${entityType.toUpperCase()}`) {
      sections.push(section)
    }
  }

  return {
    rendered: sections.join('\n\n'),
    omittedEntries: omitted,
  }
}

function renderTimeline(
  events: TimelineEvent[],
  tokenBudget: number
): { rendered: string; omittedEntries: TimelineEvent[] } {
  if (!events.length || tokenBudget <= 0) {
    return { rendered: '', omittedEntries: [] }
  }
  const lines: string[] = ['TIMELINE SNAPSHOT']
  const omitted: TimelineEvent[] = []

  for (const event of events) {
    const timeLabel = formatEventTime(event.timestamp)
    const line = `- [${timeLabel}] ${event.title}${event.location ? ` @ ${event.location}` : ''}: ${
      event.summary
    }`
    const lineTokens = estimateTokens(line)
    if (lineTokens > tokenBudget) {
      omitted.push(event)
      continue
    }
    lines.push(line)
    tokenBudget -= lineTokens
  }

  return {
    rendered: lines.join('\n'),
    omittedEntries: omitted,
  }
}

function renderExcerpts(
  excerpts: ContextExcerpt[],
  tokenBudget: number
): { rendered: string; omittedEntries: ContextExcerpt[] } {
  if (!excerpts.length || tokenBudget <= 0) {
    return { rendered: '', omittedEntries: [] }
  }
  const lines: string[] = ['RECENT EXCERPTS']
  const omitted: ContextExcerpt[] = []

  for (const excerpt of excerpts) {
    const header = `- ${excerpt.label} (${excerpt.source}, ${formatDistanceToNow(
      new Date(excerpt.createdAt),
      { addSuffix: true }
    )}):`
    const body = indentText(excerpt.content.trim(), 2)
    const entryTokens = estimateTokens(`${header}\n${body}`)
    if (entryTokens > tokenBudget) {
      omitted.push(excerpt)
      continue
    }
    lines.push(`${header}\n${body}`)
    tokenBudget -= entryTokens
  }

  return {
    rendered: lines.join('\n\n'),
    omittedEntries: omitted,
  }
}

function groupByEntityType(entries: StoryBibleEntry[]): Map<string, StoryBibleEntry[]> {
  const map = new Map<string, StoryBibleEntry[]>()
  const sorted = [...entries].sort((a, b) => scoreStoryBible(b) - scoreStoryBible(a))
  for (const entry of sorted) {
    const list = map.get(entry.entityType) ?? []
    list.push(entry)
    map.set(entry.entityType, list)
  }
  return map
}

function scoreStoryBible(entry: StoryBibleEntry): number {
  const base = IMPORTANCE_WEIGHT[entry.importance] ?? 1
  const recencyBonus = entry.updatedAt ? Math.max(0, 1 - recencyPenalty(entry.updatedAt)) : 0
  const tagBonus = entry.tags?.includes('antagonist') || entry.tags?.includes('protagonist') ? 0.5 : 0
  return base + recencyBonus + tagBonus
}

function recencyPenalty(updatedAt: string): number {
  const months = (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24 * 30)
  return Math.min(1, months / 12)
}

function getEventTime(event: TimelineEvent): number {
  return new Date(event.timestamp).getTime()
}

function estimateEntriesTokens(entries: StoryBibleEntry[]): number {
  return entries.reduce((sum, entry) => sum + estimateTokens(entry.summary), 0)
}

function estimateTimelineTokens(events: TimelineEvent[]): number {
  return events.reduce((sum, event) => sum + estimateTokens(event.summary), 0)
}

function estimateExcerptsTokens(excerpts: ContextExcerpt[]): number {
  return excerpts.reduce((sum, excerpt) => sum + estimateTokens(excerpt.content), 0)
}

export function estimateTokens(text: string): number {
  if (!text) return 0
  const words = text.trim().split(/\s+/).length
  return Math.ceil(words * 1.3)
}

function indentText(text: string, indentSpaces: number): string {
  const padding = ' '.repeat(indentSpaces)
  return text
    .split('\n')
    .map((line) => (line.trim().length ? `${padding}${line}` : line))
    .join('\n')
}

function formatEventTime(timestamp: string): string {
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) {
    return timestamp
  }
  return date.toISOString().split('T')[0]
}
