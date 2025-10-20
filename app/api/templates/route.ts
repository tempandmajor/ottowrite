import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponses, successResponse } from '@/lib/api/error-response'
import { logger } from '@/lib/monitoring/structured-logger'

export const dynamic = 'force-dynamic'

// GET - List templates
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const category = searchParams.get('category')

    let query = supabase
      .from('document_templates')
      .select('*')
      .order('usage_count', { ascending: false })
      .order('created_at', { ascending: false })

    if (type) {
      query = query.eq('type', type)
    }

    if (category) {
      query = query.eq('category', category)
    }

    const { data, error } = await query

    if (error) {
      logger.error('Template list error', {
        type: type ?? undefined,
        category: category ?? undefined,
        operation: 'templates:fetch',
      }, error)
      return errorResponses.internalError('Failed to load templates', {
        details: error,
      })
    }

    const templates = (data || []).map((template) => ({
      ...template,
      title: template.title ?? template.name ?? 'Untitled Document',
    }))

    return successResponse({ templates })
  } catch (error) {
    logger.error('Template list error', {
      operation: 'templates:get',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to load templates', { details: error })
  }
}

// POST - Create template from document
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
    const { name, title, description, type, category, content } = body
    const templateTitle = title || name

    if (!templateTitle || !type || !category || !content) {
      return errorResponses.badRequest('Missing required fields: title/name, type, category, content', {
        userId: user.id,
      })
    }

    let insertPayload: Record<string, unknown> = {
      description,
      type,
      category,
      content,
      created_by: user.id,
      is_official: false,
    }

    // Prefer the title column, but fall back to name if necessary
    let usesTitleColumn = true
    const { error: titleColumnError } = await supabase
      .from('document_templates')
      .select('title')
      .limit(1)

    if (titleColumnError && titleColumnError.code === '42703') {
      usesTitleColumn = false
    }

    insertPayload = usesTitleColumn
      ? { ...insertPayload, title: templateTitle }
      : { ...insertPayload, name: templateTitle }

    const { data: template, error } = await supabase
      .from('document_templates')
      .insert(insertPayload)
      .select()
      .single()

    if (error) {
      logger.error('Template creation error', {
        userId: user.id,
        type,
        category,
        operation: 'templates:create',
      }, error)
      return errorResponses.badRequest(error.message ?? 'Failed to create template', {
        userId: user.id,
      })
    }

    try {
      await supabase.rpc('refresh_user_plan_usage', { p_user_id: user.id })
    } catch (refreshError) {
      logger.warn('refresh_user_plan_usage failed after template insert', {
        userId: user.id,
        operation: 'templates:refresh_usage',
      }, refreshError instanceof Error ? refreshError : undefined)
    }

    return successResponse({ template })
  } catch (error) {
    logger.error('Template creation error', {
      operation: 'templates:post',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to create template', { details: error })
  }
}
