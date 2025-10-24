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
 *
 * Note: Cursor validation is relaxed to support different cursor types (UUID, timestamp, string).
 * Specific validation happens in validateCursorByType() based on endpoint requirements.
 */
export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_LIMIT).optional().default(DEFAULT_PAGE_LIMIT),
  cursor: z.string().min(1).optional(), // ✅ FIX: Accept any non-empty string, validate later
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
 * Cursor type options for different pagination scenarios
 */
export type CursorType = 'uuid' | 'timestamp' | 'string'

/**
 * Validate cursor by type
 *
 * Supports different cursor formats based on what the endpoint uses:
 * - 'uuid': For ID-based pagination (e.g., primary keys)
 * - 'timestamp': For time-based pagination (e.g., created_at, updated_at)
 * - 'string': For text-based pagination (e.g., names, slugs)
 *
 * @param cursor - The cursor value to validate
 * @param type - The expected cursor type
 * @returns The validated cursor, or undefined if null/empty
 * @throws Error if cursor format is invalid for the specified type
 */
export function validateCursorByType(
  cursor: string | null | undefined,
  type: CursorType = 'uuid'
): string | undefined {
  if (!cursor) return undefined

  switch (type) {
    case 'uuid': {
      // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(cursor)) {
        throw new Error('Invalid UUID cursor format. Expected format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx')
      }
      return cursor
    }

    case 'timestamp': {
      // ISO 8601 timestamp format (supports various valid formats)
      const date = new Date(cursor)
      if (isNaN(date.getTime())) {
        throw new Error('Invalid timestamp cursor format. Expected ISO 8601 format (e.g., 2025-01-24T10:30:00.000Z)')
      }
      // Return normalized ISO string for consistent comparisons
      return date.toISOString()
    }

    case 'string': {
      // String cursors: allow any non-empty string, sanitize for SQL safety
      const sanitized = cursor.trim()
      if (sanitized.length === 0) {
        throw new Error('Invalid string cursor: cannot be empty or whitespace-only')
      }
      // Basic SQL injection prevention (Supabase uses parameterized queries, but extra safety)
      if (sanitized.includes(';') || sanitized.includes('--') || sanitized.includes('/*')) {
        throw new Error('Invalid string cursor: contains potentially unsafe characters')
      }
      return sanitized
    }

    default: {
      throw new Error(`Unsupported cursor type: ${type}`)
    }
  }
}

/**
 * @deprecated Use validateCursorByType() instead
 * Validate and normalize cursor parameter
 * Prevents injection attacks and ensures cursor is valid UUID
 *
 * This function is deprecated in favor of validateCursorByType() which supports
 * multiple cursor types (UUID, timestamp, string).
 */
export function validateCursor(cursor: string | null): string | undefined {
  return validateCursorByType(cursor, 'uuid')
}
