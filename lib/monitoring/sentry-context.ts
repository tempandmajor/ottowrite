import * as Sentry from '@sentry/nextjs'
import { getRequestId } from '../request-id'

/**
 * Sentry Context Management with Request ID
 *
 * Provides utilities to add request IDs and other context to Sentry error reports.
 * This helps correlate user error reports with server logs.
 */

/**
 * Set request ID in Sentry context
 * Call this early in request handling to ensure all Sentry errors include the request ID
 *
 * @param requestId - The request ID to add to Sentry context
 */
export function setSentryRequestId(requestId: string): void {
  Sentry.setTag('request_id', requestId)
  Sentry.setContext('request', {
    id: requestId,
  })
}

/**
 * Capture an exception with request ID automatically included
 *
 * @param error - The error to capture
 * @param context - Additional context to include
 * @returns Sentry event ID
 */
export async function captureExceptionWithRequestId(
  error: Error,
  context?: Record<string, unknown>
): Promise<string> {
  // Get request ID from headers
  const requestId = await getRequestId()

  // Set request ID in Sentry
  setSentryRequestId(requestId)

  // Add additional context if provided
  if (context) {
    Sentry.setContext('additional', context)
  }

  // Capture the exception
  return Sentry.captureException(error)
}

/**
 * Capture a message with request ID automatically included
 *
 * @param message - The message to capture
 * @param level - The severity level
 * @param context - Additional context to include
 * @returns Sentry event ID
 */
export async function captureMessageWithRequestId(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, unknown>
): Promise<string> {
  // Get request ID from headers
  const requestId = await getRequestId()

  // Set request ID in Sentry
  setSentryRequestId(requestId)

  // Add additional context if provided
  if (context) {
    Sentry.setContext('additional', context)
  }

  // Capture the message
  return Sentry.captureMessage(message, level)
}

/**
 * Add user context to Sentry
 *
 * @param userId - The user ID
 * @param email - Optional user email
 * @param username - Optional username
 */
export function setSentryUser(userId: string, email?: string, username?: string): void {
  Sentry.setUser({
    id: userId,
    email,
    username,
  })
}

/**
 * Clear Sentry user context (e.g., on logout)
 */
export function clearSentryUser(): void {
  Sentry.setUser(null)
}

/**
 * Add custom tags to Sentry
 *
 * @param tags - Key-value pairs of tags to add
 */
export function addSentryTags(tags: Record<string, string>): void {
  Object.entries(tags).forEach(([key, value]) => {
    Sentry.setTag(key, value)
  })
}

/**
 * Add custom context to Sentry
 *
 * @param name - Context name
 * @param context - Context data
 */
export function addSentryContext(name: string, context: Record<string, unknown>): void {
  Sentry.setContext(name, context)
}

/**
 * Create a Sentry scope with request ID and execute a function
 *
 * @param requestId - The request ID
 * @param callback - Function to execute within the scope
 * @returns The result of the callback
 */
export async function withSentryScope<T>(
  requestId: string,
  callback: () => T | Promise<T>
): Promise<T> {
  return Sentry.withScope(async (scope) => {
    scope.setTag('request_id', requestId)
    scope.setContext('request', { id: requestId })
    return await callback()
  })
}
