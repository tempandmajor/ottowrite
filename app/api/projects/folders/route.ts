import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponses, successResponse } from '@/lib/api/error-response'
import {requireAuth, handleAuthError} from '@/lib/api/auth-helpers'
import { requireDefaultRateLimit } from '@/lib/api/rate-limit-helpers'
import { logger } from '@/lib/monitoring/structured-logger'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: Request) {
  try {
    const { user, supabase } = await requireAuth(request)
  await requireDefaultRateLimit(request, user.id)

    const { data, error } = await supabase
      .from('project_folders')
      .select('id, name, color, parent_id, created_at, updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (error) {
      logger.error('Failed to fetch project folders', {
        userId: user.id,
        operation: 'project_folders:fetch',
      }, error)
      return errorResponses.internalError('Failed to load folders', {
        details: error,
        userId: user.id,
      })
    }

    return successResponse({ folders: data ?? [] })
  } catch (error) {
        const authError = handleAuthError(error)
    if (authError) return authError

    logger.error('Error in GET /api/projects/folders', {
      operation: 'project_folders:get',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to load folders', { details: error })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)

    const body = await request.json()
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    const color = typeof body?.color === 'string' ? body.color.trim() : null
    const parentId = typeof body?.parent_id === 'string' ? body.parent_id.trim() : null

    if (!name) {
      return errorResponses.badRequest('Folder name is required', { userId: user.id })
    }

    if (parentId) {
      const { data: parentFolder } = await supabase
        .from('project_folders')
        .select('id')
        .eq('id', parentId)
        .eq('user_id', user.id)
        .single()

      if (!parentFolder) {
        return errorResponses.notFound('Parent folder not found', { userId: user.id })
      }
    }

    const { data, error } = await supabase
      .from('project_folders')
      .insert({
        user_id: user.id,
        name,
        color,
        parent_id: parentId ?? null,
      })
      .select()
      .single()

    if (error) {
      logger.error('Failed to create project folder', {
        userId: user.id,
        operation: 'project_folders:create',
      }, error)
      return errorResponses.internalError('Failed to create folder', {
        details: error,
        userId: user.id,
      })
    }

    return successResponse({ folder: data })
  } catch (error) {
        const authError = handleAuthError(error)
    if (authError) return authError

    logger.error('Error in POST /api/projects/folders', {
      operation: 'project_folders:post',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to create folder', { details: error })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)

    const body = await request.json()
    const id = typeof body?.id === 'string' ? body.id.trim() : ''
    const name = typeof body?.name === 'string' ? body.name.trim() : undefined
    const color = typeof body?.color === 'string' ? body.color.trim() : undefined
    const parentId = typeof body?.parent_id === 'string' ? body.parent_id.trim() : undefined

    if (!id) {
      return errorResponses.badRequest('Folder id is required', { userId: user.id })
    }

    const updates: Record<string, unknown> = {}
    if (typeof name === 'string') {
      if (!name) {
        return errorResponses.badRequest('Folder name cannot be empty', { userId: user.id })
      }
      updates.name = name
    }
    if (typeof color !== 'undefined') {
      updates.color = color && color.length > 0 ? color : null
    }
    if (typeof parentId !== 'undefined') {
      if (parentId === id) {
        return errorResponses.badRequest('Folder cannot be its own parent', { userId: user.id })
      }
      if (parentId) {
        const { data: parentFolder } = await supabase
          .from('project_folders')
          .select('id')
          .eq('id', parentId)
          .eq('user_id', user.id)
          .single()

        if (!parentFolder) {
          return errorResponses.notFound('Parent folder not found', { userId: user.id })
        }
        updates.parent_id = parentId
      } else {
        updates.parent_id = null
      }
    }

    if (Object.keys(updates).length === 0) {
      return errorResponses.badRequest('No updates provided', { userId: user.id })
    }

    const { data, error } = await supabase
      .from('project_folders')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      logger.error('Failed to update project folder', {
        userId: user.id,
        folderId: id,
        operation: 'project_folders:update',
      }, error)
      return errorResponses.internalError('Failed to update folder', {
        details: error,
        userId: user.id,
      })
    }

    return successResponse({ folder: data })
  } catch (error) {
        const authError = handleAuthError(error)
    if (authError) return authError

    logger.error('Error in PATCH /api/projects/folders', {
      operation: 'project_folders:patch',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to update folder', { details: error })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')?.trim()

    if (!id) {
      return errorResponses.badRequest('Folder id is required', { userId: user.id })
    }

    const { error } = await supabase
      .from('project_folders')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      logger.error('Failed to delete project folder', {
        userId: user.id,
        folderId: id,
        operation: 'project_folders:delete',
      }, error)
      return errorResponses.internalError('Failed to delete folder', {
        details: error,
        userId: user.id,
      })
    }

    return successResponse({ success: true })
  } catch (error) {
        const authError = handleAuthError(error)
    if (authError) return authError

    logger.error('Error in DELETE /api/projects/folders', {
      operation: 'project_folders:delete',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to delete folder', { details: error })
  }
}
