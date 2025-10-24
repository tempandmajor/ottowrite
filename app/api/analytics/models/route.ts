import { createClient } from '@/lib/supabase/server'
import { getModelComparison } from '@/lib/analytics/model-analytics'
import { errorResponses, successResponse } from '@/lib/api/error-response'
import {requireAuth, handleAuthError} from '@/lib/api/auth-helpers'
import { logger } from '@/lib/monitoring/structured-logger'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { user, supabase } = await requireAuth(request)

    // Get model comparison data for the current user
    const comparison = await getModelComparison(user.id)

    return successResponse(comparison)
  } catch (error) {
        const authError = handleAuthError(error)
    if (authError) return authError

    logger.error('Error fetching model analytics', {
      operation: 'analytics:models',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to fetch model analytics', {
      details: error,
    })
  }
}
