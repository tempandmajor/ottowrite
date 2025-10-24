/**
 * Auto-Tagging API
 * POST /api/ai/auto-tag
 *
 * Feature 3: AI detects genre, tone, influences as you write
 * Generates comprehensive tags for market positioning
 */

import { NextRequest } from 'next/server';
import { errorResponses, successResponse } from '@/lib/api/error-response';
import { logger } from '@/lib/monitoring/structured-logger';
import { generateAutoTags } from '@/lib/ai/recommendations-engine';
import type { AIModel } from '@/lib/ai/service';
import {requireAuth, handleAuthError} from '@/lib/api/auth-helpers';
import { requireAIRateLimit } from '@/lib/api/rate-limit-helpers';
import { z } from 'zod';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// Validation schemas
const autoTagSchema = z.object({
  projectId: z.string().uuid(),
  content: z.string().min(1).max(100000),
  logline: z.string().max(1000).optional(),
  regenerate: z.boolean().optional(),
  model: z.enum(['claude-sonnet-4.5', 'gpt-5', 'deepseek-chat']).optional(),
});

const patchTagSchema = z.object({
  projectId: z.string().uuid(),
  userAddedTags: z.array(z.string()).optional(),
  userRemovedTags: z.array(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request);
    await requireAIRateLimit(request, user.id);

    // Parse and validate request body
    const body = await request.json();
    const validation = autoTagSchema.safeParse(body);

    if (!validation.success) {
      return errorResponses.validationError('Invalid request data', {
        details: validation.error.issues,
      });
    }

    const { projectId, content, logline, regenerate = false, model } = validation.data;

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
    const autoTags = await generateAutoTags(content, effectiveLogline, model);

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
        const authError = handleAuthError(error)
    if (authError) return authError

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
    const { user, supabase } = await requireAuth(request);
    await requireAIRateLimit(request, user.id);

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
        const authError = handleAuthError(error)
    if (authError) return authError

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
    const { user, supabase } = await requireAuth(request);
    await requireAIRateLimit(request, user.id);

    const body = await request.json();
    const validation = patchTagSchema.safeParse(body);

    if (!validation.success) {
      return errorResponses.validationError('Invalid request data', {
        details: validation.error.issues,
      });
    }

    const { projectId, userAddedTags, userRemovedTags } = validation.data;

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
        const authError = handleAuthError(error)
    if (authError) return authError

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
    const { user, supabase } = await requireAuth(request);
    await requireAIRateLimit(request, user.id);

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
        const authError = handleAuthError(error)
    if (authError) return authError

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
