/**
 * Context-Aware Placeholders API
 * POST /api/ai/placeholder
 *
 * Feature 5: AI generates scene descriptions based on your logline
 * Provides context-aware suggestions for screenplay elements
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { errorResponses, successResponse } from '@/lib/api/error-response';
import { logger } from '@/lib/monitoring/structured-logger';
import { generateContextAwarePlaceholder } from '@/lib/ai/recommendations-engine';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

interface RequestBody {
  projectId: string;
  elementType: 'scene_heading' | 'action' | 'character' | 'dialogue' | 'transition';
  context: {
    logline: string;
    genre?: string;
    previousContent?: string;
    characterName?: string;
    location?: string;
  };
  useCache?: boolean; // Check cache first
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
      logger.warn('Unauthorized placeholder request', {
        operation: 'ai:placeholder',
      });
      return errorResponses.unauthorized();
    }

    // Parse request body
    const body: RequestBody = await request.json();
    const { projectId, elementType, context, useCache = true } = body;

    // Validate input
    if (!projectId) {
      return errorResponses.badRequest('Project ID is required');
    }

    if (!elementType) {
      return errorResponses.badRequest('Element type is required');
    }

    if (!context.logline || context.logline.trim().length === 0) {
      return errorResponses.badRequest('Logline is required in context');
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

    // Generate context hash for caching
    const contextString = JSON.stringify({
      elementType,
      logline: context.logline,
      previousContent: context.previousContent?.substring(0, 500) || '',
      characterName: context.characterName || '',
      location: context.location || '',
    });

    const contextHash = crypto
      .createHash('sha256')
      .update(contextString)
      .digest('hex')
      .substring(0, 32);

    // Check cache if enabled
    if (useCache) {
      const { data: cachedPlaceholder } = await supabase
        .from('placeholder_suggestions')
        .select('*')
        .eq('project_id', projectId)
        .eq('element_type', elementType)
        .eq('context_hash', contextHash)
        .order('generated_at', { ascending: false })
        .limit(1)
        .single();

      if (cachedPlaceholder) {
        // Update usage stats
        await supabase
          .from('placeholder_suggestions')
          .update({
            times_used: cachedPlaceholder.times_used + 1,
            last_used_at: new Date().toISOString(),
          })
          .eq('id', cachedPlaceholder.id);

        logger.info('Returning cached placeholder', {
          user_id: user.id,
          project_id: projectId,
          element_type: elementType,
          operation: 'ai:placeholder',
        });

        return successResponse({
          placeholder: {
            elementType: cachedPlaceholder.element_type,
            suggestion: cachedPlaceholder.suggestion,
            context: cachedPlaceholder.reasoning || '',
            alternatives: cachedPlaceholder.alternatives || [],
          },
          cached: true,
        });
      }
    }

    // Get project auto-tags for better context
    const { data: tags } = await supabase
      .from('project_auto_tags')
      .select('genres, tones')
      .eq('project_id', projectId)
      .single();

    // Enhance context with project tags
    const enhancedContext = {
      ...context,
      genre:
        context.genre ||
        tags?.genres?.[0]?.name ||
        undefined,
    };

    logger.info('Generating context-aware placeholder', {
      user_id: user.id,
      project_id: projectId,
      element_type: elementType,
      has_previous_content: !!context.previousContent,
      operation: 'ai:placeholder',
    });

    // Generate placeholder using AI
    const placeholder = await generateContextAwarePlaceholder(
      elementType,
      enhancedContext
    );

    // Save to database for future caching
    const { error: insertError } = await supabase
      .from('placeholder_suggestions')
      .insert({
        user_id: user.id,
        project_id: projectId,
        element_type: elementType,
        context_hash: contextHash,
        suggestion: placeholder.suggestion,
        alternatives: placeholder.alternatives || [],
        reasoning: placeholder.context,
        times_used: 1,
        last_used_at: new Date().toISOString(),
      });

    if (insertError) {
      logger.error(
        'Failed to save placeholder',
        {
          user_id: user.id,
          project_id: projectId,
          operation: 'ai:placeholder',
        },
        insertError ?? undefined
      );
      // Don't fail - return the placeholder anyway
    }

    logger.info('Placeholder generated successfully', {
      user_id: user.id,
      project_id: projectId,
      element_type: elementType,
      alternatives_count: placeholder.alternatives?.length || 0,
      operation: 'ai:placeholder',
    });

    return successResponse({
      placeholder,
      cached: false,
    });
  } catch (error) {
    logger.error(
      'Error generating placeholder',
      {
        operation: 'ai:placeholder',
      },
      error instanceof Error ? error : undefined
    );

    return errorResponses.internalError('Failed to generate placeholder');
  }
}

// GET endpoint to retrieve placeholder history/stats
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
    const elementType = searchParams.get('elementType');
    const limit = parseInt(searchParams.get('limit') || '20');

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

    // Build query
    let query = supabase
      .from('placeholder_suggestions')
      .select('*')
      .eq('project_id', projectId)
      .order('acceptance_rate', { ascending: false, nullsFirst: false })
      .order('times_used', { ascending: false })
      .limit(limit);

    if (elementType) {
      query = query.eq('element_type', elementType);
    }

    const { data: placeholders, error: queryError } = await query;

    if (queryError) {
      logger.error(
        'Failed to fetch placeholders',
        {
          user_id: user.id,
          project_id: projectId,
          operation: 'ai:placeholder:get',
        },
        queryError ?? undefined
      );
      return errorResponses.internalError('Failed to fetch placeholders');
    }

    return successResponse({
      placeholders: placeholders || [],
    });
  } catch (error) {
    logger.error(
      'Error fetching placeholders',
      {
        operation: 'ai:placeholder:get',
      },
      error instanceof Error ? error : undefined
    );

    return errorResponses.internalError('Failed to fetch placeholders');
  }
}

// PATCH endpoint to track placeholder acceptance
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
    const { placeholderId, accepted } = body;

    if (!placeholderId) {
      return errorResponses.badRequest('Placeholder ID is required');
    }

    if (typeof accepted !== 'boolean') {
      return errorResponses.badRequest('Accepted must be a boolean');
    }

    // Get current placeholder
    const { data: placeholder, error: fetchError } = await supabase
      .from('placeholder_suggestions')
      .select('times_accepted')
      .eq('id', placeholderId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !placeholder) {
      return errorResponses.notFound('Placeholder not found');
    }

    // Update acceptance tracking
    const { error: updateError } = await supabase
      .from('placeholder_suggestions')
      .update({
        times_accepted: accepted
          ? placeholder.times_accepted + 1
          : placeholder.times_accepted,
      })
      .eq('id', placeholderId)
      .eq('user_id', user.id);

    if (updateError) {
      logger.error(
        'Failed to update placeholder acceptance',
        {
          user_id: user.id,
          placeholder_id: placeholderId,
          operation: 'ai:placeholder:patch',
        },
        updateError ?? undefined
      );
      return errorResponses.internalError('Failed to update placeholder');
    }

    return successResponse({
      message: 'Placeholder acceptance tracked successfully',
    });
  } catch (error) {
    logger.error(
      'Error updating placeholder',
      {
        operation: 'ai:placeholder:patch',
      },
      error instanceof Error ? error : undefined
    );

    return errorResponses.internalError('Failed to update placeholder');
  }
}
