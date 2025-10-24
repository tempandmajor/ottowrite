import { NextRequest } from 'next/server';
import { errorResponses, successResponse } from '@/lib/api/error-response';
import {requireAuth, handleAuthError} from '@/lib/api/auth-helpers';
import { requireDefaultRateLimit } from '@/lib/api/rate-limit-helpers';
import { logger } from '@/lib/monitoring/structured-logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/beat-sheets
 *
 * Retrieve beat sheet structures
 * Query params:
 *  - structure_id: Filter by specific structure (save-the-cat, heros-journey, story-circle, truby-22-step)
 *  - genre: Filter by genre
 */
export async function GET(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request);
    await requireDefaultRateLimit(request, user.id);

    const { searchParams } = new URL(request.url);
    const structureId = searchParams.get('structure_id');
    const genre = searchParams.get('genre');

    let query = supabase
      .from('beat_sheets')
      .select('*')
      .eq('is_public', true)
      .is('created_by', null) // System templates only
      .order('total_beats', { ascending: true });

    // Filter by structure_id
    if (structureId) {
      query = query.eq('structure_id', structureId);
    }

    // Filter by genre
    if (genre) {
      query = query.contains('common_genres', [genre]);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Beat sheet list error', {
        structure_id: structureId ?? undefined,
        genre: genre ?? undefined,
        operation: 'beat-sheets:fetch'
      }, error);
      return errorResponses.internalError('Failed to fetch beat sheets', { details: error });
    }

    return successResponse({ beatSheets: data || [] });
  } catch (error) {
        const authError = handleAuthError(error)
    if (authError) return authError

    logger.error('Beat sheet list error', {
      operation: 'beat-sheets:get'
    }, error instanceof Error ? error : undefined);
    return errorResponses.internalError('Failed to fetch beat sheets', { details: error });
  }
}
