import { NextRequest } from 'next/server';
import { errorResponses, successResponse } from '@/lib/api/error-response';
import { logger } from '@/lib/monitoring/structured-logger';
import { requireAuth } from '@/lib/api/auth-helpers';
import { requireDefaultRateLimit } from '@/lib/api/rate-limit-helpers';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// Validation schema for PATCH
const updateBeatSheetSchema = z.object({
  beat_data: z.record(z.string(), z.any()).optional(),
  completed_beats: z.number().int().min(0).optional(),
});

interface RouteParams {
  params: Promise<{
    id: string;
    beatSheetId: string;
  }>;
}

/**
 * GET /api/projects/[id]/beat-sheets/[beatSheetId]
 *
 * Get a specific project beat sheet
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { user, supabase } = await requireAuth(request);
    await requireDefaultRateLimit(request, user.id);

    const { id: projectId, beatSheetId } = await params;

    // Verify project ownership first
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return errorResponses.notFound('Project not found');
    }

    const { data, error } = await supabase
      .from('project_beat_sheets')
      .select(`
        *,
        beat_sheet:beat_sheets(*)
      `)
      .eq('project_id', projectId)
      .eq('id', beatSheetId)
      .single();

    if (error) {
      logger.error('Error fetching project beat sheet', {
        project_id: projectId,
        beat_sheet_id: beatSheetId,
        operation: 'project-beat-sheet:fetch'
      }, error);
      return errorResponses.notFound('Project beat sheet not found');
    }

    return successResponse({ projectBeatSheet: data });
  } catch (error) {
    logger.error('Unexpected error fetching project beat sheet', {
      operation: 'project-beat-sheet:get'
    }, error instanceof Error ? error : undefined);
    return errorResponses.internalError('Internal server error', { details: error });
  }
}

/**
 * PATCH /api/projects/[id]/beat-sheets/[beatSheetId]
 *
 * Update beat data for a project beat sheet
 * Body: { beat_data: Record<string, any>, completed_beats?: number }
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { user, supabase } = await requireAuth(request);
    await requireDefaultRateLimit(request, user.id);

    const { id: projectId, beatSheetId } = await params;

    const body = await request.json();
    const validation = updateBeatSheetSchema.safeParse(body);

    if (!validation.success) {
      return errorResponses.validationError('Invalid request data', {
        details: validation.error.issues,
      });
    }

    const { beat_data, completed_beats } = validation.data;

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

    // Update project beat sheet
    const updateData: any = {};
    if (beat_data !== undefined) {
      updateData.beat_data = beat_data;
    }
    if (completed_beats !== undefined) {
      updateData.completed_beats = completed_beats;
    }

    const { data, error } = await supabase
      .from('project_beat_sheets')
      .update(updateData)
      .eq('id', beatSheetId)
      .eq('project_id', projectId)
      .select(`
        *,
        beat_sheet:beat_sheets(*)
      `)
      .single();

    if (error) {
      logger.error('Error updating project beat sheet', {
        project_id: projectId,
        beat_sheet_id: beatSheetId,
        operation: 'project-beat-sheet:update'
      }, error);
      return errorResponses.internalError('Failed to update project beat sheet', { details: error });
    }

    return successResponse({ projectBeatSheet: data });
  } catch (error) {
    logger.error('Unexpected error updating project beat sheet', {
      operation: 'project-beat-sheet:patch'
    }, error instanceof Error ? error : undefined);
    return errorResponses.internalError('Internal server error', { details: error });
  }
}

/**
 * DELETE /api/projects/[id]/beat-sheets/[beatSheetId]
 *
 * Remove a beat sheet from a project
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { user, supabase } = await requireAuth(request);
    await requireDefaultRateLimit(request, user.id);

    const { id: projectId, beatSheetId } = await params;

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

    const { error } = await supabase
      .from('project_beat_sheets')
      .delete()
      .eq('id', beatSheetId)
      .eq('project_id', projectId);

    if (error) {
      logger.error('Error deleting project beat sheet', {
        project_id: projectId,
        beat_sheet_id: beatSheetId,
        operation: 'project-beat-sheet:delete'
      }, error);
      return errorResponses.internalError('Failed to delete project beat sheet', { details: error });
    }

    return successResponse({ success: true });
  } catch (error) {
    logger.error('Unexpected error deleting project beat sheet', {
      operation: 'project-beat-sheet:delete'
    }, error instanceof Error ? error : undefined);
    return errorResponses.internalError('Internal server error', { details: error });
  }
}
