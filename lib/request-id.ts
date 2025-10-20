import { NextRequest } from 'next/server'
import { headers } from 'next/headers'

/**
 * Request ID Management
 *
 * Provides utilities for generating and accessing request IDs for request tracing.
 * Request IDs help correlate user error reports with server logs.
 */

export const REQUEST_ID_HEADER = 'x-request-id'

/**
 * Generate a unique request ID
 * Uses crypto.randomUUID() for cryptographically strong random IDs
 */
export function generateRequestId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }

  // Fallback for environments without crypto.randomUUID
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
}

/**
 * Get or generate request ID from Next.js request
 * @param request - Next.js request object
 * @returns Request ID (existing or newly generated)
 */
export function getOrGenerateRequestId(request: NextRequest): string {
  const existingId = request.headers.get(REQUEST_ID_HEADER)
  return existingId || generateRequestId()
}

/**
 * Get request ID from Next.js headers (for use in Server Components/Route Handlers)
 * @returns Request ID if available, or generates a new one
 */
export async function getRequestId(): Promise<string> {
  try {
    const headersList = await headers()
    const requestId = headersList.get(REQUEST_ID_HEADER)
    return requestId || generateRequestId()
  } catch {
    // If headers() fails (e.g., in edge cases), generate a new ID
    return generateRequestId()
  }
}

/**
 * Get request ID synchronously (use in API routes where headers are accessible)
 * @returns Request ID if available, or generates a new one
 */
export function getRequestIdSync(): string {
  try {
    // This will work in API routes with the async context
    const headersList = headers() as unknown as Headers
    const requestId = headersList.get(REQUEST_ID_HEADER)
    return requestId || generateRequestId()
  } catch {
    // If headers() fails, generate a new ID
    return generateRequestId()
  }
}
