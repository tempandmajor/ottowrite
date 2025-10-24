import { NextRequest } from 'next/server'
import { errorResponses, successResponse } from '@/lib/api/error-response'
import { logger } from '@/lib/monitoring/structured-logger'
import {requireAuth, handleAuthError} from '@/lib/api/auth-helpers'
import { requireDefaultRateLimit } from '@/lib/api/rate-limit-helpers'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Validation schema for template creation
const createTemplateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  type: z.string().min(1).max(50),
  category: z.string().min(1).max(50),
  content: z.string().min(1),
}).refine(data => data.name || data.title, {
  message: 'Either name or title must be provided',
})

// GET - List templates (user's own + official templates)
export async function GET(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const category = searchParams.get('category')

    // Show user's own templates + official templates
    let query = supabase
      .from('document_templates')
      .select('*')
      .or(`created_by.eq.${user.id},is_official.eq.true`)
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
        const authError = handleAuthError(error)
    if (authError) return authError

    logger.error('Template list error', {
      operation: 'templates:get',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to load templates', { details: error })
  }
}

// POST - Create template from document
export async function POST(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)
    await requireDefaultRateLimit(request, user.id)

    const body = await request.json()

    // Validate input
    const validation = createTemplateSchema.safeParse(body)
    if (!validation.success) {
      return errorResponses.validationError('Invalid template data', {
        details: validation.error.issues,
      })
    }

    const { name, title, description, type, category, content } = validation.data
    const templateTitle = title || name

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
        const authError = handleAuthError(error)
    if (authError) return authError

    logger.error('Template creation error', {
      operation: 'templates:post',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to create template', { details: error })
  }
}
