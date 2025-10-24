import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { errorResponses, successResponse } from '@/lib/api/error-response';
import {requireAuth, handleAuthError} from '@/lib/api/auth-helpers';
import { requireDefaultRateLimit } from '@/lib/api/rate-limit-helpers';
import { logger } from '@/lib/monitoring/structured-logger';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/beat-sheets/[id]
 *
 * Retrieve a specific beat sheet by ID
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { user, supabase } = await requireAuth(request);
    await requireDefaultRateLimit(request, user.id);

    const { id } = await params;

    // Add ownership check to prevent IDOR
    const { data, error } = await supabase
      .from('beat_sheets')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) {
      logger.error('Beat sheet fetch error', {
        beat_sheet_id: id,
        user_id: user.id,
        operation: 'beat-sheets:fetch-single'
      }, error);
      return errorResponses.notFound('Beat sheet not found');
    }

    return successResponse({ beatSheet: data });
  } catch (error) {
        const authError = handleAuthError(error)
    if (authError) return authError

    logger.error('Beat sheet fetch error', {
      operation: 'beat-sheets:get-by-id'
    }, error instanceof Error ? error : undefined);
    return errorResponses.internalError('Failed to fetch beat sheet', { details: error });
  }
}
