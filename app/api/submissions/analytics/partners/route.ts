/**
 * Top Performing Partners API Endpoint
 *
 * GET: Returns top performing partners by acceptance rate
 *
 * Ticket: MS-4.3
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponses } from '@/lib/api/error-response'
import { requireAuth } from '@/lib/api/auth-helpers'

export async function GET(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '10', 10)

    // Validate limit
    if (limit < 1 || limit > 50) {
      return errorResponses.validationError('limit must be between 1 and 50')
    }

    // Get top partners using RPC function
    const { data: partners, error: partnersError } = await supabase.rpc(
      'get_top_performing_partners',
      {
        p_user_id: user.id,
        p_limit: limit,
      }
    )

    if (partnersError) {
      return errorResponses.internalError('Failed to fetch top partners', {
        details: partnersError,
      })
    }

    // Format response
    const formattedPartners = (partners || []).map((partner: any) => ({
      partnerId: partner.partner_id,
      partnerName: partner.partner_name,
      partnerType: partner.partner_type,
      submissionsSent: partner.submissions_sent,
      acceptances: partner.acceptances,
      acceptanceRate: Number(partner.acceptance_rate),
      avgResponseDays: Number(partner.avg_response_days),
    }))

    return NextResponse.json({ partners: formattedPartners })
  } catch (error) {
    console.error('Error fetching top partners:', error)
    return errorResponses.internalError(
      error instanceof Error ? error.message : 'Failed to fetch top partners',
      { details: error }
    )
  }
}
