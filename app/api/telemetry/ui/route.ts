import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponses, successResponse } from '@/lib/api/error-response'
import {requireAuth, handleAuthError} from '@/lib/api/auth-helpers'
import { requireDefaultRateLimit } from '@/lib/api/rate-limit-helpers'
import { logger } from '@/lib/monitoring/structured-logger'

export async function POST(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)
  await requireDefaultRateLimit(request, user.id)

    let payload: unknown
    try {
      payload = await request.json()
    } catch {
      return errorResponses.badRequest('Invalid JSON body', { userId: user.id })
    }

    if (!payload || typeof payload !== 'object') {
      return errorResponses.badRequest('Invalid payload', { userId: user.id })
    }

    const { event, context } = payload as { event?: unknown; context?: unknown }

    if (typeof event !== 'string' || event.trim().length === 0) {
      return errorResponses.badRequest('Event name is required', { userId: user.id })
    }

    const metadata =
      context && typeof context === 'object'
        ? (context as Record<string, unknown>)
        : undefined

    logger.analytics({
      event,
      userId: user.id,
      metadata,
    })

    return successResponse({ success: true })
  } catch (error) {
        const authError = handleAuthError(error)
    if (authError) return authError

    logger.error('UI telemetry logging failed', {
      operation: 'telemetry:ui',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Telemetry failed', { details: error })
  }
}
