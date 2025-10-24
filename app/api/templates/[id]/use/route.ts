import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponses, successResponse } from '@/lib/api/error-response'
import {requireAuth, handleAuthError} from '@/lib/api/auth-helpers'
import { requireDefaultRateLimit } from '@/lib/api/rate-limit-helpers'
import { logger } from '@/lib/monitoring/structured-logger'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { user, supabase } = await requireAuth(request)
  await requireDefaultRateLimit(request, user.id)

    const { id } = await params
    const body = await request.json()
    const { project_id, title } = body

    if (!project_id) {
      return errorResponses.badRequest('Project ID required', { userId: user.id })
    }

    // Get the template
    const { data: template, error: fetchError } = await supabase
      .from('document_templates')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !template) {
      return errorResponses.notFound('Template not found', { userId: user.id })
    }

    const templateTitle = title || template.title || template.name

    // Create new document from template
    const { data: document, error: createError } = await supabase
      .from('documents')
      .insert({
        title: templateTitle,
        type: template.type,
        content: template.content,
        project_id,
        user_id: user.id,
      })
      .select()
      .single()

    if (createError) {
      logger.error('Failed to create document from template', {
        userId: user.id,
        templateId: id,
        projectId: project_id,
        operation: 'templates:use',
      }, createError)
      return errorResponses.internalError('Failed to create document from template', {
        details: createError,
        userId: user.id,
      })
    }

    // Increment template usage count
    try {
      await supabase.rpc('increment_template_usage', { template_id: id })
    } catch (usageError) {
      logger.warn('Failed to increment template usage count', {
        userId: user.id,
        templateId: id,
        operation: 'templates:increment_usage',
      }, usageError instanceof Error ? usageError : undefined)
    }

    return successResponse({ document })
  } catch (error) {
        const authError = handleAuthError(error)
    if (authError) return authError

    logger.error('Error using template', {
      operation: 'templates:use',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Internal server error', { details: error })
  }
}
