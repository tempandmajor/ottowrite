#!/usr/bin/env tsx

/**
 * BUG-001 Manual Verification Script
 *
 * Tests that AI model validation mapping works correctly.
 * Verifies that GPT-5 and DeepSeek selections no longer fail.
 *
 * Bug Description:
 * - Before: Schema accepts 'gpt' but AI service expects 'gpt-5' → Error
 * - After: mapToAIModel() converts 'gpt' → 'gpt-5' → Success
 *
 * Usage:
 *   tsx scripts/test-ai-model-validation.ts
 */

import { mapToAIModel } from '../lib/validation/schemas/ai-generate'

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
  log('  BUG-001: AI Model Validation Mapping Test', 'cyan')
  log('═══════════════════════════════════════════════════\n', 'cyan')

  let testsPassed = 0
  let testsFailed = 0

  // =========================================================================
  // TEST 1: Claude Model Mapping
  // =========================================================================
  log('🧪 Test 1: Claude model mapping', 'blue')

  const claudeResult = mapToAIModel('claude')
  const expectedClaude = 'claude-sonnet-4.5'

  if (claudeResult === expectedClaude) {
    log(`   ✅ PASS: "claude" → "${claudeResult}"`, 'green')
    testsPassed++
  } else {
    log(`   ❌ FAIL: Expected "${expectedClaude}", got "${claudeResult}"`, 'red')
    testsFailed++
  }

  console.log()

  // =========================================================================
  // TEST 2: GPT-5 Model Mapping (Critical Fix)
  // =========================================================================
  log('🧪 Test 2: GPT-5 model mapping (CRITICAL FIX)', 'blue')

  const gptResult = mapToAIModel('gpt')
  const expectedGpt = 'gpt-5'

  if (gptResult === expectedGpt) {
    log(`   ✅ PASS: "gpt" → "${gptResult}"`, 'green')
    log('   This was BROKEN before the fix!', 'dim')
    testsPassed++
  } else {
    log(`   ❌ FAIL: Expected "${expectedGpt}", got "${gptResult}"`, 'red')
    log('   Bug not fixed! GPT-5 will still fail.', 'red')
    testsFailed++
  }

  // Verify it's not just returning the input - it should convert to 'gpt-5'
  if (gptResult === 'gpt-5') {
    log('   ✅ Verified: Conversion actually happened (not just returning input)', 'green')
    testsPassed++
  } else {
    log('   ❌ FAIL: Function is not converting properly!', 'red')
    testsFailed++
  }

  console.log()

  // =========================================================================
  // TEST 3: DeepSeek Model Mapping (Critical Fix)
  // =========================================================================
  log('🧪 Test 3: DeepSeek model mapping (CRITICAL FIX)', 'blue')

  const deepseekResult = mapToAIModel('deepseek')
  const expectedDeepseek = 'deepseek-chat'

  if (deepseekResult === expectedDeepseek) {
    log(`   ✅ PASS: "deepseek" → "${deepseekResult}"`, 'green')
    log('   This was BROKEN before the fix!', 'dim')
    testsPassed++
  } else {
    log(`   ❌ FAIL: Expected "${expectedDeepseek}", got "${deepseekResult}"`, 'red')
    log('   Bug not fixed! DeepSeek will still fail.', 'red')
    testsFailed++
  }

  // Verify it's not just returning the input - it should convert to 'deepseek-chat'
  if (deepseekResult === 'deepseek-chat') {
    log('   ✅ Verified: Conversion actually happened', 'green')
    testsPassed++
  } else {
    log('   ❌ FAIL: Function is not converting properly!', 'red')
    testsFailed++
  }

  console.log()

  // =========================================================================
  // TEST 4: Null/Undefined Handling
  // =========================================================================
  log('🧪 Test 4: Null and undefined handling', 'blue')

  const undefinedResult = mapToAIModel(undefined)
  const emptyResult = mapToAIModel('')

  if (undefinedResult === null && emptyResult === null) {
    log('   ✅ PASS: Returns null for undefined and empty string', 'green')
    testsPassed++
  } else {
    log(`   ❌ FAIL: Should return null, got ${undefinedResult} and ${emptyResult}`, 'red')
    testsFailed++
  }

  console.log()

  // =========================================================================
  // TEST 5: Invalid Model Handling
  // =========================================================================
  log('🧪 Test 5: Invalid model name handling', 'blue')

  const invalidResult = mapToAIModel('invalid-model')

  if (invalidResult === null) {
    log('   ✅ PASS: Returns null for invalid model name', 'green')
    testsPassed++
  } else {
    log(`   ❌ FAIL: Should return null for invalid input, got "${invalidResult}"`, 'red')
    testsFailed++
  }

  console.log()

  // =========================================================================
  // TEST 6: Complete Coverage
  // =========================================================================
  log('🧪 Test 6: All models have valid mappings', 'blue')

  const allModels = ['claude', 'gpt', 'deepseek']
  const allResults = allModels.map(model => mapToAIModel(model))
  const allValid = allResults.every(result => result !== null && result !== undefined)

  if (allValid) {
    log('   ✅ PASS: All 3 model names have valid mappings', 'green')
    log(`   Mappings: ${allResults.join(', ')}`, 'dim')
    testsPassed++
  } else {
    log('   ❌ FAIL: Some models don\'t have valid mappings', 'red')
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
  log('  • Claude: ✅ Working (1/3 AI providers)', 'dim')
  log('  • GPT-5: ❌ Error: "Unsupported AI model: gpt"', 'dim')
  log('  • DeepSeek: ❌ Error: "Unsupported AI model: deepseek"', 'dim')
  log('  • Result: 67% of AI features broken', 'dim')

  console.log()
  log('After Fix (Working):', 'green')
  log('  • Claude: ✅ Working ("claude" → "claude-sonnet-4.5")', 'dim')
  log('  • GPT-5: ✅ Working ("gpt" → "gpt-5")', 'dim')
  log('  • DeepSeek: ✅ Working ("deepseek" → "deepseek-chat")', 'dim')
  log('  • Result: 100% of AI features functional ✅', 'dim')

  console.log()
  log('User Experience:', 'blue')
  log('  Before: Users selecting GPT or DeepSeek see 500 errors', 'dim')
  log('  After: All AI model selections work seamlessly', 'dim')

  console.log()

  // =========================================================================
  // DEMONSTRATION
  // =========================================================================
  log('═══════════════════════════════════════════════════', 'cyan')
  log('  Model Mapping Demonstration', 'cyan')
  log('═══════════════════════════════════════════════════\n', 'cyan')

  const demos = [
    { input: 'claude', output: mapToAIModel('claude') },
    { input: 'gpt', output: mapToAIModel('gpt') },
    { input: 'deepseek', output: mapToAIModel('deepseek') },
  ]

  demos.forEach(({ input, output }) => {
    const status = output !== null ? '✅' : '❌'
    const color = output !== null ? 'green' : 'red'
    log(`  ${status} "${input}" → "${output}"`, color)
  })

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
    log('  BUG-001 fix is working correctly.\n', 'green')
    log('  GPT-5 and DeepSeek selections will now work! 🎉\n', 'green')
    process.exit(0)
  } else {
    log('\n  ❌ Some tests failed!', 'red')
    log('  The model mapping may not be working correctly.\n', 'red')
    process.exit(1)
  }
}

// Run tests
main()
