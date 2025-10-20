/**
 * Structured Logging Utility
 *
 * Provides consistent, JSON-structured logging for better observability.
 * Integrates with Vercel Logs and can be ingested by log aggregators.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'

export interface LogContext {
  // Request context
  requestId?: string
  userId?: string
  sessionId?: string

  // Resource context
  documentId?: string
  projectId?: string
  organizationId?: string

  // Operation context
  operation?: string
  component?: string
  method?: string

  // Performance metrics
  duration?: number
  latency?: number

  // Additional metadata
  [key: string]: unknown
}

export interface StructuredLog {
  timestamp: string
  level: LogLevel
  message: string
  context?: LogContext
  error?: {
    name: string
    message: string
    stack?: string
    code?: string
  }
}

class StructuredLogger {
  private environment: string

  constructor() {
    this.environment = process.env.VERCEL_ENV || process.env.NODE_ENV || 'development'
  }

  /**
   * Create a structured log entry
   */
  private createLog(level: LogLevel, message: string, context?: LogContext, error?: Error): StructuredLog {
    const log: StructuredLog = {
      timestamp: new Date().toISOString(),
      level,
      message,
    }

    if (context) {
      log.context = context
    }

    if (error) {
      log.error = {
        name: error.name,
        message: error.message,
        stack: this.environment === 'production' ? undefined : error.stack,
        code: (error as any).code,
      }
    }

    return log
  }

  /**
   * Output log to console (JSON in production, pretty in development)
   */
  private output(log: StructuredLog) {
    const output = this.environment === 'production' ? JSON.stringify(log) : this.prettyPrint(log)

    switch (log.level) {
      case 'debug':
        console.debug(output)
        break
      case 'info':
        console.info(output)
        break
      case 'warn':
        console.warn(output)
        break
      case 'error':
      case 'fatal':
        console.error(output)
        break
    }
  }

  /**
   * Pretty print for development
   */
  private prettyPrint(log: StructuredLog): string {
    const emoji = {
      debug: '🔍',
      info: 'ℹ️ ',
      warn: '⚠️ ',
      error: '❌',
      fatal: '💀',
    }[log.level]

    let output = `${emoji} [${log.level.toUpperCase()}] ${log.message}`

    if (log.context) {
      output += `\n  Context: ${JSON.stringify(log.context, null, 2)}`
    }

    if (log.error) {
      output += `\n  Error: ${log.error.name}: ${log.error.message}`
      if (log.error.stack) {
        output += `\n${log.error.stack}`
      }
    }

    return output
  }

  /**
   * Log at debug level
   */
  debug(message: string, context?: LogContext) {
    const log = this.createLog('debug', message, context)
    this.output(log)
  }

  /**
   * Log at info level
   */
  info(message: string, context?: LogContext) {
    const log = this.createLog('info', message, context)
    this.output(log)
  }

  /**
   * Log at warn level
   */
  warn(message: string, context?: LogContext, error?: Error) {
    const log = this.createLog('warn', message, context, error)
    this.output(log)
  }

  /**
   * Log at error level
   */
  error(message: string, context?: LogContext, error?: Error) {
    const log = this.createLog('error', message, context, error)
    this.output(log)
  }

  /**
   * Log at fatal level (for critical errors)
   */
  fatal(message: string, context?: LogContext, error?: Error) {
    const log = this.createLog('fatal', message, context, error)
    this.output(log)
  }

  /**
   * Log AI request with performance metrics
   */
  aiRequest(params: {
    operation: string
    model: string
    promptLength: number
    completionLength?: number
    duration: number
    tokensUsed?: number
    cost?: number
    userId?: string
    documentId?: string
    success: boolean
    error?: Error
    routing?: {
      model: string
      confidence?: number
      intent?: string
      manualOverride?: boolean
      rationale?: string[]
    }
    contextTokens?: {
      explicit?: number
      generated?: number
      selection?: number
    }
  }) {
    const {
      operation,
      model,
      promptLength,
      completionLength,
      duration,
      tokensUsed,
      cost,
      userId,
      documentId,
      success,
      error,
      routing,
      contextTokens,
    } = params

    const level: LogLevel = success ? 'info' : 'error'
    const message = success
      ? `AI request completed: ${operation}`
      : `AI request failed: ${operation}`

    const context: LogContext = {
      operation: `ai:${operation}`,
      component: 'ai_service',
      model,
      promptLength,
      completionLength,
      duration,
      tokensUsed,
      cost,
      userId,
      documentId,
    }

    if (routing) {
      context.routingModel = routing.model
      if (typeof routing.confidence === 'number') {
        context.routingConfidence = routing.confidence
      }
      if (routing.intent) {
        context.routingIntent = routing.intent
      }
      if (typeof routing.manualOverride === 'boolean') {
        context.routingManualOverride = routing.manualOverride
      }
      if (routing.rationale && routing.rationale.length > 0) {
        context.routingRationale = routing.rationale
      }
    }

    if (contextTokens) {
      context.contextTokens = contextTokens
    }

    this.output(this.createLog(level, message, context, error))
  }

  /**
   * Log autosave operation with conflict detection
   */
  autosave(params: {
    documentId: string
    userId: string
    operation: 'start' | 'complete' | 'conflict' | 'error'
    duration?: number
    wordCount?: number
    clientHash?: string
    serverHash?: string
    conflictResolution?: 'client' | 'server' | 'manual'
    retryCount?: number
    error?: Error
  }) {
    const {
      documentId,
      userId,
      operation,
      duration,
      wordCount,
      clientHash,
      serverHash,
      conflictResolution,
      retryCount,
      error,
    } = params

    const level: LogLevel = operation === 'error' ? 'error' : operation === 'conflict' ? 'warn' : 'info'
    const message = `Autosave ${operation}: document ${documentId}`

    this.output(
      this.createLog(
        level,
        message,
        {
          operation: `autosave:${operation}`,
          component: 'autosave',
          documentId,
          userId,
          duration,
          wordCount,
          clientHash,
          serverHash,
          conflictResolution,
          retryCount,
        },
        error
      )
    )
  }

  /**
   * Log analytics/metrics event
   */
  analytics(params: {
    event: string
    userId?: string
    projectId?: string
    documentId?: string
    value?: number
    metadata?: Record<string, unknown>
  }) {
    const { event, userId, projectId, documentId, value, metadata } = params

    this.info(`Analytics event: ${event}`, {
      operation: `analytics:${event}`,
      component: 'analytics',
      userId,
      projectId,
      documentId,
      value,
      ...metadata,
    })
  }

  /**
   * Log API request/response
   */
  api(params: {
    method: string
    path: string
    statusCode: number
    duration: number
    userId?: string
    requestId?: string
    error?: Error
  }) {
    const { method, path, statusCode, duration, userId, requestId, error } = params

    const level: LogLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info'
    const message = `${method} ${path} ${statusCode}`

    this.output(
      this.createLog(
        level,
        message,
        {
          operation: 'api_request',
          component: 'api',
          method,
          path,
          statusCode,
          duration,
          userId,
          requestId,
        },
        error
      )
    )
  }

  /**
   * Log database query
   */
  database(params: {
    operation: 'select' | 'insert' | 'update' | 'delete' | 'rpc'
    table: string
    duration: number
    rowCount?: number
    userId?: string
    success: boolean
    error?: Error
  }) {
    const { operation, table, duration, rowCount, userId, success, error } = params

    const level: LogLevel = success ? 'info' : 'error'
    const message = success
      ? `DB ${operation} on ${table} (${rowCount ?? 0} rows)`
      : `DB ${operation} failed on ${table}`

    this.output(
      this.createLog(
        level,
        message,
        {
          operation: `database:${operation}`,
          component: 'database',
          table,
          duration,
          rowCount,
          userId,
        },
        error
      )
    )
  }

  /**
   * Log background task
   */
  backgroundTask(params: {
    taskId: string
    taskType: string
    status: 'queued' | 'running' | 'succeeded' | 'failed'
    duration?: number
    userId?: string
    projectId?: string
    error?: Error
  }) {
    const { taskId, taskType, status, duration, userId, projectId, error } = params

    const level: LogLevel = status === 'failed' ? 'error' : status === 'succeeded' ? 'info' : 'debug'
    const message = `Background task ${status}: ${taskType} (${taskId})`

    this.output(
      this.createLog(
        level,
        message,
        {
          operation: `background_task:${status}`,
          component: 'background_worker',
          taskId,
          taskType,
          status,
          duration,
          userId,
          projectId,
        },
        error
      )
    )
  }

  /**
   * Create a child logger with default context
   */
  child(defaultContext: LogContext): StructuredLogger {
    const childLogger = new StructuredLogger()
    const originalCreateLog = childLogger.createLog.bind(childLogger)

    childLogger.createLog = (level, message, context, error) => {
      return originalCreateLog(level, message, { ...defaultContext, ...context }, error)
    }

    return childLogger
  }
}

// Export singleton instance
export const logger = new StructuredLogger()

// Export class for custom instances
export { StructuredLogger }
