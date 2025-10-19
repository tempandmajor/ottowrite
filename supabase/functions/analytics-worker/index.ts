/* eslint-disable import/no-unresolved, no-undef */
/**
 * Analytics Worker Edge Function
 *
 * Processes analytics jobs from the queue and calculates metrics.
 * Runs as a background job processor with automatic retry logic.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2'

// Types (duplicated here for edge function)
type JobType =
  | 'snapshot_analysis'
  | 'snapshot_comparison'
  | 'writing_velocity'
  | 'structure_analysis'
  | 'session_summary'
  | 'daily_summary'
  | 'weekly_summary'

interface AnalyticsJob {
  id: string
  user_id: string
  document_id: string
  job_type: JobType
  status: string
  priority: number
  input: Record<string, unknown>
  output: Record<string, unknown> | null
  attempts: number
  max_attempts: number
  created_at: string
  started_at: string | null
}

interface DocumentSnapshot {
  metadata: {
    id: string
    timestamp: string
    wordCount: number
    sceneCount: number
    label?: string
  }
  content: {
    html?: string
    structure?: unknown
    sceneAnchors?: unknown[]
  }
}

// Metrics calculation functions (simplified versions for edge function)

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function countSentences(text: string): number {
  const sentences = text.match(/[.!?]+/g)
  return sentences ? sentences.length : 0
}

function analyzeSnapshot(snapshot: DocumentSnapshot) {
  const html = snapshot.content.html || ''
  const text = stripHtml(html)
  const words = text.split(/\s+/).filter((w) => w.length > 0)
  const wordCount = words.length
  const sentences = countSentences(text)

  return {
    wordCount,
    characterCount: text.length,
    paragraphCount: text.split(/\n\n+/).filter((p) => p.trim().length > 0).length,
    sentenceCount: sentences,
    averageWordsPerSentence: sentences > 0 ? wordCount / sentences : 0,
    sceneCount: snapshot.metadata.sceneCount || 0,
    readingTimeMinutes: wordCount / 250,
    analyzedAt: new Date().toISOString(),
  }
}

function compareSnapshots(from: DocumentSnapshot, to: DocumentSnapshot) {
  const fromText = stripHtml(from.content.html || '')
  const toText = stripHtml(to.content.html || '')

  const fromWords = fromText.split(/\s+/).filter((w) => w.length > 0).length
  const toWords = toText.split(/\s+/).filter((w) => w.length > 0).length

  const netWordChange = toWords - fromWords

  const fromTime = new Date(from.metadata.timestamp).getTime()
  const toTime = new Date(to.metadata.timestamp).getTime()
  const timeBetweenSnapshots = toTime - fromTime

  const hoursElapsed = timeBetweenSnapshots / (1000 * 60 * 60)
  const writingVelocity = hoursElapsed > 0 ? Math.abs(netWordChange) / hoursElapsed : 0

  return {
    wordsAdded: Math.max(0, netWordChange),
    wordsRemoved: Math.max(0, -netWordChange),
    netWordChange,
    timeBetweenSnapshots,
    writingVelocity,
    fromTimestamp: from.metadata.timestamp,
    toTimestamp: to.metadata.timestamp,
    analyzedAt: new Date().toISOString(),
  }
}

// Main worker function
async function processJob(job: AnalyticsJob, supabase: ReturnType<typeof createClient>) {
  const startTime = Date.now()

  try {
    console.log(`Processing job ${job.id} of type ${job.job_type}`)

    let metrics: Record<string, unknown> = {}

    switch (job.job_type) {
      case 'snapshot_analysis': {
        const { snapshotId } = job.input as { snapshotId: string }

        // Fetch snapshot from document_snapshots table
        const { data: snapshot, error } = await supabase
          .from('document_snapshots')
          .select('*')
          .eq('snapshot_id', snapshotId)
          .eq('user_id', job.user_id)
          .single()

        if (error || !snapshot) {
          throw new Error(`Snapshot not found: ${snapshotId}`)
        }

        // Convert DB snapshot to DocumentSnapshot format
        const docSnapshot: DocumentSnapshot = {
          metadata: {
            id: snapshot.snapshot_id,
            timestamp: snapshot.snapshot_timestamp,
            wordCount: snapshot.word_count,
            sceneCount: snapshot.scene_count,
            label: snapshot.label,
          },
          content: {
            html: snapshot.html,
            structure: snapshot.structure,
            sceneAnchors: snapshot.scene_anchors,
          },
        }

        metrics = analyzeSnapshot(docSnapshot)
        break
      }

      case 'snapshot_comparison': {
        const { fromSnapshotId, toSnapshotId } = job.input as {
          fromSnapshotId: string
          toSnapshotId: string
        }

        // Fetch both snapshots
        const { data: snapshots, error } = await supabase
          .from('document_snapshots')
          .select('*')
          .in('snapshot_id', [fromSnapshotId, toSnapshotId])
          .eq('user_id', job.user_id)

        if (error || !snapshots || snapshots.length !== 2) {
          throw new Error('Failed to fetch snapshots for comparison')
        }

        const fromSnapshot = snapshots.find((s) => s.snapshot_id === fromSnapshotId)
        const toSnapshot = snapshots.find((s) => s.snapshot_id === toSnapshotId)

        if (!fromSnapshot || !toSnapshot) {
          throw new Error('One or both snapshots not found')
        }

        const from: DocumentSnapshot = {
          metadata: {
            id: fromSnapshot.snapshot_id,
            timestamp: fromSnapshot.snapshot_timestamp,
            wordCount: fromSnapshot.word_count,
            sceneCount: fromSnapshot.scene_count,
          },
          content: {
            html: fromSnapshot.html,
            structure: fromSnapshot.structure,
            sceneAnchors: fromSnapshot.scene_anchors,
          },
        }

        const to: DocumentSnapshot = {
          metadata: {
            id: toSnapshot.snapshot_id,
            timestamp: toSnapshot.snapshot_timestamp,
            wordCount: toSnapshot.word_count,
            sceneCount: toSnapshot.scene_count,
          },
          content: {
            html: toSnapshot.html,
            structure: toSnapshot.structure,
            sceneAnchors: toSnapshot.scene_anchors,
          },
        }

        metrics = compareSnapshots(from, to)
        break
      }

      default:
        throw new Error(`Unsupported job type: ${job.job_type}`)
    }

    const processingTime = Date.now() - startTime

    // Mark job as completed
    const output = {
      jobType: job.job_type,
      success: true,
      metrics,
      processingTime,
      completedAt: new Date().toISOString(),
    }

    const { error: completeError } = await supabase.rpc('complete_analytics_job', {
      job_id: job.id,
      job_output: output,
    })

    if (completeError) {
      console.error('Failed to mark job as completed:', completeError)
      throw completeError
    }

    console.log(`Job ${job.id} completed successfully in ${processingTime}ms`)

    return { success: true, jobId: job.id, processingTime }
  } catch (error) {
    const processingTime = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    console.error(`Job ${job.id} failed:`, errorMessage)

    // Mark job as failed
    const { error: failError } = await supabase.rpc('fail_analytics_job', {
      job_id: job.id,
      error_message: errorMessage,
      should_retry: true,
    })

    if (failError) {
      console.error('Failed to mark job as failed:', failError)
    }

    return { success: false, jobId: job.id, error: errorMessage, processingTime }
  }
}

// Edge function handler
Deno.serve(async (req: Request) => {
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request body to get batch size
    const body = await req.json().catch(() => ({}))
    const batchSize = Math.min(body.batchSize || 10, 50) // Max 50 jobs per invocation

    const results = []

    // Process jobs in batch
    for (let i = 0; i < batchSize; i++) {
      // Dequeue next job
      const { data: job, error } = await supabase.rpc('dequeue_analytics_job')

      if (error) {
        console.error('Failed to dequeue job:', error)
        break
      }

      if (!job || !job.id) {
        console.log('No more jobs in queue')
        break
      }

      // Process the job
      const result = await processJob(job as AnalyticsJob, supabase)
      results.push(result)
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Worker error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})
