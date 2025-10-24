/**
 * Load Test: Complete User Journey
 *
 * Simulates a realistic user workflow from login to document creation
 * and editing. This test provides a holistic view of application performance
 * under realistic usage patterns.
 *
 * Journey Steps:
 * 1. User logs in (authentication)
 * 2. User views dashboard (SSR page load)
 * 3. User creates a new project
 * 4. User creates multiple documents in the project
 * 5. User creates characters and locations
 * 6. User adds comments to a document
 * 7. User updates document content
 * 8. User generates AI content
 * 9. User views their projects list
 */

import http from 'k6/http'
import { check, sleep, group } from 'k6'
import { Rate, Trend } from 'k6/metrics'
import { config, getScenarioOptions } from '../config.js'
import {
  setupMultipleUserSessions,
  getRandomUserSession,
  getSupabaseHeaders,
} from '../utils/auth.js'
import {
  generateProject,
  generateDocument,
  generateCharacter,
  generateLocation,
  generateComment,
  generateAIRequest,
} from '../utils/test-data.js'

// Custom metrics for each journey step
const dashboardLoadRate = new Rate('dashboard_load_success')
const projectCreationRate = new Rate('project_creation_success')
const documentCreationRate = new Rate('document_creation_success')
const characterCreationRate = new Rate('character_creation_success')
const locationCreationRate = new Rate('location_creation_success')
const commentCreationRate = new Rate('comment_creation_success')
const documentUpdateRate = new Rate('document_update_success')
const aiGenerationRate = new Rate('ai_generation_success')

const journeyDuration = new Trend('complete_journey_duration')

// Test configuration - Normal traffic scenario
export const options = getScenarioOptions('normal', {
  p95: config.thresholds.api.p95,
})

// Setup
export function setup() {
  console.log('Setting up user journey test...')
  const userSessions = setupMultipleUserSessions()
  console.log(`Authenticated ${userSessions.length} test users`)
  return { userSessions }
}

// Main test function
export default function (data) {
  const { userSessions } = data
  const userSession = getRandomUserSession(userSessions)
  const headers = getSupabaseHeaders(userSession.accessToken)

  const journeyStart = new Date()

  // Step 1: Load Dashboard
  group('Dashboard Load', () => {
    const response = http.get(`${config.baseUrl}/dashboard`, {
      headers: {
        Cookie: `sb-access-token=${userSession.accessToken}`,
      },
    })

    const success = check(response, {
      'dashboard: status 200': (r) => r.status === 200,
      'dashboard: response < 2s': (r) => r.timings.duration < 2000,
      'dashboard: has content': (r) => r.body.includes('dashboard') || r.body.length > 1000,
    })

    dashboardLoadRate.add(success)
  })

  sleep(1)

  // Step 2: Create Project
  let projectId
  group('Create Project', () => {
    const payload = JSON.stringify(generateProject())
    const response = http.post(`${config.baseUrl}/api/projects`, payload, { headers })

    const success = check(response, {
      'create project: status 201': (r) => r.status === 201,
      'create project: has id': (r) => {
        try {
          const body = JSON.parse(r.body)
          return !!body.data?.id
        } catch {
          return false
        }
      },
    })

    projectCreationRate.add(success)

    if (success && response.status === 201) {
      try {
        projectId = JSON.parse(response.body).data.id
      } catch {}
    }
  })

  if (!projectId) {
    console.error('Failed to create project, skipping rest of journey')
    return
  }

  sleep(1)

  // Step 3: Create Documents (2-3 documents)
  const documentIds = []
  group('Create Documents', () => {
    const numDocuments = Math.floor(Math.random() * 2) + 2 // 2-3 documents

    for (let i = 0; i < numDocuments; i++) {
      const payload = JSON.stringify(generateDocument(projectId))
      const response = http.post(`${config.baseUrl}/api/documents`, payload, { headers })

      const success = check(response, {
        [`create document ${i + 1}: status 201`]: (r) => r.status === 201,
        [`create document ${i + 1}: has id`]: (r) => {
          try {
            return !!JSON.parse(r.body).data?.id
          } catch {
            return false
          }
        },
      })

      documentCreationRate.add(success)

      if (success && response.status === 201) {
        try {
          documentIds.push(JSON.parse(response.body).data.id)
        } catch {}
      }

      sleep(0.5)
    }
  })

  sleep(1)

  // Step 4: Create Characters
  group('Create Characters', () => {
    const numCharacters = Math.floor(Math.random() * 2) + 1 // 1-2 characters

    for (let i = 0; i < numCharacters; i++) {
      const payload = JSON.stringify(generateCharacter(projectId))
      const response = http.post(`${config.baseUrl}/api/characters`, payload, { headers })

      const success = check(response, {
        [`create character ${i + 1}: status 201`]: (r) => r.status === 201,
      })

      characterCreationRate.add(success)
      sleep(0.5)
    }
  })

  sleep(1)

  // Step 5: Create Locations
  group('Create Locations', () => {
    const numLocations = Math.floor(Math.random() * 2) + 1 // 1-2 locations

    for (let i = 0; i < numLocations; i++) {
      const payload = JSON.stringify(generateLocation(projectId))
      const response = http.post(`${config.baseUrl}/api/locations`, payload, { headers })

      const success = check(response, {
        [`create location ${i + 1}: status 201`]: (r) => r.status === 201,
      })

      locationCreationRate.add(success)
      sleep(0.5)
    }
  })

  sleep(1)

  // Step 6: Add Comments (if we have documents)
  if (documentIds.length > 0) {
    group('Add Comments', () => {
      const documentId = documentIds[0]
      const payload = JSON.stringify(generateComment(documentId))
      const response = http.post(`${config.baseUrl}/api/comments`, payload, { headers })

      const success = check(response, {
        'create comment: status 201': (r) => r.status === 201,
      })

      commentCreationRate.add(success)
    })

    sleep(1)
  }

  // Step 7: Update Document Content (if we have documents)
  if (documentIds.length > 0) {
    group('Update Document', () => {
      const documentId = documentIds[0]
      const payload = JSON.stringify({
        content: 'Updated content from load test\n\nThis is a realistic update scenario.',
      })
      const response = http.patch(
        `${config.baseUrl}/api/documents/${documentId}`,
        payload,
        { headers }
      )

      const success = check(response, {
        'update document: status 200': (r) => r.status === 200,
      })

      documentUpdateRate.add(success)
    })

    sleep(1)
  }

  // Step 8: Generate AI Content (10% of journeys to avoid overload)
  if (documentIds.length > 0 && Math.random() < 0.1) {
    group('AI Generation', () => {
      const documentId = documentIds[0]
      const aiRequest = generateAIRequest(documentId)
      const payload = JSON.stringify(aiRequest)

      const response = http.post(`${config.baseUrl}/api/ai/generate`, payload, {
        headers,
        timeout: '30s',
      })

      const success = check(response, {
        'ai generate: status 200': (r) => r.status === 200,
        'ai generate: response < 10s': (r) => r.timings.duration < 10000,
      })

      aiGenerationRate.add(success)
    })

    sleep(2)
  }

  // Step 9: List Projects (verify everything is there)
  group('List Projects', () => {
    const response = http.get(`${config.baseUrl}/api/projects`, { headers })

    check(response, {
      'list projects: status 200': (r) => r.status === 200,
      'list projects: has our project': (r) => {
        try {
          const body = JSON.parse(r.body)
          return body.data?.some((p) => p.id === projectId)
        } catch {
          return false
        }
      },
    })
  })

  // Step 10: Cleanup - Delete Project
  group('Cleanup', () => {
    http.del(`${config.baseUrl}/api/projects/${projectId}`, null, { headers })
  })

  // Record total journey duration
  const journeyEnd = new Date()
  journeyDuration.add(journeyEnd - journeyStart)

  // Think time between journeys
  sleep(3)
}

// Teardown
export function teardown(data) {
  console.log('User journey test completed. Check metrics for results.')
}
