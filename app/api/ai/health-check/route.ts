/**
 * Template Health Check API
 * POST /api/ai/health-check
 *
 * Feature 2: Story structure and pacing analysis
 * "Your Act II feels rushed (only 40 pages)"
 * "Missing 'All Is Lost' moment at page 75"
 */

import { NextRequest } from 'next/server';
import { errorResponses, successResponse } from '@/lib/api/error-response';
import { logger } from '@/lib/monitoring/structured-logger';
import { analyzeTemplateHealth } from '@/lib/ai/recommendations-engine';
import type { AIModel } from '@/lib/ai/service';
import { requireAuth } from '@/lib/api/auth-helpers';
import { requireAIRateLimit } from '@/lib/api/rate-limit-helpers';
import { z } from 'zod';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// Validation schemas
const healthCheckSchema = z.object({
  projectId: z.string().uuid(),
  documentId: z.string().uuid().optional(),
  content: z.string().min(1).max(100000),
  templateType: z.string().min(1).max(50),
  metadata: z.object({
    totalPages: z.number().int().min(1).optional(),
    actBreaks: z.array(z.object({
      act: z.string(),
      startPage: z.number().int(),
      endPage: z.number().int(),
    })).optional(),
    genre: z.string().max(100).optional(),
  }).optional(),
  model: z.enum(['claude-opus-4', 'claude-sonnet-4.5', 'claude-haiku-4', 'gpt-5-turbo', 'gpt-4o', 'deepseek-chat', 'deepseek-reasoner']).optional(),
});

const patchHealthCheckSchema = z.object({
  healthCheckId: z.string().uuid(),
  viewed: z.boolean().optional(),
  dismissed: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request);
    await requireAIRateLimit(request, user.id);

    // Parse and validate request body
    const body = await request.json();
    const validation = healthCheckSchema.safeParse(body);

    if (!validation.success) {
      return errorResponses.validationError('Invalid request data', {
        details: validation.error.issues,
      });
    }

    const { projectId, documentId, content, templateType, metadata, model } = validation.data;

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, title')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return errorResponses.notFound('Project not found');
    }

    // Generate content hash to avoid re-analyzing same content
    const contentHash = crypto
      .createHash('sha256')
      .update(content)
      .digest('hex')
      .substring(0, 32);

    // Check if we already have a recent analysis for this content
    const { data: existingCheck } = await supabase
      .from('template_health_checks')
      .select('*')
      .eq('project_id', projectId)
      .eq('content_hash', contentHash)
      .gte('analyzed_at', new Date(Date.now() - 1000 * 60 * 60).toISOString()) // Within last hour
      .single();

    if (existingCheck) {
      logger.info('Returning cached health check', {
        user_id: user.id,
        project_id: projectId,
        operation: 'ai:health-check',
      });

      return successResponse({
        healthCheck: existingCheck,
        cached: true,
      });
    }

    logger.info('Analyzing template health', {
      user_id: user.id,
      project_id: projectId,
      template_type: templateType,
      content_length: content.length,
      operation: 'ai:health-check',
    });

    // Call AI health check engine (multi-provider support)
    const healthCheck = await analyzeTemplateHealth(content, templateType, metadata, model);

    // Save health check to database
    const { data: savedCheck, error: insertError } = await supabase
      .from('template_health_checks')
      .insert({
        user_id: user.id,
        project_id: projectId,
        document_id: documentId || null,
        template_type: templateType,
        total_pages: metadata?.totalPages || null,
        genre: metadata?.genre || null,
        overall_score: healthCheck.overallScore,
        issues: healthCheck.issues,
        strengths: healthCheck.strengths,
        act_breakdown: healthCheck.actBreakdown || [],
        beat_presence: healthCheck.beatPresence || [],
        content_hash: contentHash,
      })
      .select()
      .single();

    if (insertError) {
      logger.error(
        'Failed to save health check',
        {
          user_id: user.id,
          project_id: projectId,
          operation: 'ai:health-check',
        },
        insertError ?? undefined
      );
      // Don't fail - return the analysis anyway
    }

    logger.info('Health check completed', {
      user_id: user.id,
      project_id: projectId,
      overall_score: healthCheck.overallScore,
      issues_count: healthCheck.issues.length,
      operation: 'ai:health-check',
    });

    return successResponse({
      healthCheck: savedCheck || healthCheck,
      cached: false,
    });
  } catch (error) {
    logger.error(
      'Error generating health check',
      {
        operation: 'ai:health-check',
      },
      error instanceof Error ? error : undefined
    );

    return errorResponses.internalError('Failed to generate health check');
  }
}

// GET endpoint to retrieve health checks for a project
export async function GET(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request);
    await requireAIRateLimit(request, user.id);

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const documentId = searchParams.get('documentId');
    const limit = parseInt(searchParams.get('limit') || '10');

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
      .from('template_health_checks')
      .select('*')
      .eq('project_id', projectId)
      .order('analyzed_at', { ascending: false })
      .limit(limit);

    if (documentId) {
      query = query.eq('document_id', documentId);
    }

    const { data: healthChecks, error: queryError } = await query;

    if (queryError) {
      logger.error(
        'Failed to fetch health checks',
        {
          user_id: user.id,
          project_id: projectId,
          operation: 'ai:health-check:get',
        },
        queryError ?? undefined
      );
      return errorResponses.internalError('Failed to fetch health checks');
    }

    return successResponse({
      healthChecks: healthChecks || [],
    });
  } catch (error) {
    logger.error(
      'Error fetching health checks',
      {
        operation: 'ai:health-check:get',
      },
      error instanceof Error ? error : undefined
    );

    return errorResponses.internalError('Failed to fetch health checks');
  }
}

// PATCH endpoint to mark health check as viewed/dismissed
export async function PATCH(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request);
    await requireAIRateLimit(request, user.id);

    const body = await request.json();
    const validation = patchHealthCheckSchema.safeParse(body);

    if (!validation.success) {
      return errorResponses.validationError('Invalid request data', {
        details: validation.error.issues,
      });
    }

    const { healthCheckId, viewed, dismissed } = validation.data;

    // Update health check
    const updateData: any = {};
    if (viewed !== undefined) updateData.user_viewed = viewed;
    if (dismissed !== undefined) updateData.user_dismissed = dismissed;

    const { error: updateError } = await supabase
      .from('template_health_checks')
      .update(updateData)
      .eq('id', healthCheckId)
      .eq('user_id', user.id);

    if (updateError) {
      logger.error(
        'Failed to update health check status',
        {
          user_id: user.id,
          health_check_id: healthCheckId,
          operation: 'ai:health-check:patch',
        },
        updateError ?? undefined
      );
      return errorResponses.internalError('Failed to update health check');
    }

    return successResponse({
      message: 'Health check updated successfully',
    });
  } catch (error) {
    logger.error(
      'Error updating health check',
      {
        operation: 'ai:health-check:patch',
      },
      error instanceof Error ? error : undefined
    );

    return errorResponses.internalError('Failed to update health check');
  }
}
