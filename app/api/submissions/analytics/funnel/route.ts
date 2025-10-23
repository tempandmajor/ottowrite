/**
 * Conversion Funnel API Endpoint
 *
 * GET: Returns conversion funnel metrics
 *
 * Ticket: MS-4.3
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponses } from '@/lib/api/error-response'

export async function GET() {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return errorResponses.unauthorized('Authentication required')
    }

    // Get funnel data using RPC function
    const { data: funnel, error: funnelError } = await supabase.rpc('get_conversion_funnel', {
      p_user_id: user.id,
    })

    if (funnelError) {
      return errorResponses.internalError('Failed to fetch funnel data', {
        details: funnelError,
      })
    }

    // Format response
    const formattedFunnel = (funnel || []).map((stage: any) => ({
      stage: stage.stage,
      count: stage.count,
      percentage: Number(stage.percentage),
    }))

    return NextResponse.json({ funnel: formattedFunnel })
  } catch (error) {
    console.error('Error fetching funnel data:', error)
    return errorResponses.internalError(
      error instanceof Error ? error.message : 'Failed to fetch funnel data',
      { details: error }
    )
  }
}
