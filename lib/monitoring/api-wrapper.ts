import { NextRequest, NextResponse } from 'next/server'
import { reportAPIError, reportError, addBreadcrumb } from './error-reporter'

export type APIHandler = (request: NextRequest, context?: any) => Promise<NextResponse>

export interface APIWrapperOptions {
  requireAuth?: boolean
  operation?: string
  rateLimit?: {
    max: number
    windowMs: number
  }
}

/**
 * Wraps an API route handler with error reporting and logging
 *
 * Usage:
 * ```ts
 * export const POST = withAPIErrorHandling(
 *   async (request) => {
 *     // Your handler logic
 *     return NextResponse.json({ success: true })
 *   },
 *   { operation: 'create_document' }
 * )
 * ```
 */
export function withAPIErrorHandling(
  handler: APIHandler,
  options: APIWrapperOptions = {}
): APIHandler {
  return async (request: NextRequest, context?: any) => {
    const startTime = Date.now()
    const requestId = crypto.randomUUID()
    const operation = options.operation || 'unknown'

    try {
      // Add breadcrumb for request start
      addBreadcrumb(`API Request: ${request.method} ${request.url}`, 'http', 'info', {
        requestId,
        operation,
        method: request.method,
        url: request.url,
      })

      // Execute the handler
      const response = await handler(request, context)

      // Add breadcrumb for successful response
      const duration = Date.now() - startTime
      addBreadcrumb(
        `API Response: ${response.status}`,
        'http',
        response.status >= 400 ? 'warning' : 'info',
        {
          requestId,
          operation,
          status: response.status,
          duration,
        }
      )

      // Log slow requests (> 3 seconds)
      if (duration > 3000) {
        reportError(
          `Slow API request: ${request.method} ${request.url} took ${duration}ms`,
          {
            requestId,
            operation,
            metadata: {
              duration,
              url: request.url,
              method: request.method,
            },
          },
          'warning'
        )
      }

      return response
    } catch (error) {
      const duration = Date.now() - startTime

      // Report the error with full context
      reportAPIError(
        error instanceof Error ? error : new Error(String(error)),
        {
          method: request.method,
          url: request.url,
        },
        undefined,
        {
          requestId,
          operation,
          metadata: {
            duration,
            params: context?.params,
          },
        }
      )

      // Return appropriate error response
      const statusCode = error instanceof APIError ? error.statusCode : 500
      const message =
        error instanceof Error
          ? error.message
          : 'An unexpected error occurred'

      return NextResponse.json(
        {
          error: message,
          requestId,
        },
        {
          status: statusCode,
        }
      )
    }
  }
}

/**
 * Custom API Error class for better error handling
 */
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message)
    this.name = 'APIError'
  }
}

/**
 * Helper to create common API errors
 */
export const APIErrors = {
  unauthorized: (message = 'Unauthorized') => new APIError(message, 401, 'UNAUTHORIZED'),
  forbidden: (message = 'Forbidden') => new APIError(message, 403, 'FORBIDDEN'),
  notFound: (message = 'Not found') => new APIError(message, 404, 'NOT_FOUND'),
  badRequest: (message = 'Bad request') => new APIError(message, 400, 'BAD_REQUEST'),
  tooManyRequests: (message = 'Too many requests') =>
    new APIError(message, 429, 'TOO_MANY_REQUESTS'),
  internal: (message = 'Internal server error') =>
    new APIError(message, 500, 'INTERNAL_ERROR'),
  serviceUnavailable: (message = 'Service unavailable') =>
    new APIError(message, 503, 'SERVICE_UNAVAILABLE'),
}
