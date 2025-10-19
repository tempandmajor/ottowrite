import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  createBackgroundResponse,
  retrieveBackgroundResponse,
  extractResponseText,
} from '@/lib/ai/responses-api-service'
import { getMonthlyAIWordLimit } from '@/lib/stripe/config'
import { checkAIRequestQuota } from '@/lib/account/quota'
import { reportBackgroundTaskError, addBreadcrumb } from '@/lib/monitoring/error-reporter'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { supabase, user: null }
  }
  return { supabase, user }
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await requireUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
      throw error
    }

    return NextResponse.json({ tasks: data ?? [] })
  } catch (error) {
    console.error('Error fetching background tasks:', error)
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      task_type,
      prompt,
      project_id,
      document_id,
      context,
    }: {
      task_type?: string
      prompt?: string
      project_id?: string | null
      document_id?: string | null
      context?: string | null
    } = body ?? {}

    if (!task_type || !prompt || prompt.trim().length < 10) {
      return NextResponse.json(
        { error: 'task_type and a prompt of at least 10 characters are required.' },
        { status: 400 }
      )
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const plan = profile.subscription_tier ?? 'free'
    const currentUsage = profile.ai_words_used_this_month ?? 0

    const requestQuota = await checkAIRequestQuota(supabase, user.id, plan, 1)
    if (!requestQuota.allowed) {
      const formattedPlan = plan.charAt(0).toUpperCase() + plan.slice(1)
      return NextResponse.json(
        {
          error: `You have reached the ${formattedPlan} plan limit of ${requestQuota.limit} AI requests this month.`,
          limit: requestQuota.limit,
          used: requestQuota.used,
          upgradeRequired: true,
        },
        { status: 429 }
      )
    }

    const monthlyLimit = getMonthlyAIWordLimit(plan)
    if (currentUsage >= monthlyLimit) {
      return NextResponse.json(
        {
          error: 'Monthly AI word limit exceeded',
          limit: monthlyLimit,
          used: currentUsage,
          upgradeRequired: true,
        },
        { status: 429 }
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
          console.warn('refresh_user_plan_usage failed after background task', refreshError)
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

      return NextResponse.json({ task: updatedRecord })
    } catch (error) {
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

      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : 'Failed to execute background task',
          task: updatedRecord,
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error creating background task:', error)
    return NextResponse.json({ error: 'Failed to create background task' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { supabase, user } = await requireUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id } = body ?? {}

    if (!id) {
      return NextResponse.json({ error: 'Task id is required' }, { status: 400 })
    }

    const { data: task, error } = await supabase
      .from('ai_background_tasks')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    if (!task.provider_response_id) {
      return NextResponse.json({ task })
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

    return NextResponse.json({ task: updated ?? task })
  } catch (error) {
    console.error('Error refreshing background task:', error)
    return NextResponse.json({ error: 'Failed to refresh background task' }, { status: 500 })
  }
}
