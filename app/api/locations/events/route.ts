import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponses, successResponse } from '@/lib/api/error-response'
import {requireAuth, handleAuthError} from '@/lib/api/auth-helpers'
import { requireDefaultRateLimit } from '@/lib/api/rate-limit-helpers'
import { logger } from '@/lib/monitoring/structured-logger'

export const dynamic = 'force-dynamic'

// GET events for a location or project
export async function GET(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)
  await requireDefaultRateLimit(request, user.id)

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('project_id')
    const locationId = searchParams.get('location_id')

    if (!projectId && !locationId) {
      return errorResponses.badRequest('project_id or location_id is required', {
        userId: user.id,
      })
    }

    let query = supabase
      .from('location_events')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    if (locationId) {
      query = query.eq('location_id', locationId)
    }

    const { data, error } = await query

    if (error) {
      logger.error('Error fetching location events', {
        userId: user.id,
        projectId: projectId ?? undefined,
        locationId: locationId ?? undefined,
        operation: 'location_events:fetch',
      }, error)
      return errorResponses.internalError('Failed to fetch location events', {
        details: error,
        userId: user.id,
      })
    }

    return successResponse({ events: data ?? [] })
  } catch (error) {
        const authError = handleAuthError(error)
    if (authError) return authError

    logger.error('Error in GET /api/locations/events', {
      operation: 'location_events:get',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to fetch location events', { details: error })
  }
}

// POST create location event
export async function POST(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)

    const body = await request.json()
    const {
      project_id,
      location_id,
      title,
      occurs_at,
      description,
      importance = 5,
      key_characters,
      tags,
      metadata,
    } = body

    if (!project_id || !location_id || !title) {
      return errorResponses.badRequest(
        'project_id, location_id and title are required',
        { userId: user.id }
      )
    }

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
      .from('location_events')
      .insert({
        user_id: user.id,
        project_id,
        location_id,
        title,
        occurs_at,
        description,
        importance,
        key_characters,
        tags,
        metadata,
      })
      .select()
      .single()

    if (error) {
      logger.error('Error creating location event', {
        userId: user.id,
        projectId: project_id,
        locationId: location_id,
        operation: 'location_events:create',
      }, error)
      return errorResponses.internalError('Failed to create location event', {
        details: error,
        userId: user.id,
      })
    }

    return successResponse({ event: data }, 201)
  } catch (error) {
        const authError = handleAuthError(error)
    if (authError) return authError

    logger.error('Error in POST /api/locations/events', {
      operation: 'location_events:post',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to create location event', { details: error })
  }
}

// PATCH update location event
export async function PATCH(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return errorResponses.badRequest('Event id is required', { userId: user.id })
    }

    delete updates.user_id
    delete updates.project_id
    delete updates.location_id
    delete updates.created_at
    delete updates.updated_at

    const { data, error } = await supabase
      .from('location_events')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      logger.error('Error updating location event', {
        userId: user.id,
        eventId: id,
        operation: 'location_events:update',
      }, error)
      return errorResponses.internalError('Failed to update location event', {
        details: error,
        userId: user.id,
      })
    }

    if (!data) {
      return errorResponses.notFound('Location event not found', { userId: user.id })
    }

    return successResponse({ event: data })
  } catch (error) {
        const authError = handleAuthError(error)
    if (authError) return authError

    logger.error('Error in PATCH /api/locations/events', {
      operation: 'location_events:patch',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to update location event', { details: error })
  }
}

// DELETE location event
export async function DELETE(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return errorResponses.badRequest('Event id is required', { userId: user.id })
    }

    const { error } = await supabase
      .from('location_events')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      logger.error('Error deleting location event', {
        userId: user.id,
        eventId: id,
        operation: 'location_events:delete',
      }, error)
      return errorResponses.internalError('Failed to delete location event', {
        details: error,
        userId: user.id,
      })
    }

    return successResponse({ success: true })
  } catch (error) {
        const authError = handleAuthError(error)
    if (authError) return authError

    logger.error('Error in DELETE /api/locations/events', {
      operation: 'location_events:delete',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to delete location event', { details: error })
  }
}
