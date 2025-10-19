import { describe, expect, it, vi } from 'vitest';

import { getUsageSummary } from '@/lib/account/usage';
import { createQueryBuilder } from '@/tests/utils/supabase-mock';

const usageHistory = [
  {
    projects_count: 3,
    documents_count: 12,
    document_snapshots_count: 6,
    templates_created: 4,
    ai_words_used: 7200,
    ai_requests_count: 18,
    collaborators_count: 2,
    period_start: '2025-01-01T00:00:00.000Z',
    period_end: '2025-02-01T00:00:00.000Z',
    created_at: '2025-01-15T12:00:00.000Z',
  },
  {
    projects_count: 2,
    documents_count: 9,
    document_snapshots_count: 4,
    templates_created: 3,
    ai_words_used: 5400,
    ai_requests_count: 12,
    collaborators_count: 1,
    period_start: '2024-12-01T00:00:00.000Z',
    period_end: '2025-01-01T00:00:00.000Z',
    created_at: '2024-12-15T12:00:00.000Z',
  },
];

function createSupabaseUsageStub({ collaboratorCount }: { collaboratorCount: number }) {
  const tableResponses: Record<string, any> = {
    user_profiles: createQueryBuilder({
      single: {
        data: {
          subscription_tier: 'pro',
          ai_words_used_this_month: 7200,
          ai_words_reset_date: '2025-01-01T00:00:00.000Z',
        },
        error: null,
      },
    }),
    subscription_plan_limits: createQueryBuilder({
      maybeSingle: {
        data: {
          plan: 'pro',
          ai_words_per_month: 50000,
          ai_requests_per_month: 25,
          collaborator_slots: 8,
        },
        error: null,
      },
    }),
    projects: createQueryBuilder({
      value: { data: null, count: 3, error: null },
    }),
    documents: createQueryBuilder({
      value: { data: null, count: 12, error: null },
    }),
    document_snapshots: createQueryBuilder({
      value: { data: null, count: 6, error: null },
    }),
    document_templates: createQueryBuilder({
      value: { data: null, count: 4, error: null },
    }),
    ai_usage: createQueryBuilder({
      value: { data: null, count: 18, error: null },
    }),
    user_plan_usage: createQueryBuilder({
      value: { data: usageHistory, error: null },
      limit: { data: usageHistory, error: null },
    }),
    project_members: createQueryBuilder({
      value: { data: null, count: collaboratorCount, error: null },
    }),
  };

  return {
    from: vi.fn((table: string) => {
      const builder = tableResponses[table];
      if (!builder) {
        throw new Error(`Unexpected table requested in test stub: ${table}`);
      }
      return builder;
    }),
    rpc: vi.fn((fn: string) => {
      if (fn !== 'sum_ai_usage') {
        throw new Error(`Unexpected RPC call: ${fn}`);
      }

      return Promise.resolve({
        data: [
          {
            words_generated: 7200,
            prompt_tokens: 1200,
            completion_tokens: 600,
            total_cost: 18.5,
          },
        ],
        error: null,
      });
    }),
  };
}

describe('getUsageSummary', () => {
  it('returns collaborator totals and history alongside usage limits', async () => {
    const supabase = createSupabaseUsageStub({ collaboratorCount: 5 });

    const summary = await getUsageSummary(supabase as any, 'user-123');

    expect(summary.plan).toBe('pro');
    expect(summary.limits?.collaborator_slots).toBe(8);
    expect(summary.usage.projects).toBe(3);
    expect(summary.usage.collaborators).toBe(5);
    expect(summary.latestSnapshot?.collaborators_count).toBe(2);
    expect(summary.history[0]?.collaboratorsCount).toBe(2);
  });
});
