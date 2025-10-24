/**
 * Sentry Test API Route
 *
 * This endpoint is used to test Sentry error tracking in production.
 *
 * Usage:
 * - GET /api/test-sentry?type=client - Returns HTML page to test client-side errors
 * - GET /api/test-sentry?type=server - Throws a server-side test error
 * - GET /api/test-sentry?type=critical - Simulates a critical database error
 * - GET /api/test-sentry?type=high - Simulates a high priority AI error
 *
 * ⚠️ Only enable in production for testing, then disable
 */

import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { captureExceptionWithRequestId } from '@/lib/monitoring/sentry-context'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')

  // Only allow in production for initial testing
  if (process.env.NODE_ENV !== 'production') {
    return NextResponse.json({
      error: 'This endpoint only works in production',
      message: 'Sentry is disabled in development'
    }, { status: 403 })
  }

  switch (type) {
    case 'client':
      // Return HTML page that triggers client-side error
      return new NextResponse(
        `<!DOCTYPE html>
<html>
<head>
  <title>Sentry Client Test</title>
</head>
<body>
  <h1>Sentry Client-Side Error Test</h1>
  <button onclick="testError()">Trigger Test Error</button>
  <script>
    function testError() {
      // This will be captured by Sentry client
      throw new Error('[TEST] Client-side Sentry test error');
    }
  </script>
  <p>Click the button to trigger a test error. Check Sentry dashboard after 1-2 minutes.</p>
</body>
</html>`,
        {
          headers: {
            'Content-Type': 'text/html',
          },
        }
      )

    case 'server':
      // Throw a generic server error
      Sentry.setTag('test', 'server-error')
      Sentry.setContext('test', { type: 'server', timestamp: new Date().toISOString() })
      throw new Error('[TEST] Server-side Sentry test error')

    case 'critical': {
      // Simulate a critical database error
      Sentry.setTag('operation', 'database:query')
      Sentry.setTag('test', 'critical-error')
      Sentry.setContext('database', {
        operation: 'SELECT',
        table: 'test_table',
      })
      const criticalError = new Error('PostgresError: 53300 - connection refused')
      await captureExceptionWithRequestId(criticalError, {
        severity: 'critical',
        category: 'database',
      })
      return NextResponse.json({
        message: 'Critical error sent to Sentry',
        priority: 'CRITICAL',
        category: 'database',
      })
    }

    case 'high': {
      // Simulate a high priority AI error
      Sentry.setTag('operation', 'ai:generation')
      Sentry.setTag('ai_model', 'claude-3')
      Sentry.setTag('test', 'high-error')
      const highError = new Error('[TEST] AI generation failed - rate limit exceeded')
      await captureExceptionWithRequestId(highError, {
        severity: 'high',
        category: 'ai',
      })
      return NextResponse.json({
        message: 'High priority error sent to Sentry',
        priority: 'HIGH',
        category: 'ai',
      })
    }

    case 'medium': {
      // Simulate a medium priority error
      Sentry.setTag('operation', 'export:pdf')
      Sentry.setTag('test', 'medium-error')
      const mediumError = new Error('[TEST] Export failed - invalid document structure')
      await captureExceptionWithRequestId(mediumError, {
        severity: 'medium',
        category: 'export',
      })
      return NextResponse.json({
        message: 'Medium priority error sent to Sentry',
        priority: 'MEDIUM',
        category: 'export',
      })
    }

    case 'noise': {
      // This should be filtered out by Sentry
      Sentry.setTag('test', 'noise-error')
      const noiseError = new Error('[TEST] AbortError: user aborted request')
      await captureExceptionWithRequestId(noiseError, {
        severity: 'noise',
        category: 'ui',
      })
      return NextResponse.json({
        message: 'NOISE error sent (should be filtered)',
        priority: 'NOISE',
        note: 'This should NOT appear in Sentry dashboard',
      })
    }

    default:
      return NextResponse.json({
        message: 'Sentry Test Endpoint',
        usage: {
          client: '/api/test-sentry?type=client - Test client-side errors',
          server: '/api/test-sentry?type=server - Test server-side errors',
          critical: '/api/test-sentry?type=critical - Test CRITICAL priority',
          high: '/api/test-sentry?type=high - Test HIGH priority',
          medium: '/api/test-sentry?type=medium - Test MEDIUM priority',
          noise: '/api/test-sentry?type=noise - Test NOISE filtering',
        },
        note: 'Check Sentry dashboard after 1-2 minutes',
      })
  }
}
