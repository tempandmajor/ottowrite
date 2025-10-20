import { NextResponse } from 'next/server'
import { getRequestId } from '../request-id'
import { captureExceptionWithRequestId } from '../monitoring/sentry-context'
import { logger } from '../monitoring/structured-logger'

/**
 * Standard API Error Response Helper
 *
 * Provides consistent error responses across all API routes with request ID tracking.
 * This is a preview of TICKET-004 implementation.
 */

export interface ErrorResponseOptions {
  /**
   * Error code for programmatic error handling
   * @example 'VALIDATION_ERROR', 'NOT_FOUND', 'UNAUTHORIZED'
   */
  code?: string

  /**
   * HTTP status code
   * @default 500
   */
  status?: number

  /**
   * Additional error details (only included in development)
   */
  details?: unknown

  /**
   * User ID for logging
   */
  userId?: string

  /**
   * Whether to log this error
   * @default true for 500+ errors, false for 4xx
   */
  logError?: boolean

  /**
   * Whether to send this error to Sentry
   * @default true for 500+ errors, false for 4xx
   */
  captureInSentry?: boolean
}

/**
 * Create a standard error response with request ID
 *
 * @param message - User-friendly error message
 * @param options - Error response options
 * @returns Next.js response with error data
 *
 * @example
 * ```typescript
 * import { errorResponse } from '@/lib/api/error-response'
 *
 * // Simple error
 * return errorResponse('Not found', { status: 404, code: 'NOT_FOUND' })
 *
 * // With error object
 * try {
 *   // ... operation
 * } catch (error) {
 *   return errorResponse('Failed to process request', {
 *     status: 500,
 *     details: error,
 *     userId: user.id
 *   })
 * }
 * ```
 */
export async function errorResponse(
  message: string,
  options: ErrorResponseOptions = {}
): Promise<NextResponse> {
  const {
    code,
    status = 500,
    details,
    userId,
    logError = status >= 500,
    captureInSentry = status >= 500,
  } = options

  // Get request ID
  const requestId = await getRequestId()

  // Log error if requested
  if (logError) {
    const error = details instanceof Error ? details : undefined
    logger.error(message, {
      requestId,
      userId,
      code,
      statusCode: status,
    }, error)
  }

  // Capture in Sentry if requested
  if (captureInSentry && details instanceof Error) {
    await captureExceptionWithRequestId(details, {
      message,
      code,
      statusCode: status,
      userId,
    })
  }

  // Build response
  const isDevelopment = process.env.NODE_ENV === 'development'

  const responseBody: Record<string, unknown> = {
    error: {
      message,
      requestId,
    },
  }

  // Add code if provided
  if (code) {
    responseBody.error = {
      ...(responseBody.error as object),
      code,
    }
  }

  // Add details in development only
  if (isDevelopment && details) {
    responseBody.error = {
      ...(responseBody.error as object),
      details: details instanceof Error
        ? {
            name: details.name,
            message: details.message,
            stack: details.stack?.split('\n').slice(0, 5), // First 5 lines
          }
        : details,
    }
  }

  return NextResponse.json(responseBody, {
    status,
    headers: {
      'x-request-id': requestId,
    },
  })
}

/**
 * Quick error response helpers for common status codes
 */
export const errorResponses = {
  /**
   * 400 Bad Request
   */
  badRequest: async (message = 'Bad request', options?: Omit<ErrorResponseOptions, 'status'>) =>
    errorResponse(message, { ...options, status: 400, code: options?.code || 'BAD_REQUEST' }),

  /**
   * 401 Unauthorized
   */
  unauthorized: async (message = 'Unauthorized', options?: Omit<ErrorResponseOptions, 'status'>) =>
    errorResponse(message, { ...options, status: 401, code: options?.code || 'UNAUTHORIZED' }),

  /**
   * 403 Forbidden
   */
  forbidden: async (message = 'Forbidden', options?: Omit<ErrorResponseOptions, 'status'>) =>
    errorResponse(message, { ...options, status: 403, code: options?.code || 'FORBIDDEN' }),

  /**
   * 404 Not Found
   */
  notFound: async (message = 'Not found', options?: Omit<ErrorResponseOptions, 'status'>) =>
    errorResponse(message, { ...options, status: 404, code: options?.code || 'NOT_FOUND' }),

  /**
   * 409 Conflict
   */
  conflict: async (message = 'Conflict', options?: Omit<ErrorResponseOptions, 'status'>) =>
    errorResponse(message, { ...options, status: 409, code: options?.code || 'CONFLICT' }),

  /**
   * 422 Unprocessable Entity (Validation Error)
   */
  validationError: async (message = 'Validation error', options?: Omit<ErrorResponseOptions, 'status'>) =>
    errorResponse(message, { ...options, status: 422, code: options?.code || 'VALIDATION_ERROR' }),

  /**
   * 429 Too Many Requests
   */
  tooManyRequests: async (
    message = 'Too many requests',
    retryAfter?: number,
    options?: Omit<ErrorResponseOptions, 'status'>
  ) => {
    const response = await errorResponse(message, {
      ...options,
      status: 429,
      code: options?.code || 'RATE_LIMIT_EXCEEDED',
    })

    if (retryAfter) {
      response.headers.set('Retry-After', String(retryAfter))
    }

    return response
  },

  /**
   * 500 Internal Server Error
   */
  internalError: async (
    message = 'Internal server error',
    options?: Omit<ErrorResponseOptions, 'status'>
  ) =>
    errorResponse(message, {
      ...options,
      status: 500,
      code: options?.code || 'INTERNAL_ERROR',
      logError: true,
      captureInSentry: true,
    }),

  /**
   * 503 Service Unavailable
   */
  serviceUnavailable: async (
    message = 'Service temporarily unavailable',
    options?: Omit<ErrorResponseOptions, 'status'>
  ) =>
    errorResponse(message, {
      ...options,
      status: 503,
      code: options?.code || 'SERVICE_UNAVAILABLE',
    }),
}

/**
 * Create a success response with request ID
 *
 * @param data - Response data
 * @param status - HTTP status code (default: 200)
 * @returns Next.js response with data
 */
export async function successResponse<T = unknown>(
  data: T,
  status = 200
): Promise<NextResponse<T>> {
  const requestId = await getRequestId()

  return NextResponse.json(data, {
    status,
    headers: {
      'x-request-id': requestId,
    },
  })
}
