/**
 * Load Test Configuration
 *
 * Defines test scenarios, thresholds, and environment settings
 * for k6 load testing.
 */

// Environment-specific configuration
export const config = {
  // Base URL for the application (override with env var)
  baseUrl: __ENV.BASE_URL || 'http://localhost:3000',

  // Supabase configuration
  supabase: {
    url: __ENV.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: __ENV.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },

  // Test user credentials (create dedicated test users)
  testUsers: [
    {
      email: __ENV.TEST_USER_1_EMAIL || 'loadtest1@example.com',
      password: __ENV.TEST_USER_1_PASSWORD || 'TestPassword123!',
    },
    {
      email: __ENV.TEST_USER_2_EMAIL || 'loadtest2@example.com',
      password: __ENV.TEST_USER_2_PASSWORD || 'TestPassword123!',
    },
    {
      email: __ENV.TEST_USER_3_EMAIL || 'loadtest3@example.com',
      password: __ENV.TEST_USER_3_PASSWORD || 'TestPassword123!',
    },
  ],

  // Performance thresholds
  thresholds: {
    // General API endpoints
    api: {
      p50: 200,   // 50th percentile < 200ms
      p95: 500,   // 95th percentile < 500ms
      p99: 1000,  // 99th percentile < 1s
      errorRate: 0.01, // < 1% error rate
    },

    // AI generation endpoints (slower)
    ai: {
      p50: 2000,  // 50th percentile < 2s
      p95: 5000,  // 95th percentile < 5s
      p99: 10000, // 99th percentile < 10s
      errorRate: 0.02, // < 2% error rate (higher tolerance for AI)
    },

    // SSR pages
    ssr: {
      p50: 500,   // 50th percentile < 500ms
      p95: 2000,  // 95th percentile < 2s
      p99: 3000,  // 99th percentile < 3s
      errorRate: 0.01, // < 1% error rate
    },
  },

  // Load test scenarios
  scenarios: {
    // Scenario 1: Normal traffic (baseline)
    normal: {
      name: 'Normal Traffic',
      stages: [
        { duration: '2m', target: 10 },  // Ramp up to 10 users
        { duration: '5m', target: 10 },  // Stay at 10 users
        { duration: '2m', target: 0 },   // Ramp down
      ],
    },

    // Scenario 2: Peak traffic (5x normal)
    peak: {
      name: 'Peak Traffic (5x)',
      stages: [
        { duration: '2m', target: 50 },  // Ramp up to 50 users
        { duration: '5m', target: 50 },  // Stay at 50 users
        { duration: '2m', target: 0 },   // Ramp down
      ],
    },

    // Scenario 3: Launch spike (sudden traffic)
    spike: {
      name: 'Launch Spike',
      stages: [
        { duration: '1m', target: 100 }, // Spike to 100 users
        { duration: '5m', target: 100 }, // Sustain
        { duration: '1m', target: 0 },   // Ramp down
      ],
    },

    // Scenario 4: Stress test (find breaking point)
    stress: {
      name: 'Stress Test',
      stages: [
        { duration: '2m', target: 50 },   // Ramp to 50
        { duration: '2m', target: 100 },  // Ramp to 100
        { duration: '2m', target: 200 },  // Ramp to 200
        { duration: '5m', target: 200 },  // Sustain
        { duration: '2m', target: 0 },    // Ramp down
      ],
    },

    // Scenario 5: AI endpoint load (lower concurrency, longer duration)
    aiLoad: {
      name: 'AI Endpoint Load',
      stages: [
        { duration: '1m', target: 5 },   // Ramp to 5 users
        { duration: '5m', target: 5 },   // Stay at 5 users
        { duration: '1m', target: 0 },   // Ramp down
      ],
    },
  },
}

// Helper to get k6 options for a scenario
export function getScenarioOptions(scenarioName, customThresholds = {}) {
  const scenario = config.scenarios[scenarioName]
  if (!scenario) {
    throw new Error(`Unknown scenario: ${scenarioName}`)
  }

  return {
    stages: scenario.stages,
    thresholds: {
      http_req_duration: [`p(95)<${customThresholds.p95 || config.thresholds.api.p95}`],
      http_req_failed: [`rate<${customThresholds.errorRate || config.thresholds.api.errorRate}`],
      ...customThresholds,
    },
  }
}

// Helper to get random test user
export function getRandomTestUser() {
  const users = config.testUsers
  return users[Math.floor(Math.random() * users.length)]
}

// Helper to add common headers
export function getCommonHeaders(accessToken) {
  const headers = {
    'Content-Type': 'application/json',
  }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  return headers
}

export default config
