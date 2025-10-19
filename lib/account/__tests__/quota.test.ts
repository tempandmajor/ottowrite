import { describe, expect, it, vi } from 'vitest';

import { checkAIRequestQuota } from '@/lib/account/quota';
import { createQueryBuilder } from '@/tests/utils/supabase-mock';

function createSupabaseStub({
  planLimits,
  usageCount,
}: {
  planLimits: { data: any; error: any } | null;
  usageCount?: number;
}) {
  return {
    from: vi.fn((table: string) => {
      if (table === 'subscription_plan_limits') {
        const response = planLimits ?? { data: null, error: null };
        return createQueryBuilder({
          maybeSingle: response,
        });
      }

      if (table === 'ai_usage') {
        return createQueryBuilder({
          value: {
            data: null,
            count: usageCount ?? 0,
            error: null,
          },
        });
      }

      throw new Error(`Unexpected table requested in test stub: ${table}`);
    }),
  };
}

describe('checkAIRequestQuota', () => {
  it('allows requests when usage is below the plan limit', async () => {
    const supabase = createSupabaseStub({
      planLimits: {
        data: { ai_requests_per_month: 10 },
        error: null,
      },
      usageCount: 4,
    });

    const result = await checkAIRequestQuota(
      supabase as any,
      'user-1',
      'pro',
      1,
    );

    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(10);
    expect(result.used).toBe(4);
  });

  it('blocks requests when the projected usage exceeds the monthly cap', async () => {
    const supabase = createSupabaseStub({
      planLimits: {
        data: { ai_requests_per_month: 5 },
        error: null,
      },
      usageCount: 5,
    });

    const result = await checkAIRequestQuota(
      supabase as any,
      'user-2',
      'free',
      1,
    );

    expect(result.allowed).toBe(false);
    expect(result.limit).toBe(5);
    expect(result.used).toBe(5);
  });

  it('treats plans without explicit limits as unlimited', async () => {
    const supabase = createSupabaseStub({
      planLimits: { data: null, error: null },
    });

    const result = await checkAIRequestQuota(
      supabase as any,
      'user-3',
      'enterprise',
      42,
    );

    expect(result.allowed).toBe(true);
    expect(result.limit).toBeNull();
    expect(result.used).toBe(0);
  });
});
