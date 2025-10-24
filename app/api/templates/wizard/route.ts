/**
 * Template Wizard API
 * POST /api/templates/wizard - Create/update wizard session
 * GET /api/templates/wizard - Get user's wizard sessions
 */

import { NextRequest } from 'next/server';
import { errorResponses, successResponse, errorResponse } from '@/lib/api/error-response';
import { requireAuth } from '@/lib/api/auth-helpers';
import { requireDefaultRateLimit } from '@/lib/api/rate-limit-helpers';
import { logger } from '@/lib/monitoring/structured-logger';

export const dynamic = 'force-dynamic';

interface WizardSessionData {
  path: 'browse' | 'ai';
  templateType?: string;
  projectName?: string;
  logline?: string;
  genre?: string;
  aiModel?: 'claude-sonnet-4.5' | 'gpt-5' | 'deepseek-chat';
  completedStep: number;
  isCompleted?: boolean;
  aiRecommendation?: any;
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
      logger.warn('Unauthorized wizard session request', {
        operation: 'wizard:create',
      });
      return errorResponses.unauthorized();
    }

    // Parse request body
    const body: WizardSessionData = await request.json();
    const {
      path,
      templateType,
      projectName,
      logline,
      genre,
      aiModel,
      completedStep,
      isCompleted = false,
      aiRecommendation,
    } = body;

    // Validate input
    if (!path || !['browse', 'ai'].includes(path)) {
      return errorResponses.badRequest('Invalid path. Must be "browse" or "ai"');
    }

    if (completedStep < 1 || completedStep > 5) {
      return errorResponses.badRequest('Completed step must be between 1 and 5');
    }

    logger.info('Creating wizard session', {
      user_id: user.id,
      path,
      completed_step: completedStep,
      is_completed: isCompleted,
      operation: 'wizard:create',
    });

    // Create wizard session
    const { data: session, error: insertError } = await supabase
      .from('template_wizard_sessions')
      .insert({
        user_id: user.id,
        path,
        template_type: templateType,
        project_name: projectName,
        logline,
        genre,
        ai_model: aiModel,
        completed_step: completedStep,
        is_completed: isCompleted,
        completed_at: isCompleted ? new Date().toISOString() : null,
        ai_recommendation: aiRecommendation,
      })
      .select()
      .single();

    if (insertError) {
      logger.error('Failed to create wizard session', {
        error: insertError,
        operation: 'wizard:create',
      });
      return errorResponse('Failed to create wizard session', { status: 500 });
    }

    // If completed, update recent templates
    if (isCompleted && templateType) {
      const templateNames: Record<string, string> = {
        feature_film: 'Feature Film',
        tv_pilot: 'TV Pilot (1-Hour)',
        tv_pilot_half: 'TV Pilot (30-min)',
        short_film: 'Short Film',
        stage_play: 'Stage Play',
        podcast: 'Podcast Script',
      };

      await supabase.rpc('upsert_recent_template', {
        p_user_id: user.id,
        p_template_type: templateType,
        p_template_name: templateNames[templateType] || templateType,
      });
    }

    logger.info('Wizard session created successfully', {
      session_id: session.id,
      user_id: user.id,
      operation: 'wizard:create',
    });

    return successResponse(session);
  } catch (error) {
    logger.error('Unexpected error in wizard session creation', { error });
    return errorResponse('An unexpected error occurred', { status: 500 });
  }
}

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
    const limit = parseInt(searchParams.get('limit') || '10');
    const onlyCompleted = searchParams.get('completed') === 'true';

    logger.info('Fetching wizard sessions', {
      user_id: user.id,
      limit,
      only_completed: onlyCompleted,
      operation: 'wizard:list',
    });

    // Build query
    let query = supabase
      .from('template_wizard_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (onlyCompleted) {
      query = query.eq('is_completed', true);
    }

    const { data: sessions, error: fetchError } = await query;

    if (fetchError) {
      logger.error('Failed to fetch wizard sessions', {
        error: fetchError,
        operation: 'wizard:list',
      });
      return errorResponse('Failed to fetch wizard sessions', { status: 500 });
    }

    return successResponse(sessions);
  } catch (error) {
    logger.error('Unexpected error fetching wizard sessions', { error });
    return errorResponse('An unexpected error occurred', { status: 500 });
  }
}
