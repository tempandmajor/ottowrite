#!/usr/bin/env tsx

/**
 * Email Notification Testing Script
 *
 * Tests the complete email notification system including:
 * - Resend configuration
 * - Email template rendering
 * - All 6 notification types
 *
 * Usage:
 *   npm run test:email <your-email@example.com>
 *   npm run test:email <your-email@example.com> --type=partner_viewed
 *   npm run test:email <your-email@example.com> --all
 *
 * Requirements:
 * - RESEND_API_KEY environment variable set
 * - RESEND_FROM_EMAIL environment variable set (optional)
 * - tsx installed: npm install -D tsx
 */

import { sendNotificationEmail, sendTestEmail } from '../lib/email/send-notification-email'
import { isEmailConfigured } from '../lib/email/resend-client'

// =============================================================================
// COLORS FOR TERMINAL OUTPUT
// =============================================================================

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logSuccess(message: string) {
  log(`✅ ${message}`, 'green')
}

function logError(message: string) {
  log(`❌ ${message}`, 'red')
}

function logInfo(message: string) {
  log(`ℹ️  ${message}`, 'blue')
}

function logWarning(message: string) {
  log(`⚠️  ${message}`, 'yellow')
}

// =============================================================================
// TEST DATA
// =============================================================================

const sampleData = {
  userName: 'Jane Doe',
  partnerName: 'Literary Partners Agency',
  manuscriptTitle: 'The Last Summer',
  submissionUrl: 'https://ottowrite.app/dashboard/submissions/12345',
}

// =============================================================================
// EMAIL TEST FUNCTIONS
// =============================================================================

async function testEmailConfiguration(): Promise<boolean> {
  log('\n📧 Testing Email Configuration...', 'bright')
  log('=' .repeat(60), 'cyan')

  if (!isEmailConfigured()) {
    logError('Email not configured')
    logInfo('Please set the following environment variables:')
    console.log('  RESEND_API_KEY=re_your_api_key_here')
    console.log('  RESEND_FROM_EMAIL=OttoWrite <noreply@yourdomain.com> (optional)')
    console.log('')
    logInfo('Get your API key from: https://resend.com/api-keys')
    return false
  }

  logSuccess('Email configuration found')
  logInfo(`RESEND_API_KEY: ${process.env.RESEND_API_KEY?.substring(0, 15)}...`)
  logInfo(
    `RESEND_FROM_EMAIL: ${process.env.RESEND_FROM_EMAIL || 'OttoWrite <noreply@ottowrite.app>'}`
  )

  return true
}

async function sendBasicTestEmail(to: string): Promise<boolean> {
  log('\n📨 Sending Basic Test Email...', 'bright')
  log('=' .repeat(60), 'cyan')

  const result = await sendTestEmail(to)

  if (result.success) {
    logSuccess(`Test email sent to ${to}`)
    logInfo(`Email ID: ${result.emailId}`)
    return true
  } else {
    logError(`Failed to send test email: ${result.error}`)
    return false
  }
}

async function testPartnerViewedEmail(to: string): Promise<boolean> {
  log('\n👀 Testing Partner Viewed Email...', 'bright')
  log('=' .repeat(60), 'cyan')

  const result = await sendNotificationEmail({
    type: 'partner_viewed',
    to,
    data: {
      ...sampleData,
      userEmail: to,
      viewedAt: new Date().toLocaleString('en-US', {
        dateStyle: 'long',
        timeStyle: 'short',
      }),
    },
  })

  if (result.success) {
    logSuccess(`Partner Viewed email sent to ${to}`)
    logInfo(`Email ID: ${result.emailId}`)
    return true
  } else {
    logError(`Failed: ${result.error}`)
    return false
  }
}

async function testMaterialRequestedEmail(to: string): Promise<boolean> {
  log('\n📚 Testing Material Requested Email...', 'bright')
  log('=' .repeat(60), 'cyan')

  const result = await sendNotificationEmail({
    type: 'material_requested',
    to,
    data: {
      ...sampleData,
      userEmail: to,
      materialType: 'full',
      requestedAt: new Date().toLocaleString('en-US', {
        dateStyle: 'long',
        timeStyle: 'short',
      }),
      message: 'I really enjoyed your query letter and would love to read the full manuscript!',
    },
  })

  if (result.success) {
    logSuccess(`Material Requested email sent to ${to}`)
    logInfo(`Email ID: ${result.emailId}`)
    return true
  } else {
    logError(`Failed: ${result.error}`)
    return false
  }
}

async function testResponseReceivedEmail(to: string): Promise<boolean> {
  log('\n💬 Testing Response Received Email...', 'bright')
  log('=' .repeat(60), 'cyan')

  const result = await sendNotificationEmail({
    type: 'response_received',
    to,
    data: {
      ...sampleData,
      userEmail: to,
      responseSnippet:
        'Thank you for your submission. I have some questions about your manuscript...',
      receivedAt: new Date().toLocaleString('en-US', {
        dateStyle: 'long',
        timeStyle: 'short',
      }),
    },
  })

  if (result.success) {
    logSuccess(`Response Received email sent to ${to}`)
    logInfo(`Email ID: ${result.emailId}`)
    return true
  } else {
    logError(`Failed: ${result.error}`)
    return false
  }
}

async function testSubmissionAcceptedEmail(to: string): Promise<boolean> {
  log('\n🎉 Testing Submission Accepted Email...', 'bright')
  log('=' .repeat(60), 'cyan')

  const result = await sendNotificationEmail({
    type: 'status_accepted',
    to,
    data: {
      ...sampleData,
      userEmail: to,
      acceptedAt: new Date().toLocaleString('en-US', {
        dateStyle: 'long',
        timeStyle: 'short',
      }),
      message:
        "I would be honored to represent this manuscript. Let's schedule a call to discuss next steps!",
    },
  })

  if (result.success) {
    logSuccess(`Submission Accepted email sent to ${to}`)
    logInfo(`Email ID: ${result.emailId}`)
    return true
  } else {
    logError(`Failed: ${result.error}`)
    return false
  }
}

async function testSubmissionRejectedEmail(to: string): Promise<boolean> {
  log('\n📋 Testing Submission Rejected Email...', 'bright')
  log('=' .repeat(60), 'cyan')

  const result = await sendNotificationEmail({
    type: 'status_rejected',
    to,
    data: {
      ...sampleData,
      userEmail: to,
      rejectedAt: new Date().toLocaleString('en-US', {
        dateStyle: 'long',
        timeStyle: 'short',
      }),
      feedback:
        "While the premise is interesting, I don't feel strongly enough about the voice to take it on at this time. Best of luck finding the right fit!",
    },
  })

  if (result.success) {
    logSuccess(`Submission Rejected email sent to ${to}`)
    logInfo(`Email ID: ${result.emailId}`)
    return true
  } else {
    logError(`Failed: ${result.error}`)
    return false
  }
}

async function testSubmissionReminderEmail(to: string): Promise<boolean> {
  log('\n⏰ Testing Submission Reminder Email...', 'bright')
  log('=' .repeat(60), 'cyan')

  const result = await sendNotificationEmail({
    type: 'submission_reminder',
    to,
    data: {
      ...sampleData,
      userEmail: to,
      submittedAt: 'October 15, 2024',
      daysSinceSubmission: 42,
      lastActivity: 'Partner viewed manuscript on November 1, 2024',
    },
  })

  if (result.success) {
    logSuccess(`Submission Reminder email sent to ${to}`)
    logInfo(`Email ID: ${result.emailId}`)
    return true
  } else {
    logError(`Failed: ${result.error}`)
    return false
  }
}

// =============================================================================
// MAIN TEST RUNNER
// =============================================================================

async function main() {
  const args = process.argv.slice(2)
  const email = args.find((arg) => !arg.startsWith('--'))
  const testAll = args.includes('--all')
  const typeArg = args.find((arg) => arg.startsWith('--type='))
  const testType = typeArg?.split('=')[1]

  log('\n' + '='.repeat(60), 'bright')
  log('📧 OttoWrite Email Notification Testing', 'bright')
  log('='.repeat(60), 'bright')

  // Validate email argument
  if (!email || !email.includes('@')) {
    logError('Please provide a valid email address')
    console.log('')
    console.log('Usage:')
    console.log('  npm run test:email <your-email@example.com>')
    console.log('  npm run test:email <your-email@example.com> --type=partner_viewed')
    console.log('  npm run test:email <your-email@example.com> --all')
    console.log('')
    console.log('Available types:')
    console.log('  - partner_viewed')
    console.log('  - material_requested')
    console.log('  - response_received')
    console.log('  - status_accepted')
    console.log('  - status_rejected')
    console.log('  - submission_reminder')
    process.exit(1)
  }

  // Check email configuration
  const configOk = await testEmailConfiguration()
  if (!configOk) {
    process.exit(1)
  }

  let totalTests = 0
  let passedTests = 0

  // Send basic test email
  totalTests++
  if (await sendBasicTestEmail(email)) {
    passedTests++
  }

  // Wait between emails to avoid rate limiting
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

  if (testAll) {
    // Test all notification types
    log('\n🔄 Testing all notification types...', 'bright')

    await delay(1000)
    totalTests++
    if (await testPartnerViewedEmail(email)) passedTests++

    await delay(1000)
    totalTests++
    if (await testMaterialRequestedEmail(email)) passedTests++

    await delay(1000)
    totalTests++
    if (await testResponseReceivedEmail(email)) passedTests++

    await delay(1000)
    totalTests++
    if (await testSubmissionAcceptedEmail(email)) passedTests++

    await delay(1000)
    totalTests++
    if (await testSubmissionRejectedEmail(email)) passedTests++

    await delay(1000)
    totalTests++
    if (await testSubmissionReminderEmail(email)) passedTests++
  } else if (testType) {
    // Test specific type
    await delay(1000)
    totalTests++

    switch (testType) {
      case 'partner_viewed':
        if (await testPartnerViewedEmail(email)) passedTests++
        break
      case 'material_requested':
        if (await testMaterialRequestedEmail(email)) passedTests++
        break
      case 'response_received':
        if (await testResponseReceivedEmail(email)) passedTests++
        break
      case 'status_accepted':
        if (await testSubmissionAcceptedEmail(email)) passedTests++
        break
      case 'status_rejected':
        if (await testSubmissionRejectedEmail(email)) passedTests++
        break
      case 'submission_reminder':
        if (await testSubmissionReminderEmail(email)) passedTests++
        break
      default:
        logError(`Unknown notification type: ${testType}`)
        totalTests--
    }
  }

  // Summary
  log('\n' + '='.repeat(60), 'bright')
  log('📊 Test Summary', 'bright')
  log('='.repeat(60), 'bright')
  log(`Total tests: ${totalTests}`, 'cyan')
  log(`Passed: ${passedTests}`, 'green')
  log(`Failed: ${totalTests - passedTests}`, passedTests === totalTests ? 'reset' : 'red')
  log('')

  if (passedTests === totalTests) {
    logSuccess('All tests passed! 🎉')
    log('')
    logInfo(`Check your inbox at: ${email}`)
    logInfo('You should receive all test emails within a few minutes.')
  } else {
    logWarning('Some tests failed. Please check the errors above.')
  }

  log('')
}

// Run main function
main().catch((error) => {
  logError(`Unhandled error: ${error.message}`)
  console.error(error)
  process.exit(1)
})
