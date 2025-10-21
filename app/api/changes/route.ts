/**
 * Document Changes API
 * Handles change tracking with insertions, deletions, and modifications
 * Supports accept/reject workflow
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponses, successResponse } from '@/lib/api/error-response'
import { validateBody, validateQuery, validationErrorResponse } from '@/lib/validation/middleware'
import { z } from 'zod'
import { logger } from '@/lib/monitoring/structured-logger'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// Validation schemas
const createChangeSchema = z.object({
  documentId: z.string().uuid(),
  changeType: z.enum(['insertion', 'deletion', 'modification']),
  content: z.string().min(1).max(50000),
  originalContent: z.string().max(50000).optional(),
  startPosition: z.number().int().min(0),
  endPosition: z.number().int().min(0),
  comment: z.string().max(1000).optional(),
}).refine((data) => data.endPosition >= data.startPosition, {
  message: 'End position must be >= start position',
  path: ['endPosition'],
})

const listChangesQuerySchema = z.object({
  documentId: z.string().uuid(),
  status: z.enum(['pending', 'accepted', 'rejected', 'all']).optional().default('all'),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
})

const reviewChangeSchema = z.object({
  changeId: z.string().uuid(),
  action: z.enum(['accept', 'reject']),
  comment: z.string().max(1000).optional(),
})

/**
 * GET /api/changes - List changes for a document
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
    const validation = validateQuery(request, listChangesQuerySchema)
    if (!validation.success) {
      return validationErrorResponse(validation, user.id)
    }

    const { documentId, status, limit, offset } = validation.data!

    // Verify user has access to document
    const { data: document } = await supabase
      .from('documents')
      .select('id, user_id')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single()

    if (!document) {
      return errorResponses.notFound('Document not found')
    }

    // Build query
    let query = supabase
      .from('document_changes')
      .select(`
        *,
        author:user_id (
          id,
          email
        ),
        reviewer:reviewed_by (
          id,
          email
        )
      `, { count: 'exact' })
      .eq('document_id', documentId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Filter by status if not 'all'
    if (status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: changes, error, count } = await query

    if (error) {
      logger.error('Error fetching document changes', {
        userId: user.id,
        documentId,
        operation: 'changes:list',
      }, error)
      return errorResponses.internalError('Failed to fetch changes')
    }

    return successResponse({
      changes: changes || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    })
  } catch (error) {
    logger.error('Unexpected error in GET /api/changes', {
      operation: 'changes:list',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError()
  }
}

/**
 * POST /api/changes - Create a new change
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

    // Validate request body
    const validation = await validateBody(request, createChangeSchema)
    if (!validation.success) {
      return validationErrorResponse(validation, user.id)
    }

    const {
      documentId,
      changeType,
      content,
      originalContent,
      startPosition,
      endPosition,
      comment,
    } = validation.data!

    // Verify user has access to document
    const { data: document } = await supabase
      .from('documents')
      .select('id, user_id')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single()

    if (!document) {
      return errorResponses.notFound('Document not found')
    }

    // Create change
    const { data: change, error } = await supabase
      .from('document_changes')
      .insert({
        document_id: documentId,
        user_id: user.id,
        change_type: changeType,
        content,
        original_content: originalContent || null,
        start_position: startPosition,
        end_position: endPosition,
        comment: comment || null,
        status: 'pending',
      })
      .select(`
        *,
        author:user_id (
          id,
          email
        )
      `)
      .single()

    if (error) {
      logger.error('Error creating document change', {
        userId: user.id,
        documentId,
        operation: 'changes:create',
      }, error)
      return errorResponses.internalError('Failed to create change')
    }

    logger.info('Document change created', {
      userId: user.id,
      documentId,
      changeId: change.id,
      changeType,
      operation: 'changes:create',
    })

    return successResponse({ change }, 201)
  } catch (error) {
    logger.error('Unexpected error in POST /api/changes', {
      operation: 'changes:create',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError()
  }
}

/**
 * PATCH /api/changes - Review a change (accept/reject)
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

    // Validate request body
    const validation = await validateBody(request, reviewChangeSchema)
    if (!validation.success) {
      return validationErrorResponse(validation, user.id)
    }

    const { changeId, action, comment } = validation.data!

    // Get change with document ownership check
    const { data: change } = await supabase
      .from('document_changes')
      .select(`
        *,
        document:document_id (
          id,
          user_id
        )
      `)
      .eq('id', changeId)
      .single()

    if (!change) {
      return errorResponses.notFound('Change not found')
    }

    // Verify user is document owner
    if (change.document.user_id !== user.id) {
      return errorResponses.forbidden('Only document owner can review changes')
    }

    // Check if change is still pending
    if (change.status !== 'pending') {
      return errorResponses.badRequest(`Change has already been ${change.status}`)
    }

    // Update change status
    const newStatus = action === 'accept' ? 'accepted' : 'rejected'
    const { data: updatedChange, error } = await supabase
      .from('document_changes')
      .update({
        status: newStatus,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', changeId)
      .select(`
        *,
        author:user_id (
          id,
          email
        ),
        reviewer:reviewed_by (
          id,
          email
        )
      `)
      .single()

    if (error) {
      logger.error('Error reviewing change', {
        userId: user.id,
        changeId,
        action,
        operation: 'changes:review',
      }, error)
      return errorResponses.internalError('Failed to review change')
    }

    // Add comment to history if provided
    if (comment) {
      await supabase
        .from('change_history')
        .insert({
          change_id: changeId,
          user_id: user.id,
          action: 'commented',
          comment,
        })
    }

    logger.info('Change reviewed', {
      userId: user.id,
      changeId,
      action,
      status: newStatus,
      operation: 'changes:review',
    })

    return successResponse({ change: updatedChange })
  } catch (error) {
    logger.error('Unexpected error in PATCH /api/changes', {
      operation: 'changes:review',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError()
  }
}

/**
 * DELETE /api/changes - Delete a pending change
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
    const changeId = searchParams.get('id')

    if (!changeId) {
      return errorResponses.badRequest('Change ID is required')
    }

    // Verify change exists and user owns it
    const { data: change } = await supabase
      .from('document_changes')
      .select('id, user_id, status')
      .eq('id', changeId)
      .eq('user_id', user.id)
      .single()

    if (!change) {
      return errorResponses.notFound('Change not found')
    }

    // Only allow deleting pending changes
    if (change.status !== 'pending') {
      return errorResponses.badRequest('Can only delete pending changes')
    }

    // Delete change
    const { error } = await supabase
      .from('document_changes')
      .delete()
      .eq('id', changeId)
      .eq('user_id', user.id)

    if (error) {
      logger.error('Error deleting change', {
        userId: user.id,
        changeId,
        operation: 'changes:delete',
      }, error)
      return errorResponses.internalError('Failed to delete change')
    }

    logger.info('Change deleted', {
      userId: user.id,
      changeId,
      operation: 'changes:delete',
    })

    return successResponse({ success: true })
  } catch (error) {
    logger.error('Unexpected error in DELETE /api/changes', {
      operation: 'changes:delete',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError()
  }
}
