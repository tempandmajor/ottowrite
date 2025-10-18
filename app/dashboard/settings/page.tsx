import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SettingsForm } from './settings-form'

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select(
      'id, full_name, preferred_genres, writing_focus, writing_preferences, timezone, subscription_tier'
    )
    .eq('id', user.id)
    .single()

  if (error) {
    throw error
  }

  const plan = profile.subscription_tier ?? 'free'

  const now = new Date()
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
  const periodStartISO = periodStart.toISOString()
  const periodEndISO = periodEnd.toISOString()

  const [{ data: planLimits, error: planLimitError }, projectsResult, documentsResult, snapshotsResult, templatesResult, aiUsageResult, aiRequestsResult, usageSnapshotResult] = await Promise.all([
    supabase
      .from('subscription_plan_limits')
      .select('*')
      .eq('plan', plan)
      .maybeSingle(),
    supabase.from('projects').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('documents').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase
      .from('document_snapshots')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),
    supabase
      .from('document_templates')
      .select('id', { count: 'exact', head: true })
      .eq('created_by', user.id),
    supabase.rpc('sum_ai_usage', {
      p_user_id: user.id,
      p_period_start: periodStartISO,
      p_period_end: periodEndISO,
    }),
    supabase
      .from('ai_usage')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', periodStartISO)
      .lt('created_at', periodEndISO),
    supabase
      .from('user_plan_usage')
      .select(
        'projects_count, documents_count, document_snapshots_count, templates_created, ai_words_used, ai_requests_count, period_start, period_end, created_at'
      )
      .eq('user_id', user.id)
      .order('period_start', { ascending: false })
      .limit(1),
  ])

  if (planLimitError) {
    throw planLimitError
  }
  if (projectsResult.error) throw projectsResult.error
  if (documentsResult.error) throw documentsResult.error
  if (snapshotsResult.error) throw snapshotsResult.error
  if (templatesResult.error) throw templatesResult.error
  if (aiUsageResult.error) throw aiUsageResult.error
  if (aiRequestsResult.error) throw aiRequestsResult.error
  if (usageSnapshotResult.error) throw usageSnapshotResult.error

  const aiUsageRow = aiUsageResult.data?.[0] ?? {
    words_generated: 0,
    prompt_tokens: 0,
    completion_tokens: 0,
    total_cost: 0,
  }

  const usageSummary = {
    plan,
    limits: planLimits ?? null,
    usage: {
      projects: projectsResult.count ?? 0,
      documents: documentsResult.count ?? 0,
      document_snapshots: snapshotsResult.count ?? 0,
      templates_created: templatesResult.count ?? 0,
      ai_words_used_month: aiUsageRow.words_generated ?? 0,
      ai_requests_month: aiRequestsResult.count ?? 0,
      ai_prompt_tokens: aiUsageRow.prompt_tokens ?? 0,
      ai_completion_tokens: aiUsageRow.completion_tokens ?? 0,
      ai_cost_month: aiUsageRow.total_cost ?? 0,
    },
    currentPeriod: {
      start: periodStartISO,
      end: periodEndISO,
    },
    latestSnapshot: usageSnapshotResult.data?.[0] ?? null,
  }

  return (
    <SettingsForm
      profile={{
        id: profile.id,
        fullName: profile.full_name ?? '',
        preferredGenres: profile.preferred_genres ?? [],
        writingFocus: profile.writing_focus ?? 'prose',
        writingPreferences:
          (profile.writing_preferences as Record<string, string> | null) ?? {},
        timezone: profile.timezone ?? '',
      }}
      email={user.email ?? ''}
      usageSummary={usageSummary}
    />
  )
}
