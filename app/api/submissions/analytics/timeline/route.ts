/**
 * Submission Timeline API Endpoint
 *
 * GET: Returns activity timeline for visualization
 *
 * Ticket: MS-4.3
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponses } from '@/lib/api/error-response'
import {requireAuth, handleAuthError} from '@/lib/api/auth-helpers'

export async function GET(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const daysBack = parseInt(searchParams.get('daysBack') || '30', 10)

    // Validate daysBack
    if (daysBack < 1 || daysBack > 365) {
      return errorResponses.validationError('daysBack must be between 1 and 365')
    }

    // Get timeline data using RPC function
    const { data: timeline, error: timelineError } = await supabase.rpc(
      'get_submission_timeline',
      {
        p_user_id: user.id,
        p_days_back: daysBack,
      }
    )

    if (timelineError) {
      return errorResponses.internalError('Failed to fetch timeline data', {
        details: timelineError,
      })
    }

    // Format response
    const formattedTimeline = (timeline || []).map((day: any) => ({
      date: day.date,
      submissionsCreated: day.submissions_created,
      partnersContacted: day.partners_contacted,
      viewsReceived: day.views_received,
      requestsReceived: day.requests_received,
      responsesReceived: day.responses_received,
    }))

    return NextResponse.json({ timeline: formattedTimeline })
  } catch (error) {
        const authError = handleAuthError(error)
    if (authError) return authError

    console.error('Error fetching timeline data:', error)
    return errorResponses.internalError(
      error instanceof Error ? error.message : 'Failed to fetch timeline data',
      { details: error }
    )
  }
}
