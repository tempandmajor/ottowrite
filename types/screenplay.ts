export type ScreenplaySequence = {
  id: string
  title: string
  summary?: string | null
  color?: string | null
  sceneIds: string[]
}

export type ScreenplayAct = {
  id: string
  title: string
  summary?: string | null
  sequences: ScreenplaySequence[]
}

export function generateId(prefix: string = 'sp'): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}
