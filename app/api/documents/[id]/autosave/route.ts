import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateContentHash } from '@/lib/content-hash'
import { errorResponses, successResponse } from '@/lib/api/error-response'
import {requireAuth, handleAuthError} from '@/lib/api/auth-helpers'
import { requireDefaultRateLimit } from '@/lib/api/rate-limit-helpers'
import { logger } from '@/lib/monitoring/structured-logger'
import { sanitizeHTML, detectXSSPatterns } from '@/lib/security/sanitize'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

type AutosavePayload = {
  html?: string
  structure?: unknown
  metadata?: unknown
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
    const { user, supabase } = await requireAuth(request)
  await requireDefaultRateLimit(request, user.id)

    const { id: documentId } = await params
    if (!documentId) {
      return errorResponses.badRequest('Missing document id')
    }

    const body = (await request.json()) as AutosavePayload

    // Security: Sanitize HTML content to prevent XSS attacks
    let html = body.html
    if (html && typeof html === 'string') {
      // Detect malicious patterns
      if (detectXSSPatterns(html)) {
        logger.warn('XSS patterns detected in document content', {
          operation: 'autosave:xss_detection',
          userId: user.id,
          documentId,
          contentLength: html.length,
        })
      }

      // Sanitize the HTML (removes scripts, iframes, event handlers, etc.)
      html = sanitizeHTML(html, false) // Keep formatting HTML, just remove dangerous patterns
    }

    const structure = normalizeStructure(body.structure)
    const metadata = body.metadata ?? {}
    const anchorIds = normalizeAnchorIds(body.anchorIds)
    const snapshotOnly = Boolean(body.snapshotOnly)
    const baseHash = body.baseHash ?? null

    const { data: document, error: documentError } = await supabase
      .from('documents')
      .select('id, user_id, type, content, word_count, updated_at')
      .eq('id', documentId)
      .single()

    if (documentError || !document) {
      return errorResponses.notFound('Document not found', { userId: user.id })
    }

    if (document.user_id !== user.id) {
      return errorResponses.forbidden('You do not have access to this document', { userId: user.id })
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
      return errorResponses.conflict('Document has been modified by another session', {
        code: 'AUTOSAVE_CONFLICT',
        details: {
          status: 'conflict',
          hash: serverHash,
          document: {
            html: existingHtml,
            structure: existingStructure,
            wordCount: document.word_count,
            updatedAt: document.updated_at,
          },
        },
        userId: user.id,
      })
    }

    const updatedHtml = typeof html === 'string' ? html : existingHtml
    const updatedStructure = Array.isArray(structure) ? structure : existingStructure
    const updatedMetadata = metadata ?? existingContent.metadata ?? {}
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
      metadata: updatedMetadata,
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
      logger.error('Failed to create document snapshot', {
        userId: user.id,
        documentId,
        operation: 'autosave:snapshot',
      }, snapshotError)
      return errorResponses.internalError('Failed to create snapshot', {
        details: snapshotError,
        userId: user.id,
      })
    }

    try {
      await supabase.rpc('refresh_user_plan_usage', { p_user_id: user.id })
    } catch (refreshError) {
      logger.warn('refresh_user_plan_usage failed after snapshot insert', {
        userId: user.id,
        operation: 'autosave:refresh_usage',
      }, refreshError instanceof Error ? refreshError : undefined)
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
        metadata: updatedMetadata,
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
        logger.error('Failed to update document during autosave', {
          userId: user.id,
          documentId,
          operation: 'autosave:update_document',
        }, updateError)
        return errorResponses.internalError('Failed to save document', {
          details: updateError,
          userId: user.id,
        })
      }
    }

    return successResponse({
      status: snapshotOnly ? 'snapshot' : 'saved',
      hash: payloadHash,
      snapshotId: snapshot.id,
    })
  } catch (error) {
        const authError = handleAuthError(error)
    if (authError) return authError

    logger.error('Autosave error', {
      operation: 'autosave',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to save document', {
      details: error,
    })
  }
}
