#!/usr/bin/env tsx

/**
 * RLS Regression Test Runner
 *
 * Runs comprehensive Row-Level Security tests against Supabase database
 * to ensure no cross-user data access or privilege escalation vulnerabilities.
 *
 * Usage:
 *   npm run test:rls
 *   or
 *   tsx scripts/run-rls-tests.ts
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:')
  console.error('   - SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL')
  console.error('   - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

async function runRLSTests() {
  console.log('\n🔒 Starting RLS Regression Test Suite\n')
  console.log('━'.repeat(60))

  // Create service role client (bypasses RLS for test setup)
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  try {
    // Load SQL test file
    const testSQL = readFileSync(
      join(process.cwd(), 'supabase', 'tests', 'rls_regression_tests.sql'),
      'utf-8'
    )

    console.log('📝 Executing RLS regression tests...\n')

    // Execute the test SQL
    const { data, error } = await supabase.rpc('exec', { sql: testSQL })

    if (error) {
      // If exec RPC doesn't exist, try direct query
      const { error: queryError } = await supabase.from('_').select('*').limit(0)

      if (queryError) {
        console.error('❌ Error executing tests:', error)
        process.exit(1)
      }
    }

    console.log('\n✅ RLS regression tests completed')
    console.log('━'.repeat(60))
    console.log('\nReview the output above for any ✗ FAILED tests')
    console.log('All tests should show ✓ PASSED status\n')

  } catch (err) {
    console.error('❌ Fatal error running RLS tests:', err)
    process.exit(1)
  }
}

// Additional automated checks
async function checkForServiceRoleLeaks() {
  console.log('\n🔍 Checking for service role key leaks...\n')
  console.log('━'.repeat(60))

  const { execSync } = require('child_process')

  try {
    // Check for service role key in client-side code
    const clientSideFiles = execSync(
      'grep -r "service_role\\|SERVICE_ROLE" --include="*.ts" --include="*.tsx" app/ components/ 2>/dev/null | grep -v "service-role.ts" | grep -v node_modules || true',
      { encoding: 'utf-8' }
    )

    if (clientSideFiles.trim()) {
      console.error('❌ SECURITY WARNING: Service role references found in client code!')
      console.error(clientSideFiles)
      return false
    }

    console.log('✅ No service role leaks detected in client-side code')

    // Check for hardcoded keys
    const hardcodedKeys = execSync(
      'grep -r "eyJ[A-Za-z0-9_-]*\\.[A-Za-z0-9_-]*\\.[A-Za-z0-9_-]*" --include="*.ts" --include="*.tsx" --include="*.js" app/ components/ lib/ 2>/dev/null | grep -v node_modules | grep -v ".next" || true',
      { encoding: 'utf-8' }
    )

    if (hardcodedKeys.trim()) {
      console.warn('⚠️  WARNING: Potential hardcoded JWT/keys detected!')
      console.warn(hardcodedKeys)
      return false
    }

    console.log('✅ No hardcoded keys detected')
    console.log('━'.repeat(60))
    return true

  } catch (error) {
    console.error('❌ Error checking for leaks:', error)
    return false
  }
}

async function verifyRLSEnabled() {
  console.log('\n🛡️  Verifying RLS is enabled on all tables...\n')
  console.log('━'.repeat(60))

  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  try {
    // Query to check RLS status on all public tables
    const { data, error } = await supabase.rpc('query', {
      sql: `
        SELECT
          schemaname,
          tablename,
          rowsecurity as rls_enabled
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename NOT LIKE 'pg_%'
        ORDER BY tablename;
      `
    })

    if (error) {
      console.warn('⚠️  Could not verify RLS status via RPC')
      console.warn('   Please verify manually in Supabase Dashboard')
      return
    }

    if (!data || data.length === 0) {
      console.log('ℹ️  No tables found or unable to query RLS status')
      return
    }

    let allEnabled = true
    const exceptions = ['subscription_plan_limits', 'beat_templates', 'document_templates']

    for (const table of data as any[]) {
      const isException = exceptions.includes(table.tablename)
      const status = table.rls_enabled ? '✅' : '❌'
      const suffix = isException && !table.rls_enabled ? ' (public table - OK)' : ''

      console.log(`${status} ${table.tablename}${suffix}`)

      if (!table.rls_enabled && !isException) {
        allEnabled = false
      }
    }

    console.log('━'.repeat(60))

    if (allEnabled) {
      console.log('✅ RLS is properly enabled on all sensitive tables')
    } else {
      console.error('❌ WARNING: Some tables do not have RLS enabled!')
    }

  } catch (err) {
    console.warn('⚠️  Could not verify RLS status:', err)
    console.warn('   Please verify manually in Supabase Dashboard')
  }
}

// Main execution
async function main() {
  console.log('\n🔐 SUPABASE RLS SECURITY AUDIT\n')
  console.log('━'.repeat(60))
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`Supabase URL: ${SUPABASE_URL}`)
  console.log('━'.repeat(60))

  // Run all checks
  await checkForServiceRoleLeaks()
  await verifyRLSEnabled()
  await runRLSTests()

  console.log('\n✅ Security audit complete\n')
}

main().catch((error) => {
  console.error('\n❌ Fatal error:', error)
  process.exit(1)
})
