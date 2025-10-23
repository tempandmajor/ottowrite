/**
 * Partner Submissions API
 *
 * GET /api/partners/submissions - Get submissions for a partner
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponses, successResponse } from '@/lib/api/error-response'

/**
 * GET /api/partners/submissions
 * Fetch submissions for the authenticated partner
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return errorResponses.unauthorized()
    }

    const searchParams = request.nextUrl.searchParams
    const partnerId = searchParams.get('partner_id')
    const status = searchParams.get('status')

    if (!partnerId) {
      return errorResponses.badRequest('partner_id is required')
    }

    // Verify the partner belongs to this user
    const { data: partner } = await supabase
      .from('submission_partners')
      .select('id')
      .eq('id', partnerId)
      .eq('email', user.email)
      .single()

    if (!partner) {
      return errorResponses.forbidden('Partner access denied')
    }

    // Build query
    let query = supabase
      .from('partner_submissions')
      .select(`
        id,
        status,
        submitted_at,
        viewed_at,
        response_message,
        manuscript_submissions (
          id,
          title,
          genre,
          word_count,
          query_letter,
          user_profiles (
            full_name
          )
        )
      `)
      .eq('partner_id', partnerId)
      .order('submitted_at', { ascending: false })

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status)
    }

    const { data: partnerSubmissions, error: fetchError } = await query

    if (fetchError) {
      return errorResponses.internalError('Failed to fetch submissions', {
        details: fetchError.message,
      })
    }

    // Transform the data
    const submissions = (partnerSubmissions || []).map((ps: any) => ({
      id: ps.id,
      title: ps.manuscript_submissions?.title || 'Untitled',
      genre: ps.manuscript_submissions?.genre || 'Unknown',
      word_count: ps.manuscript_submissions?.word_count || 0,
      author_name: ps.manuscript_submissions?.user_profiles?.full_name || 'Anonymous',
      submitted_at: ps.submitted_at,
      status: ps.status,
      query_letter_preview: ps.manuscript_submissions?.query_letter
        ? ps.manuscript_submissions.query_letter.substring(0, 200) + '...'
        : '',
    }))

    return successResponse({
      submissions,
      total: submissions.length,
    })
  } catch (error) {
    console.error('Error fetching partner submissions:', error)
    return errorResponses.internalError('An unexpected error occurred')
  }
}
