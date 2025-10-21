import { stripHtml } from '@/lib/utils/text-diff'
import {
  type ContextExcerpt,
  type StoryBibleEntry,
  type StoryBibleImportance,
} from '@/lib/ai/context-manager'

function mapWorldElementType(type?: string | null): StoryBibleEntry['entityType'] {
  switch ((type ?? '').toLowerCase()) {
    case 'location':
      return 'location'
    case 'faction':
      return 'faction'
    case 'artifact':
    case 'technology':
      return 'object'
    default:
      return 'concept'
  }
}

function inferWorldElementImportance(record: any): StoryBibleImportance {
  const tags: string[] = Array.isArray(record?.tags) ? record.tags : []
  if (tags.some((tag) => typeof tag === 'string' && tag.toLowerCase().includes('primary'))) {
    return 'main'
  }
  if (tags.some((tag) => typeof tag === 'string' && tag.toLowerCase().includes('major'))) {
    return 'supporting'
  }
  return 'minor'
}

export function mapWorldElementToStoryBibleEntry(record: any): StoryBibleEntry {
  const summary =
    typeof record.summary === 'string' && record.summary.trim().length > 0
      ? record.summary
      : typeof record.description === 'string' && record.description.trim().length > 0
      ? record.description
      : 'No world element summary available yet.'

  return {
    id: record.id,
    name: record.name,
    entityType: mapWorldElementType(record.type),
    summary,
    importance: inferWorldElementImportance(record),
    updatedAt: record.updated_at ?? undefined,
    tags: Array.isArray(record.tags) ? record.tags : undefined,
  }
}

export function normalizeExcerptSource(
  source: unknown,
  docType?: string | null
): ContextExcerpt['source'] {
  if (typeof source === 'string') {
    const normalized = source.toLowerCase()
    if (normalized === 'scene' || normalized === 'chapter' || normalized === 'note' || normalized === 'analysis') {
      return normalized
    }
  }

  switch ((docType ?? '').toLowerCase()) {
    case 'screenplay':
      return 'scene'
    case 'novel':
    case 'short_story':
      return 'chapter'
    default:
      return 'note'
  }
}

export function truncateSnapshotContent(text: string, maxLength = 1200): string {
  if (text.length <= maxLength) {
    return text
  }
  return `${text.slice(0, maxLength).trimEnd()}...`
}

export function mapSnapshotToContextExcerpt(
  record: any,
  documentLookup: Map<string, { title: string; type?: string | null }>
): ContextExcerpt | null {
  if (!record || typeof record !== 'object') {
    return null
  }

  const payload = record.payload ?? {}
  const rawHtml = typeof payload?.html === 'string' ? payload.html : ''
  const plainText = rawHtml ? stripHtml(rawHtml) : ''
  if (!plainText) {
    return null
  }

  const docMeta = documentLookup.get(record.document_id ?? '')
  const metadata = (record.metadata ?? {}) as Record<string, unknown>
  const metadataLabel =
    typeof metadata['label'] === 'string' ? (metadata['label'] as string).trim() : ''
  const metadataSource = metadata['source']

  const labelParts: string[] = []
  if (metadataLabel) {
    labelParts.push(metadataLabel)
  }
  if (docMeta?.title) {
    labelParts.push(docMeta.title)
  }

  const uniqueLabelParts = Array.from(new Set(labelParts))
  const label = metadataLabel && docMeta?.title
    ? uniqueLabelParts.join(' - ')
    : metadataLabel
    ? metadataLabel
    : docMeta?.title
    ? `${docMeta.title} excerpt`
    : 'Document excerpt'

  return {
    id: record.id,
    label,
    content: truncateSnapshotContent(plainText),
    source: normalizeExcerptSource(metadataSource, docMeta?.type),
    createdAt: record.created_at ?? new Date().toISOString(),
  }
}
