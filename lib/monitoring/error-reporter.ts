import * as Sentry from '@sentry/nextjs'

export type ErrorSeverity = 'fatal' | 'error' | 'warning' | 'info' | 'debug'

export interface ErrorContext {
  userId?: string
  documentId?: string
  projectId?: string
  requestId?: string
  operation?: string
  metadata?: Record<string, unknown>
}

/**
 * Report an error to Sentry with additional context
 *
 * @param error - The error object or message
 * @param context - Additional context for the error
 * @param severity - Error severity level
 */
export function reportError(
  error: Error | string,
  context?: ErrorContext,
  severity: ErrorSeverity = 'error'
) {
  // Don't report in development unless explicitly enabled
  if (process.env.NODE_ENV === 'development' && !process.env.SENTRY_DEBUG) {
    console.error('[Error Reporter]', error, context)
    return
  }

  // Set user context if provided
  if (context?.userId) {
    Sentry.setUser({ id: context.userId })
  }

  // Set additional context
  if (context) {
    const { userId: _userId, ...otherContext } = context
    Sentry.setContext('error_context', otherContext)
  }

  // Set tags for better filtering
  if (context?.operation) {
    Sentry.setTag('operation', context.operation)
  }

  if (context?.documentId) {
    Sentry.setTag('document_id', context.documentId)
  }

  if (context?.projectId) {
    Sentry.setTag('project_id', context.projectId)
  }

  // Capture the error
  if (error instanceof Error) {
    Sentry.captureException(error, {
      level: severity,
    })
  } else {
    Sentry.captureMessage(error, {
      level: severity,
    })
  }
}

/**
 * Report an API error with request/response context
 */
export function reportAPIError(
  error: Error | string,
  request: {
    method?: string
    url?: string
    headers?: Record<string, string>
    body?: unknown
  },
  response?: {
    status?: number
    statusText?: string
  },
  context?: ErrorContext
) {
  // Add request/response context
  Sentry.setContext('http_request', {
    method: request.method,
    url: request.url,
    // Don't log sensitive headers
    headers: request.headers
      ? Object.fromEntries(
          Object.entries(request.headers).filter(
            ([key]) => !['authorization', 'cookie', 'x-supabase-auth'].includes(key.toLowerCase())
          )
        )
      : undefined,
  })

  if (response) {
    Sentry.setContext('http_response', {
      status: response.status,
      statusText: response.statusText,
    })
  }

  reportError(error, context, 'error')
}

/**
 * Report a background task failure
 */
export function reportBackgroundTaskError(
  taskName: string,
  error: Error | string,
  context?: ErrorContext
) {
  reportError(error, {
    ...context,
    operation: `background_task:${taskName}`,
  })
}

/**
 * Report an AI generation failure
 */
export function reportAIError(
  operation: string,
  error: Error | string,
  context?: ErrorContext & {
    model?: string
    promptLength?: number
    responseLength?: number
  }
) {
  // Add AI-specific tags
  if (context?.model) {
    Sentry.setTag('ai_model', context.model)
  }

  Sentry.setContext('ai_operation', {
    operation,
    model: context?.model,
    promptLength: context?.promptLength,
    responseLength: context?.responseLength,
  })

  reportError(error, {
    ...context,
    operation: `ai:${operation}`,
  })
}

/**
 * Report an autosave failure
 */
export function reportAutosaveError(
  error: Error | string,
  context?: ErrorContext & {
    failureType?: string
    retryCount?: number
    clientHash?: string
    serverHash?: string
  }
) {
  Sentry.setContext('autosave', {
    failureType: context?.failureType,
    retryCount: context?.retryCount,
    clientHash: context?.clientHash,
    serverHash: context?.serverHash,
  })

  reportError(error, {
    ...context,
    operation: 'autosave',
  })
}

/**
 * Report a database error
 */
export function reportDatabaseError(
  operation: string,
  error: Error | string,
  context?: ErrorContext & {
    table?: string
    query?: string
  }
) {
  Sentry.setContext('database', {
    operation,
    table: context?.table,
    // Don't log full queries with potential sensitive data
    queryType: context?.query?.split(' ')[0], // Just the operation (SELECT, INSERT, etc.)
  })

  reportError(error, {
    ...context,
    operation: `database:${operation}`,
  })
}

/**
 * Report a Stripe/payment error
 */
export function reportPaymentError(
  operation: string,
  error: Error | string,
  context?: ErrorContext & {
    customerId?: string
    subscriptionId?: string
    amount?: number
  }
) {
  Sentry.setContext('payment', {
    operation,
    customerId: context?.customerId,
    subscriptionId: context?.subscriptionId,
    amount: context?.amount,
  })

  reportError(error, {
    ...context,
    operation: `payment:${operation}`,
  })
}

/**
 * Add breadcrumb for debugging (won't create an event by itself)
 */
export function addBreadcrumb(
  message: string,
  category: string,
  level: ErrorSeverity = 'info',
  data?: Record<string, unknown>
) {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
  })
}

/**
 * Wrap an async function with error reporting
 */
export function withErrorReporting<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  operation: string,
  getContext?: (...args: Parameters<T>) => ErrorContext
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args)
    } catch (error) {
      const context = getContext ? getContext(...args) : undefined
      reportError(error instanceof Error ? error : new Error(String(error)), {
        ...context,
        operation,
      })
      throw error
    }
  }) as T
}
