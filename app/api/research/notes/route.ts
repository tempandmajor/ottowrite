import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponses, successResponse, errorResponse } from '@/lib/api/error-response'
import { logger } from '@/lib/monitoring/structured-logger'

export const dynamic = 'force-dynamic'

type NoteCategory = 'reference' | 'character' | 'worldbuilding' | 'plot' | 'setting' | 'research' | 'other'

/**
 * GET /api/research/notes
 * Fetch research notes with filtering
 */
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
    const documentId = searchParams.get('document_id')
    const category = searchParams.get('category') as NoteCategory | null
    const tag = searchParams.get('tag')
    const search = searchParams.get('search')
    const pinnedOnly = searchParams.get('pinned') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50')

    let query = supabase
      .from('research_notes')
      .select('*')
      .eq('user_id', user.id)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit)

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    if (documentId) {
      query = query.eq('document_id', documentId)
    }

    if (category) {
      query = query.eq('category', category)
    }

    if (tag) {
      query = query.contains('tags', [tag])
    }

    if (pinnedOnly) {
      query = query.eq('is_pinned', true)
    }

    if (search) {
      // Full-text search on title and content
      query = query.textSearch('title', search, {
        type: 'websearch',
        config: 'english',
      })
    }

    const { data, error } = await query

    if (error) {
      logger.error('Failed to fetch research notes', {
        userId: user.id,
        operation: 'research:fetch_notes',
      }, error)
      return errorResponse('Failed to fetch notes', { status: 500, details: error })
    }

    return successResponse({ notes: data || [] })
  } catch (error) {
    logger.error('Error fetching research notes', {
      operation: 'research:get_notes',
    }, error instanceof Error ? error : undefined)
    return errorResponse('Failed to fetch notes', { status: 500, details: error })
  }
}

/**
 * POST /api/research/notes
 * Create a new research note
 */
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
      title,
      content,
      project_id,
      document_id,
      tags = [],
      category,
      sources = [],
      is_pinned = false,
    } = body

    if (!title || title.trim().length === 0) {
      return errorResponses.badRequest('Title is required')
    }

    if (!content || content.trim().length === 0) {
      return errorResponses.badRequest('Content is required')
    }

    const { data: note, error } = await supabase
      .from('research_notes')
      .insert({
        user_id: user.id,
        title: title.trim(),
        content: content.trim(),
        project_id: project_id || null,
        document_id: document_id || null,
        tags: Array.isArray(tags) ? tags : [],
        category: category || null,
        sources: Array.isArray(sources) ? sources : [],
        is_pinned,
      })
      .select()
      .single()

    if (error) {
      logger.error('Failed to create research note', {
        userId: user.id,
        operation: 'research:create_note',
      }, error)
      return errorResponse('Failed to create note', { status: 500, details: error })
    }

    return successResponse({ note }, 201)
  } catch (error) {
    logger.error('Error creating research note', {
      operation: 'research:post_note',
    }, error instanceof Error ? error : undefined)
    return errorResponse('Failed to create note', { status: 500, details: error })
  }
}

/**
 * PATCH /api/research/notes
 * Update a research note
 */
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
    const { id, title, content, tags, category, is_pinned, sources } = body

    if (!id) {
      return errorResponses.badRequest('Note ID is required')
    }

    const updates: Record<string, any> = {}

    if (title !== undefined) updates.title = title.trim()
    if (content !== undefined) updates.content = content.trim()
    if (tags !== undefined) updates.tags = Array.isArray(tags) ? tags : []
    if (category !== undefined) updates.category = category
    if (is_pinned !== undefined) updates.is_pinned = is_pinned
    if (sources !== undefined) updates.sources = Array.isArray(sources) ? sources : []

    if (Object.keys(updates).length === 0) {
      return errorResponses.badRequest('No fields to update')
    }

    const { data: note, error } = await supabase
      .from('research_notes')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      logger.error('Failed to update research note', {
        userId: user.id,
        noteId: id,
        operation: 'research:update_note',
      }, error)
      return errorResponse('Failed to update note', { status: 500, details: error })
    }

    if (!note) {
      return errorResponses.notFound('Note not found or access denied')
    }

    return successResponse({ note })
  } catch (error) {
    logger.error('Error updating research note', {
      operation: 'research:patch_note',
    }, error instanceof Error ? error : undefined)
    return errorResponse('Failed to update note', { status: 500, details: error })
  }
}

/**
 * DELETE /api/research/notes
 * Delete a research note
 */
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
      return errorResponses.badRequest('Note ID is required')
    }

    const { error } = await supabase
      .from('research_notes')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      logger.error('Failed to delete research note', {
        userId: user.id,
        noteId: id,
        operation: 'research:delete_note',
      }, error)
      return errorResponse('Failed to delete note', { status: 500, details: error })
    }

    return successResponse({ success: true })
  } catch (error) {
    logger.error('Error deleting research note', {
      operation: 'research:delete_note',
    }, error instanceof Error ? error : undefined)
    return errorResponse('Failed to delete note', { status: 500, details: error })
  }
}
