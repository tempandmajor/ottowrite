/**
 * Security Test: Rate Limiter Single Token Consumption (SEC-002)
 *
 * Verifies that the double-decrement bug is fixed.
 * Each request should consume exactly 1 token, not 2.
 *
 * Bug Description:
 * - Before fix: applyRateLimit() consumed 1 token, then addRateLimitHeaders() consumed another
 * - Result: Every request consumed 2 tokens, halving all configured limits
 * - Fix: addRateLimitHeaders() now uses getRateLimitStatus() which is read-only
 *
 * Test Cases:
 * 1. Single request consumes exactly 1 token
 * 2. getRateLimitStatus() does not consume tokens
 * 3. Multiple requests consume correct number of tokens
 * 4. Burst capacity works correctly with single consumption
 * 5. Expensive operations (costPerRequest > 1) work correctly
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { rateLimit, getRateLimitStatus, clearRateLimit, RateLimitConfig } from '@/lib/security/rate-limiter'

describe('SEC-002: Rate Limiter Single Token Consumption', () => {
  const testConfig: RateLimitConfig = {
    max: 10,
    windowMs: 60000, // 1 minute
    burst: 5, // Total capacity: 15
  }

  const identifier = 'test-user-sec002'

  beforeEach(() => {
    // Clear rate limit before each test
    clearRateLimit(identifier, testConfig)
  })

  // =========================================================================
  // TEST 1: Single Request Consumes Exactly 1 Token
  // =========================================================================
  it('[CRITICAL] Single request consumes exactly 1 token (not 2)', () => {
    // First request - should consume 1 token
    const result1 = rateLimit(identifier, testConfig)

    expect(result1.allowed).toBe(true)
    expect(result1.remaining).toBe(14) // Started with 15 (10 + 5 burst), consumed 1 = 14 remaining

    // Second request - should consume 1 more token
    const result2 = rateLimit(identifier, testConfig)

    expect(result2.allowed).toBe(true)
    expect(result2.remaining).toBe(13) // 14 - 1 = 13 remaining

    // Verify total consumption: 2 requests = 2 tokens consumed
    // Remaining should be: 15 (total) - 2 (consumed) = 13 ✅
  })

  // =========================================================================
  // TEST 2: getRateLimitStatus() Does NOT Consume Tokens (Read-Only)
  // =========================================================================
  it('[CRITICAL] getRateLimitStatus() is read-only and does not consume tokens', () => {
    // Consume 1 token
    const result1 = rateLimit(identifier, testConfig)
    expect(result1.remaining).toBe(14)

    // Call getRateLimitStatus() 5 times - should NOT consume any tokens
    for (let i = 0; i < 5; i++) {
      const status = getRateLimitStatus(identifier, testConfig)
      expect(status.remaining).toBe(14) // Still 14! Not decreasing
      expect(status.allowed).toBe(true)
    }

    // Verify with another rateLimit() call - should still be at 14 - 1 = 13
    const result2 = rateLimit(identifier, testConfig)
    expect(result2.remaining).toBe(13) // Proof that status checks didn't consume
  })

  // =========================================================================
  // TEST 3: Multiple Requests Consume Correct Number of Tokens
  // =========================================================================
  it('[PASS] 10 requests consume exactly 10 tokens', () => {
    const results = []

    // Make 10 requests
    for (let i = 0; i < 10; i++) {
      results.push(rateLimit(identifier, testConfig))
    }

    // All should be allowed
    expect(results.every(r => r.allowed)).toBe(true)

    // Last result should show 5 remaining (15 total - 10 consumed = 5)
    expect(results[9].remaining).toBe(5)

    // Verify with status check (read-only)
    const status = getRateLimitStatus(identifier, testConfig)
    expect(status.remaining).toBe(5)
  })

  // =========================================================================
  // TEST 4: Configured Limits Are Actual Limits (No Halving)
  // =========================================================================
  it('[PASS] Configured limit of 15 allows 15 requests (not halved to 7-8)', () => {
    const results = []

    // Make 15 requests (exactly at the limit)
    for (let i = 0; i < 15; i++) {
      results.push(rateLimit(identifier, testConfig))
    }

    // All 15 should be allowed
    expect(results.filter(r => r.allowed).length).toBe(15)

    // 16th request should be denied
    const result16 = rateLimit(identifier, testConfig)
    expect(result16.allowed).toBe(false)
    expect(result16.remaining).toBe(0)
    expect(result16.retryAfter).toBeGreaterThan(0)
  })

  // =========================================================================
  // TEST 5: Burst Capacity Works With Single Consumption
  // =========================================================================
  it('[PASS] Burst capacity is correctly consumed', () => {
    // Consume all normal tokens (10)
    for (let i = 0; i < 10; i++) {
      const result = rateLimit(identifier, testConfig)
      expect(result.allowed).toBe(true)
      expect(result.burst).toBe(false) // Using normal capacity
    }

    // Next 5 should use burst capacity
    for (let i = 0; i < 5; i++) {
      const result = rateLimit(identifier, testConfig)
      expect(result.allowed).toBe(true)
      expect(result.burst).toBe(true) // Using burst capacity
    }

    // 16th request should be denied (all capacity exhausted)
    const finalResult = rateLimit(identifier, testConfig)
    expect(finalResult.allowed).toBe(false)
    expect(finalResult.remaining).toBe(0)
  })

  // =========================================================================
  // TEST 6: Expensive Operations (costPerRequest > 1)
  // =========================================================================
  it('[PASS] Expensive operations consume correct number of tokens', () => {
    const expensiveConfig: RateLimitConfig = {
      max: 10,
      windowMs: 60000,
      costPerRequest: 3, // Each request costs 3 tokens
    }

    const expensiveIdentifier = 'test-user-expensive'
    clearRateLimit(expensiveIdentifier, expensiveConfig)

    // First request - costs 3 tokens
    const result1 = rateLimit(expensiveIdentifier, expensiveConfig)
    expect(result1.allowed).toBe(true)
    expect(result1.remaining).toBe(7) // 10 - 3 = 7

    // Status check should NOT consume tokens
    const status = getRateLimitStatus(expensiveIdentifier, expensiveConfig)
    expect(status.remaining).toBe(7) // Still 7

    // Second request - costs 3 more tokens
    const result2 = rateLimit(expensiveIdentifier, expensiveConfig)
    expect(result2.allowed).toBe(true)
    expect(result2.remaining).toBe(4) // 7 - 3 = 4

    // Third request - costs 3 more tokens
    const result3 = rateLimit(expensiveIdentifier, expensiveConfig)
    expect(result3.allowed).toBe(true)
    expect(result3.remaining).toBe(1) // 4 - 3 = 1

    // Fourth request - would cost 3 but only 1 available - DENIED
    const result4 = rateLimit(expensiveIdentifier, expensiveConfig)
    expect(result4.allowed).toBe(false)
    expect(result4.remaining).toBe(0)
  })

  // =========================================================================
  // TEST 7: Regression Test - Simulated Before/After Fix
  // =========================================================================
  it('[REGRESSION] Verify fix prevents double decrement', () => {
    // Simulate the workflow: rateLimit() + status check
    // Before fix: Both would decrement
    // After fix: Only rateLimit() decrements

    // 1. Apply rate limit (decrements)
    const rateLimitResult = rateLimit(identifier, testConfig)
    expect(rateLimitResult.remaining).toBe(14) // 15 - 1 = 14

    // 2. Check status for headers (should NOT decrement)
    const statusForHeaders = getRateLimitStatus(identifier, testConfig)
    expect(statusForHeaders.remaining).toBe(14) // Still 14!

    // 3. Next actual request (should be at 13, not 12)
    const nextRequest = rateLimit(identifier, testConfig)
    expect(nextRequest.remaining).toBe(13) // 14 - 1 = 13

    // BEFORE FIX (buggy behavior):
    // - rateLimit() → 14 remaining
    // - getRateLimitStatus() → 13 remaining (BUG: decremented again)
    // - nextRequest → 12 remaining (wrong!)
    // Result: Only 7-8 requests allowed instead of 15

    // AFTER FIX (correct behavior):
    // - rateLimit() → 14 remaining
    // - getRateLimitStatus() → 14 remaining (no change)
    // - nextRequest → 13 remaining (correct!)
    // Result: Full 15 requests allowed ✅
  })

  // =========================================================================
  // TEST 8: No Entry State (Fresh Identifier)
  // =========================================================================
  it('[PASS] getRateLimitStatus() returns full capacity for new identifier', () => {
    const newIdentifier = 'brand-new-user'

    // Check status before any requests
    const status = getRateLimitStatus(newIdentifier, testConfig)

    expect(status.remaining).toBe(15) // Full capacity (10 + 5 burst)
    expect(status.allowed).toBe(true)
    expect(status.resetAt).toBeGreaterThan(Date.now())
  })

  // =========================================================================
  // TEST 9: Expired Window State
  // =========================================================================
  it('[PASS] getRateLimitStatus() returns full capacity after window expires', () => {
    const shortWindowConfig: RateLimitConfig = {
      max: 5,
      windowMs: 100, // 100ms window
    }

    const expiredIdentifier = 'test-user-expired'

    // Consume some tokens
    rateLimit(expiredIdentifier, shortWindowConfig)
    rateLimit(expiredIdentifier, shortWindowConfig)

    // Should have 3 remaining
    let status = getRateLimitStatus(expiredIdentifier, shortWindowConfig)
    expect(status.remaining).toBe(3)

    // Wait for window to expire
    return new Promise(resolve => {
      setTimeout(() => {
        // After expiry, should return full capacity
        status = getRateLimitStatus(expiredIdentifier, shortWindowConfig)
        expect(status.remaining).toBe(5) // Full capacity restored
        expect(status.allowed).toBe(true)
        resolve(undefined)
      }, 150)
    })
  })
})

/**
 * Performance Comparison
 * ======================
 *
 * BEFORE FIX (Double Decrement):
 * - Configured: 50 requests/hour
 * - Actual: 25 requests/hour (50% reduction)
 * - Every request: rateLimit() + rateLimit() = 2 tokens consumed
 *
 * AFTER FIX (Single Decrement):
 * - Configured: 50 requests/hour
 * - Actual: 50 requests/hour ✅
 * - Every request: rateLimit() + getRateLimitStatus() = 1 token consumed
 *
 * Impact on Production Limits:
 * =============================
 *
 * | Limit Type      | Configured | Before Fix | After Fix |
 * |-----------------|------------|------------|-----------|
 * | AI Generate     | 30/min     | 15/min ❌  | 30/min ✅ |
 * | AI Expensive    | 15/min     | 7-8/min ❌ | 15/min ✅ |
 * | General API     | 150/min    | 75/min ❌  | 150/min ✅|
 * | Document Save   | 180/min    | 90/min ❌  | 180/min ✅|
 * | File Upload     | 30/5min    | 15/5min ❌ | 30/5min ✅|
 *
 * User Experience Impact:
 * - BEFORE: Users hit limits at 50% of intended capacity → frustration
 * - AFTER: Users get full intended capacity → better UX ✅
 */

/**
 * Manual Test Scenarios
 * =====================
 *
 * Scenario 1: Verify Single Token Consumption
 * --------------------------------------------
 * 1. Start with fresh identifier
 * 2. Call rateLimit() → expect remaining = initial - 1
 * 3. Call getRateLimitStatus() 5 times → expect remaining stays the same
 * 4. Call rateLimit() → expect remaining = (initial - 1) - 1
 *
 * Scenario 2: Full Capacity Test
 * -------------------------------
 * 1. Configure limit: max=10, burst=5 (total=15)
 * 2. Make 15 rateLimit() calls
 * 3. All 15 should succeed
 * 4. 16th call should fail
 * 5. Remaining should be 0
 *
 * Scenario 3: Production API Simulation
 * --------------------------------------
 * 1. Configure API_GENERAL: max=100, burst=50 (total=150)
 * 2. Simulate 100 API requests (each does rateLimit() + getRateLimitStatus())
 * 3. All 100 should succeed
 * 4. Remaining should be 50 (not 0 as with double-decrement bug)
 */
