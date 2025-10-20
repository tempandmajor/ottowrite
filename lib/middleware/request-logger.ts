/**
 * Request/Response Logging Middleware
 *
 * Structured logging for all API requests to support:
 * - Debugging production issues
 * - Performance monitoring
 * - Analytics and usage tracking
 * - Security auditing
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '../monitoring/structured-logger'

/**
 * Log levels for different response times
 */
const SLOW_REQUEST_THRESHOLD_MS = 1000 // 1 second warning
const VERY_SLOW_REQUEST_THRESHOLD_MS = 5000 // 5 second error

/**
 * Sampling rate for verbose logs (10% = 0.1)
 * Reduces logging costs while maintaining visibility
 */
const VERBOSE_LOG_SAMPLE_RATE = 0.1

/**
 * Paths to exclude from logging (health checks, monitoring)
 */
const EXCLUDED_PATHS = ['/api/health', '/api/health/ready']

/**
 * Log API request details
 *
 * @param request - The incoming request
 * @param response - The response to send
 * @param startTime - Request start time in ms
 * @param userId - User ID if authenticated
 */
export function logRequest(
  request: NextRequest,
  response: NextResponse,
  startTime: number,
  userId?: string
): void {
  const duration = Date.now() - startTime
  const { pathname, search } = request.nextUrl
  const fullPath = pathname + search

  // Skip excluded paths
  if (EXCLUDED_PATHS.some(path => fullPath.startsWith(path))) {
    return
  }

  // Determine log level based on status and duration
  const level = getLogLevel(response.status, duration)

  // Sample verbose logs to reduce cost
  const isVerbose = Math.random() < VERBOSE_LOG_SAMPLE_RATE
  const logData = buildLogData(request, response, duration, userId, isVerbose)

  // Log with appropriate level
  switch (level) {
    case 'error':
      logger.error('API request error', logData)
      break
    case 'warn':
      logger.warn('API request warning', logData)
      break
    default:
      logger.info('API request', logData)
  }
}

/**
 * Determine log level based on response status and duration
 */
function getLogLevel(status: number, duration: number): 'info' | 'warn' | 'error' {
  // 5xx errors
  if (status >= 500) {
    return 'error'
  }

  // Very slow requests (>5s)
  if (duration >= VERY_SLOW_REQUEST_THRESHOLD_MS) {
    return 'error'
  }

  // 4xx client errors or slow requests (>1s)
  if (status >= 400 || duration >= SLOW_REQUEST_THRESHOLD_MS) {
    return 'warn'
  }

  return 'info'
}

/**
 * Build structured log data
 */
function buildLogData(
  request: NextRequest,
  response: NextResponse,
  duration: number,
  userId?: string,
  isVerbose: boolean = false
): Record<string, any> {
  const { pathname, search } = request.nextUrl
  const method = request.method || 'GET'
  const status = response.status

  // Base log data (always included)
  const logData: Record<string, any> = {
    operation: 'http:request',
    method,
    path: pathname,
    status,
    duration,
    timestamp: new Date().toISOString(),
  }

  // Add query params if present
  if (search) {
    logData.query = sanitizeQueryParams(search)
  }

  // Add user ID if authenticated
  if (userId) {
    logData.userId = userId
  }

  // Add request details (privacy-safe)
  logData.request = {
    bodySize: getContentLength(request.headers),
    contentType: request.headers.get('content-type') || undefined,
    userAgent: sanitizeUserAgent(request.headers.get('user-agent')),
  }

  // Add response details
  logData.response = {
    bodySize: getContentLength(response.headers),
    contentType: response.headers.get('content-type') || undefined,
  }

  // Add verbose details if sampled (10% of requests)
  if (isVerbose) {
    logData.verbose = {
      referer: request.headers.get('referer') || undefined,
      ip: getClientIP(request),
      requestId: request.headers.get('x-request-id') || undefined,
    }
  }

  // Add performance labels
  if (duration >= VERY_SLOW_REQUEST_THRESHOLD_MS) {
    logData.performance = 'very_slow'
  } else if (duration >= SLOW_REQUEST_THRESHOLD_MS) {
    logData.performance = 'slow'
  }

  // Add error details for failures
  if (status >= 400) {
    logData.errorType = status >= 500 ? 'server_error' : 'client_error'
  }

  return logData
}

/**
 * Get content length from headers
 */
function getContentLength(headers: Headers): number | undefined {
  const length = headers.get('content-length')
  return length ? parseInt(length, 10) : undefined
}

/**
 * Sanitize query params for logging (remove sensitive data)
 */
function sanitizeQueryParams(search: string): string {
  // Remove tokens, passwords, keys, secrets from query string
  const sensitiveParams = ['token', 'password', 'key', 'secret', 'api_key', 'apikey']

  return search.replace(
    new RegExp(`([?&])(${sensitiveParams.join('|')})=([^&]*)`, 'gi'),
    '$1$2=***'
  )
}

/**
 * Sanitize user agent for logging (shorten long strings)
 */
function sanitizeUserAgent(userAgent: string | null): string | undefined {
  if (!userAgent) return undefined

  // Truncate very long user agents
  const MAX_LENGTH = 200
  if (userAgent.length > MAX_LENGTH) {
    return userAgent.substring(0, MAX_LENGTH) + '...'
  }

  return userAgent
}

/**
 * Get client IP address from request headers
 */
function getClientIP(request: NextRequest): string | undefined {
  // Try various headers (Vercel, Cloudflare, etc.)
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnectingIp = request.headers.get('cf-connecting-ip')

  return cfConnectingIp || realIp || forwardedFor?.split(',')[0] || undefined
}

/**
 * Start a request timer
 * Returns the start time in milliseconds
 */
export function startRequestTimer(): number {
  return Date.now()
}

/**
 * Check if request should be logged
 */
export function shouldLogRequest(request: NextRequest): boolean {
  const pathname = request.nextUrl.pathname

  // Exclude health checks and monitoring
  if (EXCLUDED_PATHS.some(path => pathname.startsWith(path))) {
    return false
  }

  return true
}
