/**
 * Load Test: Projects API
 *
 * Tests the /api/projects endpoint under various load scenarios.
 *
 * Endpoints tested:
 * - GET /api/projects (list projects)
 * - POST /api/projects (create project)
 * - GET /api/projects/[id] (get project)
 * - PATCH /api/projects/[id] (update project)
 * - DELETE /api/projects/[id] (delete project)
 */

import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'
import { config, getScenarioOptions } from '../config.js'
import { setupMultipleUserSessions, getRandomUserSession, getSupabaseHeaders } from '../utils/auth.js'
import { generateProject } from '../utils/test-data.js'

// Custom metrics
const projectListRate = new Rate('project_list_success')
const projectCreateRate = new Rate('project_create_success')
const projectGetRate = new Rate('project_get_success')
const projectUpdateRate = new Rate('project_update_success')
const projectDeleteRate = new Rate('project_delete_success')

const projectListDuration = new Trend('project_list_duration')
const projectCreateDuration = new Trend('project_create_duration')
const projectGetDuration = new Trend('project_get_duration')
const projectUpdateDuration = new Trend('project_update_duration')

// Test configuration
export const options = getScenarioOptions('normal', {
  p95: config.thresholds.api.p95,
})

// Setup: Authenticate test users
export function setup() {
  console.log('Setting up test users...')
  const userSessions = setupMultipleUserSessions()
  console.log(`Authenticated ${userSessions.length} test users`)
  return { userSessions }
}

// Main test function
export default function (data) {
  const { userSessions } = data
  const userSession = getRandomUserSession(userSessions)
  const headers = getSupabaseHeaders(userSession.accessToken)

  // Test 1: List projects
  testListProjects(headers)

  sleep(1)

  // Test 2: Create project
  const projectId = testCreateProject(headers)

  if (projectId) {
    sleep(1)

    // Test 3: Get project
    testGetProject(headers, projectId)

    sleep(1)

    // Test 4: Update project
    testUpdateProject(headers, projectId)

    sleep(1)

    // Test 5: Delete project
    testDeleteProject(headers, projectId)
  }

  sleep(2) // Think time between iterations
}

/**
 * Test GET /api/projects
 */
function testListProjects(headers) {
  const response = http.get(`${config.baseUrl}/api/projects`, { headers })

  const success = check(response, {
    'list projects: status 200': (r) => r.status === 200,
    'list projects: has data': (r) => {
      try {
        const body = JSON.parse(r.body)
        return Array.isArray(body.data)
      } catch {
        return false
      }
    },
    'list projects: response < 500ms': (r) => r.timings.duration < 500,
  })

  projectListRate.add(success)
  projectListDuration.add(response.timings.duration)
}

/**
 * Test POST /api/projects
 */
function testCreateProject(headers) {
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
    'create project: response < 1s': (r) => r.timings.duration < 1000,
  })

  projectCreateRate.add(success)
  projectCreateDuration.add(response.timings.duration)

  if (success && response.status === 201) {
    try {
      const body = JSON.parse(response.body)
      return body.data.id
    } catch {
      return null
    }
  }

  return null
}

/**
 * Test GET /api/projects/[id]
 */
function testGetProject(headers, projectId) {
  const response = http.get(`${config.baseUrl}/api/projects/${projectId}`, { headers })

  const success = check(response, {
    'get project: status 200': (r) => r.status === 200,
    'get project: has data': (r) => {
      try {
        const body = JSON.parse(r.body)
        return body.data?.id === projectId
      } catch {
        return false
      }
    },
    'get project: response < 500ms': (r) => r.timings.duration < 500,
  })

  projectGetRate.add(success)
  projectGetDuration.add(response.timings.duration)
}

/**
 * Test PATCH /api/projects/[id]
 */
function testUpdateProject(headers, projectId) {
  const payload = JSON.stringify({
    title: 'Updated Title',
    description: 'Updated description from load test',
  })

  const response = http.patch(`${config.baseUrl}/api/projects/${projectId}`, payload, { headers })

  const success = check(response, {
    'update project: status 200': (r) => r.status === 200,
    'update project: title updated': (r) => {
      try {
        const body = JSON.parse(r.body)
        return body.data?.title === 'Updated Title'
      } catch {
        return false
      }
    },
    'update project: response < 500ms': (r) => r.timings.duration < 500,
  })

  projectUpdateRate.add(success)
  projectUpdateDuration.add(response.timings.duration)
}

/**
 * Test DELETE /api/projects/[id]
 */
function testDeleteProject(headers, projectId) {
  const response = http.del(`${config.baseUrl}/api/projects/${projectId}`, null, { headers })

  const success = check(response, {
    'delete project: status 200 or 204': (r) => r.status === 200 || r.status === 204,
    'delete project: response < 500ms': (r) => r.timings.duration < 500,
  })

  projectDeleteRate.add(success)
}

// Teardown: Clean up any remaining test data if needed
export function teardown(data) {
  console.log('Test completed. Check metrics for results.')
}
