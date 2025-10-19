/**
 * Analytics Job Enqueue API
 *
 * Endpoint for creating analytics jobs that will be processed by the edge function worker.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await req.json()
    const { jobType, documentId, priority = 1, userId: _userId, ...jobInput } = body as AnalyticsJobInput & {
      priority?: JobPriority
    }

    // Validate required fields
    if (!jobType || !documentId) {
      return NextResponse.json(
        { error: 'Missing required fields: jobType, documentId' },
        { status: 400 }
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
      return NextResponse.json({ error: 'Document not found or access denied' }, { status: 404 })
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
      console.error('Failed to create analytics job:', jobError)
      return NextResponse.json({ error: 'Failed to create job' }, { status: 500 })
    }

    return NextResponse.json(
      {
        success: true,
        job: {
          id: job.id,
          jobType: job.job_type,
          status: job.status,
          priority: job.priority,
          createdAt: job.created_at,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Analytics enqueue error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
