import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponses, successResponse } from '@/lib/api/error-response'
import { logger } from '@/lib/monitoring/structured-logger'
import { createPaginatedResponse, paginationQuerySchema } from '@/lib/api/pagination'
import { validateQuery, validationErrorResponse, commonValidators } from '@/lib/validation/middleware'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Validation schema for locations list
const locationsListQuerySchema = z.object({
  project_id: commonValidators.uuid,
  category: z.string().optional(),
  search: z.string().max(200).optional(),
}).merge(paginationQuerySchema)

// GET locations for a project
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return errorResponses.unauthorized()
    }

    // Validate query parameters
    const validation = validateQuery(request, locationsListQuerySchema)
    if (!validation.success) {
      return validationErrorResponse(validation, user.id)
    }

    const { project_id: projectId, category, search, limit, cursor } = validation.data!

    let query = supabase
      .from('locations')
      .select(
        `
          *,
          location_events (
            id,
            title,
            occurs_at,
            description,
            importance,
            key_characters,
            tags,
            created_at,
            updated_at
          )
        `
      )
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .order('id', { ascending: false }) // Secondary sort for cursor stability

    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    // Apply cursor pagination
    if (cursor) {
      query = query.lt('updated_at', cursor)
    }
    query = query.limit(limit + 1)

    const { data, error } = await query

    if (error) {
      logger.error('Error fetching locations', {
        userId: user.id,
        projectId,
        operation: 'locations:fetch',
      }, error)
      return errorResponses.internalError('Failed to fetch locations', {
        details: error,
        userId: user.id,
      })
    }

    // Build paginated response
    const { data: locations, pagination } = createPaginatedResponse(
      data || [],
      limit,
      'updated_at'
    )

    return successResponse({ locations, pagination })
  } catch (error) {
    logger.error('Error in GET /api/locations', {
      operation: 'locations:get',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to fetch locations', { details: error })
  }
}

// POST - create location
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
      category = 'other',
      summary,
      history,
      culture,
      climate,
      key_features,
      tags,
      image_url,
      metadata,
    } = body

    if (!project_id || !name || !category) {
      return errorResponses.badRequest('project_id, name and category are required', {
        userId: user.id,
      })
    }

    // verify project ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', project_id)
      .eq('user_id', user.id)
      .single()

    if (projectError || !project) {
      return errorResponses.notFound('Project not found', { userId: user.id })
    }

    const { data, error } = await supabase
      .from('locations')
      .insert({
        user_id: user.id,
        project_id,
        name,
        category,
        summary,
        history,
        culture,
        climate,
        key_features,
        tags,
        image_url,
        metadata,
      })
      .select()
      .single()

    if (error) {
      logger.error('Error creating location', {
        userId: user.id,
        projectId: project_id,
        operation: 'locations:create',
      }, error)
      return errorResponses.internalError('Failed to create location', {
        details: error,
        userId: user.id,
      })
    }

    return successResponse({ location: data }, 201)
  } catch (error) {
    logger.error('Error in POST /api/locations', {
      operation: 'locations:post',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to create location', { details: error })
  }
}

// PATCH update location
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
      return errorResponses.badRequest('Location id is required', { userId: user.id })
    }

    delete updates.user_id
    delete updates.project_id
    delete updates.created_at
    delete updates.updated_at

    const { data, error } = await supabase
      .from('locations')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      logger.error('Error updating location', {
        userId: user.id,
        locationId: id,
        operation: 'locations:update',
      }, error)
      return errorResponses.internalError('Failed to update location', {
        details: error,
        userId: user.id,
      })
    }

    return successResponse({ location: data })
  } catch (error) {
    logger.error('Error in PATCH /api/locations', {
      operation: 'locations:patch',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to update location', { details: error })
  }
}

// DELETE location
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
      return errorResponses.badRequest('Location id is required', { userId: user.id })
    }

    const { error } = await supabase
      .from('locations')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      logger.error('Error deleting location', {
        userId: user.id,
        locationId: id,
        operation: 'locations:delete',
      }, error)
      return errorResponses.internalError('Failed to delete location', {
        details: error,
        userId: user.id,
      })
    }

    return successResponse({ success: true })
  } catch (error) {
    logger.error('Error in DELETE /api/locations', {
      operation: 'locations:delete',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to delete location', { details: error })
  }
}
