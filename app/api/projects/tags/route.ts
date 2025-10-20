import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponses, successResponse } from '@/lib/api/error-response'
import { logger } from '@/lib/monitoring/structured-logger'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return errorResponses.unauthorized()
    }

    const { data: tagRows, error } = await supabase
      .from('project_tags')
      .select('id, name, color, description, created_at, updated_at')
      .eq('user_id', user.id)
      .order('name', { ascending: true })

    if (error) {
      logger.error('Failed to fetch project tags', {
        userId: user.id,
        operation: 'project_tags:fetch',
      }, error)
      return errorResponses.internalError('Failed to load tags', {
        details: error,
        userId: user.id,
      })
    }

    const tagIds = tagRows?.map((tag) => tag.id) ?? []
    let counts: Record<string, number> = {}

    if (tagIds.length > 0) {
      const { data: linkCounts, error: countError } = await supabase
        .from('project_tag_links')
        .select('tag_id, project_id')
        .eq('user_id', user.id)
        .in('tag_id', tagIds)

      if (countError) {
        logger.error('Failed to fetch tag link counts', {
          userId: user.id,
          operation: 'project_tags:fetch_counts',
        }, countError)
        return errorResponses.internalError('Failed to load tag counts', {
          details: countError,
          userId: user.id,
        })
      }

      counts = (linkCounts ?? []).reduce<Record<string, number>>((acc, row) => {
        acc[row.tag_id] = (acc[row.tag_id] ?? 0) + 1
        return acc
      }, {})
    }

    const tags = (tagRows ?? []).map((tag) => ({
      ...tag,
      project_count: counts[tag.id] ?? 0,
    }))

    return successResponse({ tags })
  } catch (error) {
    logger.error('Error in GET /api/projects/tags', {
      operation: 'project_tags:get',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to load tags', { details: error })
  }
}

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
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    const color = typeof body?.color === 'string' ? body.color.trim() : null
    const description = typeof body?.description === 'string' ? body.description.trim() : null

    if (!name) {
      return errorResponses.badRequest('Tag name is required', { userId: user.id })
    }

    const { data, error } = await supabase
      .from('project_tags')
      .insert({
        user_id: user.id,
        name,
        color,
        description,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return errorResponses.conflict('A tag with this name already exists', { userId: user.id })
      }
      logger.error('Failed to create project tag', {
        userId: user.id,
        operation: 'project_tags:create',
      }, error)
      return errorResponses.internalError('Failed to create tag', {
        details: error,
        userId: user.id,
      })
    }

    return successResponse({ tag: data })
  } catch (error) {
    logger.error('Error in POST /api/projects/tags', {
      operation: 'project_tags:post',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to create tag', { details: error })
  }
}

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
    const id = typeof body?.id === 'string' ? body.id.trim() : ''
    const name = typeof body?.name === 'string' ? body.name.trim() : undefined
    const color = typeof body?.color === 'string' ? body.color.trim() : undefined
    const description = typeof body?.description === 'string' ? body.description.trim() : undefined

    if (!id) {
      return errorResponses.badRequest('Tag id is required', { userId: user.id })
    }

    const updates: Record<string, unknown> = {}
    if (typeof name !== 'undefined') {
      if (!name) {
        return errorResponses.badRequest('Tag name cannot be empty', { userId: user.id })
      }
      updates.name = name
    }
    if (typeof color !== 'undefined') {
      updates.color = color?.length ? color : null
    }
    if (typeof description !== 'undefined') {
      updates.description = description?.length ? description : null
    }

    if (Object.keys(updates).length === 0) {
      return errorResponses.badRequest('No updates provided', { userId: user.id })
    }

    const { data, error } = await supabase
      .from('project_tags')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return errorResponses.conflict('A tag with this name already exists', { userId: user.id })
      }
      logger.error('Failed to update project tag', {
        userId: user.id,
        tagId: id,
        operation: 'project_tags:update',
      }, error)
      return errorResponses.internalError('Failed to update tag', {
        details: error,
        userId: user.id,
      })
    }

    return successResponse({ tag: data })
  } catch (error) {
    logger.error('Error in PATCH /api/projects/tags', {
      operation: 'project_tags:patch',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to update tag', { details: error })
  }
}

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
    const id = searchParams.get('id')?.trim()

    if (!id) {
      return errorResponses.badRequest('Tag id is required', { userId: user.id })
    }

    const { error } = await supabase
      .from('project_tags')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      logger.error('Failed to delete project tag', {
        userId: user.id,
        tagId: id,
        operation: 'project_tags:delete',
      }, error)
      return errorResponses.internalError('Failed to delete tag', {
        details: error,
        userId: user.id,
      })
    }

    return successResponse({ success: true })
  } catch (error) {
    logger.error('Error in DELETE /api/projects/tags', {
      operation: 'project_tags:delete',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to delete tag', { details: error })
  }
}
