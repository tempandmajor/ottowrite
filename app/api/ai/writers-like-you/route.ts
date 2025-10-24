/**
 * Collaborative Filtering API
 * GET /api/ai/writers-like-you
 *
 * Feature 4: "Writers Like You Used..."
 * Collaborative filtering for template recommendations based on similar writers
 */

import { NextRequest } from 'next/server';
import { errorResponses, successResponse } from '@/lib/api/error-response';
import { logger } from '@/lib/monitoring/structured-logger';
import { getCollaborativeRecommendations, UserProfile } from '@/lib/ai/recommendations-engine';
import type { AIModel } from '@/lib/ai/service';
import {requireAuth, handleAuthError} from '@/lib/api/auth-helpers';
import { requireAIRateLimit } from '@/lib/api/rate-limit-helpers';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// Validation schemas
const updateProfileSchema = z.object({
  preferredGenres: z.array(z.string().max(100)).max(20).optional(),
  writingStyle: z.string().max(500).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request);
    await requireAIRateLimit(request, user.id);

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const model = (searchParams.get('model') as AIModel) || 'deepseek-chat'; // DeepSeek is cost-effective for recommendations

    // Get or create user writing profile
    const { data: profile, error: profileError } = await supabase
      .from('user_writing_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      logger.error(
        'Failed to fetch user profile',
        {
          user_id: user.id,
          operation: 'ai:writers-like-you',
        },
        profileError ?? undefined
      );
      return errorResponses.internalError('Failed to fetch user profile');
    }

    // If no profile exists, create a basic one
    if (!profile) {
      logger.info('Creating new user writing profile', {
        user_id: user.id,
        operation: 'ai:writers-like-you',
      });

      // Get user's completed projects to build profile
      const { data: projects } = await supabase
        .from('projects')
        .select('id, type, status')
        .eq('user_id', user.id);

      const completedProjects = (projects || []).map((p) => ({
        template_type: p.type || 'unknown',
        genre: 'unknown',
        success_metric: p.status === 'completed' ? 1 : 0,
      }));

      await supabase.from('user_writing_profiles').insert({
        user_id: user.id,
        preferred_genres: [],
        preferred_templates: [],
        completed_projects: completedProjects,
        total_projects: projects?.length || 0,
        total_completions: completedProjects.filter((p) => p.success_metric === 1).length,
      });
    }

    // Build user profile object
    const userProfile: UserProfile = {
      userId: user.id,
      preferredGenres: profile?.preferred_genres || [],
      completedProjects: profile?.completed_projects || [],
      writingStyle: profile?.writing_style || undefined,
    };

    // Get current project context if provided
    let currentProject: { logline?: string; genre?: string } | undefined;
    if (projectId) {
      const { data: project } = await supabase
        .from('projects')
        .select('logline')
        .eq('id', projectId)
        .eq('user_id', user.id)
        .single();

      if (project) {
        // Get project tags for genre
        const { data: tags } = await supabase
          .from('project_auto_tags')
          .select('genres')
          .eq('project_id', projectId)
          .single();

        currentProject = {
          logline: project.logline || undefined,
          genre: tags?.genres?.[0]?.name || undefined,
        };
      }
    }

    logger.info('Generating collaborative recommendations', {
      user_id: user.id,
      project_id: projectId,
      preferred_genres_count: userProfile.preferredGenres.length,
      completed_projects_count: userProfile.completedProjects.length,
      operation: 'ai:writers-like-you',
    });

    // Get collaborative recommendations (multi-provider support)
    const recommendations = await getCollaborativeRecommendations(
      userProfile,
      currentProject,
      model
    );

    // Get actual template usage stats from database
    const { data: usageStats } = await supabase
      .from('template_usage_stats')
      .select('*')
      .order('total_uses', { ascending: false })
      .limit(10);

    // Enhance recommendations with real data if available
    const enhancedRecommendations = recommendations.map((rec) => {
      const stats = usageStats?.find((s) => s.template_type === rec.template_type);
      if (stats) {
        return {
          ...rec,
          usageCount: stats.total_uses,
          averageRating: stats.average_rating,
        };
      }
      return rec;
    });

    logger.info('Collaborative recommendations generated', {
      user_id: user.id,
      recommendations_count: enhancedRecommendations.length,
      operation: 'ai:writers-like-you',
    });

    return successResponse({
      recommendations: enhancedRecommendations,
      userProfile: {
        preferredGenres: userProfile.preferredGenres,
        completedProjects: userProfile.completedProjects.length,
        writingStyle: userProfile.writingStyle,
      },
    });
  } catch (error) {
        const authError = handleAuthError(error)
    if (authError) return authError

    logger.error(
      'Error generating collaborative recommendations',
      {
        operation: 'ai:writers-like-you',
      },
      error instanceof Error ? error : undefined
    );

    return errorResponses.internalError(
      'Failed to generate collaborative recommendations'
    );
  }
}

// POST endpoint to update user writing profile
export async function POST(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request);
    await requireAIRateLimit(request, user.id);

    const body = await request.json();
    const validation = updateProfileSchema.safeParse(body);

    if (!validation.success) {
      return errorResponses.validationError('Invalid request data', {
        details: validation.error.issues,
      });
    }

    const { preferredGenres, writingStyle } = validation.data;

    // Update user profile
    const updateData: any = {};
    if (preferredGenres !== undefined) {
      updateData.preferred_genres = preferredGenres;
    }
    if (writingStyle !== undefined) {
      updateData.writing_style = writingStyle;
    }
    updateData.updated_at = new Date().toISOString();

    const { data: updatedProfile, error: updateError } = await supabase
      .from('user_writing_profiles')
      .upsert(
        {
          user_id: user.id,
          ...updateData,
        },
        {
          onConflict: 'user_id',
        }
      )
      .select()
      .single();

    if (updateError) {
      logger.error(
        'Failed to update user profile',
        {
          user_id: user.id,
          operation: 'ai:writers-like-you:post',
        },
        updateError ?? undefined
      );
      return errorResponses.internalError('Failed to update profile');
    }

    logger.info('User profile updated', {
      user_id: user.id,
      operation: 'ai:writers-like-you:post',
    });

    return successResponse({
      profile: updatedProfile,
      message: 'Profile updated successfully',
    });
  } catch (error) {
        const authError = handleAuthError(error)
    if (authError) return authError

    logger.error(
      'Error updating user profile',
      {
        operation: 'ai:writers-like-you:post',
      },
      error instanceof Error ? error : undefined
    );

    return errorResponses.internalError('Failed to update profile');
  }
}
