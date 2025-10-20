import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateWorldElement } from '@/lib/ai/world-element'
import { errorResponses, successResponse } from '@/lib/api/error-response'
import { logger } from '@/lib/monitoring/structured-logger'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

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

    if (!projectId) {
      return errorResponses.badRequest('project_id is required', { userId: user.id })
    }

    const { data, error } = await supabase
      .from('world_elements')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (error) {
      logger.error('Failed to fetch world elements', {
        userId: user.id,
        projectId,
        operation: 'world_elements:fetch',
      }, error)
      return errorResponses.internalError('Failed to fetch world elements', {
        details: error,
        userId: user.id,
      })
    }

    return successResponse({ elements: data ?? [] })
  } catch (error) {
    logger.error('Error fetching world elements', {
      operation: 'world_elements:get',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to fetch world elements', { details: error })
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
    const {
      project_id,
      type,
      name,
      summary,
      description,
      properties,
      tags,
      related_element_ids,
      image_urls,
      ai_prompt,
      use_ai,
    } = body || {}

    if (!project_id || !type || (!name && !use_ai)) {
      return errorResponses.badRequest(
        'project_id, type, and name (unless AI generation is requested) are required',
        { userId: user.id }
      )
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, type, genre')
      .eq('id', project_id)
      .eq('user_id', user.id)
      .single()

    if (projectError || !project) {
      return errorResponses.notFound('Project not found', { userId: user.id })
    }

    let finalName: string | undefined = name
    let finalSummary: string | undefined = summary
    let finalDescription: string | undefined = description
    let finalProperties: Record<string, unknown> | undefined = properties
    let finalTags: string[] | undefined = Array.isArray(tags) ? tags : undefined
    let aiMetadata: Record<string, unknown> | undefined

    if (use_ai) {
      const prompt = String(ai_prompt ?? '').trim()
      if (!prompt || prompt.length < 10) {
        return errorResponses.badRequest(
          'Please provide a prompt of at least 10 characters for AI generation',
          { userId: user.id }
        )
      }

      const existingResponse = await supabase
        .from('world_elements')
        .select('name, type, summary')
        .eq('project_id', project_id)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(12)

      const generated = await generateWorldElement({
        projectType: project.type,
        genre: project.genre,
        type,
        prompt,
        existingElements: existingResponse.data ?? [],
      })

      finalName = generated.name
      finalSummary = generated.summary
      finalDescription = generated.description
      finalProperties = generated.properties
      finalTags = generated.tags
      aiMetadata = {
        prompt,
        generatedAt: new Date().toISOString(),
        model: 'claude-sonnet-4.5',
      }
    }

    if (!finalName) {
      return errorResponses.badRequest('Name is required', { userId: user.id })
    }

    const { data: element, error: insertError } = await supabase
      .from('world_elements')
      .insert({
        user_id: user.id,
        project_id,
        type,
        name: finalName,
        summary: finalSummary ?? null,
        description: finalDescription ?? null,
        properties: finalProperties ?? {},
        tags: finalTags ?? [],
        related_element_ids: related_element_ids ?? [],
        image_urls: image_urls ?? [],
        ai_metadata: aiMetadata ?? null,
      })
      .select()
      .single()

    if (insertError) {
      logger.error('Failed to create world element', {
        userId: user.id,
        projectId: project_id,
        operation: 'world_elements:create',
      }, insertError)
      return errorResponses.internalError('Failed to create world element', {
        details: insertError,
        userId: user.id,
      })
    }

    return successResponse({ element }, 201)
  } catch (error) {
    logger.error('Error creating world element', {
      operation: 'world_elements:post',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to create world element', { details: error })
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
    const { id, ...updates } = body || {}

    if (!id) {
      return errorResponses.badRequest('id is required', { userId: user.id })
    }

    delete updates.user_id
    delete updates.project_id
    delete updates.created_at
    delete updates.updated_at

    const { data: element, error } = await supabase
      .from('world_elements')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      logger.error('Failed to update world element', {
        userId: user.id,
        elementId: id,
        operation: 'world_elements:update',
      }, error)
      return errorResponses.internalError('Failed to update world element', {
        details: error,
        userId: user.id,
      })
    }

    return successResponse({ element })
  } catch (error) {
    logger.error('Error updating world element', {
      operation: 'world_elements:patch',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to update world element', { details: error })
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
    const id = searchParams.get('id')

    if (!id) {
      return errorResponses.badRequest('id is required', { userId: user.id })
    }

    const { error } = await supabase
      .from('world_elements')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      logger.error('Failed to delete world element', {
        userId: user.id,
        elementId: id,
        operation: 'world_elements:delete',
      }, error)
      return errorResponses.internalError('Failed to delete world element', {
        details: error,
        userId: user.id,
      })
    }

    return successResponse({ success: true })
  } catch (error) {
    logger.error('Error deleting world element', {
      operation: 'world_elements:delete',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to delete world element', { details: error })
  }
}
