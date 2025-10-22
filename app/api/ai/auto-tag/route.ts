/**
 * Auto-Tagging API
 * POST /api/ai/auto-tag
 *
 * Feature 3: AI detects genre, tone, influences as you write
 * Generates comprehensive tags for market positioning
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { errorResponses, successResponse } from '@/lib/api/error-response';
import { logger } from '@/lib/monitoring/structured-logger';
import { generateAutoTags } from '@/lib/ai/recommendations-engine';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

interface RequestBody {
  projectId: string;
  content: string;
  logline?: string;
  regenerate?: boolean; // Force regenerate even if tags exist
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      logger.warn('Unauthorized auto-tag request', {
        operation: 'ai:auto-tag',
      });
      return errorResponses.unauthorized();
    }

    // Parse request body
    const body: RequestBody = await request.json();
    const { projectId, content, logline, regenerate = false } = body;

    // Validate input
    if (!projectId) {
      return errorResponses.badRequest('Project ID is required');
    }

    if (!content || content.trim().length === 0) {
      return errorResponses.badRequest('Content is required');
    }

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, title, logline')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return errorResponses.notFound('Project not found');
    }

    // Use project logline if not provided
    const effectiveLogline = logline || project.logline || '';

    // Generate content hash
    const contentHash = crypto
      .createHash('sha256')
      .update(content + effectiveLogline)
      .digest('hex')
      .substring(0, 32);

    // Check for existing tags (unless regenerate is true)
    if (!regenerate) {
      const { data: existingTags } = await supabase
        .from('project_auto_tags')
        .select('*')
        .eq('project_id', projectId)
        .eq('analyzed_content_hash', contentHash)
        .single();

      if (existingTags) {
        logger.info('Returning cached auto-tags', {
          user_id: user.id,
          project_id: projectId,
          operation: 'ai:auto-tag',
        });

        return successResponse({
          tags: existingTags,
          cached: true,
        });
      }
    }

    logger.info('Generating auto-tags', {
      user_id: user.id,
      project_id: projectId,
      content_length: content.length,
      has_logline: !!effectiveLogline,
      operation: 'ai:auto-tag',
    });

    // Call AI auto-tagging engine
    const autoTags = await generateAutoTags(content, effectiveLogline);

    // Upsert tags to database (replace existing tags for this project)
    const { data: savedTags, error: upsertError } = await supabase
      .from('project_auto_tags')
      .upsert(
        {
          user_id: user.id,
          project_id: projectId,
          genres: autoTags.genres,
          tones: autoTags.tones,
          themes: autoTags.themes,
          influences: autoTags.influences,
          target_audience: autoTags.targetAudience,
          content_warnings: autoTags.contentWarnings || [],
          market_comparisons: autoTags.marketComparisons,
          analyzed_content_hash: contentHash,
          generated_at: new Date().toISOString(),
          user_modified: false,
        },
        {
          onConflict: 'project_id',
        }
      )
      .select()
      .single();

    if (upsertError) {
      logger.error(
        'Failed to save auto-tags',
        {
          user_id: user.id,
          project_id: projectId,
          operation: 'ai:auto-tag',
        },
        upsertError ?? undefined
      );
      // Don't fail - return the analysis anyway
    }

    logger.info('Auto-tags generated successfully', {
      user_id: user.id,
      project_id: projectId,
      genres_count: autoTags.genres.length,
      themes_count: autoTags.themes.length,
      operation: 'ai:auto-tag',
    });

    return successResponse({
      tags: savedTags || autoTags,
      cached: false,
    });
  } catch (error) {
    logger.error(
      'Error generating auto-tags',
      {
        operation: 'ai:auto-tag',
      },
      error instanceof Error ? error : undefined
    );

    return errorResponses.internalError('Failed to generate auto-tags');
  }
}

// GET endpoint to retrieve tags for a project
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
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return errorResponses.badRequest('Project ID is required');
    }

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

    // Get tags
    const { data: tags, error: queryError } = await supabase
      .from('project_auto_tags')
      .select('*')
      .eq('project_id', projectId)
      .single();

    if (queryError && queryError.code !== 'PGRST116') {
      // PGRST116 = no rows returned (not an error)
      logger.error(
        'Failed to fetch auto-tags',
        {
          user_id: user.id,
          project_id: projectId,
          operation: 'ai:auto-tag:get',
        },
        queryError ?? undefined
      );
      return errorResponses.internalError('Failed to fetch tags');
    }

    return successResponse({
      tags: tags || null,
    });
  } catch (error) {
    logger.error(
      'Error fetching auto-tags',
      {
        operation: 'ai:auto-tag:get',
      },
      error instanceof Error ? error : undefined
    );

    return errorResponses.internalError('Failed to fetch tags');
  }
}

// PATCH endpoint to update user-modified tags
export async function PATCH(request: NextRequest) {
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

    const body = await request.json();
    const { projectId, userAddedTags, userRemovedTags } = body;

    if (!projectId) {
      return errorResponses.badRequest('Project ID is required');
    }

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

    // Update tags
    const updateData: any = {
      user_modified: true,
    };

    if (userAddedTags !== undefined) {
      updateData.user_added_tags = userAddedTags;
    }

    if (userRemovedTags !== undefined) {
      updateData.user_removed_tags = userRemovedTags;
    }

    const { data: updatedTags, error: updateError } = await supabase
      .from('project_auto_tags')
      .update(updateData)
      .eq('project_id', projectId)
      .select()
      .single();

    if (updateError) {
      logger.error(
        'Failed to update auto-tags',
        {
          user_id: user.id,
          project_id: projectId,
          operation: 'ai:auto-tag:patch',
        },
        updateError ?? undefined
      );
      return errorResponses.internalError('Failed to update tags');
    }

    return successResponse({
      tags: updatedTags,
      message: 'Tags updated successfully',
    });
  } catch (error) {
    logger.error(
      'Error updating auto-tags',
      {
        operation: 'ai:auto-tag:patch',
      },
      error instanceof Error ? error : undefined
    );

    return errorResponses.internalError('Failed to update tags');
  }
}

// DELETE endpoint to remove tags for a project
export async function DELETE(request: NextRequest) {
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
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return errorResponses.badRequest('Project ID is required');
    }

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

    // Delete tags
    const { error: deleteError } = await supabase
      .from('project_auto_tags')
      .delete()
      .eq('project_id', projectId);

    if (deleteError) {
      logger.error(
        'Failed to delete auto-tags',
        {
          user_id: user.id,
          project_id: projectId,
          operation: 'ai:auto-tag:delete',
        },
        deleteError ?? undefined
      );
      return errorResponses.internalError('Failed to delete tags');
    }

    return successResponse({
      message: 'Tags deleted successfully',
    });
  } catch (error) {
    logger.error(
      'Error deleting auto-tags',
      {
        operation: 'ai:auto-tag:delete',
      },
      error instanceof Error ? error : undefined
    );

    return errorResponses.internalError('Failed to delete tags');
  }
}
