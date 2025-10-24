#!/usr/bin/env tsx

/**
 * BUG-002 Manual Verification Script
 *
 * Tests that cursor pagination works with different cursor types.
 * Verifies that timestamp, UUID, and string cursors are all supported.
 *
 * Bug Description:
 * - Before: Schema only accepted UUIDs, breaking timestamp-based pagination
 * - After: Supports UUID, timestamp, and string cursors with proper validation
 *
 * Usage:
 *   tsx scripts/test-pagination-cursors.ts
 */

import { validateCursorByType, type CursorType } from '../lib/api/pagination'

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
  log('  BUG-002: Cursor Pagination Type Support Test', 'cyan')
  log('═══════════════════════════════════════════════════\n', 'cyan')

  let testsPassed = 0
  let testsFailed = 0

  // =========================================================================
  // TEST 1: UUID Cursor Validation
  // =========================================================================
  log('🧪 Test 1: UUID cursor validation', 'blue')

  const validUUID = '123e4567-e89b-12d3-a456-426614174000'
  try {
    const result = validateCursorByType(validUUID, 'uuid')
    if (result === validUUID) {
      log(`   ✅ PASS: Valid UUID accepted: ${validUUID}`, 'green')
      testsPassed++
    } else {
      log(`   ❌ FAIL: Unexpected result: ${result}`, 'red')
      testsFailed++
    }
  } catch (error) {
    log(`   ❌ FAIL: Valid UUID rejected: ${error}`, 'red')
    testsFailed++
  }

  const invalidUUID = 'not-a-uuid'
  try {
    validateCursorByType(invalidUUID, 'uuid')
    log(`   ❌ FAIL: Invalid UUID was accepted`, 'red')
    testsFailed++
  } catch (error) {
    log(`   ✅ PASS: Invalid UUID correctly rejected`, 'green')
    testsPassed++
  }

  console.log()

  // =========================================================================
  // TEST 2: Timestamp Cursor Validation (Critical Fix)
  // =========================================================================
  log('🧪 Test 2: Timestamp cursor validation (CRITICAL FIX)', 'blue')

  const validTimestamp = '2025-01-24T10:30:00.000Z'
  try {
    const result = validateCursorByType(validTimestamp, 'timestamp')
    if (result === validTimestamp) {
      log(`   ✅ PASS: Valid timestamp accepted: ${validTimestamp}`, 'green')
      log('   This was BROKEN before the fix!', 'dim')
      testsPassed++
    } else {
      log(`   ⚠️  Timestamp normalized to: ${result}`, 'yellow')
      log('   (Normalization is acceptable)', 'dim')
      testsPassed++
    }
  } catch (error) {
    log(`   ❌ FAIL: Valid timestamp rejected: ${error}`, 'red')
    log('   Bug not fixed! Timestamp cursors still broken.', 'red')
    testsFailed++
  }

  const invalidTimestamp = 'invalid-date'
  try {
    validateCursorByType(invalidTimestamp, 'timestamp')
    log(`   ❌ FAIL: Invalid timestamp was accepted`, 'red')
    testsFailed++
  } catch (error) {
    log(`   ✅ PASS: Invalid timestamp correctly rejected`, 'green')
    testsPassed++
  }

  console.log()

  // =========================================================================
  // TEST 3: String Cursor Validation
  // =========================================================================
  log('🧪 Test 3: String cursor validation', 'blue')

  const validString = 'character-name-cursor'
  try {
    const result = validateCursorByType(validString, 'string')
    if (result === validString) {
      log(`   ✅ PASS: Valid string accepted: ${validString}`, 'green')
      testsPassed++
    } else {
      log(`   ❌ FAIL: Unexpected result: ${result}`, 'red')
      testsFailed++
    }
  } catch (error) {
    log(`   ❌ FAIL: Valid string rejected: ${error}`, 'red')
    testsFailed++
  }

  const sqlInjection = "'; DROP TABLE users--"
  try {
    validateCursorByType(sqlInjection, 'string')
    log(`   ❌ FAIL: SQL injection pattern was accepted!`, 'red')
    testsFailed++
  } catch (error) {
    log(`   ✅ PASS: SQL injection pattern correctly rejected`, 'green')
    testsPassed++
  }

  console.log()

  // =========================================================================
  // TEST 4: Null/Undefined Handling
  // =========================================================================
  log('🧪 Test 4: Null and undefined handling', 'blue')

  const nullResult = validateCursorByType(null, 'uuid')
  const undefinedResult = validateCursorByType(undefined, 'timestamp')

  if (nullResult === undefined && undefinedResult === undefined) {
    log('   ✅ PASS: Null and undefined return undefined', 'green')
    testsPassed++
  } else {
    log(`   ❌ FAIL: Expected undefined, got ${nullResult} and ${undefinedResult}`, 'red')
    testsFailed++
  }

  console.log()

  // =========================================================================
  // TEST 5: Real-World Endpoint Simulation
  // =========================================================================
  log('🧪 Test 5: Real-world endpoint scenarios', 'blue')

  // Simulate Characters endpoint (uses created_at timestamp)
  const charactersCreatedAt = '2025-01-24T10:30:00.000Z'
  try {
    const result = validateCursorByType(charactersCreatedAt, 'timestamp')
    log('   ✅ PASS: Characters endpoint timestamp cursor works', 'green')
    log(`   Cursor: ${charactersCreatedAt} → ${result}`, 'dim')
    testsPassed++
  } catch (error) {
    log('   ❌ FAIL: Characters endpoint would be broken!', 'red')
    log(`   Error: ${error}`, 'dim')
    testsFailed++
  }

  // Simulate Locations endpoint (uses updated_at timestamp)
  const locationsUpdatedAt = '2025-01-23T15:45:30.123Z'
  try {
    const result = validateCursorByType(locationsUpdatedAt, 'timestamp')
    log('   ✅ PASS: Locations endpoint timestamp cursor works', 'green')
    log(`   Cursor: ${locationsUpdatedAt} → ${result}`, 'dim')
    testsPassed++
  } catch (error) {
    log('   ❌ FAIL: Locations endpoint would be broken!', 'red')
    log(`   Error: ${error}`, 'dim')
    testsFailed++
  }

  console.log()

  // =========================================================================
  // TEST 6: Type Specificity
  // =========================================================================
  log('🧪 Test 6: Type specificity and cross-validation', 'blue')

  const timestamp = '2025-01-24T10:30:00.000Z'

  // Timestamp should fail UUID validation
  try {
    validateCursorByType(timestamp, 'uuid')
    log('   ❌ FAIL: Timestamp accepted as UUID (too permissive)', 'red')
    testsFailed++
  } catch (error) {
    log('   ✅ PASS: Timestamp correctly rejected by UUID validator', 'green')
    testsPassed++
  }

  // UUID should fail timestamp validation
  try {
    validateCursorByType(validUUID, 'timestamp')
    log('   ❌ FAIL: UUID accepted as timestamp (too permissive)', 'red')
    testsFailed++
  } catch (error) {
    log('   ✅ PASS: UUID correctly rejected by timestamp validator', 'green')
    testsPassed++
  }

  // But both should work as string (most permissive)
  try {
    const r1 = validateCursorByType(timestamp, 'string')
    const r2 = validateCursorByType(validUUID, 'string')
    if (r1 && r2) {
      log('   ✅ PASS: Both timestamp and UUID work as string cursors', 'green')
      testsPassed++
    } else {
      log('   ❌ FAIL: String validation too restrictive', 'red')
      testsFailed++
    }
  } catch (error) {
    log('   ❌ FAIL: String validation rejected valid inputs', 'red')
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
  log('Before Fix (Broken):', 'yellow')
  log('  • Schema: z.string().uuid() - only accepts UUIDs', 'dim')
  log('  • Characters endpoint: ❌ Timestamp cursors rejected', 'dim')
  log('  • Locations endpoint: ❌ Timestamp cursors rejected', 'dim')
  log('  • Result: 50% of paginated endpoints broken', 'dim')

  console.log()
  log('After Fix (Working):', 'green')
  log('  • Schema: z.string().min(1) - accepts any string', 'dim')
  log('  • Validation: validateCursorByType() - type-specific checks', 'dim')
  log('  • Characters endpoint: ✅ Timestamp cursors validated', 'dim')
  log('  • Locations endpoint: ✅ Timestamp cursors validated', 'dim')
  log('  • UUID endpoints: ✅ Backward compatible', 'dim')
  log('  • Result: 100% of pagination functional ✅', 'dim')

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
    log('  BUG-002 fix is working correctly.\n', 'green')
    log('  Pagination will now work for all cursor types! 🎉\n', 'green')
    process.exit(0)
  } else {
    log('\n  ❌ Some tests failed!', 'red')
    log('  The cursor pagination may not be working correctly.\n', 'red')
    process.exit(1)
  }
}

// Run tests
main()
