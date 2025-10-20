import { NextResponse } from 'next/server'
import { logger } from '@/lib/monitoring/structured-logger'

export const dynamic = 'force-dynamic'
export const maxDuration = 5 // 5 second timeout for readiness checks

interface ReadinessCheck {
  ready: boolean
  timestamp: string
  message?: string
}

/**
 * Readiness Probe Endpoint
 *
 * Used by Kubernetes/container orchestrators to determine if the app is ready to receive traffic.
 * This is a lightweight check that verifies the app has started successfully.
 *
 * Difference from /api/health:
 * - /api/health: Liveness check - verifies app is running and healthy
 * - /api/health/ready: Readiness check - verifies app is ready to serve requests
 *
 * Returns:
 * - 200 OK: App is ready to receive traffic
 * - 503 Service Unavailable: App is starting up or not ready
 */
export async function GET() {
  const startTime = Date.now()

  // Check if critical environment variables are loaded
  const isReady = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.OPENAI_API_KEY
  )

  const response: ReadinessCheck = {
    ready: isReady,
    timestamp: new Date().toISOString(),
  }

  if (!isReady) {
    response.message = 'Application is starting up or environment not configured'
  }

  const duration = Date.now() - startTime

  logger.info('Readiness check completed', {
    operation: 'health:ready',
    ready: isReady,
    duration,
  })

  const statusCode = isReady ? 200 : 503

  return NextResponse.json(response, {
    status: statusCode,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  })
}
