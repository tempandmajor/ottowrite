import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/monitoring/structured-logger'

export const dynamic = 'force-dynamic'
export const maxDuration = 10 // 10 second timeout for health checks

type HealthStatus = 'healthy' | 'degraded' | 'unhealthy'
type CheckStatus = 'healthy' | 'unhealthy'

interface HealthCheck {
  status: HealthStatus
  timestamp: string
  version: string
  uptime: number
  checks: {
    database: CheckStatus
    environment: CheckStatus
  }
  details?: {
    database?: string
    environment?: string
  }
}

/**
 * Health Check Endpoint
 *
 * Used by load balancers and monitoring systems to verify application health.
 *
 * Returns:
 * - 200 OK: All systems healthy
 * - 503 Service Unavailable: One or more systems unhealthy
 */
export async function GET() {
  const startTime = Date.now()

  const checks: HealthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    uptime: process.uptime(),
    checks: {
      database: 'healthy',
      environment: 'healthy',
    },
    details: {},
  }

  // Check 1: Database connectivity
  try {
    const supabase = await createClient()

    // Simple query to verify database connection
    const { error } = await supabase
      .from('user_profiles')
      .select('id')
      .limit(1)
      .single()

    // We expect either data or a "no rows" error - both mean DB is connected
    if (error && error.code !== 'PGRST116') {
      checks.checks.database = 'unhealthy'
      checks.details!.database = `Database query failed: ${error.message}`
      checks.status = 'unhealthy'

      logger.error('Health check: Database unhealthy', {
        operation: 'health:check',
        error: error.message,
        code: error.code,
      })
    }
  } catch (error) {
    checks.checks.database = 'unhealthy'
    checks.details!.database = error instanceof Error ? error.message : 'Unknown error'
    checks.status = 'unhealthy'

    logger.error('Health check: Database check failed', {
      operation: 'health:check',
    }, error instanceof Error ? error : undefined)
  }

  // Check 2: Critical environment variables
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'OPENAI_API_KEY',
  ]

  const missingEnvVars = requiredEnvVars.filter(key => !process.env[key])

  if (missingEnvVars.length > 0) {
    checks.checks.environment = 'unhealthy'
    checks.details!.environment = `Missing env vars: ${missingEnvVars.join(', ')}`
    checks.status = 'unhealthy'

    logger.warn('Health check: Missing environment variables', {
      operation: 'health:check',
      missingVars: missingEnvVars,
    })
  }

  const duration = Date.now() - startTime

  // Log health check
  logger.info('Health check completed', {
    operation: 'health:check',
    status: checks.status,
    duration,
    checks: checks.checks,
  })

  // Return appropriate status code
  const statusCode = checks.status === 'healthy' ? 200 : 503

  return NextResponse.json(checks, {
    status: statusCode,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  })
}
