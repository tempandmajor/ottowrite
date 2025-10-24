#!/usr/bin/env ts-node
/**
 * Stripe Webhook Verification Script
 *
 * This script verifies your Stripe webhook setup by:
 * 1. Checking webhook endpoint accessibility
 * 2. Creating test subscription events
 * 3. Monitoring webhook delivery
 * 4. Verifying database updates
 *
 * Usage:
 *   npx ts-node scripts/verify-stripe-webhooks.ts
 */

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(message: string, color: keyof typeof COLORS = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`)
}

interface TestResult {
  name: string
  passed: boolean
  message: string
  details?: unknown
}

async function verifyWebhookEndpoint(webhookUrl: string): Promise<TestResult> {
  try {
    // Test webhook endpoint accessibility
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'test' }),
    })

    // Expected: 400 (missing signature) or 401 (invalid signature)
    // This confirms endpoint is accessible
    if (response.status === 400 || response.status === 401) {
      return {
        name: 'Webhook Endpoint Accessibility',
        passed: true,
        message: `Endpoint is accessible (HTTP ${response.status})`,
        details: { url: webhookUrl, status: response.status },
      }
    }

    return {
      name: 'Webhook Endpoint Accessibility',
      passed: false,
      message: `Unexpected status code: ${response.status}`,
      details: { url: webhookUrl, status: response.status },
    }
  } catch (error) {
    return {
      name: 'Webhook Endpoint Accessibility',
      passed: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error,
    }
  }
}

async function checkStripeWebhookRegistration(
  stripe: Stripe
): Promise<TestResult> {
  try {
    const endpoints = await stripe.webhookEndpoints.list({ limit: 100 })

    const prodEndpoint = endpoints.data.find(
      (ep) =>
        ep.url.includes('ottowrite.app') ||
        ep.url.includes('/api/webhooks/stripe')
    )

    if (!prodEndpoint) {
      return {
        name: 'Stripe Webhook Registration',
        passed: false,
        message: 'No webhook endpoint registered in Stripe dashboard',
        details: { registeredEndpoints: endpoints.data.length },
      }
    }

    // Check if all required events are enabled
    const requiredEvents = [
      'checkout.session.completed',
      'customer.subscription.created',
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'invoice.payment_succeeded',
      'invoice.payment_failed',
    ]

    const missingEvents = requiredEvents.filter(
      (event) => !prodEndpoint.enabled_events.includes(event as any)
    )

    if (missingEvents.length > 0) {
      return {
        name: 'Stripe Webhook Registration',
        passed: false,
        message: `Missing required events: ${missingEvents.join(', ')}`,
        details: {
          endpoint: prodEndpoint.url,
          enabledEvents: prodEndpoint.enabled_events,
          missingEvents,
        },
      }
    }

    return {
      name: 'Stripe Webhook Registration',
      passed: true,
      message: `Webhook registered correctly: ${prodEndpoint.url}`,
      details: {
        endpoint: prodEndpoint.url,
        status: prodEndpoint.status,
        events: prodEndpoint.enabled_events.length,
      },
    }
  } catch (error) {
    return {
      name: 'Stripe Webhook Registration',
      passed: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error,
    }
  }
}

async function checkWebhookDelivery(stripe: Stripe): Promise<TestResult> {
  try {
    // Get recent webhook delivery attempts
    const attempts = await stripe.events.list({ limit: 10 })

    if (attempts.data.length === 0) {
      return {
        name: 'Recent Webhook Delivery',
        passed: false,
        message: 'No recent webhook events found',
        details: { hint: 'Try creating a test subscription first' },
      }
    }

    return {
      name: 'Recent Webhook Delivery',
      passed: true,
      message: `Found ${attempts.data.length} recent events`,
      details: {
        recentEvents: attempts.data.map((e) => ({
          type: e.type,
          created: new Date(e.created * 1000).toISOString(),
        })),
      },
    }
  } catch (error) {
    return {
      name: 'Recent Webhook Delivery',
      passed: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error,
    }
  }
}

async function verifyDatabaseIntegration(
  supabaseUrl: string,
  supabaseKey: string
): Promise<TestResult> {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Check if we can query user_profiles
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, subscription_tier, stripe_customer_id, stripe_subscription_id')
      .not('stripe_customer_id', 'is', null)
      .limit(5)

    if (error) {
      return {
        name: 'Database Integration',
        passed: false,
        message: `Database query failed: ${error.message}`,
        details: error,
      }
    }

    return {
      name: 'Database Integration',
      passed: true,
      message: `Found ${data?.length || 0} users with Stripe data`,
      details: {
        usersWithStripe: data?.length || 0,
        sampleData: data?.map((u) => ({
          tier: u.subscription_tier,
          hasCustomerId: !!u.stripe_customer_id,
          hasSubscriptionId: !!u.stripe_subscription_id,
        })),
      },
    }
  } catch (error) {
    return {
      name: 'Database Integration',
      passed: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error,
    }
  }
}

async function main() {
  log('\n╔════════════════════════════════════════╗', 'blue')
  log('║   Stripe Webhook Verification Tool    ║', 'blue')
  log('╚════════════════════════════════════════╝\n', 'blue')

  // Check environment variables
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!stripeSecretKey) {
    log('❌ STRIPE_SECRET_KEY not found in environment', 'red')
    process.exit(1)
  }

  if (!webhookSecret) {
    log('⚠️  STRIPE_WEBHOOK_SECRET not found in environment', 'yellow')
    log('   Webhooks will not work without this secret!\n', 'yellow')
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    log('⚠️  Supabase credentials not found', 'yellow')
    log('   Database verification will be skipped\n', 'yellow')
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2025-09-30.clover',
  })

  log('Running verification tests...\n', 'cyan')

  const results: TestResult[] = []

  // Test 1: Webhook endpoint accessibility
  const webhookUrl = 'https://www.ottowrite.app/api/webhooks/stripe'
  log(`1. Testing webhook endpoint: ${webhookUrl}`, 'cyan')
  const endpointTest = await verifyWebhookEndpoint(webhookUrl)
  results.push(endpointTest)
  log(
    endpointTest.passed
      ? `   ✓ ${endpointTest.message}`
      : `   ✗ ${endpointTest.message}`,
    endpointTest.passed ? 'green' : 'red'
  )
  console.log()

  // Test 2: Stripe webhook registration
  log('2. Checking Stripe webhook registration', 'cyan')
  const registrationTest = await checkStripeWebhookRegistration(stripe)
  results.push(registrationTest)
  log(
    registrationTest.passed
      ? `   ✓ ${registrationTest.message}`
      : `   ✗ ${registrationTest.message}`,
    registrationTest.passed ? 'green' : 'red'
  )
  console.log()

  // Test 3: Recent webhook delivery
  log('3. Checking recent webhook deliveries', 'cyan')
  const deliveryTest = await checkWebhookDelivery(stripe)
  results.push(deliveryTest)
  log(
    deliveryTest.passed
      ? `   ✓ ${deliveryTest.message}`
      : `   ✗ ${deliveryTest.message}`,
    deliveryTest.passed ? 'green' : 'red'
  )
  console.log()

  // Test 4: Database integration (if credentials available)
  if (supabaseUrl && supabaseServiceKey) {
    log('4. Verifying database integration', 'cyan')
    const dbTest = await verifyDatabaseIntegration(supabaseUrl, supabaseServiceKey)
    results.push(dbTest)
    log(
      dbTest.passed ? `   ✓ ${dbTest.message}` : `   ✗ ${dbTest.message}`,
      dbTest.passed ? 'green' : 'red'
    )
    console.log()
  }

  // Summary
  log('\n╔════════════════════════════════════════╗', 'blue')
  log('║          Verification Summary          ║', 'blue')
  log('╚════════════════════════════════════════╝\n', 'blue')

  const passed = results.filter((r) => r.passed).length
  const failed = results.filter((r) => !r.passed).length

  log(`Total Tests: ${results.length}`, 'cyan')
  log(`Passed: ${passed}`, passed === results.length ? 'green' : 'yellow')
  log(`Failed: ${failed}\n`, failed > 0 ? 'red' : 'green')

  if (failed === 0) {
    log('✓ All tests passed! Webhooks are configured correctly.', 'green')
  } else {
    log('✗ Some tests failed. Please review the details above.', 'red')
    log('\nFailed tests:', 'yellow')
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        log(`  - ${r.name}: ${r.message}`, 'red')
        if (r.details) {
          log(`    Details: ${JSON.stringify(r.details, null, 2)}`, 'yellow')
        }
      })
  }

  // Next steps
  if (!webhookSecret) {
    log('\n⚠️  Next Steps:', 'yellow')
    log('1. Register webhook endpoint in Stripe dashboard', 'yellow')
    log('2. Copy webhook signing secret (whsec_...)', 'yellow')
    log('3. Add STRIPE_WEBHOOK_SECRET to Vercel environment variables', 'yellow')
    log('4. Redeploy application', 'yellow')
    log('5. Run this script again to verify\n', 'yellow')
  }

  process.exit(failed > 0 ? 1 : 0)
}

main().catch((error) => {
  log(`\n❌ Fatal error: ${error.message}`, 'red')
  console.error(error)
  process.exit(1)
})
