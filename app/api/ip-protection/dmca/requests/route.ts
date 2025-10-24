/**
 * DMCA Takedown Requests API Endpoint
 *
 * GET: List all DMCA requests for the authenticated user
 * POST: Create a new DMCA request
 *
 * Ticket: MS-5.3
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponses } from '@/lib/api/error-response'
import {requireAuth, handleAuthError} from '@/lib/api/auth-helpers'
import { requireDefaultRateLimit } from '@/lib/api/rate-limit-helpers'

export async function GET(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)
  await requireDefaultRateLimit(request, user.id)

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const filterStatus = searchParams.get('status')

    // Build query
    let query = supabase
      .from('dmca_takedown_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    // Apply status filter
    if (filterStatus && filterStatus !== 'all') {
      if (filterStatus === 'active') {
        query = query.in('status', ['submitted', 'under_review', 'notice_sent', 'counter_notice_received'])
      } else {
        query = query.eq('status', filterStatus)
      }
    }

    const { data: requests, error: requestsError } = await query

    if (requestsError) {
      return errorResponses.internalError('Failed to fetch DMCA requests', {
        details: requestsError,
      })
    }

    // Format for response
    const formattedRequests = requests.map((req) => ({
      id: req.id,
      workTitle: req.work_title,
      infringingUrl: req.infringing_url,
      infringingPlatform: req.infringing_platform,
      status: req.status,
      submittedAt: req.submitted_at,
      createdAt: req.created_at,
    }))

    return NextResponse.json({ requests: formattedRequests })
  } catch (error) {
        const authError = handleAuthError(error)
    if (authError) return authError

    console.error('Error fetching DMCA requests:', error)
    return errorResponses.internalError(
      error instanceof Error ? error.message : 'Failed to fetch DMCA requests',
      { details: error }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)

    const body = await request.json()

    // Validate required fields
    if (!body.workTitle || !body.workDescription || !body.infringingUrl) {
      return errorResponses.validationError('Missing required fields')
    }

    // Create request
    const { data: dmcaRequest, error: createError } = await supabase
      .from('dmca_takedown_requests')
      .insert({
        user_id: user.id,
        submission_id: body.submissionId || null,
        work_title: body.workTitle,
        work_description: body.workDescription,
        copyright_registration_number: body.copyrightRegistration || null,
        infringing_url: body.infringingUrl,
        infringing_platform: body.infringingPlatform,
        infringement_description: body.infringementDescription,
        evidence_urls: body.evidenceUrls?.filter((url: string) => url.trim()) || [],
        complainant_full_name: body.complainantName,
        complainant_email: body.complainantEmail,
        complainant_phone: body.complainantPhone || null,
        complainant_address: body.complainantAddress,
        good_faith_statement: body.goodFaithStatement || false,
        accuracy_statement: body.accuracyStatement || false,
        penalty_of_perjury: body.penaltyOfPerjury || false,
        electronic_signature: body.electronicSignature,
        status: body.status || 'draft',
      })
      .select()
      .single()

    if (createError) {
      return errorResponses.internalError('Failed to create DMCA request', {
        details: createError,
      })
    }

    // If status is submitted, call the submit function
    if (body.status === 'submitted') {
      const { error: submitError } = await supabase.rpc('submit_dmca_request', {
        p_request_id: dmcaRequest.id,
        p_user_id: user.id,
      })

      if (submitError) {
        return errorResponses.internalError('Failed to submit DMCA request', {
          details: submitError,
        })
      }
    }

    return NextResponse.json({
      success: true,
      requestId: dmcaRequest.id,
    })
  } catch (error) {
        const authError = handleAuthError(error)
    if (authError) return authError

    console.error('Error creating DMCA request:', error)
    return errorResponses.internalError(
      error instanceof Error ? error.message : 'Failed to create DMCA request',
      { details: error }
    )
  }
}
