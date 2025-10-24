import { NextRequest } from 'next/server'
import { errorResponses, successResponse } from '@/lib/api/error-response'
import {requireAuth, handleAuthError} from '@/lib/api/auth-helpers'
import { requireDefaultRateLimit } from '@/lib/api/rate-limit-helpers'
import { logger } from '@/lib/monitoring/structured-logger'

export const dynamic = 'force-dynamic'

// GET - List available beat templates
export async function GET(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)
    await requireDefaultRateLimit(request, user.id)

    const { searchParams } = new URL(request.url)
    const suitableFor = searchParams.get('suitable_for')

    const typeAliases: Record<string, string[]> = {
      series: ['series', 'novel'],
    }

    const filterValues = suitableFor
      ? Array.from(new Set([suitableFor, ...(typeAliases[suitableFor] || []), 'general'].filter(Boolean)))
      : null

    let query = supabase
      .from('beat_templates')
      .select('*')
      .eq('is_public', true)
      .order('total_beats', { ascending: true })

    if (filterValues && filterValues.length > 0) {
      query = query.overlaps('suitable_for', filterValues)
    }

    const { data, error } = await query

    if (error) {
      logger.error('Error fetching beat templates', {
        suitableFor: suitableFor ?? undefined,
        operation: 'beat_templates:fetch',
      }, error)
      return errorResponses.internalError('Failed to fetch beat templates', {
        details: error,
      })
    }

    return successResponse({ templates: data || [] })
  } catch (error) {
        const authError = handleAuthError(error)
    if (authError) return authError

    logger.error('Error in GET /api/story-beats/templates', {
      operation: 'beat_templates:get',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to fetch beat templates', { details: error })
  }
}
