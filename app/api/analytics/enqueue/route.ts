/**
 * Analytics Job Enqueue API
 *
 * Endpoint for creating analytics jobs that will be processed by the edge function worker.
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponses, successResponse } from '@/lib/api/error-response'
import { logger } from '@/lib/monitoring/structured-logger'
import type { AnalyticsJobInput, JobPriority } from '@/lib/analytics/worker-contract'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return errorResponses.unauthorized()
    }

    // Parse request body
    const body = await req.json()
    const { jobType, documentId, priority = 1, userId: _userId, ...jobInput } = body as AnalyticsJobInput & {
      priority?: JobPriority
    }

    // Validate required fields
    if (!jobType || !documentId) {
      return errorResponses.badRequest(
        'Missing required fields: jobType, documentId',
        { userId: user.id }
      )
    }

    // Verify document belongs to user
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single()

    if (docError || !document) {
      return errorResponses.notFound('Document not found or access denied', { userId: user.id })
    }

    // Create analytics job
    const { data: job, error: jobError } = await supabase
      .from('analytics_jobs')
      .insert({
        user_id: user.id,
        document_id: documentId,
        job_type: jobType,
        priority,
        input: {
          jobType,
          documentId,
          userId: user.id,
          priority,
          ...jobInput,
        },
        status: 'pending',
        attempts: 0,
        max_attempts: 3,
      })
      .select()
      .single()

    if (jobError) {
      logger.error('Failed to create analytics job', {
        userId: user.id,
        documentId,
        jobType,
        operation: 'analytics:enqueue',
      }, jobError)
      return errorResponses.internalError('Failed to create job', {
        details: jobError,
        userId: user.id,
      })
    }

    return successResponse(
      {
        job: {
          id: job.id,
          jobType: job.job_type,
          status: job.status,
          priority: job.priority,
          createdAt: job.created_at,
        },
      },
      201
    )
  } catch (error) {
    logger.error('Analytics enqueue error', {
      operation: 'analytics:enqueue',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError(
      error instanceof Error ? error.message : 'Internal server error',
      { details: error }
    )
  }
}
