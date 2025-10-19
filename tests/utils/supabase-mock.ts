import { vi } from 'vitest';

type QueryBuilderResponse<T> = {
  value?: T;
  maybeSingle?: T;
  single?: T;
  limit?: T;
};

/**
 * Minimal Supabase query builder mock that supports chaining plus awaiting.
 * Each chained call returns the same builder so methods can be composed, and
 * awaiting the builder resolves with the configured response.
 */
export function createQueryBuilder<T>(config: QueryBuilderResponse<T>): any {
  const resolved =
    config.value ?? config.maybeSingle ?? config.single ?? config.limit ?? ({} as T);

  const builder: any = {};

  builder.select = vi.fn(() => builder);
  builder.eq = vi.fn(() => builder);
  builder.gte = vi.fn(() => builder);
  builder.lt = vi.fn(() => builder);
  builder.in = vi.fn(() => builder);
  builder.neq = vi.fn(() => builder);
  builder.order = vi.fn(() => builder);
  builder.limit = vi.fn(() =>
    Promise.resolve(config.limit ?? resolved),
  );
  builder.maybeSingle = vi.fn(() =>
    Promise.resolve(config.maybeSingle ?? resolved),
  );
  builder.single = vi.fn(() =>
    Promise.resolve(config.single ?? resolved),
  );
  builder.then = (onFulfilled: any, onRejected: any) =>
    Promise.resolve(resolved).then(onFulfilled, onRejected);
  builder.catch = (onRejected: any) =>
    Promise.resolve(resolved).catch(onRejected);
  builder.finally = (onFinally: any) =>
    Promise.resolve(resolved).finally(onFinally);

  return builder;
}
