#!/usr/bin/env tsx

/**
 * SEC-001 Manual Security Test
 *
 * Quick verification script for comments authorization fix.
 * Tests that users cannot comment on other users' documents.
 *
 * Usage:
 *   npm run dev  # Start dev server in another terminal
 *   tsx scripts/test-comments-security.ts
 */

import { createClient } from '@supabase/supabase-js'

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
}

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

async function main() {
  log('═══════════════════════════════════════════════════', 'cyan')
  log('  SEC-001: Comments Authorization Security Test', 'cyan')
  log('═══════════════════════════════════════════════════\n', 'cyan')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

  if (!supabaseUrl || !supabaseKey) {
    log('❌ Missing Supabase credentials', 'red')
    log('   Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY\n', 'dim')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  let testsPassed = 0
  let testsFailed = 0

  try {
    // =========================================================================
    // SETUP: Create test users and document
    // =========================================================================
    log('📦 Setting up test environment...', 'blue')

    // Create User A
    const { data: userA } = await supabase.auth.admin.createUser({
      email: `test-user-a-${Date.now()}@test.com`,
      password: 'TestPassword123!',
      email_confirm: true,
    })
    log(`   ✓ Created User A: ${userA.user?.email}`, 'dim')

    // Create User B
    const { data: userB } = await supabase.auth.admin.createUser({
      email: `test-user-b-${Date.now()}@test.com`,
      password: 'TestPassword123!',
      email_confirm: true,
    })
    log(`   ✓ Created User B: ${userB.user?.email}`, 'dim')

    if (!userA.user || !userB.user) {
      throw new Error('Failed to create test users')
    }

    // Get auth tokens
    const loginA = await supabase.auth.signInWithPassword({
      email: userA.user.email!,
      password: 'TestPassword123!',
    })
    const tokenA = loginA.data.session?.access_token

    const loginB = await supabase.auth.signInWithPassword({
      email: userB.user.email!,
      password: 'TestPassword123!',
    })
    const tokenB = loginB.data.session?.access_token

    // Create document owned by User A
    const { data: doc } = await supabase
      .from('documents')
      .insert({
        user_id: userA.user.id,
        title: 'SEC-001 Test Document',
        content: 'Test content for security testing',
        type: 'manuscript',
      })
      .select()
      .single()

    // Create comment thread
    const { data: thread } = await supabase
      .from('comment_threads')
      .insert({
        document_id: doc.id,
        selection_start: 0,
        selection_end: 10,
        created_by: userA.user.id,
      })
      .select()
      .single()

    log(`   ✓ Created test document and thread\n`, 'dim')

    // =========================================================================
    // TEST 1: Authorized User Can Comment (Should Pass)
    // =========================================================================
    log('🧪 Test 1: User A comments on own document', 'blue')

    const test1Response = await fetch('http://localhost:3000/api/comments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        threadId: thread.id,
        content: 'Legitimate comment from User A',
      }),
    })

    const test1Data = await test1Response.json()

    if (test1Response.status === 201 && test1Data.comment) {
      log('   ✅ PASS: User A successfully commented (201 Created)', 'green')
      testsPassed++
    } else {
      log(`   ❌ FAIL: Expected 201, got ${test1Response.status}`, 'red')
      log(`   Response: ${JSON.stringify(test1Data)}`, 'dim')
      testsFailed++
    }
    console.log()

    // =========================================================================
    // TEST 2: Unauthorized User Cannot Comment (Should Fail with 403)
    // =========================================================================
    log('🧪 Test 2: User B tries to comment on User A\'s document', 'blue')

    const test2Response = await fetch('http://localhost:3000/api/comments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`,
      },
      body: JSON.stringify({
        threadId: thread.id,
        content: 'MALICIOUS: User B attacking User A\'s document',
      }),
    })

    const test2Data = await test2Response.json()

    if (test2Response.status === 403 && test2Data.error?.includes('Access denied')) {
      log('   ✅ PASS: User B blocked with 403 Forbidden', 'green')
      log(`   Message: "${test2Data.error}"`, 'dim')
      testsPassed++
    } else if (test2Response.status === 201) {
      log('   ❌ FAIL: Security vulnerability! User B was allowed to comment', 'red')
      log('   The authorization check is not working correctly', 'red')
      testsFailed++
    } else {
      log(`   ⚠️  UNEXPECTED: Got status ${test2Response.status}`, 'yellow')
      log(`   Response: ${JSON.stringify(test2Data)}`, 'dim')
      testsFailed++
    }
    console.log()

    // =========================================================================
    // TEST 3: Invalid Thread Returns 404
    // =========================================================================
    log('🧪 Test 3: Comment on non-existent thread', 'blue')

    const fakeThreadId = '00000000-0000-0000-0000-000000000000'
    const test3Response = await fetch('http://localhost:3000/api/comments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        threadId: fakeThreadId,
        content: 'Comment on fake thread',
      }),
    })

    const test3Data = await test3Response.json()

    if (test3Response.status === 404) {
      log('   ✅ PASS: Invalid thread returns 404 Not Found', 'green')
      testsPassed++
    } else {
      log(`   ❌ FAIL: Expected 404, got ${test3Response.status}`, 'red')
      log(`   Response: ${JSON.stringify(test3Data)}`, 'dim')
      testsFailed++
    }
    console.log()

    // =========================================================================
    // TEST 4: Unauthenticated Request Returns 401
    // =========================================================================
    log('🧪 Test 4: Unauthenticated comment attempt', 'blue')

    const test4Response = await fetch('http://localhost:3000/api/comments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // No Authorization header
      },
      body: JSON.stringify({
        threadId: thread.id,
        content: 'Unauthenticated comment',
      }),
    })

    const test4Data = await test4Response.json()

    if (test4Response.status === 401) {
      log('   ✅ PASS: Unauthenticated request returns 401 Unauthorized', 'green')
      testsPassed++
    } else {
      log(`   ❌ FAIL: Expected 401, got ${test4Response.status}`, 'red')
      log(`   Response: ${JSON.stringify(test4Data)}`, 'dim')
      testsFailed++
    }
    console.log()

    // =========================================================================
    // CLEANUP
    // =========================================================================
    log('🧹 Cleaning up test data...', 'blue')

    await supabase.from('comments').delete().eq('thread_id', thread.id)
    await supabase.from('comment_threads').delete().eq('id', thread.id)
    await supabase.from('documents').delete().eq('id', doc.id)
    await supabase.auth.admin.deleteUser(userA.user.id)
    await supabase.auth.admin.deleteUser(userB.user.id)

    log('   ✓ Test data cleaned up\n', 'dim')

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
      log('\n  ✅ All security tests passed!', 'green')
      log('  SEC-001 fix is working correctly.\n', 'green')
      process.exit(0)
    } else {
      log('\n  ❌ Some tests failed!', 'red')
      log('  Please review the authorization logic.\n', 'red')
      process.exit(1)
    }
  } catch (error) {
    log('\n❌ Test execution failed:', 'red')
    console.error(error)
    process.exit(1)
  }
}

// Run tests
main()
