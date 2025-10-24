/**
 * Rate Limit Monitoring Utilities
 *
 * Provides metrics and monitoring for rate limit enforcement.
 * Use for debugging, analytics, and alerting.
 *
 * Ticket: PROD-008
 */

export interface RateLimitMetric {
  identifier: string
  endpoint: string
  timestamp: number
  allowed: boolean
  remaining: number
  resetAt: number
  usedBurst: boolean
  retryAfter?: number
}

export interface RateLimitStats {
  totalRequests: number
  allowedRequests: number
  blockedRequests: number
  burstUsage: number
  uniqueIdentifiers: number
  topBlockedIdentifiers: { identifier: string; count: number }[]
  topBlockedEndpoints: { endpoint: string; count: number }[]
}

// In-memory circular buffer for recent rate limit events
const MAX_EVENTS = 10000
const rateLimitEvents: RateLimitMetric[] = []
let eventIndex = 0

/**
 * Log a rate limit check event
 */
export function logRateLimitEvent(metric: RateLimitMetric): void {
  if (rateLimitEvents.length < MAX_EVENTS) {
    rateLimitEvents.push(metric)
  } else {
    rateLimitEvents[eventIndex] = metric
    eventIndex = (eventIndex + 1) % MAX_EVENTS
  }
}

/**
 * Get rate limit statistics for a time window
 */
export function getRateLimitStats(windowMs: number = 60 * 60 * 1000): RateLimitStats {
  const now = Date.now()
  const windowStart = now - windowMs

  // Filter events within time window
  const recentEvents = rateLimitEvents.filter((event) => event.timestamp >= windowStart)

  // Calculate stats
  const totalRequests = recentEvents.length
  const allowedRequests = recentEvents.filter((e) => e.allowed).length
  const blockedRequests = totalRequests - allowedRequests
  const burstUsage = recentEvents.filter((e) => e.usedBurst).length

  // Count unique identifiers
  const identifiers = new Set(recentEvents.map((e) => e.identifier))
  const uniqueIdentifiers = identifiers.size

  // Find top blocked identifiers
  const blockedByIdentifier = new Map<string, number>()
  recentEvents
    .filter((e) => !e.allowed)
    .forEach((e) => {
      blockedByIdentifier.set(e.identifier, (blockedByIdentifier.get(e.identifier) || 0) + 1)
    })

  const topBlockedIdentifiers = Array.from(blockedByIdentifier.entries())
    .map(([identifier, count]) => ({ identifier, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Find top blocked endpoints
  const blockedByEndpoint = new Map<string, number>()
  recentEvents
    .filter((e) => !e.allowed)
    .forEach((e) => {
      blockedByEndpoint.set(e.endpoint, (blockedByEndpoint.get(e.endpoint) || 0) + 1)
    })

  const topBlockedEndpoints = Array.from(blockedByEndpoint.entries())
    .map(([endpoint, count]) => ({ endpoint, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  return {
    totalRequests,
    allowedRequests,
    blockedRequests,
    burstUsage,
    uniqueIdentifiers,
    topBlockedIdentifiers,
    topBlockedEndpoints,
  }
}

/**
 * Get recent rate limit violations
 */
export function getRecentViolations(limit: number = 100): RateLimitMetric[] {
  return rateLimitEvents
    .filter((e) => !e.allowed)
    .slice(-limit)
    .reverse()
}

/**
 * Get rate limit events for a specific identifier
 */
export function getIdentifierHistory(
  identifier: string,
  limit: number = 100
): RateLimitMetric[] {
  return rateLimitEvents
    .filter((e) => e.identifier === identifier)
    .slice(-limit)
    .reverse()
}

/**
 * Check if an identifier is currently rate limited
 */
export function isIdentifierRateLimited(identifier: string): boolean {
  const now = Date.now()
  const recentEvent = rateLimitEvents
    .filter((e) => e.identifier === identifier && e.timestamp >= now - 60000)
    .pop()

  return recentEvent ? !recentEvent.allowed : false
}

/**
 * Get rate limit health score (0-100)
 * 100 = no blocks, 0 = all blocked
 */
export function getRateLimitHealthScore(windowMs: number = 60 * 60 * 1000): number {
  const stats = getRateLimitStats(windowMs)

  if (stats.totalRequests === 0) {
    return 100
  }

  const allowedPercentage = (stats.allowedRequests / stats.totalRequests) * 100
  return Math.round(allowedPercentage)
}

/**
 * Detect potential abuse patterns
 */
export interface AbusePattern {
  identifier: string
  endpoint: string
  requestCount: number
  blockCount: number
  blockRate: number
  firstSeen: number
  lastSeen: number
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export function detectAbusePatterns(windowMs: number = 60 * 60 * 1000): AbusePattern[] {
  const now = Date.now()
  const windowStart = now - windowMs
  const recentEvents = rateLimitEvents.filter((event) => event.timestamp >= windowStart)

  // Group by identifier and endpoint
  const patterns = new Map<string, AbusePattern>()

  recentEvents.forEach((event) => {
    const key = `${event.identifier}:${event.endpoint}`
    const existing = patterns.get(key)

    if (existing) {
      existing.requestCount++
      if (!event.allowed) {
        existing.blockCount++
      }
      existing.lastSeen = event.timestamp
    } else {
      patterns.set(key, {
        identifier: event.identifier,
        endpoint: event.endpoint,
        requestCount: 1,
        blockCount: event.allowed ? 0 : 1,
        blockRate: 0,
        firstSeen: event.timestamp,
        lastSeen: event.timestamp,
        severity: 'low',
      })
    }
  })

  // Calculate block rates and severity
  const abusivePatterns: AbusePattern[] = []

  patterns.forEach((pattern) => {
    pattern.blockRate = pattern.blockCount / pattern.requestCount

    // Determine severity based on block rate and request count
    if (pattern.blockRate > 0.8 && pattern.requestCount > 100) {
      pattern.severity = 'critical'
    } else if (pattern.blockRate > 0.6 && pattern.requestCount > 50) {
      pattern.severity = 'high'
    } else if (pattern.blockRate > 0.4 && pattern.requestCount > 20) {
      pattern.severity = 'medium'
    } else {
      pattern.severity = 'low'
    }

    // Only report patterns with significant abuse
    if (pattern.blockRate > 0.3 && pattern.requestCount > 10) {
      abusivePatterns.push(pattern)
    }
  })

  return abusivePatterns.sort((a, b) => {
    // Sort by severity, then block count
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
      return severityOrder[b.severity] - severityOrder[a.severity]
    }
    return b.blockCount - a.blockCount
  })
}

/**
 * Generate a rate limit monitoring report
 */
export function generateMonitoringReport(windowMs: number = 60 * 60 * 1000): string {
  const stats = getRateLimitStats(windowMs)
  const healthScore = getRateLimitHealthScore(windowMs)
  const violations = getRecentViolations(5)
  const abusePatterns = detectAbusePatterns(windowMs)

  const windowHours = windowMs / (60 * 60 * 1000)

  let report = `
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ RATE LIMIT MONITORING REPORT                                        ┃
┃ Window: Last ${windowHours} hour(s)                                           ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

📊 OVERALL STATISTICS
─────────────────────────────────────────────────────────────────────
Total Requests:        ${stats.totalRequests.toLocaleString()}
✅ Allowed:            ${stats.allowedRequests.toLocaleString()} (${((stats.allowedRequests / stats.totalRequests) * 100).toFixed(1)}%)
❌ Blocked:            ${stats.blockedRequests.toLocaleString()} (${((stats.blockedRequests / stats.totalRequests) * 100).toFixed(1)}%)
🚀 Burst Usage:        ${stats.burstUsage.toLocaleString()} requests
👥 Unique Users/IPs:   ${stats.uniqueIdentifiers.toLocaleString()}

💚 Health Score:       ${healthScore}/100 ${healthScore >= 90 ? '(Excellent)' : healthScore >= 75 ? '(Good)' : healthScore >= 60 ? '(Fair)' : '(Poor)'}

${stats.topBlockedIdentifiers.length > 0 ? `
🚫 TOP BLOCKED IDENTIFIERS
─────────────────────────────────────────────────────────────────────
${stats.topBlockedIdentifiers.map((item, i) => `${i + 1}. ${item.identifier}: ${item.count} blocks`).join('\n')}
` : ''}

${stats.topBlockedEndpoints.length > 0 ? `
🎯 TOP BLOCKED ENDPOINTS
─────────────────────────────────────────────────────────────────────
${stats.topBlockedEndpoints.map((item, i) => `${i + 1}. ${item.endpoint}: ${item.count} blocks`).join('\n')}
` : ''}

${abusePatterns.length > 0 ? `
⚠️  ABUSE PATTERNS DETECTED
─────────────────────────────────────────────────────────────────────
${abusePatterns.map((pattern, i) => `
${i + 1}. ${pattern.severity.toUpperCase()} - ${pattern.identifier}
   Endpoint: ${pattern.endpoint}
   Requests: ${pattern.requestCount} (${pattern.blockCount} blocked, ${(pattern.blockRate * 100).toFixed(1)}% block rate)
   Active: ${new Date(pattern.firstSeen).toLocaleTimeString()} - ${new Date(pattern.lastSeen).toLocaleTimeString()}
`).join('\n')}
` : '✅ No significant abuse patterns detected'}

${violations.length > 0 ? `
🔴 RECENT VIOLATIONS (Last 5)
─────────────────────────────────────────────────────────────────────
${violations.map((v, i) => `${i + 1}. [${new Date(v.timestamp).toLocaleTimeString()}] ${v.identifier} → ${v.endpoint}`).join('\n')}
` : ''}

─────────────────────────────────────────────────────────────────────
Generated: ${new Date().toLocaleString()}
`

  return report
}

/**
 * Check if rate limits need adjustment (too many blocks)
 */
export function shouldAdjustRateLimits(
  windowMs: number = 60 * 60 * 1000
): { shouldAdjust: boolean; reason?: string } {
  const stats = getRateLimitStats(windowMs)
  const healthScore = getRateLimitHealthScore(windowMs)

  // If too many legitimate requests are being blocked
  if (healthScore < 80 && stats.totalRequests > 100) {
    const blockRate = (stats.blockedRequests / stats.totalRequests) * 100
    return {
      shouldAdjust: true,
      reason: `High block rate: ${blockRate.toFixed(1)}%. Consider increasing rate limits.`,
    }
  }

  // If burst capacity is heavily used
  if (stats.burstUsage / stats.allowedRequests > 0.5) {
    return {
      shouldAdjust: true,
      reason: `Burst capacity heavily used (${((stats.burstUsage / stats.allowedRequests) * 100).toFixed(1)}%). Consider increasing base limits.`,
    }
  }

  return { shouldAdjust: false }
}
