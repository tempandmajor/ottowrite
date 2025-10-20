import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponses, successResponse } from '@/lib/api/error-response'
import { logger } from '@/lib/monitoring/structured-logger'

export const dynamic = 'force-dynamic'

// GET - List characters for a project
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return errorResponses.unauthorized()
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('project_id')
    const role = searchParams.get('role')
    const limit = searchParams.get('limit')

    if (!projectId) {
      return errorResponses.badRequest('project_id is required', { userId: user.id })
    }

    let query = supabase
      .from('characters')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .order('importance', { ascending: false })
      .order('created_at', { ascending: false })

    if (role) {
      query = query.eq('role', role)
    }

    if (limit) {
      query = query.limit(parseInt(limit))
    }

    const { data: characters, error } = await query

    if (error) {
      logger.error('Error fetching characters', {
        userId: user.id,
        projectId,
        operation: 'characters:fetch',
      }, error)
      return errorResponses.internalError('Failed to fetch characters', {
        details: error,
        userId: user.id,
      })
    }

    return successResponse({ characters })
  } catch (error) {
    logger.error('Error in GET /api/characters', {
      operation: 'characters:get',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to fetch characters', { details: error })
  }
}

// POST - Create a new character
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return errorResponses.unauthorized()
    }

    const body = await request.json()
    const {
      project_id,
      name,
      role,
      importance = 5,
      age,
      gender,
      appearance,
      physical_description,
      personality_traits,
      strengths,
      weaknesses,
      fears,
      desires,
      backstory,
      arc_type,
      character_arc,
      internal_conflict,
      external_conflict,
      first_appearance,
      last_appearance,
      story_function,
      image_url,
      voice_description,
      tags,
      notes,
      metadata,
    } = body

    if (!project_id || !name || !role) {
      return errorResponses.badRequest('project_id, name, and role are required', {
        userId: user.id,
      })
    }

    // Verify project belongs to user
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', project_id)
      .eq('user_id', user.id)
      .single()

    if (projectError || !project) {
      return errorResponses.notFound('Project not found', { userId: user.id })
    }

    const { data: character, error } = await supabase
      .from('characters')
      .insert({
        user_id: user.id,
        project_id,
        name,
        role,
        importance,
        age,
        gender,
        appearance,
        physical_description,
        personality_traits,
        strengths,
        weaknesses,
        fears,
        desires,
        backstory,
        arc_type,
        character_arc,
        internal_conflict,
        external_conflict,
        first_appearance,
        last_appearance,
        story_function,
        image_url,
        voice_description,
        tags,
        notes,
        metadata,
      })
      .select()
      .single()

    if (error) {
      logger.error('Error creating character', {
        userId: user.id,
        projectId: project_id,
        operation: 'characters:create',
      }, error)
      return errorResponses.internalError('Failed to create character', {
        details: error,
        userId: user.id,
      })
    }

    return successResponse({ character }, 201)
  } catch (error) {
    logger.error('Error in POST /api/characters', {
      operation: 'characters:post',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to create character', { details: error })
  }
}

// PATCH - Update a character
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return errorResponses.unauthorized()
    }

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return errorResponses.badRequest('Character id is required', { userId: user.id })
    }

    // Remove fields that shouldn't be updated
    delete updates.user_id
    delete updates.project_id
    delete updates.created_at
    delete updates.updated_at

    const { data: character, error } = await supabase
      .from('characters')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      logger.error('Error updating character', {
        userId: user.id,
        characterId: id,
        operation: 'characters:update',
      }, error)
      return errorResponses.internalError('Failed to update character', {
        details: error,
        userId: user.id,
      })
    }

    if (!character) {
      return errorResponses.notFound('Character not found', { userId: user.id })
    }

    return successResponse({ character })
  } catch (error) {
    logger.error('Error in PATCH /api/characters', {
      operation: 'characters:patch',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to update character', { details: error })
  }
}

// DELETE - Delete a character
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return errorResponses.unauthorized()
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return errorResponses.badRequest('Character id is required', { userId: user.id })
    }

    const { error } = await supabase
      .from('characters')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      logger.error('Error deleting character', {
        userId: user.id,
        characterId: id,
        operation: 'characters:delete',
      }, error)
      return errorResponses.internalError('Failed to delete character', {
        details: error,
        userId: user.id,
      })
    }

    return successResponse({ success: true })
  } catch (error) {
    logger.error('Error in DELETE /api/characters', {
      operation: 'characters:delete',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to delete character', { details: error })
  }
}
