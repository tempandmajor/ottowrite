/**
 * Recent Templates API
 * GET /api/templates/recent - Get user's recent templates
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { errorResponses, successResponse, errorResponse } from '@/lib/api/error-response';
import { logger } from '@/lib/monitoring/structured-logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return errorResponses.unauthorized();
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '4');

    logger.info('Fetching recent templates', {
      user_id: user.id,
      limit,
      operation: 'templates:recent',
    });

    // Call helper function to get recent templates
    const { data: recentTemplates, error: fetchError } = await supabase.rpc(
      'get_user_recent_templates',
      {
        p_user_id: user.id,
        p_limit: limit,
      }
    );

    if (fetchError) {
      logger.error('Failed to fetch recent templates', {
        error: fetchError,
        operation: 'templates:recent',
      });
      return errorResponse('Failed to fetch recent templates', { status: 500 });
    }

    // Format response
    const formatted = (recentTemplates || []).map((template: any) => ({
      id: template.id,
      type: template.template_type,
      name: template.template_name,
      lastUsed: template.last_used,
      projectsCount: template.projects_count,
    }));

    return successResponse(formatted);
  } catch (error) {
    logger.error('Unexpected error fetching recent templates', { error });
    return errorResponse('An unexpected error occurred', { status: 500 });
  }
}
