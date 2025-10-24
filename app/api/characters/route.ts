import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponses, successResponse } from '@/lib/api/error-response'
import {requireAuth, handleAuthError} from '@/lib/api/auth-helpers'
import { requireDefaultRateLimit } from '@/lib/api/rate-limit-helpers'
import { logger } from '@/lib/monitoring/structured-logger'
import { validateQuery, validateBody, validationErrorResponse, commonValidators } from '@/lib/validation/middleware'
import { createPaginatedResponse, paginationQuerySchema, validateCursorByType } from '@/lib/api/pagination'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Validation schemas for character endpoints
const characterListQuerySchema = z.object({
  project_id: commonValidators.uuid,
  role: z.enum(['protagonist', 'antagonist', 'supporting', 'minor', 'other']).optional(),
}).merge(paginationQuerySchema)

const characterCreateSchema = z.object({
  project_id: commonValidators.uuid,
  name: commonValidators.nonEmptyString(200),
  role: z.enum(['protagonist', 'antagonist', 'supporting', 'minor', 'other']),
  importance: z.number().int().min(1).max(10).optional().default(5),
  age: z.number().int().min(0).max(200).optional(),
  gender: commonValidators.optionalString(50),
  appearance: commonValidators.optionalString(2000),
  physical_description: commonValidators.optionalString(2000),
  personality_traits: commonValidators.optionalString(2000),
  strengths: commonValidators.optionalString(2000),
  weaknesses: commonValidators.optionalString(2000),
  fears: commonValidators.optionalString(2000),
  desires: commonValidators.optionalString(2000),
  backstory: commonValidators.optionalString(5000),
  arc_type: commonValidators.optionalString(100),
  character_arc: commonValidators.optionalString(5000),
  internal_conflict: commonValidators.optionalString(2000),
  external_conflict: commonValidators.optionalString(2000),
  first_appearance: commonValidators.optionalString(500),
  last_appearance: commonValidators.optionalString(500),
  story_function: commonValidators.optionalString(1000),
  image_url: z.string().url().optional(),
  voice_description: commonValidators.optionalString(2000),
  tags: z.array(z.string().max(50)).max(20).optional(),
  notes: commonValidators.optionalString(5000),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

const characterUpdateSchema = z.object({
  id: commonValidators.uuid,
  name: commonValidators.optionalString(200),
  role: z.enum(['protagonist', 'antagonist', 'supporting', 'minor', 'other']).optional(),
  importance: z.number().int().min(1).max(10).optional(),
  age: z.number().int().min(0).max(200).optional(),
  gender: commonValidators.optionalString(50),
  appearance: commonValidators.optionalString(2000),
  physical_description: commonValidators.optionalString(2000),
  personality_traits: commonValidators.optionalString(2000),
  strengths: commonValidators.optionalString(2000),
  weaknesses: commonValidators.optionalString(2000),
  fears: commonValidators.optionalString(2000),
  desires: commonValidators.optionalString(2000),
  backstory: commonValidators.optionalString(5000),
  arc_type: commonValidators.optionalString(100),
  character_arc: commonValidators.optionalString(5000),
  internal_conflict: commonValidators.optionalString(2000),
  external_conflict: commonValidators.optionalString(2000),
  first_appearance: commonValidators.optionalString(500),
  last_appearance: commonValidators.optionalString(500),
  story_function: commonValidators.optionalString(1000),
  image_url: z.string().url().optional(),
  voice_description: commonValidators.optionalString(2000),
  tags: z.array(z.string().max(50)).max(20).optional(),
  notes: commonValidators.optionalString(5000),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

const characterDeleteQuerySchema = z.object({
  id: commonValidators.uuid,
})

// GET - List characters for a project
export async function GET(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)
  await requireDefaultRateLimit(request, user.id)

    // Validate query parameters
    const validation = validateQuery(request, characterListQuerySchema)
    if (!validation.success) {
      return validationErrorResponse(validation, user.id)
    }

    const { project_id: projectId, role, limit, cursor } = validation.data!

    // ✅ FIX: Validate cursor as timestamp (this endpoint uses created_at for pagination)
    const validatedCursor = validateCursorByType(cursor, 'timestamp')

    let query = supabase
      .from('characters')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false }) // Secondary sort for cursor stability

    if (role) {
      query = query.eq('role', role)
    }

    // Apply cursor pagination
    // Fetch limit + 1 to determine if there are more results
    if (validatedCursor) {
      query = query.lt('created_at', validatedCursor)
    }
    query = query.limit(limit + 1)

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

    // Build paginated response
    const { data, pagination } = createPaginatedResponse(
      characters || [],
      limit,
      'created_at'
    )

    return successResponse({ characters: data, pagination })
  } catch (error) {
        const authError = handleAuthError(error)
    if (authError) return authError

    logger.error('Error in GET /api/characters', {
      operation: 'characters:get',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to fetch characters', { details: error })
  }
}

// POST - Create a new character
export async function POST(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)

    // Validate request body
    const validation = await validateBody(request, characterCreateSchema)
    if (!validation.success) {
      return validationErrorResponse(validation, user.id)
    }

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
    } = validation.data!

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
        const authError = handleAuthError(error)
    if (authError) return authError

    logger.error('Error in POST /api/characters', {
      operation: 'characters:post',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to create character', { details: error })
  }
}

// PATCH - Update a character
export async function PATCH(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)

    // Validate request body
    const validation = await validateBody(request, characterUpdateSchema)
    if (!validation.success) {
      return validationErrorResponse(validation, user.id)
    }

    const { id, ...updates } = validation.data!

    // Remove fields that shouldn't be updated (if they somehow got through)
    delete (updates as any).user_id
    delete (updates as any).project_id
    delete (updates as any).created_at
    delete (updates as any).updated_at

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
        const authError = handleAuthError(error)
    if (authError) return authError

    logger.error('Error in PATCH /api/characters', {
      operation: 'characters:patch',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to update character', { details: error })
  }
}

// DELETE - Delete a character
export async function DELETE(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)

    // Validate query parameters
    const validation = validateQuery(request, characterDeleteQuerySchema)
    if (!validation.success) {
      return validationErrorResponse(validation, user.id)
    }

    const { id } = validation.data!

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
        const authError = handleAuthError(error)
    if (authError) return authError

    logger.error('Error in DELETE /api/characters', {
      operation: 'characters:delete',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to delete character', { details: error })
  }
}
