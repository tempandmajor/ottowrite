import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { errorResponses, successResponse } from '@/lib/api/error-response';
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
    const supabase = await createClient();
    const { id } = await params;

    const { data, error } = await supabase
      .from('beat_sheets')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      logger.error('Beat sheet fetch error', {
        beat_sheet_id: id,
        operation: 'beat-sheets:fetch-single'
      }, error);
      return errorResponses.notFound('Beat sheet not found');
    }

    return successResponse({ beatSheet: data });
  } catch (error) {
    logger.error('Beat sheet fetch error', {
      operation: 'beat-sheets:get-by-id'
    }, error instanceof Error ? error : undefined);
    return errorResponses.internalError('Failed to fetch beat sheet', { details: error });
  }
}
