/**
 * Submission Partners API Endpoint
 *
 * GET: Returns all partners for a submission with response status
 *
 * Ticket: MS-4.1
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponses } from '@/lib/api/error-response'
import {requireAuth, handleAuthError} from '@/lib/api/auth-helpers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  try {
    const { user, supabase } = await requireAuth(request)

    const { submissionId } = await params

    // Verify ownership
    const { data: submission } = await supabase
      .from('manuscript_submissions')
      .select('id')
      .eq('id', submissionId)
      .eq('user_id', user.id)
      .single()

    if (!submission) {
      return errorResponses.notFound('Submission not found')
    }

    // Get all partner submissions with partner details
    const { data: partnerSubmissions, error: partnersError } = await supabase
      .from('partner_submissions')
      .select('*, submission_partners(*)')
      .eq('submission_id', submissionId)
      .order('submitted_at', { ascending: false })

    if (partnersError) {
      return errorResponses.internalError('Failed to fetch partners', {
        details: partnersError,
      })
    }

    const formattedPartners = partnerSubmissions.map((ps: any) => ({
      id: ps.id,
      partnerId: ps.partner_id,
      partnerName: ps.submission_partners?.name || 'Unknown',
      partnerCompany: ps.submission_partners?.company || '',
      partnerType: ps.submission_partners?.type || 'agent',
      status: ps.status,
      submittedAt: ps.submitted_at,
      viewedByPartner: ps.viewed_by_partner,
      firstViewedAt: ps.first_viewed_at,
      lastViewedAt: ps.last_viewed_at,
      viewCount: ps.view_count,
      partnerResponse: ps.partner_response,
      partnerResponseDate: ps.partner_response_date,
      rejectionReason: ps.rejection_reason,
    }))

    return NextResponse.json({ partners: formattedPartners })
  } catch (error) {
        const authError = handleAuthError(error)
    if (authError) return authError

    console.error('Error fetching submission partners:', error)
    return errorResponses.internalError(
      error instanceof Error ? error.message : 'Failed to fetch partners',
      { details: error }
    )
  }
}
