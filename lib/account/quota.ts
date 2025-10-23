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

export async function checkDocumentQuota(
  supabase: SupabaseClient,
  userId: string,
  plan: string
) {
  const limits = await getPlanLimits(supabase, plan)
  const limit = limits?.max_documents ?? null

  // -1 means unlimited
  if (limit === null || limit === -1) {
    return {
      allowed: true,
      used: 0,
      limit,
    }
  }

  // Count existing documents for this user
  const { count, error } = await supabase
    .from('documents')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (error) throw error
  const used = count ?? 0

  if (used >= limit) {
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

export async function checkProjectQuota(
  supabase: SupabaseClient,
  userId: string,
  plan: string
) {
  const limits = await getPlanLimits(supabase, plan)
  const limit = limits?.max_projects ?? null

  // -1 means unlimited
  if (limit === null || limit === -1) {
    return {
      allowed: true,
      used: 0,
      limit,
    }
  }

  // Count existing projects for this user
  const { count, error } = await supabase
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (error) throw error
  const used = count ?? 0

  if (used >= limit) {
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

export async function checkTeamSeatQuota(
  supabase: SupabaseClient,
  projectOwnerId: string,
  plan: string
) {
  const limits = await getPlanLimits(supabase, plan)
  const limit = limits?.collaborator_slots ?? null

  // null or 0 means no collaboration allowed
  if (limit === null || limit === 0) {
    return {
      allowed: false,
      used: 0,
      limit: limit ?? 0,
    }
  }

  // -1 means unlimited (though we don't currently use this for team seats)
  if (limit === -1) {
    return {
      allowed: true,
      used: 0,
      limit,
    }
  }

  // Count existing team members across all projects owned by this user
  // Only count invited and accepted members (not declined)
  // Exclude owners (they don't count as team members)
  // We need to join with projects to filter by owner
  const { count, error } = await supabase
    .from('project_members')
    .select('*, projects!inner(user_id)', { count: 'exact', head: true })
    .eq('projects.user_id', projectOwnerId)
    .in('status', ['invited', 'accepted'])
    .neq('role', 'owner')

  if (error) throw error
  const used = count ?? 0

  if (used >= limit) {
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

export async function checkAPIRateLimit(
  supabase: SupabaseClient,
  userId: string,
  plan: string
) {
  // Get API requests per day limit from config
  // Professional: 50, Studio: 1000, others: 0 (no API access)
  const apiLimits: Record<string, number> = {
    free: 0,
    hobbyist: 0,
    professional: 50,
    studio: 1000,
  }

  const limit = apiLimits[plan] ?? 0

  // No API access for this plan
  if (limit === 0) {
    return {
      allowed: false,
      used: 0,
      limit: 0,
      resetAt: null,
    }
  }

  // Get today's API request count
  const { data, error } = await supabase.rpc('get_api_request_count_today', {
    p_user_id: userId,
  })

  if (error) throw error
  const used = data ?? 0

  // Calculate reset time (next day at 00:00 UTC)
  const now = new Date()
  const resetAt = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0, 0, 0, 0
  ))

  if (used >= limit) {
    return {
      allowed: false,
      used,
      limit,
      resetAt: resetAt.toISOString(),
    }
  }

  return {
    allowed: true,
    used,
    limit,
    remaining: limit - used,
    resetAt: resetAt.toISOString(),
  }
}
