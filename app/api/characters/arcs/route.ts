import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponses, successResponse } from '@/lib/api/error-response'
import { logger } from '@/lib/monitoring/structured-logger'

export const dynamic = 'force-dynamic'

// GET - List arc stages for a character
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
    const characterId = searchParams.get('character_id')

    if (!characterId) {
      return errorResponses.badRequest('character_id is required', { userId: user.id })
    }

    const { data: arcStages, error } = await supabase
      .from('character_arcs')
      .select('*')
      .eq('character_id', characterId)
      .eq('user_id', user.id)
      .order('stage_order', { ascending: true })

    if (error) {
      logger.error('Error fetching arc stages', {
        userId: user.id,
        characterId,
        operation: 'character_arcs:fetch',
      }, error)
      return errorResponses.internalError('Failed to fetch arc stages', {
        details: error,
        userId: user.id,
      })
    }

    return successResponse({ arcStages })
  } catch (error) {
    logger.error('Error in GET /api/characters/arcs', {
      operation: 'character_arcs:get',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to fetch arc stages', { details: error })
  }
}

// POST - Create a new arc stage
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
      character_id,
      stage_name,
      stage_order,
      description,
      location,
      chapter_scene,
      page_number,
      emotional_state,
      beliefs,
      relationships_status,
      is_completed = false,
      notes,
      metadata,
    } = body

    if (!character_id || !stage_name || stage_order === undefined) {
      return errorResponses.badRequest(
        'character_id, stage_name, and stage_order are required',
        { userId: user.id }
      )
    }

    // Verify character belongs to user
    const { data: character, error: charError } = await supabase
      .from('characters')
      .select('id, user_id')
      .eq('id', character_id)
      .eq('user_id', user.id)
      .single()

    if (charError || !character) {
      return errorResponses.notFound('Character not found', { userId: user.id })
    }

    const { data: arcStage, error } = await supabase
      .from('character_arcs')
      .insert({
        user_id: user.id,
        character_id,
        stage_name,
        stage_order,
        description,
        location,
        chapter_scene,
        page_number,
        emotional_state,
        beliefs,
        relationships_status,
        is_completed,
        notes,
        metadata,
      })
      .select()
      .single()

    if (error) {
      logger.error('Error creating arc stage', {
        userId: user.id,
        characterId: character_id,
        operation: 'character_arcs:create',
      }, error)
      return errorResponses.internalError('Failed to create arc stage', {
        details: error,
        userId: user.id,
      })
    }

    return successResponse({ arcStage }, 201)
  } catch (error) {
    logger.error('Error in POST /api/characters/arcs', {
      operation: 'character_arcs:post',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to create arc stage', { details: error })
  }
}

// PATCH - Update an arc stage
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
      return errorResponses.badRequest('Arc stage id is required', { userId: user.id })
    }

    // Remove fields that shouldn't be updated
    delete updates.user_id
    delete updates.character_id
    delete updates.created_at
    delete updates.updated_at

    const { data: arcStage, error } = await supabase
      .from('character_arcs')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      logger.error('Error updating arc stage', {
        userId: user.id,
        arcStageId: id,
        operation: 'character_arcs:update',
      }, error)
      return errorResponses.internalError('Failed to update arc stage', {
        details: error,
        userId: user.id,
      })
    }

    if (!arcStage) {
      return errorResponses.notFound('Arc stage not found', { userId: user.id })
    }

    return successResponse({ arcStage })
  } catch (error) {
    logger.error('Error in PATCH /api/characters/arcs', {
      operation: 'character_arcs:patch',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to update arc stage', { details: error })
  }
}

// DELETE - Delete an arc stage
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
      return errorResponses.badRequest('Arc stage id is required', { userId: user.id })
    }

    const { error } = await supabase
      .from('character_arcs')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      logger.error('Error deleting arc stage', {
        userId: user.id,
        arcStageId: id,
        operation: 'character_arcs:delete',
      }, error)
      return errorResponses.internalError('Failed to delete arc stage', {
        details: error,
        userId: user.id,
      })
    }

    return successResponse({ success: true })
  } catch (error) {
    logger.error('Error in DELETE /api/characters/arcs', {
      operation: 'character_arcs:delete',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to delete arc stage', { details: error })
  }
}
