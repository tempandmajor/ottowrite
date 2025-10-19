import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { AIRequest, TelemetryStats } from '@/components/account/ai-telemetry-dashboard'

export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch recent requests
  const { data: requests, error: requestsError } = await supabase
    .from('ai_requests')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (requestsError) {
    console.error('Error fetching AI requests:', requestsError)
    return NextResponse.json({ error: 'Failed to fetch AI requests' }, { status: 500 })
  }

  // Calculate statistics
  const stats: TelemetryStats = {
    total_requests: requests.length,
    succeeded_requests: requests.filter((r) => r.status === 'succeeded').length,
    failed_requests: requests.filter((r) => r.status !== 'succeeded').length,
    total_words_generated: requests.reduce((sum, r) => sum + (r.words_generated ?? 0), 0),
    total_prompt_tokens: requests.reduce((sum, r) => sum + (r.prompt_tokens ?? 0), 0),
    total_completion_tokens: requests.reduce((sum, r) => sum + (r.completion_tokens ?? 0), 0),
    avg_latency_ms: null,
    most_used_model: null,
    most_used_command: null,
  }

  // Calculate average latency
  const latencies = requests.filter((r) => r.latency_ms != null).map((r) => r.latency_ms!)
  if (latencies.length > 0) {
    stats.avg_latency_ms = latencies.reduce((sum, l) => sum + l, 0) / latencies.length
  }

  // Find most used model
  const modelCounts = new Map<string, number>()
  requests.forEach((r) => {
    const count = modelCounts.get(r.selected_model) ?? 0
    modelCounts.set(r.selected_model, count + 1)
  })
  if (modelCounts.size > 0) {
    const entries = Array.from(modelCounts.entries())
    entries.sort((a, b) => b[1] - a[1])
    stats.most_used_model = entries[0][0]
  }

  // Find most used command
  const commandCounts = new Map<string, number>()
  requests.forEach((r) => {
    if (r.command) {
      const count = commandCounts.get(r.command) ?? 0
      commandCounts.set(r.command, count + 1)
    }
  })
  if (commandCounts.size > 0) {
    const entries = Array.from(commandCounts.entries())
    entries.sort((a, b) => b[1] - a[1])
    stats.most_used_command = entries[0][0]
  }

  return NextResponse.json({
    requests: requests as AIRequest[],
    stats,
  })
}
