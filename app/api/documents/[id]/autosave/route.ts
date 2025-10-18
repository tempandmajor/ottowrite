import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateContentHash } from '@/lib/content-hash'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

type AutosavePayload = {
  html?: string
  structure?: unknown
  anchorIds?: string[]
  wordCount?: number
  baseHash?: string | null
  snapshotOnly?: boolean
}

const SNAPSHOT_LIMITS: Record<string, number> = {
  free: 20,
  hobbyist: 200,
  professional: 200,
  studio: 400,
}

const DEFAULT_SNAPSHOT_LIMIT = 50

const CLEAN_WORD_REGEX = /<[^>]*>/g
const ANCHOR_SPAN_REGEX =
  /<span[^>]*data-scene-anchor=["']true["'][^>]*data-scene-id=["']([^"']+)["'][^>]*>/gi

function computeWordCount(html: string | undefined): number {
  if (!html) return 0
  const text = html.replace(CLEAN_WORD_REGEX, ' ')
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
}

function normalizeStructure(structure: unknown): unknown {
  if (!structure) return []
  if (Array.isArray(structure)) return structure
  return structure
}

function normalizeAnchorIds(anchorIds?: string[]): string[] {
  if (!Array.isArray(anchorIds)) return []
  return Array.from(new Set(anchorIds.filter((id) => typeof id === 'string')))
}

function extractAnchorsFromHtml(html: string | undefined): string[] {
  if (!html) return []
  const ids = new Set<string>()
  let match: RegExpExecArray | null
  while ((match = ANCHOR_SPAN_REGEX.exec(html)) !== null) {
    if (match[1]) {
      ids.add(match[1])
    }
  }
  return Array.from(ids)
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: documentId } = await params
    if (!documentId) {
      return NextResponse.json({ error: 'Missing document id' }, { status: 400 })
    }

    const body = (await request.json()) as AutosavePayload
    const html = body.html
    const structure = normalizeStructure(body.structure)
    const anchorIds = normalizeAnchorIds(body.anchorIds)
    const snapshotOnly = Boolean(body.snapshotOnly)
    const baseHash = body.baseHash ?? null

    const { data: document, error: documentError } = await supabase
      .from('documents')
      .select('id, user_id, type, content, word_count, updated_at')
      .eq('id', documentId)
      .single()

    if (documentError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    if (document.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const existingContent = (document.content ?? {}) as Record<string, any>
    const existingStructure = normalizeStructure(existingContent.structure)
    const existingHtml = typeof existingContent.html === 'string' ? existingContent.html : ''

    const existingAnchors = extractAnchorsFromHtml(existingHtml)
    const serverHash = generateContentHash({
      html: existingHtml,
      structure: existingStructure,
      anchorIds: existingAnchors,
    })

    if (baseHash && baseHash !== serverHash && !snapshotOnly) {
      return NextResponse.json(
        {
          status: 'conflict',
          hash: serverHash,
          document: {
            html: existingHtml,
            structure: existingStructure,
            wordCount: document.word_count,
            updatedAt: document.updated_at,
          },
        },
        { status: 409 }
      )
    }

    const updatedHtml = typeof html === 'string' ? html : existingHtml
    const updatedStructure = Array.isArray(structure) ? structure : existingStructure
    const updatedAnchorIds =
      anchorIds.length > 0 ? anchorIds : extractAnchorsFromHtml(updatedHtml)
    const payloadWordCount =
      typeof body.wordCount === 'number' ? body.wordCount : computeWordCount(updatedHtml)

    const payloadHash = generateContentHash({
      html: updatedHtml,
      structure: updatedStructure,
      anchorIds: updatedAnchorIds,
    })

    const snapshotPayload = {
      html: updatedHtml,
      structure: updatedStructure,
      anchors: updatedAnchorIds,
      word_count: payloadWordCount,
    }

    const { data: snapshot, error: snapshotError } = await supabase
      .from('document_snapshots')
      .insert({
        document_id: documentId,
        user_id: user.id,
        autosave_hash: payloadHash,
        payload: snapshotPayload,
      })
      .select('id, created_at')
      .single()

    if (snapshotError) {
      console.error('Failed to create document snapshot', snapshotError)
      return NextResponse.json({ error: 'Failed to create snapshot' }, { status: 500 })
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single()

    const tier = profile?.subscription_tier ?? 'free'
    const retentionLimit = SNAPSHOT_LIMITS[tier] ?? DEFAULT_SNAPSHOT_LIMIT

    const { data: oldSnapshots } = await supabase
      .from('document_snapshots')
      .select('id')
      .eq('document_id', documentId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(retentionLimit, retentionLimit + 99)

    if (Array.isArray(oldSnapshots) && oldSnapshots.length > 0) {
      await supabase
        .from('document_snapshots')
        .delete()
        .in(
          'id',
          oldSnapshots.map((item) => item.id)
        )
    }

    if (!snapshotOnly && (payloadHash !== serverHash || updatedHtml !== existingHtml)) {
      const newContent = {
        ...existingContent,
        html: updatedHtml,
        structure: updatedStructure,
      }

      const { error: updateError } = await supabase
        .from('documents')
        .update({
          content: newContent,
          word_count: payloadWordCount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', documentId)

      if (updateError) {
        console.error('Failed to update document during autosave', updateError)
        return NextResponse.json({ error: 'Failed to save document' }, { status: 500 })
      }
    }

    return NextResponse.json({
      status: snapshotOnly ? 'snapshot' : 'saved',
      hash: payloadHash,
      snapshotId: snapshot.id,
    })
  } catch (error) {
    console.error('Autosave error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
