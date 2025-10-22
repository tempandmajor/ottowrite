/**
 * Smart Template Recommendations API
 * POST /api/ai/recommend-template
 *
 * Feature 1: AI-powered template recommendations based on logline
 * "Based on your logline, we recommend Feature Film (95% match)"
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { errorResponses, successResponse } from '@/lib/api/error-response';
import { logger } from '@/lib/monitoring/structured-logger';
import { getSmartTemplateRecommendations } from '@/lib/ai/recommendations-engine';
import type { AIModel } from '@/lib/ai/service';

export const dynamic = 'force-dynamic';

interface RequestBody {
  logline: string;
  projectId?: string;
  additionalContext?: {
    targetLength?: 'short' | 'feature' | 'series' | 'stage';
    preferredMedium?: 'film' | 'tv' | 'stage' | 'audio' | 'sequential';
  };
  saveRecommendation?: boolean; // Save to database for tracking
  model?: AIModel; // Allow model selection (Claude, GPT-5, DeepSeek)
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
      logger.warn('Unauthorized template recommendation request', {
        operation: 'ai:recommend-template',
      });
      return errorResponses.unauthorized();
    }

    // Parse request body
    const body: RequestBody = await request.json();
    const { logline, projectId, additionalContext, saveRecommendation = true, model } = body;

    // Validate input
    if (!logline || logline.trim().length === 0) {
      return errorResponses.badRequest('Logline is required');
    }

    if (logline.length > 1000) {
      return errorResponses.badRequest('Logline must be less than 1000 characters');
    }

    // Verify project ownership if projectId provided
    if (projectId) {
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .eq('user_id', user.id)
        .single();

      if (projectError || !project) {
        return errorResponses.notFound('Project not found');
      }
    }

    logger.info('Generating template recommendations', {
      user_id: user.id,
      project_id: projectId,
      logline_length: logline.length,
      model: model || 'claude-sonnet-4.5',
      operation: 'ai:recommend-template',
    });

    // Call AI recommendations engine (multi-provider support)
    const recommendations = await getSmartTemplateRecommendations(
      logline,
      additionalContext,
      model
    );

    // Save recommendation to database if requested
    if (saveRecommendation) {
      const { error: insertError } = await supabase
        .from('template_recommendations')
        .insert({
          user_id: user.id,
          project_id: projectId || null,
          logline,
          additional_context: additionalContext || {},
          detected_genre: recommendations.detectedGenre,
          detected_tone: recommendations.detectedTone,
          confidence: recommendations.confidence,
          recommended_template_type: recommendations.primary.template_type,
          match_percentage: recommendations.primary.match_percentage,
          reasons: recommendations.primary.reasons,
          alternatives: recommendations.alternatives,
        });

      if (insertError) {
        logger.error(
          'Failed to save template recommendation',
          {
            user_id: user.id,
            operation: 'ai:recommend-template',
          },
          insertError ?? undefined
        );
        // Don't fail the request - just log the error
      }
    }

    logger.info('Template recommendations generated successfully', {
      user_id: user.id,
      recommended_template: recommendations.primary.template_type,
      match_percentage: recommendations.primary.match_percentage,
      confidence: recommendations.confidence,
      operation: 'ai:recommend-template',
    });

    return successResponse({
      recommendation: recommendations,
    });
  } catch (error) {
    logger.error(
      'Error generating template recommendations',
      {
        operation: 'ai:recommend-template',
      },
      error instanceof Error ? error : undefined
    );

    return errorResponses.internalError(
      'Failed to generate template recommendations'
    );
  }
}

// GET endpoint to retrieve past recommendations for a project
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
    const limit = parseInt(searchParams.get('limit') || '10');

    // Build query
    let query = supabase
      .from('template_recommendations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data: recommendations, error: queryError } = await query;

    if (queryError) {
      logger.error(
        'Failed to fetch template recommendations',
        {
          user_id: user.id,
          operation: 'ai:recommend-template:get',
        },
        queryError ?? undefined
      );
      return errorResponses.internalError('Failed to fetch recommendations');
    }

    return successResponse({
      recommendations: recommendations || [],
    });
  } catch (error) {
    logger.error(
      'Error fetching template recommendations',
      {
        operation: 'ai:recommend-template:get',
      },
      error instanceof Error ? error : undefined
    );

    return errorResponses.internalError('Failed to fetch recommendations');
  }
}

// PATCH endpoint to track user acceptance
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
    const { recommendationId, accepted, acceptedTemplateType } = body;

    if (!recommendationId) {
      return errorResponses.badRequest('Recommendation ID is required');
    }

    // Update recommendation
    const { error: updateError } = await supabase
      .from('template_recommendations')
      .update({
        user_accepted: accepted,
        accepted_template_type: acceptedTemplateType || null,
      })
      .eq('id', recommendationId)
      .eq('user_id', user.id);

    if (updateError) {
      logger.error(
        'Failed to update recommendation acceptance',
        {
          user_id: user.id,
          recommendation_id: recommendationId,
          operation: 'ai:recommend-template:patch',
        },
        updateError ?? undefined
      );
      return errorResponses.internalError('Failed to update recommendation');
    }

    return successResponse({
      message: 'Recommendation updated successfully',
    });
  } catch (error) {
    logger.error(
      'Error updating recommendation',
      {
        operation: 'ai:recommend-template:patch',
      },
      error instanceof Error ? error : undefined
    );

    return errorResponses.internalError('Failed to update recommendation');
  }
}
