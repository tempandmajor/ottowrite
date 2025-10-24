import { NextRequest } from 'next/server'
import {
  createBackgroundResponse,
  retrieveBackgroundResponse,
  extractResponseText,
} from '@/lib/ai/responses-api-service'
import { getMonthlyAIWordLimit } from '@/lib/stripe/config'
import { checkAIRequestQuota } from '@/lib/account/quota'
import { reportBackgroundTaskError, addBreadcrumb } from '@/lib/monitoring/error-reporter'
import { errorResponses, successResponse } from '@/lib/api/error-response'
import { logger } from '@/lib/monitoring/structured-logger'
import {requireAuth, handleAuthError} from '@/lib/api/auth-helpers'
import { requireAIRateLimit } from '@/lib/api/rate-limit-helpers'
import { z } from 'zod'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Validation schemas
const createTaskSchema = z.object({
  task_type: z.string().min(1).max(100),
  prompt: z.string().min(10).max(50000),
  project_id: z.string().uuid().nullable().optional(),
  document_id: z.string().uuid().nullable().optional(),
  context: z.string().max(100000).nullable().optional(),
})

const refreshTaskSchema = z.object({
  id: z.string().uuid(),
})

export async function GET(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)
    await requireAIRateLimit(request, user.id)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const documentId = searchParams.get('document_id')
    const projectId = searchParams.get('project_id')

    let query = supabase
      .from('ai_background_tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (id) {
      query = query.eq('id', id)
    }
    if (documentId) {
      query = query.eq('document_id', documentId)
    }
    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data, error } = await query

    if (error) {
      logger.error('Failed to fetch background tasks', {
        userId: user.id,
        operation: 'background_task:fetch',
      }, error)
      return errorResponses.internalError('Failed to fetch background tasks', {
        details: error,
        userId: user.id,
      })
    }

    return successResponse({ tasks: data ?? [] })
  } catch (error) {
        const authError = handleAuthError(error)
    if (authError) return authError

    logger.error('Error fetching background tasks', {
      operation: 'background_task:get',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to fetch tasks', { details: error })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)
    await requireAIRateLimit(request, user.id)

    const body = await request.json()
    const validation = createTaskSchema.safeParse(body)

    if (!validation.success) {
      return errorResponses.validationError('Invalid request data', {
        details: validation.error.issues,
      })
    }

    const { task_type, prompt, project_id, document_id, context } = validation.data

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return errorResponses.notFound('Profile not found', { userId: user.id })
    }

    const plan = profile.subscription_tier ?? 'free'
    const currentUsage = profile.ai_words_used_this_month ?? 0

    const requestQuota = await checkAIRequestQuota(supabase, user.id, plan, 1)
    if (!requestQuota.allowed) {
      const formattedPlan = plan.charAt(0).toUpperCase() + plan.slice(1)
      return errorResponses.tooManyRequests(
        `You have reached the ${formattedPlan} plan limit of ${requestQuota.limit} AI requests this month.`,
        undefined,
        {
          code: 'AI_REQUEST_LIMIT_EXCEEDED',
          userId: user.id,
          details: {
            limit: requestQuota.limit,
            used: requestQuota.used,
            upgradeRequired: true,
          },
        }
      )
    }

    const monthlyLimit = getMonthlyAIWordLimit(plan)
    if (currentUsage >= monthlyLimit) {
      return errorResponses.tooManyRequests(
        'Monthly AI word limit exceeded',
        undefined,
        {
          code: 'AI_WORD_LIMIT_EXCEEDED',
          userId: user.id,
          details: {
            limit: monthlyLimit,
            used: currentUsage,
            upgradeRequired: true,
          },
        }
      )
    }

    const { data: inserted, error: insertError } = await supabase
      .from('ai_background_tasks')
      .insert({
        user_id: user.id,
        project_id: project_id ?? null,
        document_id: document_id ?? null,
        task_type,
        prompt: prompt.trim(),
        status: 'queued',
      })
      .select()
      .single()

    if (insertError || !inserted) {
      throw insertError ?? new Error('Failed to store background task')
    }

    let updatedRecord = inserted

    try {
      // Add breadcrumb for task start
      addBreadcrumb(`Background task started: ${task_type}`, 'background_task', 'info', {
        taskId: inserted.id,
        taskType: task_type,
        userId: user.id,
        promptLength: prompt.length,
      })

      const metadata = {
        task_type,
        project_id: project_id ?? undefined,
        document_id: document_id ?? undefined,
      }
      const response = await createBackgroundResponse(
        `${prompt.trim()}${context ? `\n\nCONTEXT:\n${context}` : ''}`,
        metadata
      )

      const status =
        response.status === 'completed'
          ? 'succeeded'
          : response.status === 'failed'
          ? 'failed'
          : 'running'

      let result = null
      if (response.status === 'completed') {
        result = extractResponseText(response)
        const wordsGenerated = result.text.trim().length === 0 ? 0 : result.text.trim().split(/\s+/).length

        await supabase.from('ai_usage').insert([
          {
            user_id: user.id,
            document_id: document_id ?? null,
            model: 'openai-responses',
            words_generated: wordsGenerated,
            prompt_tokens: 0,
            completion_tokens: 0,
            total_cost: 0,
            prompt_preview: prompt.trim().substring(0, 200),
          },
        ])

        await supabase
          .from('user_profiles')
          .update({
            ai_words_used_this_month: currentUsage + wordsGenerated,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id)

        try {
          await supabase.rpc('refresh_user_plan_usage', { p_user_id: user.id })
        } catch (refreshError) {
          logger.warn('refresh_user_plan_usage failed after background task', {
            userId: user.id,
            operation: 'background_task:refresh_usage',
          }, refreshError instanceof Error ? refreshError : undefined)
        }
      }

      const { data: updated } = await supabase
        .from('ai_background_tasks')
        .update({
          status,
          provider_response_id: response.id,
          result,
        })
        .eq('id', inserted.id)
        .select()
        .single()

      if (updated) {
        updatedRecord = updated
      }

      return successResponse({ task: updatedRecord })
    } catch (error) {
          const authError = handleAuthError(error)
    if (authError) return authError

    // Report background task failure to Sentry
      reportBackgroundTaskError(task_type, error instanceof Error ? error : new Error(String(error)), {
        userId: user.id,
        projectId: project_id ?? undefined,
        documentId: document_id ?? undefined,
        metadata: {
          taskId: inserted.id,
          promptLength: prompt.length,
        },
      })

      const { data: failed } = await supabase
        .from('ai_background_tasks')
        .update({
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('id', inserted.id)
        .select()
        .single()

      if (failed) {
        updatedRecord = failed
      }

      return errorResponses.internalError('Failed to execute background task', {
        details: { error, task: updatedRecord },
        userId: user.id,
      })
    }
  } catch (error) {
        const authError = handleAuthError(error)
    if (authError) return authError

    logger.error('Error creating background task', {
      operation: 'background_task:post',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to create background task', { details: error })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)
    await requireAIRateLimit(request, user.id)

    const body = await request.json()
    const validation = refreshTaskSchema.safeParse(body)

    if (!validation.success) {
      return errorResponses.validationError('Invalid request data', {
        details: validation.error.issues,
      })
    }

    const { id } = validation.data

    const { data: task, error } = await supabase
      .from('ai_background_tasks')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !task) {
      return errorResponses.notFound('Task not found', { userId: user.id })
    }

    if (!task.provider_response_id) {
      return successResponse({ task })
    }

    const response = await retrieveBackgroundResponse(task.provider_response_id)
    const status =
      response.status === 'completed'
        ? 'succeeded'
        : response.status === 'failed'
        ? 'failed'
        : 'running'

    let result = task.result
    if (response.status === 'completed') {
      result = extractResponseText(response)
    }

    const { data: updated } = await supabase
      .from('ai_background_tasks')
      .update({ status, result })
      .eq('id', id)
      .select()
      .single()

    return successResponse({ task: updated ?? task })
  } catch (error) {
        const authError = handleAuthError(error)
    if (authError) return authError

    logger.error('Error refreshing background task', {
      operation: 'background_task:patch',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to refresh background task', { details: error })
  }
}
