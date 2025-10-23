import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('subscription_tier, ai_words_used_this_month, ai_words_reset_date')
      .eq('id', user.id)
      .single()

    const tier = profile?.subscription_tier ?? 'free'

    const { data: tierLimits } = await supabase
      .from('subscription_tier_limits')
      .select('*')
      .eq('tier', tier)
      .single()

    const [
      projectsResult,
      documentsResult,
      snapshotsResult,
      templatesResult,
    ] = await Promise.all([
      supabase.from('projects').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('documents').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('document_snapshots').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('document_templates').select('id', { count: 'exact', head: true }).eq('created_by', user.id),
    ])

    if (projectsResult.error) throw projectsResult.error
    if (documentsResult.error) throw documentsResult.error
    if (snapshotsResult.error) throw snapshotsResult.error
    if (templatesResult.error) throw templatesResult.error

    const [
      aiUsageResult,
      aiRequestsResult,
      usageSnapshotResult,
    ] = await Promise.all([
      supabase.rpc('sum_ai_usage', {
        p_user_id: user.id,
        p_period_start: periodStart.toISOString(),
        p_period_end: periodEnd.toISOString(),
      }),
      supabase
        .from('ai_usage')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', periodStart.toISOString())
        .lt('created_at', periodEnd.toISOString()),
      supabase
        .from('user_plan_usage')
        .select('projects_count, documents_count, document_snapshots_count, templates_created, ai_words_used, ai_requests_count, period_start, period_end, created_at')
        .eq('user_id', user.id)
        .order('period_start', { ascending: false })
        .limit(1),
    ])

    if (aiUsageResult.error) throw aiUsageResult.error
    if (aiRequestsResult.error) throw aiRequestsResult.error
    if (usageSnapshotResult.error) throw usageSnapshotResult.error

    const aiUsage = aiUsageResult.data?.[0] ?? {
      words_generated: 0,
      prompt_tokens: 0,
      completion_tokens: 0,
      total_cost: 0,
    }

    const latestSnapshot = usageSnapshotResult.data?.[0] ?? null

    return NextResponse.json({
      plan: tier, // Keep 'plan' in response for backward compatibility
      limits: tierLimits ?? null,
      usage: {
        projects: projectsResult.count ?? 0,
        documents: documentsResult.count ?? 0,
        document_snapshots: snapshotsResult.count ?? 0,
        templates_created: templatesResult.count ?? 0,
        ai_words_used_month: aiUsage.words_generated ?? 0,
        ai_requests_month: aiRequestsResult.count ?? 0,
        ai_prompt_tokens: aiUsage.prompt_tokens ?? 0,
        ai_completion_tokens: aiUsage.completion_tokens ?? 0,
        ai_cost_month: aiUsage.total_cost ?? 0,
      },
      profile: {
        ai_words_used_this_month: profile?.ai_words_used_this_month ?? 0,
        ai_words_reset_date: profile?.ai_words_reset_date ?? null,
      },
      current_period: {
        start: periodStart.toISOString(),
        end: periodEnd.toISOString(),
      },
      latest_snapshot: latestSnapshot,
    })
  } catch (error) {
    console.error('Failed to load account usage:', error)
    return NextResponse.json({ error: 'Failed to load usage data' }, { status: 500 })
  }
}
