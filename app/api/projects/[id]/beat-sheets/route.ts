import { NextRequest } from 'next/server';
import { errorResponses, successResponse } from '@/lib/api/error-response';
import { logger } from '@/lib/monitoring/structured-logger';
import { requireAuth } from '@/lib/api/auth-helpers';
import { requireDefaultRateLimit } from '@/lib/api/rate-limit-helpers';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// Validation schema for POST
const addBeatSheetSchema = z.object({
  beat_sheet_id: z.string().uuid(),
});

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/projects/[id]/beat-sheets
 *
 * Get all beat sheets associated with a project
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { user, supabase } = await requireAuth(request);
    await requireDefaultRateLimit(request, user.id);

    const { id: projectId } = await params;

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return errorResponses.notFound('Project not found');
    }

    // Get project beat sheets with beat sheet details
    const { data, error } = await supabase
      .from('project_beat_sheets')
      .select(`
        *,
        beat_sheet:beat_sheets(*)
      `)
      .eq('project_id', projectId);

    if (error) {
      logger.error('Error fetching project beat sheets', {
        project_id: projectId,
        operation: 'project-beat-sheets:fetch'
      }, error);
      return errorResponses.internalError('Failed to fetch project beat sheets', { details: error });
    }

    return successResponse({ projectBeatSheets: data || [] });
  } catch (error) {
    logger.error('Unexpected error fetching project beat sheets', {
      operation: 'project-beat-sheets:get'
    }, error instanceof Error ? error : undefined);
    return errorResponses.internalError('Internal server error', { details: error });
  }
}

/**
 * POST /api/projects/[id]/beat-sheets
 *
 * Add a beat sheet to a project
 * Body: { beat_sheet_id: string }
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { user, supabase } = await requireAuth(request);
    await requireDefaultRateLimit(request, user.id);

    const { id: projectId } = await params;

    const body = await request.json();
    const validation = addBeatSheetSchema.safeParse(body);

    if (!validation.success) {
      return errorResponses.validationError('Invalid request data', {
        details: validation.error.issues,
      });
    }

    const { beat_sheet_id } = validation.data;

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return errorResponses.notFound('Project not found');
    }

    // Get beat sheet total_beats
    const { data: beatSheet, error: beatSheetError } = await supabase
      .from('beat_sheets')
      .select('total_beats')
      .eq('id', beat_sheet_id)
      .single();

    if (beatSheetError || !beatSheet) {
      return errorResponses.notFound('Beat sheet not found');
    }

    // Create project beat sheet
    const { data, error } = await supabase
      .from('project_beat_sheets')
      .insert({
        project_id: projectId,
        beat_sheet_id,
        total_beats: beatSheet.total_beats,
        completed_beats: 0,
        beat_data: {}
      })
      .select(`
        *,
        beat_sheet:beat_sheets(*)
      `)
      .single();

    if (error) {
      logger.error('Error creating project beat sheet', {
        project_id: projectId,
        beat_sheet_id,
        operation: 'project-beat-sheets:create'
      }, error);
      return errorResponses.internalError('Failed to add beat sheet to project', { details: error });
    }

    return successResponse({ projectBeatSheet: data });
  } catch (error) {
    logger.error('Unexpected error creating project beat sheet', {
      operation: 'project-beat-sheets:post'
    }, error instanceof Error ? error : undefined);
    return errorResponses.internalError('Internal server error', { details: error });
  }
}
