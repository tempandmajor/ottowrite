import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponses, successResponse } from '@/lib/api/error-response'
import {requireAuth, handleAuthError} from '@/lib/api/auth-helpers'
import { requireDefaultRateLimit } from '@/lib/api/rate-limit-helpers'
import { logger } from '@/lib/monitoring/structured-logger'

export const dynamic = 'force-dynamic'

// GET - List beats for a project
export async function GET(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)
  await requireDefaultRateLimit(request, user.id)

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('project_id')
    const beatType = searchParams.get('beat_type')

    if (!projectId) {
      return errorResponses.badRequest('Project ID required', { userId: user.id })
    }

    let query = supabase
      .from('story_beats')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .order('order_position', { ascending: true })

    if (beatType) {
      query = query.eq('beat_type', beatType)
    }

    const { data, error } = await query

    if (error) {
      logger.error('Error fetching story beats', {
        userId: user.id,
        projectId,
        beatType: beatType ?? undefined,
        operation: 'story_beats:fetch',
      }, error)
      return errorResponses.internalError('Failed to fetch story beats', {
        details: error,
        userId: user.id,
      })
    }

    return successResponse({ beats: data || [] })
  } catch (error) {
        const authError = handleAuthError(error)
    if (authError) return authError

    logger.error('Error in GET /api/story-beats', {
      operation: 'story_beats:get',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to fetch story beats', { details: error })
  }
}

// POST - Create or initialize beats from template
export async function POST(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)

    const body = await request.json()
    const { project_id, template_name, beats } = body

    if (!project_id) {
      return errorResponses.badRequest('Project ID required', { userId: user.id })
    }

    // If template_name provided, initialize from template
    if (template_name) {
      const { data: createdBeats, error: rpcError } = await supabase.rpc(
        'initialize_beats_from_template',
        {
          p_project_id: project_id,
          p_user_id: user.id,
          p_template_name: template_name,
        }
      )

      if (rpcError) {
        const isTemplateMissing = rpcError.message?.toLowerCase().includes('template not found')

        if (isTemplateMissing) {
          return errorResponses.notFound('Template not found', { userId: user.id })
        }

        logger.error('Error initializing beats from template', {
          userId: user.id,
          projectId: project_id,
          templateName: template_name,
          operation: 'story_beats:initialize_template',
        }, rpcError)
        return errorResponses.internalError('Failed to initialize beats', {
          details: rpcError,
          userId: user.id,
        })
      }

      return successResponse({ beats: createdBeats || [] })
    }

    // Otherwise, create individual beats
    if (beats && Array.isArray(beats)) {
      const { data: createdBeats, error: createError } = await supabase
        .from('story_beats')
        .insert(
          beats.map((beat) => ({
            ...beat,
            project_id,
            user_id: user.id,
          }))
        )
        .select()

      if (createError) {
        logger.error('Error creating story beats', {
          userId: user.id,
          projectId: project_id,
          beatCount: beats.length,
          operation: 'story_beats:create',
        }, createError)
        return errorResponses.internalError('Failed to create story beats', {
          details: createError,
          userId: user.id,
        })
      }

      return successResponse({ beats: createdBeats })
    }

    return errorResponses.badRequest('Either template_name or beats array is required', {
      userId: user.id,
    })
  } catch (error) {
        const authError = handleAuthError(error)
    if (authError) return authError

    logger.error('Error in POST /api/story-beats', {
      operation: 'story_beats:post',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to create story beats', { details: error })
  }
}

// PATCH - Update beat
export async function PATCH(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return errorResponses.badRequest('Beat ID required', { userId: user.id })
    }

    const { data, error } = await supabase
      .from('story_beats')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      logger.error('Error updating story beat', {
        userId: user.id,
        beatId: id,
        operation: 'story_beats:update',
      }, error)
      return errorResponses.internalError('Failed to update story beat', {
        details: error,
        userId: user.id,
      })
    }

    if (!data) {
      return errorResponses.notFound('Story beat not found', { userId: user.id })
    }

    return successResponse({ beat: data })
  } catch (error) {
        const authError = handleAuthError(error)
    if (authError) return authError

    logger.error('Error in PATCH /api/story-beats', {
      operation: 'story_beats:patch',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to update story beat', { details: error })
  }
}

// DELETE - Delete beat
export async function DELETE(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return errorResponses.badRequest('Beat ID required', { userId: user.id })
    }

    const { error } = await supabase
      .from('story_beats')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      logger.error('Error deleting story beat', {
        userId: user.id,
        beatId: id,
        operation: 'story_beats:delete',
      }, error)
      return errorResponses.internalError('Failed to delete story beat', {
        details: error,
        userId: user.id,
      })
    }

    return successResponse({ success: true })
  } catch (error) {
        const authError = handleAuthError(error)
    if (authError) return authError

    logger.error('Error in DELETE /api/story-beats', {
      operation: 'story_beats:delete',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to delete story beat', { details: error })
  }
}
