/**
 * Change History API
 * Provides audit trail of all change actions
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponses, successResponse, errorResponse } from '@/lib/api/error-response'
import { validateQuery, validationErrorResponse } from '@/lib/validation/middleware'
import { z } from 'zod'
import { logger } from '@/lib/monitoring/structured-logger'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

const historyQuerySchema = z.object({
  changeId: z.string().uuid().optional(),
  documentId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
}).refine((data) => data.changeId || data.documentId, {
  message: 'Either changeId or documentId must be provided',
})

/**
 * GET /api/changes/history - Get change history
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

    // Validate query parameters
    const validation = validateQuery(request, historyQuerySchema)
    if (!validation.success) {
      return validationErrorResponse(validation, user.id)
    }

    const { changeId, documentId, limit, offset } = validation.data!

    // Build query based on filter type
    let query = supabase
      .from('change_history')
      .select(`
        *,
        change:change_id (
          id,
          document_id,
          change_type,
          status,
          content
        ),
        user:user_id (
          id,
          email
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (changeId) {
      // Get history for specific change
      const { data: change } = await supabase
        .from('document_changes')
        .select('id, document_id')
        .eq('id', changeId)
        .single()

      if (!change) {
        return errorResponses.notFound('Change not found')
      }

      // Verify user has access to the document
      const { data: document } = await supabase
        .from('documents')
        .select('id, user_id')
        .eq('id', change.document_id)
        .eq('user_id', user.id)
        .single()

      if (!document) {
        return errorResponses.forbidden('No access to this change')
      }

      query = query.eq('change_id', changeId)
    } else if (documentId) {
      // Get history for all changes in document
      const { data: document } = await supabase
        .from('documents')
        .select('id, user_id')
        .eq('id', documentId)
        .eq('user_id', user.id)
        .single()

      if (!document) {
        return errorResponses.notFound('Document not found')
      }

      // Filter by document_id through change relationship
      query = query.eq('change.document_id', documentId)
    }

    const { data: history, error, count } = await query

    if (error) {
      logger.error('Error fetching change history', {
        userId: user.id,
        changeId,
        documentId,
        operation: 'change_history:list',
      }, error)
      return errorResponse('Failed to fetch change history', { status: 500 })
    }

    return successResponse({
      history: history || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    })
  } catch (error) {
    logger.error('Unexpected error in GET /api/changes/history', {
      operation: 'change_history:list',
    }, error instanceof Error ? error : undefined)
    return errorResponse("Internal server error", { status: 500 })
  }
}
