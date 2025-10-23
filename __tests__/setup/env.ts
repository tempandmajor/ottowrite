/**
 * Test Environment Setup
 *
 * Sets up mock environment variables for testing
 */

// Mock environment variables for tests
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.OPENAI_API_KEY = 'sk-test-key'
process.env.STRIPE_SECRET_KEY = 'sk_test_key'
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret'
process.env.NEXT_PUBLIC_APP_VERSION = '1.0.0-test'
process.env.NODE_ENV = 'test'
process.env.MANUSCRIPT_ACCESS_SECRET = 'test-manuscript-access-secret-key-must-be-at-least-32-characters-long'
