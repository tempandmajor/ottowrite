import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponses, successResponse } from '@/lib/api/error-response'
import { requireAuth } from '@/lib/api/auth-helpers'
import { requireDefaultRateLimit } from '@/lib/api/rate-limit-helpers'
import { logger } from '@/lib/monitoring/structured-logger'
import { reportAutosaveError } from '@/lib/monitoring/error-reporter'

export async function POST(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)
  await requireDefaultRateLimit(request, user.id)

    const body = await request.json()

    // Report to Sentry for real-time alerting
    reportAutosaveError(body.error_message || 'Autosave failed', {
      userId: user.id,
      documentId: body.document_id,
      failureType: body.failure_type,
      retryCount: body.retry_count ?? 0,
      clientHash: body.client_hash,
      serverHash: body.server_hash,
    })

    // Also store in database for historical analysis
    const { error } = await supabase.from('autosave_failures').insert({
      user_id: user.id,
      document_id: body.document_id,
      failure_type: body.failure_type,
      error_message: body.error_message,
      client_hash: body.client_hash,
      server_hash: body.server_hash,
      retry_count: body.retry_count ?? 0,
      user_agent: body.user_agent,
      content_preview: body.content_preview,
    })

    if (error) {
      logger.error('Failed to log autosave failure', {
        userId: user.id,
        documentId: body.document_id,
        failureType: body.failure_type,
        operation: 'telemetry:autosave_failure',
      }, error)
      return errorResponses.internalError('Failed to log autosave failure', {
        details: error,
        userId: user.id,
      })
    }

    return successResponse({ success: true })
  } catch (error) {
    logger.error('Error in POST /api/telemetry/autosave-failure', {
      operation: 'telemetry:autosave_failure',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to log autosave failure', { details: error })
  }
}
