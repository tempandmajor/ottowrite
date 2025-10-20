import type { Chapter } from '@/components/editor/chapter-sidebar'

export type ClientContentSnapshot = {
  html?: string
  structure?: Chapter[]
  anchorIds?: string[]
  metadata?: Record<string, any>
}

export async function computeClientContentHash({
  html = '',
  structure = [],
  anchorIds = [],
}: ClientContentSnapshot): Promise<string> {
  const normalized = {
    html,
    structure: Array.isArray(structure) ? structure : [],
    anchors: Array.from(new Set(anchorIds.filter((id): id is string => typeof id === 'string'))).sort(),
  }

  const encoder = new TextEncoder()
  const data = encoder.encode(JSON.stringify(normalized))
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}
