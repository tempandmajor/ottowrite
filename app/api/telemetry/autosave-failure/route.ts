import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { withAPIErrorHandling, APIErrors } from '@/lib/monitoring/api-wrapper'
import { reportAutosaveError } from '@/lib/monitoring/error-reporter'

export const POST = withAPIErrorHandling(
  async (request) => {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw APIErrors.unauthorized()
    }

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
      throw new Error(`Failed to log autosave failure: ${error.message}`)
    }

    return NextResponse.json({ success: true })
  },
  { operation: 'log_autosave_failure' }
)
