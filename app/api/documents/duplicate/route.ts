import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponses, successResponse } from '@/lib/api/error-response'
import { requireAuth } from '@/lib/api/auth-helpers'
import { requireDefaultRateLimit } from '@/lib/api/rate-limit-helpers'
import { logger } from '@/lib/monitoring/structured-logger'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)
  await requireDefaultRateLimit(request, user.id)

    const body = await request.json()
    const { documentId, newTitle } = body

    if (!documentId) {
      return errorResponses.badRequest('Document ID required', { userId: user.id })
    }

    // Get the original document
    const { data: originalDoc, error: fetchError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !originalDoc) {
      return errorResponses.notFound('Document not found', { userId: user.id })
    }

    // Create duplicate
    const { data: duplicate, error: createError } = await supabase
      .from('documents')
      .insert({
        user_id: user.id,
        project_id: originalDoc.project_id,
        title: newTitle || `${originalDoc.title} (Copy)`,
        type: originalDoc.type,
        content: originalDoc.content,
        word_count: originalDoc.word_count,
        position: originalDoc.position + 1,
      })
      .select()
      .single()

    if (createError) {
      logger.error('Failed to duplicate document', {
        userId: user.id,
        documentId,
        operation: 'documents:duplicate_bulk',
      }, createError)
      return errorResponses.internalError('Failed to duplicate document', {
        details: createError,
        userId: user.id,
      })
    }

    return successResponse({ document: duplicate })
  } catch (error) {
    logger.error('Document duplication error', {
      operation: 'documents:duplicate_bulk',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to duplicate document', { details: error })
  }
}
