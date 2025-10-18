import { createHash } from 'node:crypto'

type HashPayload = {
  html?: string
  structure?: unknown
  anchorIds?: string[]
}

function normalizeStructure(structure?: unknown): unknown {
  if (!Array.isArray(structure)) return []
  return structure
}

function normalizeAnchorIds(anchorIds?: string[]): string[] {
  if (!Array.isArray(anchorIds)) return []
  return Array.from(new Set(anchorIds.filter((id) => typeof id === 'string'))).sort()
}

export function generateContentHash(payload: HashPayload): string {
  const normalized = {
    html: payload.html ?? '',
    structure: normalizeStructure(payload.structure),
    anchors: normalizeAnchorIds(payload.anchorIds),
  }

  const serialized = JSON.stringify(normalized)
  return createHash('sha256').update(serialized).digest('hex')
}
