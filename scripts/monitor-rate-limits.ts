#!/usr/bin/env tsx

/**
 * Rate Limit Monitoring CLI
 *
 * View rate limit statistics and abuse patterns.
 *
 * Usage:
 *   npm run monitor:rate-limits
 *   npm run monitor:rate-limits --window=24  # Last 24 hours
 *   npm run monitor:rate-limits --watch      # Auto-refresh every 10s
 *
 * Ticket: PROD-008
 */

import {
  getRateLimitStats,
  generateMonitoringReport,
  detectAbusePatterns,
  shouldAdjustRateLimits,
} from '../lib/monitoring/rate-limit-monitor'

// ============================================================================
// COLORS
// ============================================================================

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const args = process.argv.slice(2)
  const windowArg = args.find((arg) => arg.startsWith('--window='))
  const watchMode = args.includes('--watch')

  const windowHours = windowArg ? parseInt(windowArg.split('=')[1], 10) : 1
  const windowMs = windowHours * 60 * 60 * 1000

  async function displayReport() {
    // Clear console in watch mode
    if (watchMode) {
      console.clear()
    }

    // Generate and display report
    const report = generateMonitoringReport(windowMs)
    console.log(report)

    // Check if adjustments needed
    const adjustment = shouldAdjustRateLimits(windowMs)
    if (adjustment.shouldAdjust) {
      log('', 'reset')
      log('⚠️  RECOMMENDATION', 'yellow')
      log('─'.repeat(70), 'dim')
      log(adjustment.reason || 'Consider adjusting rate limits', 'yellow')
      log('', 'reset')
    }

    // Show abuse patterns summary
    const abusePatterns = detectAbusePatterns(windowMs)
    if (abusePatterns.length > 0) {
      const critical = abusePatterns.filter((p) => p.severity === 'critical')
      const high = abusePatterns.filter((p) => p.severity === 'high')

      if (critical.length > 0 || high.length > 0) {
        log('', 'reset')
        log('🚨 IMMEDIATE ACTION REQUIRED', 'red')
        log('─'.repeat(70), 'dim')
        if (critical.length > 0) {
          log(`  ${critical.length} CRITICAL abuse pattern(s) detected`, 'red')
        }
        if (high.length > 0) {
          log(`  ${high.length} HIGH severity abuse pattern(s) detected`, 'yellow')
        }
        log('', 'reset')
        log('Actions:', 'cyan')
        log('  1. Review abuse patterns above', 'dim')
        log('  2. Consider IP blocking or user suspension', 'dim')
        log('  3. Check application logs for suspicious activity', 'dim')
        log('', 'reset')
      }
    }

    if (watchMode) {
      log(`Last updated: ${new Date().toLocaleTimeString()}`, 'dim')
      log('Press Ctrl+C to exit', 'dim')
    }
  }

  // Initial display
  await displayReport()

  // Watch mode: refresh every 10 seconds
  if (watchMode) {
    setInterval(async () => {
      await displayReport()
    }, 10000)
  }
}

// Run
main().catch((error) => {
  console.error('Error:', error)
  process.exit(1)
})
