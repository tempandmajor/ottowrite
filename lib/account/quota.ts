import { SupabaseClient } from '@supabase/supabase-js'

export function getCurrentBillingWindow() {
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
  return {
    start,
    end,
    startISO: start.toISOString(),
    endISO: end.toISOString(),
  }
}

export async function getPlanLimits(
  supabase: SupabaseClient,
  plan: string
) {
  const { data, error } = await supabase
    .from('subscription_plan_limits')
    .select('*')
    .eq('plan', plan)
    .maybeSingle()

  if (error) throw error
  return data ?? null
}

export async function checkAIRequestQuota(
  supabase: SupabaseClient,
  userId: string,
  plan: string,
  requested: number
) {
  const limits = await getPlanLimits(supabase, plan)
  const limit = limits?.ai_requests_per_month ?? null

  if (limit === null) {
    return {
      allowed: true,
      used: 0,
      limit,
    }
  }

  const { startISO, endISO } = getCurrentBillingWindow()
  const { count, error } = await supabase
    .from('ai_usage')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', startISO)
    .lt('created_at', endISO)

  if (error) throw error
  const used = count ?? 0
  const projected = used + requested

  if (projected > limit) {
    return {
      allowed: false,
      used,
      limit,
    }
  }

  return {
    allowed: true,
    used,
    limit,
  }
}
