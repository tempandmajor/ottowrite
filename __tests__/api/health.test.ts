import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET as healthCheck } from '@/app/api/health/route'
import { GET as readinessCheck } from '@/app/api/health/ready/route'
import {
  createMockSupabaseClient,
  createMockQueryBuilder,
  getResponseJSON,
} from '../setup/api-test-utils'

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  getPoolConfig: vi.fn(() => ({ maxConnections: 10, idleTimeout: 300 })),
  getServiceRolePoolConfig: vi.fn(() => ({ maxConnections: 5, idleTimeout: 300 })),
}))

describe('/api/health - Health Check Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/health', () => {
    it('should return 200 when all systems are healthy', async () => {
      const mockClient = createMockSupabaseClient({ id: 'test-user', email: 'test@example.com' })
      const profileBuilder = createMockQueryBuilder({ id: 'test-user' })

      mockClient.from = vi.fn(() => profileBuilder)

      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(mockClient as any)

      const response = await healthCheck()
      const json = await getResponseJSON(response)

      expect(response.status).toBe(200)
      expect(json.status).toBe('healthy')
      expect(json.checks.database).toBe('healthy')
      expect(json.checks.environment).toBe('healthy')
      expect(json.timestamp).toBeDefined()
      expect(json.version).toBeDefined()
      expect(json.uptime).toBeDefined()
    })

    it('should return 503 when database is unhealthy', async () => {
      const mockClient = createMockSupabaseClient({ id: 'test-user', email: 'test@example.com' })
      const profileBuilder = createMockQueryBuilder(null, {
        message: 'Connection failed',
        code: 'CONNECTION_ERROR',
      })

      mockClient.from = vi.fn(() => profileBuilder)

      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(mockClient as any)

      const response = await healthCheck()
      const json = await getResponseJSON(response)

      expect(response.status).toBe(503)
      expect(json.status).toBe('unhealthy')
      expect(json.checks.database).toBe('unhealthy')
      expect(json.details).toBeDefined()
      expect(json.details.database).toContain('Connection failed')
    })

    it('should include proper cache headers', async () => {
      const mockClient = createMockSupabaseClient({ id: 'test-user', email: 'test@example.com' })
      const profileBuilder = createMockQueryBuilder({ id: 'test-user' })

      mockClient.from = vi.fn(() => profileBuilder)

      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(mockClient as any)

      const response = await healthCheck()

      expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate')
      expect(response.headers.get('Pragma')).toBe('no-cache')
      expect(response.headers.get('Expires')).toBe('0')
    })
  })

  describe('GET /api/health/ready', () => {
    it('should return 200 when app is ready', async () => {
      const response = await readinessCheck()
      const json = await getResponseJSON(response)

      expect(response.status).toBe(200)
      expect(json.ready).toBe(true)
      expect(json.timestamp).toBeDefined()
    })

    it('should return 503 when critical env vars are missing', async () => {
      const originalEnv = process.env.NEXT_PUBLIC_SUPABASE_URL
      delete process.env.NEXT_PUBLIC_SUPABASE_URL

      const response = await readinessCheck()
      const json = await getResponseJSON(response)

      expect(response.status).toBe(503)
      expect(json.ready).toBe(false)
      expect(json.message).toBeDefined()

      // Restore env
      process.env.NEXT_PUBLIC_SUPABASE_URL = originalEnv
    })

    it('should include no-cache headers', async () => {
      const response = await readinessCheck()

      expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate')
      expect(response.headers.get('Pragma')).toBe('no-cache')
    })
  })
})
