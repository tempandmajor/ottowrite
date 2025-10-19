/**
 * Test User Fixtures
 *
 * Defines test users for e2e testing.
 * These should be created in a test Supabase instance.
 */

export const TEST_USERS = {
  // Primary test user with free tier
  free: {
    email: 'test-free@ottowrite.test',
    password: 'Test123!@#',
    tier: 'free',
  },

  // Test user with hobbyist tier
  hobbyist: {
    email: 'test-hobbyist@ottowrite.test',
    password: 'Test123!@#',
    tier: 'hobbyist',
  },

  // Test user with professional tier
  professional: {
    email: 'test-professional@ottowrite.test',
    password: 'Test123!@#',
    tier: 'professional',
  },

  // Secondary user for conflict testing
  conflict: {
    email: 'test-conflict@ottowrite.test',
    password: 'Test123!@#',
    tier: 'free',
  },
} as const

export type TestUserKey = keyof typeof TEST_USERS
export type TestUser = typeof TEST_USERS[TestUserKey]
