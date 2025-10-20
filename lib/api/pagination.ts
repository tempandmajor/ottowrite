import { z } from 'zod'

/**
 * Cursor-based Pagination Utilities
 *
 * Provides consistent pagination across all list endpoints.
 * Uses cursor-based pagination for better performance and consistency.
 *
 * Why cursor-based over offset-based:
 * - Consistent results even when data changes
 * - Better performance on large datasets
 * - No skipped/duplicate items on page boundaries
 * - Scales well to millions of records
 */

export const DEFAULT_PAGE_LIMIT = 50
export const MAX_PAGE_LIMIT = 100

/**
 * Pagination query schema for validating query parameters
 */
export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_LIMIT).optional().default(DEFAULT_PAGE_LIMIT),
  cursor: z.string().uuid().optional(),
})

/**
 * Pagination metadata returned with paginated responses
 */
export interface PaginationMetadata {
  limit: number
  nextCursor?: string
  hasMore: boolean
  total?: number // Optional - only if explicitly counted
}

/**
 * Standard paginated response format
 */
export interface PaginatedResponse<T> {
  data: T[]
  pagination: PaginationMetadata
}

/**
 * Parse pagination parameters from request
 */
export function parsePaginationParams(params: {
  limit?: number | string
  cursor?: string
}): { limit: number; cursor?: string } {
  const validated = paginationQuerySchema.parse(params)
  return {
    limit: validated.limit,
    cursor: validated.cursor,
  }
}

/**
 * Build pagination metadata from query results
 *
 * @param items - The items returned from the query
 * @param limit - The requested limit
 * @param cursorField - The field to use for cursor (default: 'id')
 * @returns Pagination metadata
 */
export function buildPaginationMetadata<T extends Record<string, any>>(
  items: T[],
  limit: number,
  cursorField: keyof T = 'id'
): PaginationMetadata {
  const hasMore = items.length > limit

  // If we have more items than requested, remove the extra one
  // (we fetch limit + 1 to determine if there are more)
  const dataItems = hasMore ? items.slice(0, limit) : items

  const nextCursor = hasMore && dataItems.length > 0
    ? dataItems[dataItems.length - 1][cursorField]
    : undefined

  return {
    limit,
    nextCursor,
    hasMore,
  }
}

/**
 * Create a paginated response
 *
 * Usage:
 * ```typescript
 * const { data, pagination } = createPaginatedResponse(
 *   items,
 *   params.limit
 * )
 * return successResponse({ items: data, pagination })
 * ```
 */
export function createPaginatedResponse<T extends Record<string, any>>(
  items: T[],
  limit: number,
  cursorField: keyof T = 'id'
): PaginatedResponse<T> {
  const pagination = buildPaginationMetadata(items, limit, cursorField)
  const data = pagination.hasMore ? items.slice(0, limit) : items

  return {
    data,
    pagination,
  }
}

/**
 * Apply cursor-based pagination to a Supabase query
 *
 * NOTE: This assumes your query is already ordered by the cursor field.
 * You must add `.order(cursorField)` before calling this function.
 *
 * Usage:
 * ```typescript
 * let query = supabase
 *   .from('characters')
 *   .select('*')
 *   .eq('project_id', projectId)
 *   .order('created_at', { ascending: false }) // Must order first!
 *
 * query = applyCursorPagination(query, cursor, limit, 'created_at')
 * ```
 */
export function applyCursorPagination(
  query: any, // Supabase query builder
  cursor: string | undefined,
  limit: number,
  cursorField: string = 'id'
): any {
  // Fetch one extra item to determine if there are more results
  query = query.limit(limit + 1)

  // If cursor is provided, filter results after the cursor
  if (cursor) {
    query = query.gt(cursorField, cursor)
  }

  return query
}

/**
 * Validate and normalize cursor parameter
 * Prevents injection attacks and ensures cursor is valid UUID
 */
export function validateCursor(cursor: string | null): string | undefined {
  if (!cursor) return undefined

  // Basic UUID format validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  if (!uuidRegex.test(cursor)) {
    throw new Error('Invalid cursor format')
  }

  return cursor
}
