import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponses, successResponse } from '@/lib/api/error-response'
import { logger } from '@/lib/monitoring/structured-logger'

export const dynamic = 'force-dynamic'

// GET - List relationships for a project or character
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
    const characterId = searchParams.get('character_id')

    if (!projectId && !characterId) {
      return errorResponses.badRequest('project_id or character_id is required', {
        userId: user.id,
      })
    }

    if (characterId) {
      // Get relationships for a specific character using the RPC function
      const { data: relationships, error } = await supabase.rpc('get_character_relationships', {
        p_character_id: characterId,
      })

      if (error) {
        logger.error('Error fetching character relationships', {
          userId: user.id,
          characterId,
          operation: 'character_relationships:fetch_by_character',
        }, error)
        return errorResponses.internalError('Failed to fetch character relationships', {
          details: error,
          userId: user.id,
        })
      }

      return successResponse({ relationships })
    } else {
      // Get all relationships for a project
      const { data: relationships, error } = await supabase
        .from('character_relationships')
        .select(`
          *,
          character_a:characters!character_relationships_character_a_id_fkey(id, name, role),
          character_b:characters!character_relationships_character_b_id_fkey(id, name, role)
        `)
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        logger.error('Error fetching project relationships', {
          userId: user.id,
          projectId: projectId ?? undefined,
          operation: 'character_relationships:fetch_by_project',
        }, error)
        return errorResponses.internalError('Failed to fetch project relationships', {
          details: error,
          userId: user.id,
        })
      }

      return successResponse({ relationships })
    }
  } catch (error) {
    logger.error('Error in GET /api/characters/relationships', {
      operation: 'character_relationships:get',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to fetch relationships', { details: error })
  }
}

// POST - Create a new relationship
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
      character_a_id,
      character_b_id,
      relationship_type,
      description,
      strength = 5,
      is_positive = true,
      status = 'current',
      starts_at,
      ends_at,
      key_moments,
      notes,
      metadata,
    } = body

    if (!project_id || !character_a_id || !character_b_id || !relationship_type) {
      return errorResponses.badRequest(
        'project_id, character_a_id, character_b_id, and relationship_type are required',
        { userId: user.id }
      )
    }

    if (character_a_id === character_b_id) {
      return errorResponses.badRequest('Cannot create relationship with the same character', {
        userId: user.id,
      })
    }

    // Verify both characters belong to user and project
    const { data: characters, error: charError } = await supabase
      .from('characters')
      .select('id')
      .in('id', [character_a_id, character_b_id])
      .eq('project_id', project_id)
      .eq('user_id', user.id)

    if (charError || !characters || characters.length !== 2) {
      return errorResponses.notFound('Characters not found', { userId: user.id })
    }

    const { data: relationship, error } = await supabase
      .from('character_relationships')
      .insert({
        user_id: user.id,
        project_id,
        character_a_id,
        character_b_id,
        relationship_type,
        description,
        strength,
        is_positive,
        status,
        starts_at,
        ends_at,
        key_moments,
        notes,
        metadata,
      })
      .select()
      .single()

    if (error) {
      logger.error('Error creating relationship', {
        userId: user.id,
        projectId: project_id,
        operation: 'character_relationships:create',
      }, error)
      return errorResponses.internalError('Failed to create relationship', {
        details: error,
        userId: user.id,
      })
    }

    return successResponse({ relationship }, 201)
  } catch (error) {
    logger.error('Error in POST /api/characters/relationships', {
      operation: 'character_relationships:post',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to create relationship', { details: error })
  }
}

// PATCH - Update a relationship
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
      return errorResponses.badRequest('Relationship id is required', { userId: user.id })
    }

    // Remove fields that shouldn't be updated
    delete updates.user_id
    delete updates.project_id
    delete updates.character_a_id
    delete updates.character_b_id
    delete updates.created_at
    delete updates.updated_at

    const { data: relationship, error } = await supabase
      .from('character_relationships')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      logger.error('Error updating relationship', {
        userId: user.id,
        relationshipId: id,
        operation: 'character_relationships:update',
      }, error)
      return errorResponses.internalError('Failed to update relationship', {
        details: error,
        userId: user.id,
      })
    }

    if (!relationship) {
      return errorResponses.notFound('Relationship not found', { userId: user.id })
    }

    return successResponse({ relationship })
  } catch (error) {
    logger.error('Error in PATCH /api/characters/relationships', {
      operation: 'character_relationships:patch',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to update relationship', { details: error })
  }
}

// DELETE - Delete a relationship
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
      return errorResponses.badRequest('Relationship id is required', { userId: user.id })
    }

    const { error } = await supabase
      .from('character_relationships')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      logger.error('Error deleting relationship', {
        userId: user.id,
        relationshipId: id,
        operation: 'character_relationships:delete',
      }, error)
      return errorResponses.internalError('Failed to delete relationship', {
        details: error,
        userId: user.id,
      })
    }

    return successResponse({ success: true })
  } catch (error) {
    logger.error('Error in DELETE /api/characters/relationships', {
      operation: 'character_relationships:delete',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to delete relationship', { details: error })
  }
}
