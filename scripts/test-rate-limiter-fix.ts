#!/usr/bin/env tsx

/**
 * SEC-002 Manual Verification Script
 *
 * Tests that the rate limiter double-decrement bug is fixed.
 * Verifies that each request consumes exactly 1 token (not 2).
 *
 * Bug Description:
 * - Before: applyRateLimit() consumed 1 token + addRateLimitHeaders() consumed 1 token = 2 per request
 * - After: applyRateLimit() consumed 1 token + addRateLimitHeaders() reads status only = 1 per request
 *
 * Usage:
 *   tsx scripts/test-rate-limiter-fix.ts
 */

import { rateLimit, getRateLimitStatus, clearRateLimit, RateLimitConfig } from '../lib/security/rate-limiter'

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
}

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function main() {
  log('═══════════════════════════════════════════════════', 'cyan')
  log('  SEC-002: Rate Limiter Single Token Consumption', 'cyan')
  log('═══════════════════════════════════════════════════\n', 'cyan')

  let testsPassed = 0
  let testsFailed = 0

  const testConfig: RateLimitConfig = {
    max: 10,
    windowMs: 60000, // 1 minute
    burst: 5, // Total capacity: 15
  }

  const identifier = 'test-user-manual'

  // =========================================================================
  // TEST 1: Single Request Consumes Exactly 1 Token
  // =========================================================================
  log('🧪 Test 1: Single request token consumption', 'blue')

  clearRateLimit(identifier, testConfig)

  const result1 = rateLimit(identifier, testConfig)
  const expected1 = 14 // 15 total - 1 consumed = 14

  if (result1.remaining === expected1) {
    log(`   ✅ PASS: First request consumed 1 token (${expected1} remaining)`, 'green')
    testsPassed++
  } else {
    log(`   ❌ FAIL: Expected ${expected1} remaining, got ${result1.remaining}`, 'red')
    testsFailed++
  }

  const result2 = rateLimit(identifier, testConfig)
  const expected2 = 13 // 14 - 1 = 13

  if (result2.remaining === expected2) {
    log(`   ✅ PASS: Second request consumed 1 token (${expected2} remaining)`, 'green')
    testsPassed++
  } else {
    log(`   ❌ FAIL: Expected ${expected2} remaining, got ${result2.remaining}`, 'red')
    testsFailed++
  }

  console.log()

  // =========================================================================
  // TEST 2: getRateLimitStatus() Does NOT Consume Tokens
  // =========================================================================
  log('🧪 Test 2: Status check is read-only (critical fix verification)', 'blue')

  clearRateLimit(identifier, testConfig)

  // Consume 1 token
  const firstRequest = rateLimit(identifier, testConfig)
  log(`   After 1st request: ${firstRequest.remaining} remaining`, 'dim')

  // Check status 5 times - should NOT decrement
  let allStatusChecksCorrect = true
  for (let i = 1; i <= 5; i++) {
    const status = getRateLimitStatus(identifier, testConfig)
    if (status.remaining !== 14) {
      allStatusChecksCorrect = false
      log(`   ❌ Status check ${i} consumed tokens! Got ${status.remaining} instead of 14`, 'red')
    }
  }

  if (allStatusChecksCorrect) {
    log('   ✅ PASS: 5 status checks did NOT consume any tokens', 'green')
    testsPassed++
  } else {
    log('   ❌ FAIL: Status checks consumed tokens (bug not fixed!)', 'red')
    testsFailed++
  }

  // Verify with actual request
  const nextRequest = rateLimit(identifier, testConfig)
  if (nextRequest.remaining === 13) {
    log('   ✅ PASS: Next request correctly shows 13 remaining', 'green')
    log('   (Proof that status checks were truly read-only)', 'dim')
    testsPassed++
  } else {
    log(`   ❌ FAIL: Expected 13 remaining, got ${nextRequest.remaining}`, 'red')
    log('   This indicates status checks consumed tokens!', 'red')
    testsFailed++
  }

  console.log()

  // =========================================================================
  // TEST 3: Full Capacity Available (No Halving)
  // =========================================================================
  log('🧪 Test 3: Configured limit is actual limit (not halved)', 'blue')

  clearRateLimit(identifier, testConfig)

  const results = []
  for (let i = 0; i < 15; i++) {
    results.push(rateLimit(identifier, testConfig))
  }

  const allAllowed = results.every(r => r.allowed)
  const lastRemaining = results[14].remaining

  if (allAllowed && lastRemaining === 0) {
    log('   ✅ PASS: All 15 requests allowed (not halved to 7-8)', 'green')
    log(`   Final state: ${lastRemaining} remaining`, 'dim')
    testsPassed++
  } else {
    log('   ❌ FAIL: Not all requests allowed or wrong remaining count', 'red')
    log(`   Allowed: ${results.filter(r => r.allowed).length}/15`, 'dim')
    log(`   Last remaining: ${lastRemaining}`, 'dim')
    testsFailed++
  }

  // 16th request should be denied
  const denied = rateLimit(identifier, testConfig)
  if (!denied.allowed && denied.remaining === 0) {
    log('   ✅ PASS: 16th request correctly denied', 'green')
    testsPassed++
  } else {
    log('   ❌ FAIL: 16th request should be denied', 'red')
    testsFailed++
  }

  console.log()

  // =========================================================================
  // TEST 4: Production Rate Limit Simulation
  // =========================================================================
  log('🧪 Test 4: Production API limit simulation', 'blue')

  const prodConfig: RateLimitConfig = {
    max: 100,
    windowMs: 60000,
    burst: 50,
  }
  const prodIdentifier = 'prod-user'

  clearRateLimit(prodIdentifier, prodConfig)

  // Simulate 100 API requests
  // Each request in production does: rateLimit() + getRateLimitStatus()
  let prodResults = []
  for (let i = 0; i < 100; i++) {
    const limitResult = rateLimit(prodIdentifier, prodConfig)
    getRateLimitStatus(prodIdentifier, prodConfig) // Simulate header addition
    prodResults.push(limitResult)
  }

  const allProdAllowed = prodResults.every(r => r.allowed)
  const prodRemaining = getRateLimitStatus(prodIdentifier, prodConfig).remaining

  if (allProdAllowed && prodRemaining === 50) {
    log('   ✅ PASS: 100 API requests allowed with 50 remaining', 'green')
    log('   (Before fix: would have been ~50 allowed, 0 remaining)', 'dim')
    testsPassed++
  } else {
    log('   ❌ FAIL: Production simulation incorrect', 'red')
    log(`   Allowed: ${prodResults.filter(r => r.allowed).length}/100`, 'dim')
    log(`   Remaining: ${prodRemaining} (expected 50)`, 'dim')
    testsFailed++
  }

  console.log()

  // =========================================================================
  // TEST 5: Expensive Operations (costPerRequest > 1)
  // =========================================================================
  log('🧪 Test 5: Expensive operations consume correct tokens', 'blue')

  const expensiveConfig: RateLimitConfig = {
    max: 10,
    windowMs: 60000,
    costPerRequest: 3,
  }
  const expensiveIdentifier = 'expensive-user'

  clearRateLimit(expensiveIdentifier, expensiveConfig)

  // First request costs 3 tokens
  const exp1 = rateLimit(expensiveIdentifier, expensiveConfig)
  // Status check should NOT consume tokens
  const expStatus = getRateLimitStatus(expensiveIdentifier, expensiveConfig)
  // Second request costs 3 more
  const exp2 = rateLimit(expensiveIdentifier, expensiveConfig)

  if (exp1.remaining === 7 && expStatus.remaining === 7 && exp2.remaining === 4) {
    log('   ✅ PASS: Expensive operations consume correct tokens', 'green')
    log('   Request 1: 10 - 3 = 7 remaining ✓', 'dim')
    log('   Status check: still 7 remaining ✓', 'dim')
    log('   Request 2: 7 - 3 = 4 remaining ✓', 'dim')
    testsPassed++
  } else {
    log('   ❌ FAIL: Expensive operations not working correctly', 'red')
    log(`   Expected: 7, 7, 4 | Got: ${exp1.remaining}, ${expStatus.remaining}, ${exp2.remaining}`, 'dim')
    testsFailed++
  }

  console.log()

  // =========================================================================
  // IMPACT SUMMARY
  // =========================================================================
  log('═══════════════════════════════════════════════════', 'cyan')
  log('  Impact Analysis', 'cyan')
  log('═══════════════════════════════════════════════════', 'cyan')

  console.log()
  log('Before Fix (Double Decrement):', 'yellow')
  log('  • Configured: 150 requests/min → Actual: 75 requests/min ❌', 'dim')
  log('  • Users hit limits at 50% capacity', 'dim')
  log('  • Every request consumed 2 tokens instead of 1', 'dim')

  console.log()
  log('After Fix (Single Decrement):', 'green')
  log('  • Configured: 150 requests/min → Actual: 150 requests/min ✅', 'dim')
  log('  • Users get full intended capacity', 'dim')
  log('  • getRateLimitStatus() is read-only, zero cost', 'dim')

  console.log()

  // =========================================================================
  // RESULTS
  // =========================================================================
  log('═══════════════════════════════════════════════════', 'cyan')
  log('  Test Results', 'cyan')
  log('═══════════════════════════════════════════════════', 'cyan')

  const totalTests = testsPassed + testsFailed
  log(`\n  Total Tests:  ${totalTests}`, 'blue')
  log(`  Passed:       ${testsPassed}`, 'green')
  log(`  Failed:       ${testsFailed}`, testsFailed > 0 ? 'red' : 'green')

  if (testsFailed === 0) {
    log('\n  ✅ All tests passed!', 'green')
    log('  SEC-002 fix is working correctly.\n', 'green')
    process.exit(0)
  } else {
    log('\n  ❌ Some tests failed!', 'red')
    log('  The double-decrement bug may still exist.\n', 'red')
    process.exit(1)
  }
}

// Run tests
main()
