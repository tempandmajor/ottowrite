/**
 * Performance Monitoring and SLO Tracking
 *
 * Tracks latency, throughput, and error budgets for key operations.
 * Helps maintain service level objectives (SLOs) and identify performance regressions.
 */

import { logger } from './structured-logger'

// Service Level Objectives (SLOs)
export const SLO_TARGETS = {
  // API endpoints should respond within these times for 95% of requests
  api: {
    p95_latency_ms: 1000, // 95th percentile
    p99_latency_ms: 3000, // 99th percentile
    error_budget_percent: 1.0, // 1% error rate allowed
  },

  // AI generation operations
  ai_generation: {
    p95_latency_ms: 10000, // 10 seconds
    p99_latency_ms: 30000, // 30 seconds
    error_budget_percent: 5.0, // 5% error rate allowed
  },

  // Autosave operations
  autosave: {
    p95_latency_ms: 500, // 500ms
    p99_latency_ms: 2000, // 2 seconds
    error_budget_percent: 0.5, // 0.5% error rate allowed
  },

  // Database queries
  database: {
    p95_latency_ms: 200, // 200ms
    p99_latency_ms: 1000, // 1 second
    error_budget_percent: 0.1, // 0.1% error rate allowed
  },

  // Background tasks
  background_task: {
    p95_latency_ms: 60000, // 1 minute
    p99_latency_ms: 300000, // 5 minutes
    error_budget_percent: 2.0, // 2% error rate allowed
  },
}

export type ServiceType = keyof typeof SLO_TARGETS

interface PerformanceMetric {
  operation: string
  serviceType: ServiceType
  latency: number
  success: boolean
  timestamp: Date
}

/**
 * Performance metric collector
 * In production, this would send to a metrics backend (Datadog, Prometheus, etc.)
 */
class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private readonly maxMetrics = 1000 // Keep last 1000 metrics in memory

  /**
   * Record a performance metric
   */
  record(params: {
    operation: string
    serviceType: ServiceType
    latency: number
    success: boolean
  }) {
    const metric: PerformanceMetric = {
      ...params,
      timestamp: new Date(),
    }

    this.metrics.push(metric)

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics)
    }

    // Check SLO violations
    const slo = SLO_TARGETS[params.serviceType]
    if (params.latency > slo.p95_latency_ms) {
      logger.warn('SLO violation: High latency detected', {
        operation: params.operation,
        serviceType: params.serviceType,
        latency: params.latency,
        slo_p95: slo.p95_latency_ms,
        violation_percent: ((params.latency / slo.p95_latency_ms - 1) * 100).toFixed(1),
      })
    }
  }

  /**
   * Get metrics for a specific service type
   */
  getMetrics(serviceType?: ServiceType, since?: Date): PerformanceMetric[] {
    let filtered = this.metrics

    if (serviceType) {
      filtered = filtered.filter((m) => m.serviceType === serviceType)
    }

    if (since) {
      filtered = filtered.filter((m) => m.timestamp >= since)
    }

    return filtered
  }

  /**
   * Calculate percentile latency
   */
  getPercentile(serviceType: ServiceType, percentile: number, since?: Date): number {
    const metrics = this.getMetrics(serviceType, since)
    if (metrics.length === 0) return 0

    const latencies = metrics.map((m) => m.latency).sort((a, b) => a - b)
    const index = Math.ceil((percentile / 100) * latencies.length) - 1
    return latencies[index] || 0
  }

  /**
   * Calculate error rate
   */
  getErrorRate(serviceType: ServiceType, since?: Date): number {
    const metrics = this.getMetrics(serviceType, since)
    if (metrics.length === 0) return 0

    const errors = metrics.filter((m) => !m.success).length
    return (errors / metrics.length) * 100
  }

  /**
   * Get SLO compliance status
   */
  getSLOStatus(serviceType: ServiceType, since?: Date): {
    compliant: boolean
    p95_latency: number
    p95_target: number
    p99_latency: number
    p99_target: number
    error_rate: number
    error_budget: number
    sample_size: number
  } {
    const slo = SLO_TARGETS[serviceType]
    const p95 = this.getPercentile(serviceType, 95, since)
    const p99 = this.getPercentile(serviceType, 99, since)
    const errorRate = this.getErrorRate(serviceType, since)
    const metrics = this.getMetrics(serviceType, since)

    return {
      compliant: p95 <= slo.p95_latency_ms && p99 <= slo.p99_latency_ms && errorRate <= slo.error_budget_percent,
      p95_latency: p95,
      p95_target: slo.p95_latency_ms,
      p99_latency: p99,
      p99_target: slo.p99_latency_ms,
      error_rate: errorRate,
      error_budget: slo.error_budget_percent,
      sample_size: metrics.length,
    }
  }

  /**
   * Get overall health summary
   */
  getHealthSummary(): Record<
    ServiceType,
    {
      status: 'healthy' | 'degraded' | 'critical'
      p95_latency: number
      error_rate: number
      sample_size: number
    }
  > {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const services = Object.keys(SLO_TARGETS) as ServiceType[]

    const summary = {} as Record<
      ServiceType,
      {
        status: 'healthy' | 'degraded' | 'critical'
        p95_latency: number
        error_rate: number
        sample_size: number
      }
    >

    for (const service of services) {
      const sloStatus = this.getSLOStatus(service, oneHourAgo)
      const status = sloStatus.compliant
        ? 'healthy'
        : sloStatus.p99_latency > sloStatus.p99_target * 1.5 || sloStatus.error_rate > sloStatus.error_budget * 2
        ? 'critical'
        : 'degraded'

      summary[service] = {
        status,
        p95_latency: sloStatus.p95_latency,
        error_rate: sloStatus.error_rate,
        sample_size: sloStatus.sample_size,
      }
    }

    return summary
  }

  /**
   * Clear all metrics (for testing)
   */
  clear() {
    this.metrics = []
  }
}

// Export singleton
export const performanceMonitor = new PerformanceMonitor()

/**
 * Timer utility for measuring operation duration
 */
export class PerformanceTimer {
  private startTime: number
  private operation: string
  private serviceType: ServiceType
  private context: Record<string, unknown>

  constructor(operation: string, serviceType: ServiceType, context: Record<string, unknown> = {}) {
    this.operation = operation
    this.serviceType = serviceType
    this.context = context
    this.startTime = Date.now()
  }

  /**
   * End the timer and record the metric
   */
  end(success: boolean = true, additionalContext?: Record<string, unknown>) {
    const latency = Date.now() - this.startTime

    // Record performance metric
    performanceMonitor.record({
      operation: this.operation,
      serviceType: this.serviceType,
      latency,
      success,
    })

    // Log the operation
    const level = success ? 'info' : 'error'
    logger[level](`${this.operation} completed`, {
      ...this.context,
      ...additionalContext,
      duration: latency,
      operation: this.operation,
    })

    return latency
  }

  /**
   * Get elapsed time without ending the timer
   */
  elapsed(): number {
    return Date.now() - this.startTime
  }
}

/**
 * Decorator for measuring function performance
 */
export function measurePerformance(serviceType: ServiceType, operation?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const op = operation || `${target.constructor.name}.${propertyKey}`
      const timer = new PerformanceTimer(op, serviceType)

      try {
        const result = await originalMethod.apply(this, args)
        timer.end(true)
        return result
      } catch (error) {
        timer.end(false)
        throw error
      }
    }

    return descriptor
  }
}
