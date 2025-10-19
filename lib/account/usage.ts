import { SupabaseClient } from '@supabase/supabase-js'

export type UsageSummary = {
  plan: string
  limits: {
    max_projects: number | null
    max_documents: number | null
    max_document_snapshots: number | null
    max_templates: number | null
    ai_words_per_month: number | null
    ai_requests_per_month: number | null
    collaborator_slots: number | null
  } | null
  usage: {
    projects: number
    documents: number
    document_snapshots: number
    templates_created: number
    ai_words_used_month: number
    ai_requests_month: number
    ai_prompt_tokens: number
    ai_completion_tokens: number
    ai_cost_month: number
    collaborators: number
  }
  currentPeriod: { start: string; end: string }
  latestSnapshot: {
    projects_count: number
    documents_count: number
    document_snapshots_count: number
    templates_created: number
    ai_words_used: number
    ai_requests_count: number
    collaborators_count: number
    period_start: string
    period_end: string
    created_at: string
  } | null
  history: Array<{
    periodStart: string
    periodEnd: string
    aiWordsUsed: number
    aiRequests: number
    projectsCount: number
    documentsCount: number
    collaboratorsCount: number
    createdAt: string
  }>
}

export async function getUsageSummary(
  supabase: SupabaseClient,
  userId: string
): Promise<UsageSummary> {
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('subscription_tier, ai_words_used_this_month, ai_words_reset_date')
    .eq('id', userId)
    .single()

  if (profileError) {
    throw profileError
  }

  const plan = profile?.subscription_tier ?? 'free'
  const now = new Date()
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
  const periodStartISO = periodStart.toISOString()
  const periodEndISO = periodEnd.toISOString()

  const [
    planLimitsResult,
    projectsResult,
    documentsResult,
    snapshotsResult,
    templatesResult,
    aiUsageResult,
    aiRequestsResult,
    usageHistoryResult,
    collaboratorsResult,
  ] = await Promise.all([
    supabase
      .from('subscription_plan_limits')
      .select('*')
      .eq('plan', plan)
      .maybeSingle(),
    supabase.from('projects').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('documents').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase
      .from('document_snapshots')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase
      .from('document_templates')
      .select('id', { count: 'exact', head: true })
      .eq('created_by', userId),
    supabase.rpc('sum_ai_usage', {
      p_user_id: userId,
      p_period_start: periodStartISO,
      p_period_end: periodEndISO,
    }),
    supabase
      .from('ai_usage')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', periodStartISO)
      .lt('created_at', periodEndISO),
    supabase
      .from('user_plan_usage')
      .select(
        'projects_count, documents_count, document_snapshots_count, templates_created, ai_words_used, ai_requests_count, collaborators_count, period_start, period_end, created_at'
      )
      .eq('user_id', userId)
      .order('period_start', { ascending: false })
      .limit(12),
    supabase
      .from('project_members')
      .select('id, projects!inner(user_id)', { count: 'exact', head: true })
      .eq('projects.user_id', userId)
      .in('status', ['invited', 'accepted'])
      .neq('role', 'owner'),
  ])

  if (planLimitsResult.error) throw planLimitsResult.error
  if (projectsResult.error) throw projectsResult.error
  if (documentsResult.error) throw documentsResult.error
  if (snapshotsResult.error) throw snapshotsResult.error
  if (templatesResult.error) throw templatesResult.error
  if (aiUsageResult.error) throw aiUsageResult.error
  if (aiRequestsResult.error) throw aiRequestsResult.error
  if (usageHistoryResult.error) throw usageHistoryResult.error
  if (collaboratorsResult.error) throw collaboratorsResult.error

  const aiUsage = aiUsageResult.data?.[0] ?? {
    words_generated: 0,
    prompt_tokens: 0,
    completion_tokens: 0,
    total_cost: 0,
  }

  const history = (usageHistoryResult.data ?? []).map((row) => ({
    periodStart: row.period_start,
    periodEnd: row.period_end,
    aiWordsUsed: row.ai_words_used ?? 0,
    aiRequests: row.ai_requests_count ?? 0,
    projectsCount: row.projects_count ?? 0,
    documentsCount: row.documents_count ?? 0,
    collaboratorsCount: row.collaborators_count ?? 0,
    createdAt: row.created_at,
  }))

  const collaboratorsActive = collaboratorsResult.count ?? 0

  return {
    plan,
    limits: planLimitsResult.data ?? null,
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
      collaborators: collaboratorsActive,
    },
    currentPeriod: {
      start: periodStartISO,
      end: periodEndISO,
    },
    latestSnapshot: usageHistoryResult.data?.[0]
      ? {
          projects_count: usageHistoryResult.data[0].projects_count ?? 0,
          documents_count: usageHistoryResult.data[0].documents_count ?? 0,
          document_snapshots_count: usageHistoryResult.data[0].document_snapshots_count ?? 0,
          templates_created: usageHistoryResult.data[0].templates_created ?? 0,
          ai_words_used: usageHistoryResult.data[0].ai_words_used ?? 0,
          ai_requests_count: usageHistoryResult.data[0].ai_requests_count ?? 0,
          collaborators_count: usageHistoryResult.data[0].collaborators_count ?? 0,
          period_start: usageHistoryResult.data[0].period_start,
          period_end: usageHistoryResult.data[0].period_end,
          created_at: usageHistoryResult.data[0].created_at,
        }
      : null,
    history,
  }
}
