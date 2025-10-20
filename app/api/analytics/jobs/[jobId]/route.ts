/**
 * Analytics Job Status API
 *
 * Get status and results of an analytics job.
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponses, successResponse } from '@/lib/api/error-response'
import { logger } from '@/lib/monitoring/structured-logger'

export async function GET(req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId } = await params
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return errorResponses.unauthorized()
    }

    // Fetch job
    const { data: job, error: jobError } = await supabase
      .from('analytics_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single()

    if (jobError || !job) {
      return errorResponses.notFound('Job not found', { userId: user.id })
    }

    return successResponse({
      job: {
        id: job.id,
        jobType: job.job_type,
        status: job.status,
        priority: job.priority,
        input: job.input,
        output: job.output,
        error: job.error,
        attempts: job.attempts,
        maxAttempts: job.max_attempts,
        createdAt: job.created_at,
        startedAt: job.started_at,
        completedAt: job.completed_at,
      },
    })
  } catch (error) {
    logger.error('Analytics job status error', {
      operation: 'analytics:get_job_status',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError(
      error instanceof Error ? error.message : 'Internal server error',
      { details: error }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return errorResponses.unauthorized()
    }

    // Cancel job using the database function
    const { error: cancelError } = await supabase.rpc('cancel_analytics_job', {
      job_id: jobId,
    })

    if (cancelError) {
      logger.error('Failed to cancel analytics job', {
        userId: user.id,
        jobId,
        operation: 'analytics:cancel_job',
      }, cancelError)
      return errorResponses.internalError('Failed to cancel job', {
        details: cancelError,
        userId: user.id,
      })
    }

    return successResponse({ success: true })
  } catch (error) {
    logger.error('Analytics job cancel error', {
      operation: 'analytics:delete_job',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError(
      error instanceof Error ? error.message : 'Internal server error',
      { details: error }
    )
  }
}
