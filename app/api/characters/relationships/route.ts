import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponses, successResponse } from '@/lib/api/error-response'
import { requireAuth } from '@/lib/api/auth-helpers'
import { requireDefaultRateLimit } from '@/lib/api/rate-limit-helpers'
import { logger } from '@/lib/monitoring/structured-logger'
import { validateQuery, validateBody, validationErrorResponse, commonValidators } from '@/lib/validation/middleware'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Validation schemas for relationship endpoints
const relationshipListQuerySchema = z.object({
  project_id: commonValidators.uuid.optional(),
  character_id: commonValidators.uuid.optional(),
}).refine(data => data.project_id || data.character_id, {
  message: 'Either project_id or character_id is required',
})

const relationshipCreateSchema = z.object({
  project_id: commonValidators.uuid,
  character_a_id: commonValidators.uuid,
  character_b_id: commonValidators.uuid,
  relationship_type: z.enum([
    'family',
    'friend',
    'enemy',
    'rival',
    'mentor',
    'mentee',
    'romantic',
    'professional',
    'ally',
    'other',
  ]),
  description: commonValidators.optionalString(2000),
  strength: z.number().int().min(1).max(10).optional().default(5),
  is_positive: z.boolean().optional().default(true),
  status: z.enum(['current', 'past', 'developing', 'broken']).optional().default('current'),
  starts_at: commonValidators.optionalString(500),
  ends_at: commonValidators.optionalString(500),
  key_moments: z.array(z.string().max(1000)).max(20).optional(),
  notes: commonValidators.optionalString(5000),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).refine(data => data.character_a_id !== data.character_b_id, {
  message: 'Cannot create relationship with the same character',
  path: ['character_b_id'],
})

const relationshipUpdateSchema = z.object({
  id: commonValidators.uuid,
  relationship_type: z.enum([
    'family',
    'friend',
    'enemy',
    'rival',
    'mentor',
    'mentee',
    'romantic',
    'professional',
    'ally',
    'other',
  ]).optional(),
  description: commonValidators.optionalString(2000),
  strength: z.number().int().min(1).max(10).optional(),
  is_positive: z.boolean().optional(),
  status: z.enum(['current', 'past', 'developing', 'broken']).optional(),
  starts_at: commonValidators.optionalString(500),
  ends_at: commonValidators.optionalString(500),
  key_moments: z.array(z.string().max(1000)).max(20).optional(),
  notes: commonValidators.optionalString(5000),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

const relationshipDeleteQuerySchema = z.object({
  id: commonValidators.uuid,
})

// GET - List relationships for a project or character
export async function GET(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)
  await requireDefaultRateLimit(request, user.id)

    // Validate query parameters
    const validation = validateQuery(request, relationshipListQuerySchema)
    if (!validation.success) {
      return validationErrorResponse(validation, user.id)
    }

    const { project_id: projectId, character_id: characterId } = validation.data!

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
    const { user, supabase } = await requireAuth(request)

    // Validate request body
    const validation = await validateBody(request, relationshipCreateSchema)
    if (!validation.success) {
      return validationErrorResponse(validation, user.id)
    }

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
    } = validation.data!

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
    const { user, supabase } = await requireAuth(request)

    // Validate request body
    const validation = await validateBody(request, relationshipUpdateSchema)
    if (!validation.success) {
      return validationErrorResponse(validation, user.id)
    }

    const { id, ...updates } = validation.data!

    // Remove fields that shouldn't be updated (if they somehow got through)
    delete (updates as any).user_id
    delete (updates as any).project_id
    delete (updates as any).character_a_id
    delete (updates as any).character_b_id
    delete (updates as any).created_at
    delete (updates as any).updated_at

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
    const { user, supabase } = await requireAuth(request)

    // Validate query parameters
    const validation = validateQuery(request, relationshipDeleteQuerySchema)
    if (!validation.success) {
      return validationErrorResponse(validation, user.id)
    }

    const { id } = validation.data!

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
