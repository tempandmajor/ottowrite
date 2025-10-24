/**
 * DMCA Statistics API Endpoint
 *
 * GET: Returns summary statistics for user's DMCA requests
 *
 * Ticket: MS-5.3
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponses } from '@/lib/api/error-response'
import { requireAuth } from '@/lib/api/auth-helpers'

export async function GET(request: Request) {
  try {
    const { user, supabase } = await requireAuth(request)

    // Call database function to get statistics
    const { data: stats, error: statsError } = await supabase
      .rpc('get_dmca_statistics', {
        p_user_id: user.id,
      })
      .single()

    if (statsError || !stats) {
      return errorResponses.internalError('Failed to fetch DMCA statistics', {
        details: statsError,
      })
    }

    return NextResponse.json({
      stats: {
        totalRequests: Number((stats as any).total_requests),
        draftRequests: Number((stats as any).draft_requests),
        submittedRequests: Number((stats as any).submitted_requests),
        activeRequests: Number((stats as any).active_requests),
        completedRequests: Number((stats as any).completed_requests),
        successRate: Number((stats as any).success_rate),
      },
    })
  } catch (error) {
    console.error('Error fetching DMCA statistics:', error)
    return errorResponses.internalError(
      error instanceof Error ? error.message : 'Failed to fetch DMCA statistics',
      { details: error }
    )
  }
}
