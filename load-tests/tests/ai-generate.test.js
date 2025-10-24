/**
 * Load Test: AI Generation API
 *
 * Tests the /api/ai/generate endpoint under load.
 * This endpoint is slower and more expensive, so we test with lower concurrency.
 *
 * Endpoints tested:
 * - POST /api/ai/generate
 */

import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend, Counter } from 'k6/metrics'
import { config, getScenarioOptions } from '../config.js'
import { setupMultipleUserSessions, getRandomUserSession, getSupabaseHeaders } from '../utils/auth.js'
import { generateProject, generateDocument, generateAIRequest } from '../utils/test-data.js'

// Custom metrics
const aiGenerateRate = new Rate('ai_generate_success')
const aiGenerateDuration = new Trend('ai_generate_duration')
const aiGenerateTokens = new Counter('ai_generate_tokens')
const aiGenerateErrors = new Counter('ai_generate_errors')

// Test configuration - Use AI-specific scenario with lower concurrency
export const options = getScenarioOptions('aiLoad', {
  p95: config.thresholds.ai.p95,
  errorRate: config.thresholds.ai.errorRate,
})

// Setup: Authenticate users and create test projects/documents
export function setup() {
  console.log('Setting up AI generation test...')
  const userSessions = setupMultipleUserSessions()

  // Create a test project and document for each user
  const testData = userSessions.map((userSession) => {
    const headers = getSupabaseHeaders(userSession.accessToken)

    // Create project
    const projectPayload = JSON.stringify(generateProject())
    const projectResponse = http.post(
      `${config.baseUrl}/api/projects`,
      projectPayload,
      { headers }
    )

    if (projectResponse.status !== 201) {
      console.error(`Failed to create project for ${userSession.email}`)
      return null
    }

    const project = JSON.parse(projectResponse.body).data

    // Create document
    const documentPayload = JSON.stringify(generateDocument(project.id))
    const documentResponse = http.post(
      `${config.baseUrl}/api/documents`,
      documentPayload,
      { headers }
    )

    if (documentResponse.status !== 201) {
      console.error(`Failed to create document for ${userSession.email}`)
      return null
    }

    const document = JSON.parse(documentResponse.body).data

    return {
      userSession,
      projectId: project.id,
      documentId: document.id,
    }
  }).filter(Boolean)

  console.log(`Setup complete: ${testData.length} test contexts created`)
  return { testData }
}

// Main test function
export default function (data) {
  const { testData } = data

  if (!testData || testData.length === 0) {
    console.error('No test data available')
    return
  }

  const testContext = testData[Math.floor(Math.random() * testData.length)]
  const headers = getSupabaseHeaders(testContext.userSession.accessToken)

  // Test AI generation
  testAIGeneration(headers, testContext.documentId)

  // Longer sleep time between AI requests (these are expensive)
  sleep(5)
}

/**
 * Test POST /api/ai/generate
 */
function testAIGeneration(headers, documentId) {
  const aiRequest = generateAIRequest(documentId)
  const payload = JSON.stringify(aiRequest)

  const startTime = new Date()
  const response = http.post(`${config.baseUrl}/api/ai/generate`, payload, {
    headers,
    timeout: '30s', // AI requests can take longer
  })
  const duration = new Date() - startTime

  const success = check(response, {
    'ai generate: status 200': (r) => r.status === 200,
    'ai generate: has content': (r) => {
      try {
        const body = JSON.parse(r.body)
        return !!body.data?.content || !!body.data?.text
      } catch {
        return false
      }
    },
    'ai generate: response < 10s': (r) => r.timings.duration < 10000,
    'ai generate: response < 5s (p95 target)': (r) => r.timings.duration < 5000,
  })

  aiGenerateRate.add(success)
  aiGenerateDuration.add(response.timings.duration)

  // Track token usage if available
  if (success && response.status === 200) {
    try {
      const body = JSON.parse(response.body)
      if (body.data?.usage?.total_tokens) {
        aiGenerateTokens.add(body.data.usage.total_tokens)
      }
    } catch (error) {
      // Ignore parsing errors
    }
  } else {
    aiGenerateErrors.add(1)
    console.error(`AI generation failed: ${response.status} - ${response.body}`)
  }
}

// Teardown: Clean up test projects and documents
export function teardown(data) {
  if (!data || !data.testData) return

  console.log('Cleaning up test data...')

  data.testData.forEach((testContext) => {
    if (!testContext) return

    const headers = getSupabaseHeaders(testContext.userSession.accessToken)

    // Delete project (cascades to documents)
    http.del(`${config.baseUrl}/api/projects/${testContext.projectId}`, null, { headers })
  })

  console.log('Cleanup complete')
}
