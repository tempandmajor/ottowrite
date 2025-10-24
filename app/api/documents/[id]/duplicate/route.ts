import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponses, successResponse } from '@/lib/api/error-response'
import {requireAuth, handleAuthError} from '@/lib/api/auth-helpers'
import { requireDefaultRateLimit } from '@/lib/api/rate-limit-helpers'
import { logger } from '@/lib/monitoring/structured-logger'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { user, supabase } = await requireAuth(request)
  await requireDefaultRateLimit(request, user.id)

    const { id } = await params

    // Get the original document
    const { data: originalDoc, error: fetchError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !originalDoc) {
      return errorResponses.notFound('Document not found', { userId: user.id })
    }

    // Create duplicate with "(Copy)" suffix
    const { data: duplicate, error: createError } = await supabase
      .from('documents')
      .insert({
        title: `${originalDoc.title} (Copy)`,
        type: originalDoc.type,
        content: originalDoc.content,
        project_id: originalDoc.project_id,
        user_id: user.id,
        word_count: originalDoc.word_count,
      })
      .select()
      .single()

    if (createError) {
      logger.error('Failed to duplicate document', {
        userId: user.id,
        documentId: id,
        operation: 'documents:duplicate',
      }, createError)
      return errorResponses.internalError('Failed to duplicate document', {
        details: createError,
        userId: user.id,
      })
    }

    return successResponse({ document: duplicate })
  } catch (error) {
        const authError = handleAuthError(error)
    if (authError) return authError

    logger.error('Error duplicating document', {
      operation: 'documents:duplicate',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Internal server error', { details: error })
  }
}
