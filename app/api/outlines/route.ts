import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponses, successResponse } from '@/lib/api/error-response'
import { requireAuth } from '@/lib/api/auth-helpers'
import { requireDefaultRateLimit } from '@/lib/api/rate-limit-helpers'
import { logger } from '@/lib/monitoring/structured-logger'
import { generateOutline } from '@/lib/ai/outline-generator'
import type { OutlineSection as GeneratedOutlineSection } from '@/lib/ai/outline-generator'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow up to 60 seconds for AI generation

const mapSectionsForDb = (
  sections: GeneratedOutlineSection[] | undefined,
  outlineId: string,
  userId: string
) => {
  if (!sections || sections.length === 0) return []

  return sections.map((section, index) => ({
    outline_id: outlineId,
    user_id: userId,
    parent_id: null,
    order_position:
      typeof section.order === 'number' && !Number.isNaN(section.order)
        ? section.order
        : index + 1,
    title: section.title || `Section ${index + 1}`,
    description: section.description ?? null,
    notes: section.notes ?? null,
    word_count_target: section.wordCountTarget ?? null,
    page_count_target: section.pageCountTarget ?? null,
    metadata: {
      type: section.type,
      characters: section.characters ?? [],
      locations: section.locations ?? [],
      plotPoints: section.plotPoints ?? [],
    },
  }))
}

// GET - List outlines for a project
export async function GET(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)
  await requireDefaultRateLimit(request, user.id)

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('project_id')

    if (!projectId) {
      return errorResponses.badRequest('Project ID required', { userId: user.id })
    }

    const { data, error } = await supabase
      .from('outlines')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('Error fetching outlines', {
        userId: user.id,
        projectId,
        operation: 'outlines:fetch',
      }, error)
      return errorResponses.internalError('Failed to fetch outlines', {
        details: error,
        userId: user.id,
      })
    }

    return successResponse({ outlines: data || [] })
  } catch (error) {
    logger.error('Error in GET /api/outlines', {
      operation: 'outlines:get',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to fetch outlines', { details: error })
  }
}

// POST - Generate new outline using AI
export async function POST(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)

    const body = await request.json()
    const { project_id, premise, format, additional_context, existing_content } = body

    if (!project_id || !premise || !format) {
      return errorResponses.badRequest(
        'Project ID, premise, and format are required',
        { userId: user.id }
      )
    }

    // Validate format
    const validFormats = ['chapter_summary', 'scene_by_scene', 'treatment', 'beat_outline', 'custom']
    if (!validFormats.includes(format)) {
      return errorResponses.badRequest(
        `Invalid format. Valid formats: ${validFormats.join(', ')}`,
        { userId: user.id }
      )
    }

    // Get project details for context
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', project_id)
      .eq('user_id', user.id)
      .single()

    if (projectError || !project) {
      return errorResponses.notFound('Project not found', { userId: user.id })
    }

    // Generate outline using Claude 4.5
    let generatedContent
    try {
      generatedContent = await generateOutline({
        premise,
        format,
        projectType: project.type,
        genre: project.genre,
        additionalContext: additional_context,
        existingContent: existing_content,
      })
    } catch (aiError) {
      logger.error('AI outline generation failed', {
        userId: user.id,
        projectId: project_id,
        format,
        operation: 'outlines:ai_generate',
      }, aiError instanceof Error ? aiError : undefined)
      return errorResponses.internalError('Failed to generate outline with AI', {
        details: aiError,
        userId: user.id,
      })
    }

    // Create outline record
    const { data: outline, error: createError } = await supabase
      .from('outlines')
      .insert({
        user_id: user.id,
        project_id,
        title: generatedContent.title || `${format.replace('_', ' ')} Outline`,
        format,
        premise,
        content: generatedContent.sections,
        metadata: {
          project_type: project.type,
          project_genre: project.genre,
          additional_context,
          generated_at: new Date().toISOString(),
          model: generatedContent.model || 'claude-4.5',
        },
      })
      .select()
      .single()

    if (createError) {
      logger.error('Error creating outline record', {
        userId: user.id,
        projectId: project_id,
        operation: 'outlines:create',
      }, createError)
      return errorResponses.internalError('Failed to create outline', {
        details: createError,
        userId: user.id,
      })
    }

    const sectionsForDb = mapSectionsForDb(generatedContent.sections, outline.id, user.id)

    if (sectionsForDb.length > 0) {
      const { error: sectionsError } = await supabase
        .from('outline_sections')
        .insert(sectionsForDb)

      if (sectionsError) {
        logger.error('Error inserting outline sections', {
          userId: user.id,
          outlineId: outline.id,
          sectionCount: sectionsForDb.length,
          operation: 'outlines:create_sections',
        }, sectionsError)

        // Clean up the outline record to avoid inconsistency
        await supabase.from('outlines').delete().eq('id', outline.id).eq('user_id', user.id)

        return errorResponses.internalError('Failed to store outline sections', {
          details: sectionsError,
          userId: user.id,
        })
      }
    }

    return successResponse({ outline }, 201)
  } catch (error) {
    logger.error('Error in POST /api/outlines', {
      operation: 'outlines:post',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError(
      error instanceof Error ? error.message : 'Failed to generate outline',
      { details: error }
    )
  }
}

// PATCH - Update outline
export async function PATCH(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return errorResponses.badRequest('Outline ID required', { userId: user.id })
    }

    const { data, error } = await supabase
      .from('outlines')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      logger.error('Error updating outline', {
        userId: user.id,
        outlineId: id,
        operation: 'outlines:update',
      }, error)
      return errorResponses.internalError('Failed to update outline', {
        details: error,
        userId: user.id,
      })
    }

    if (!data) {
      return errorResponses.notFound('Outline not found', { userId: user.id })
    }

    if (updates.content && Array.isArray(updates.content)) {
      const sectionsForDb = mapSectionsForDb(
        updates.content as GeneratedOutlineSection[],
        id,
        user.id
      )

      const { error: deleteError } = await supabase
        .from('outline_sections')
        .delete()
        .eq('outline_id', id)
        .eq('user_id', user.id)

      if (deleteError) {
        logger.error('Error clearing outline sections', {
          userId: user.id,
          outlineId: id,
          operation: 'outlines:clear_sections',
        }, deleteError)
        return errorResponses.internalError('Failed to update outline sections', {
          details: deleteError,
          userId: user.id,
        })
      }

      if (sectionsForDb.length > 0) {
        const { error: insertError } = await supabase
          .from('outline_sections')
          .insert(sectionsForDb)

        if (insertError) {
          logger.error('Error inserting outline sections', {
            userId: user.id,
            outlineId: id,
            sectionCount: sectionsForDb.length,
            operation: 'outlines:insert_sections',
          }, insertError)
          return errorResponses.internalError('Failed to update outline sections', {
            details: insertError,
            userId: user.id,
          })
        }
      }
    }

    return successResponse({ outline: data })
  } catch (error) {
    logger.error('Error in PATCH /api/outlines', {
      operation: 'outlines:patch',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to update outline', { details: error })
  }
}

// DELETE - Delete outline
export async function DELETE(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return errorResponses.badRequest('Outline ID required', { userId: user.id })
    }

    const { error } = await supabase
      .from('outlines')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      logger.error('Error deleting outline', {
        userId: user.id,
        outlineId: id,
        operation: 'outlines:delete',
      }, error)
      return errorResponses.internalError('Failed to delete outline', {
        details: error,
        userId: user.id,
      })
    }

    return successResponse({ success: true })
  } catch (error) {
    logger.error('Error in DELETE /api/outlines', {
      operation: 'outlines:delete',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to delete outline', { details: error })
  }
}
