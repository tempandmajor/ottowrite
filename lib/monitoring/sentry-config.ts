/**
 * Sentry Error Alerting Configuration
 *
 * Comprehensive error monitoring with intelligent alerting rules,
 * error grouping, and fingerprinting for better observability.
 *
 * This configuration enhances the base Sentry setup with:
 * - Smart error grouping and fingerprinting
 * - Alert rule definitions
 * - Severity classification
 * - Error filtering to reduce noise
 */

import * as Sentry from '@sentry/nextjs'

/**
 * Error classifications for alert routing
 */
export enum ErrorPriority {
  CRITICAL = 'critical', // Immediate attention required
  HIGH = 'high', // Requires attention within hours
  MEDIUM = 'medium', // Requires attention within days
  LOW = 'low', // Monitor only
  NOISE = 'noise', // Ignore/filter out
}

/**
 * Error categories for grouping and routing
 */
export enum ErrorCategory {
  // Infrastructure
  DATABASE = 'database',
  API = 'api',
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',

  // Features
  AI = 'ai',
  AUTOSAVE = 'autosave',
  PAYMENT = 'payment',
  EXPORT = 'export',

  // Client-side
  UI = 'ui',
  BROWSER = 'browser',

  // System
  PERFORMANCE = 'performance',
  SECURITY = 'security',
  UNKNOWN = 'unknown',
}

/**
 * Alert rules configuration
 * Used to determine which errors should trigger alerts and at what priority
 */
export const ALERT_RULES: Array<{
  name: string
  category: ErrorCategory
  priority: ErrorPriority
  matcher: (event: Sentry.ErrorEvent) => boolean
  fingerprint?: string[]
  description: string
}> = [
  // CRITICAL - Database connectivity issues
  {
    name: 'Database Connection Failure',
    category: ErrorCategory.DATABASE,
    priority: ErrorPriority.CRITICAL,
    matcher: (event) => {
      const error = event.exception?.values?.[0]?.value || ''
      return (
        error.includes('ECONNREFUSED') ||
        error.includes('connection refused') ||
        error.includes('database is down') ||
        error.includes('PostgresError: 53300') // Too many connections
      )
    },
    fingerprint: ['database', 'connection', 'failure'],
    description: 'Database connection failures - app likely down',
  },

  // CRITICAL - Payment processing failures
  {
    name: 'Payment Processing Failure',
    category: ErrorCategory.PAYMENT,
    priority: ErrorPriority.CRITICAL,
    matcher: (event) => {
      const error = event.exception?.values?.[0]?.value || ''
      const operation = event.tags?.operation
      return (
        (typeof operation === 'string' && operation.includes('payment')) ||
        error.includes('stripe') ||
        error.includes('payment failed')
      )
    },
    fingerprint: ['payment', 'processing', 'failure'],
    description: 'Payment failures - potential revenue loss',
  },

  // CRITICAL - Authentication system down
  {
    name: 'Authentication System Failure',
    category: ErrorCategory.AUTHENTICATION,
    priority: ErrorPriority.CRITICAL,
    matcher: (event) => {
      const error = event.exception?.values?.[0]?.value || ''
      const operation = event.tags?.operation
      return (
        error.includes('AuthApiError') ||
        error.includes('Supabase auth') ||
        (typeof operation === 'string' && operation.includes('auth') && event.contexts?.http_response?.status === 500)
      )
    },
    fingerprint: ['auth', 'system', 'failure'],
    description: 'Auth system failures - users cannot log in',
  },

  // HIGH - AI generation failures (batch)
  {
    name: 'AI Generation High Failure Rate',
    category: ErrorCategory.AI,
    priority: ErrorPriority.HIGH,
    matcher: (event) => {
      const operation = event.tags?.operation
      const aiModel = event.tags?.ai_model
      return (typeof operation === 'string' && operation.includes('ai:')) || aiModel !== undefined
    },
    fingerprint: ['ai', 'generation', 'failure'],
    description: 'AI generation failures - core feature degraded',
  },

  // HIGH - Autosave failures (data loss risk)
  {
    name: 'Autosave Failure',
    category: ErrorCategory.AUTOSAVE,
    priority: ErrorPriority.HIGH,
    matcher: (event) => {
      const operation = event.tags?.operation
      return operation === 'autosave' || event.contexts?.autosave !== undefined
    },
    fingerprint: ['autosave', 'failure'],
    description: 'Autosave failures - potential data loss',
  },

  // HIGH - API rate limiting exceeded (potential attack)
  {
    name: 'Rate Limit Abuse',
    category: ErrorCategory.SECURITY,
    priority: ErrorPriority.HIGH,
    matcher: (event) => {
      const error = event.exception?.values?.[0]?.value || ''
      const response = event.contexts?.http_response
      return response?.status === 429 && error.includes('rate limit')
    },
    fingerprint: ['security', 'rate_limit', 'abuse'],
    description: 'Rate limit exceeded - potential abuse',
  },

  // MEDIUM - Database query errors
  {
    name: 'Database Query Error',
    category: ErrorCategory.DATABASE,
    priority: ErrorPriority.MEDIUM,
    matcher: (event) => {
      const error = event.exception?.values?.[0]?.value || ''
      const operation = event.tags?.operation
      return (
        error.includes('PostgresError') ||
        (typeof operation === 'string' && operation.includes('database:')) ||
        event.contexts?.database !== undefined
      )
    },
    fingerprint: ['database', 'query', 'error'],
    description: 'Database query failures',
  },

  // MEDIUM - External API failures
  {
    name: 'External API Failure',
    category: ErrorCategory.API,
    priority: ErrorPriority.MEDIUM,
    matcher: (event) => {
      const error = event.exception?.values?.[0]?.value || ''
      return (
        error.includes('fetch failed') ||
        error.includes('API error') ||
        !!(event.contexts?.http_request && event.contexts.http_response?.status === 500)
      )
    },
    fingerprint: ['api', 'external', 'failure'],
    description: 'External API integration failures',
  },

  // MEDIUM - Export failures
  {
    name: 'Export Failure',
    category: ErrorCategory.EXPORT,
    priority: ErrorPriority.MEDIUM,
    matcher: (event) => {
      const operation = event.tags?.operation
      const error = event.exception?.values?.[0]?.value || ''
      return (typeof operation === 'string' && operation.includes('export')) || error.includes('export')
    },
    fingerprint: ['export', 'failure'],
    description: 'Document export failures',
  },

  // LOW - Network timeouts (transient)
  {
    name: 'Network Timeout',
    category: ErrorCategory.NETWORK,
    priority: ErrorPriority.LOW,
    matcher: (event) => {
      const error = event.exception?.values?.[0]?.value || ''
      return error.includes('ETIMEDOUT') || error.includes('timeout')
    },
    fingerprint: ['network', 'timeout'],
    description: 'Network timeouts - usually transient',
  },

  // LOW - Client-side UI errors
  {
    name: 'UI Render Error',
    category: ErrorCategory.UI,
    priority: ErrorPriority.LOW,
    matcher: (event) => {
      const error = event.exception?.values?.[0]?.value || ''
      return (
        error.includes('React') ||
        error.includes('render') ||
        event.exception?.values?.[0]?.type === 'UnhandledRejection'
      )
    },
    fingerprint: ['ui', 'render', 'error'],
    description: 'UI rendering errors',
  },

  // NOISE - 404 errors
  {
    name: '404 Not Found',
    category: ErrorCategory.API,
    priority: ErrorPriority.NOISE,
    matcher: (event) => {
      return event.contexts?.http_response?.status === 404
    },
    fingerprint: ['404'],
    description: '404 errors - expected user behavior',
  },

  // NOISE - Browser extension interference
  {
    name: 'Browser Extension',
    category: ErrorCategory.BROWSER,
    priority: ErrorPriority.NOISE,
    matcher: (event) => {
      const error = event.exception?.values?.[0]?.value || ''
      return (
        error.includes('chrome-extension://') ||
        error.includes('moz-extension://') ||
        error.includes('safari-extension://')
      )
    },
    fingerprint: ['browser', 'extension'],
    description: 'Browser extension interference - not our bug',
  },

  // NOISE - User cancelled actions
  {
    name: 'User Cancelled',
    category: ErrorCategory.UI,
    priority: ErrorPriority.NOISE,
    matcher: (event) => {
      const error = event.exception?.values?.[0]?.value || ''
      return error.includes('AbortError') || error.includes('user aborted')
    },
    fingerprint: ['user', 'cancelled'],
    description: 'User-initiated cancellations',
  },
]

/**
 * Classify an error event and assign priority
 */
export function classifyError(event: Sentry.ErrorEvent): {
  priority: ErrorPriority
  category: ErrorCategory
  ruleName?: string
  description?: string
} {
  // Check each alert rule
  for (const rule of ALERT_RULES) {
    if (rule.matcher(event)) {
      return {
        priority: rule.priority,
        category: rule.category,
        ruleName: rule.name,
        description: rule.description,
      }
    }
  }

  // Default classification
  return {
    priority: ErrorPriority.MEDIUM,
    category: ErrorCategory.UNKNOWN,
    ruleName: 'Unknown Error',
    description: 'Uncategorized error',
  }
}

/**
 * Generate fingerprint for error grouping
 * This helps Sentry group similar errors together
 */
export function generateFingerprint(event: Sentry.ErrorEvent): string[] {
  // First, try to match against alert rules for predefined fingerprints
  for (const rule of ALERT_RULES) {
    if (rule.matcher(event) && rule.fingerprint) {
      return rule.fingerprint
    }
  }

  // Generate dynamic fingerprint based on error characteristics
  const fingerprint: string[] = []

  // Add error type
  const errorType = event.exception?.values?.[0]?.type
  if (errorType) {
    fingerprint.push(errorType)
  }

  // Add operation if available
  const operation = event.tags?.operation as string | undefined
  if (operation) {
    fingerprint.push(operation)
  }

  // Add HTTP status if available
  const status = event.contexts?.http_response?.status
  if (status) {
    fingerprint.push(`status-${status}`)
  }

  // Add module/component if available
  const module = event.exception?.values?.[0]?.stacktrace?.frames?.[0]?.module
  if (module) {
    fingerprint.push(module)
  }

  return fingerprint.length > 0 ? fingerprint : ['{{ default }}']
}

/**
 * Enhanced beforeSend hook with intelligent filtering and classification
 * Use this in your Sentry.init() configuration
 */
export function enhancedBeforeSend(
  event: Sentry.ErrorEvent,
  hint: Sentry.EventHint
): Sentry.ErrorEvent | null {
  // Classify the error
  const classification = classifyError(event)

  // Filter out NOISE errors
  if (classification.priority === ErrorPriority.NOISE) {
    return null
  }

  // Add custom tags for filtering and routing
  event.tags = {
    ...event.tags,
    error_priority: classification.priority,
    error_category: classification.category,
    alert_rule: classification.ruleName,
  }

  // Add custom context
  event.contexts = {
    ...event.contexts,
    classification: {
      priority: classification.priority,
      category: classification.category,
      rule: classification.ruleName,
      description: classification.description,
    },
  }

  // Set fingerprint for better grouping
  event.fingerprint = generateFingerprint(event)

  // Scrub sensitive data
  if (event.request) {
    // Remove sensitive headers
    if (event.request.headers) {
      delete event.request.headers['authorization']
      delete event.request.headers['cookie']
      delete event.request.headers['x-supabase-auth']
      delete event.request.headers['Authorization']
      delete event.request.headers['Cookie']
    }

    // Remove sensitive query params
    if (event.request.query_string) {
      const params = new URLSearchParams(event.request.query_string)
      const sensitiveParams = ['token', 'key', 'secret', 'password', 'api_key', 'apikey']
      sensitiveParams.forEach((param) => {
        if (params.has(param)) params.delete(param)
      })
      event.request.query_string = params.toString()
    }
  }

  // Add error details for better debugging
  if (hint.originalException instanceof Error) {
    event.contexts = {
      ...event.contexts,
      error_details: {
        name: hint.originalException.name,
        message: hint.originalException.message,
        // Only first 5 lines of stack in production
        stack:
          process.env.NODE_ENV === 'production'
            ? hint.originalException.stack?.split('\n').slice(0, 5).join('\n')
            : hint.originalException.stack,
      },
    }
  }

  return event
}

/**
 * Alert notification configuration
 * This is used to configure notification channels in Sentry UI
 */
export const ALERT_NOTIFICATION_CONFIG = {
  // CRITICAL errors - immediate notification (Slack, PagerDuty, Email)
  critical: {
    channels: ['slack', 'pagerduty', 'email'],
    frequency: 'immediate',
    conditions: [
      {
        metric: 'event.count',
        threshold: 1, // Alert on first occurrence
        window: '1m',
      },
    ],
    description: 'Critical errors require immediate attention',
  },

  // HIGH priority - notify within 15 minutes
  high: {
    channels: ['slack', 'email'],
    frequency: 'batched',
    conditions: [
      {
        metric: 'event.count',
        threshold: 5, // Alert if 5+ errors in 15 minutes
        window: '15m',
      },
    ],
    description: 'High priority errors - batched alerts',
  },

  // MEDIUM priority - daily summary
  medium: {
    channels: ['email'],
    frequency: 'daily',
    conditions: [
      {
        metric: 'event.count',
        threshold: 10, // Alert if 10+ errors in a day
        window: '24h',
      },
    ],
    description: 'Medium priority errors - daily summary',
  },

  // LOW priority - weekly summary
  low: {
    channels: ['email'],
    frequency: 'weekly',
    conditions: [
      {
        metric: 'event.count',
        threshold: 50, // Alert if 50+ errors in a week
        window: '7d',
      },
    ],
    description: 'Low priority errors - weekly summary',
  },
}

/**
 * Performance monitoring thresholds
 * Used to alert on performance degradation
 */
export const PERFORMANCE_THRESHOLDS = {
  api: {
    p50: 500, // 50th percentile should be under 500ms
    p95: 2000, // 95th percentile should be under 2s
    p99: 5000, // 99th percentile should be under 5s
  },
  ai: {
    p50: 3000, // AI requests are slower
    p95: 10000,
    p99: 30000,
  },
  database: {
    p50: 100,
    p95: 500,
    p99: 1000,
  },
  autosave: {
    p50: 500,
    p95: 2000,
    p99: 5000,
  },
}

/**
 * Error rate thresholds
 * Used to alert on elevated error rates
 */
export const ERROR_RATE_THRESHOLDS = {
  critical: 0.01, // 1% error rate is critical
  high: 0.005, // 0.5% error rate is high priority
  medium: 0.001, // 0.1% error rate is medium priority
}

/**
 * Session replay configuration
 * Capture sessions with errors for debugging
 */
export const REPLAY_CONFIG = {
  // Capture all sessions with critical/high priority errors
  onError: (event: Sentry.ErrorEvent) => {
    const classification = classifyError(event)
    return (
      classification.priority === ErrorPriority.CRITICAL || classification.priority === ErrorPriority.HIGH
    )
  },

  // Privacy settings
  maskAllText: true, // Mask all text content
  blockAllMedia: true, // Don't capture images/videos
  maskAllInputs: true, // Mask form inputs

  // Performance settings
  sessionSampleRate: 0.01, // 1% of normal sessions
  errorSampleRate: 1.0, // 100% of sessions with errors
}
