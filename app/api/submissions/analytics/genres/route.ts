/**
 * Genre Performance API Endpoint
 *
 * GET: Returns performance metrics by genre
 *
 * Ticket: MS-4.3
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponses } from '@/lib/api/error-response'
import {requireAuth, handleAuthError} from '@/lib/api/auth-helpers'

export async function GET(request: Request) {
  try {
    const { user, supabase } = await requireAuth(request)

    // Get genre performance from materialized view
    const { data: genres, error: genresError } = await supabase
      .from('genre_performance_analytics')
      .select('*')
      .eq('user_id', user.id)
      .order('total_submissions', { ascending: false })

    if (genresError) {
      return errorResponses.internalError('Failed to fetch genre performance', {
        details: genresError,
      })
    }

    // Format response
    const formattedGenres = (genres || []).map((genre: any) => ({
      genre: genre.genre,
      totalSubmissions: Number(genre.total_submissions),
      partnersContacted: Number(genre.partners_contacted),
      totalViews: Number(genre.total_views),
      totalRequests: Number(genre.total_requests),
      totalAcceptances: Number(genre.total_acceptances),
      totalRejections: Number(genre.total_rejections),
      acceptanceRate: Number(genre.acceptance_rate),
    }))

    return NextResponse.json({ genres: formattedGenres })
  } catch (error) {
        const authError = handleAuthError(error)
    if (authError) return authError

    console.error('Error fetching genre performance:', error)
    return errorResponses.internalError(
      error instanceof Error ? error.message : 'Failed to fetch genre performance',
      { details: error }
    )
  }
}
