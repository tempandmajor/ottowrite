import { createClient } from '@/lib/supabase/server'
import { getModelComparison } from '@/lib/analytics/model-analytics'
import { errorResponses, successResponse } from '@/lib/api/error-response'
import { logger } from '@/lib/monitoring/structured-logger'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return errorResponses.unauthorized()
    }

    // Get model comparison data for the current user
    const comparison = await getModelComparison(user.id)

    return successResponse(comparison)
  } catch (error) {
    logger.error('Error fetching model analytics', {
      operation: 'analytics:models',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to fetch model analytics', {
      details: error,
    })
  }
}
