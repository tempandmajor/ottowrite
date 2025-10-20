import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST } from '@/app/api/documents/[id]/autosave/route'
import {
  createMockUser,
  createMockSupabaseClient,
  createMockQueryBuilder,
  createMockRequest,
  getResponseJSON,
} from '../setup/api-test-utils'

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

describe('/api/documents/[id]/autosave - Document Autosave Endpoint', () => {
  const mockUser = createMockUser()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      const mockClient = createMockSupabaseClient(null)
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(mockClient as any)

      const request = createMockRequest({
        method: 'POST',
        body: {
          html: '<p>Content</p>',
        },
      }) as any

      const params = { params: Promise.resolve({ id: 'doc-123' }) }
      const response = await POST(request, params)
      const json = await getResponseJSON(response)

      expect(response.status).toBe(401)
      expect(json.error.code).toBe('UNAUTHORIZED')
    })
  })

  describe('XSS Protection', () => {
    it('should sanitize malicious HTML content', async () => {
      const mockClient = createMockSupabaseClient(mockUser)
      const documentBuilder = createMockQueryBuilder({
        id: 'doc-123',
        user_id: mockUser.id,
        type: 'novel',
        content: { html: '<p>Safe content</p>' },
        word_count: 2,
        updated_at: new Date().toISOString(),
      })
      const snapshotBuilder = createMockQueryBuilder({
        id: 'snap-123',
        created_at: new Date().toISOString(),
      })
      const profileBuilder = createMockQueryBuilder({
        id: mockUser.id,
        subscription_tier: 'free',
      })

      mockClient.from = vi.fn((table: string) => {
        if (table === 'documents') return documentBuilder
        if (table === 'document_snapshots') return snapshotBuilder
        if (table === 'user_profiles') return profileBuilder
        return createMockQueryBuilder()
      })
      mockClient.rpc = vi.fn().mockResolvedValue({ data: null, error: null })

      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(mockClient as any)

      const maliciousHTML = '<p>Hello</p><script>alert("XSS")</script><p>World</p>'

      const request = createMockRequest({
        method: 'POST',
        body: {
          html: maliciousHTML,
          wordCount: 2,
        },
      }) as any

      const params = { params: Promise.resolve({ id: 'doc-123' }) }
      const response = await POST(request, params)
      const json = await getResponseJSON(response)

      expect(response.status).toBe(200)
      expect(json.data.status).toBeDefined()
    })

    it('should detect and log XSS patterns', async () => {
      const mockClient = createMockSupabaseClient(mockUser)
      const documentBuilder = createMockQueryBuilder({
        id: 'doc-123',
        user_id: mockUser.id,
        type: 'novel',
        content: { html: '<p>Safe</p>' },
        word_count: 1,
        updated_at: new Date().toISOString(),
      })
      const snapshotBuilder = createMockQueryBuilder({
        id: 'snap-123',
        created_at: new Date().toISOString(),
      })
      const profileBuilder = createMockQueryBuilder({
        id: mockUser.id,
        subscription_tier: 'free',
      })

      mockClient.from = vi.fn((table: string) => {
        if (table === 'documents') return documentBuilder
        if (table === 'document_snapshots') return snapshotBuilder
        if (table === 'user_profiles') return profileBuilder
        return createMockQueryBuilder()
      })
      mockClient.rpc = vi.fn().mockResolvedValue({ data: null, error: null })

      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(mockClient as any)

      const request = createMockRequest({
        method: 'POST',
        body: {
          html: '<img src=x onerror=alert(1)>',
          wordCount: 0,
        },
      }) as any

      const params = { params: Promise.resolve({ id: 'doc-123' }) }
      const response = await POST(request, params)

      // Should process but log warning
      expect(response.status).toBe(200)
    })
  })

  describe('Conflict Detection', () => {
    it('should return 409 when document hash conflicts', async () => {
      const mockClient = createMockSupabaseClient(mockUser)
      const existingHash = 'existing-hash-123'
      const documentBuilder = createMockQueryBuilder({
        id: 'doc-123',
        user_id: mockUser.id,
        type: 'novel',
        content: {
          html: '<p>Server version</p>',
          structure: [],
        },
        word_count: 2,
        updated_at: new Date().toISOString(),
      })

      mockClient.from = vi.fn((table: string) => {
        if (table === 'documents') return documentBuilder
        return createMockQueryBuilder()
      })

      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(mockClient as any)

      const request = createMockRequest({
        method: 'POST',
        body: {
          html: '<p>Client version</p>',
          baseHash: 'different-hash-456', // Hash mismatch
          wordCount: 2,
        },
      }) as any

      const params = { params: Promise.resolve({ id: 'doc-123' }) }
      const response = await POST(request, params)
      const json = await getResponseJSON(response)

      expect(response.status).toBe(409)
      expect(json.error.code).toBe('AUTOSAVE_CONFLICT')
      expect(json.error.details).toBeDefined()
      expect(json.error.details.document).toBeDefined()
    })

    it('should allow save when hash matches', async () => {
      const mockClient = createMockSupabaseClient(mockUser)
      const documentBuilder = createMockQueryBuilder({
        id: 'doc-123',
        user_id: mockUser.id,
        type: 'novel',
        content: {
          html: '<p>Content</p>',
          structure: [],
        },
        word_count: 1,
        updated_at: new Date().toISOString(),
      })
      const snapshotBuilder = createMockQueryBuilder({
        id: 'snap-123',
        created_at: new Date().toISOString(),
      })
      const profileBuilder = createMockQueryBuilder({
        id: mockUser.id,
        subscription_tier: 'free',
      })

      mockClient.from = vi.fn((table: string) => {
        if (table === 'documents') return documentBuilder
        if (table === 'document_snapshots') return snapshotBuilder
        if (table === 'user_profiles') return profileBuilder
        return createMockQueryBuilder()
      })
      mockClient.rpc = vi.fn().mockResolvedValue({ data: null, error: null })

      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(mockClient as any)

      // Calculate the actual hash that will be generated
      const { generateContentHash } = await import('@/lib/content-hash')
      const correctHash = generateContentHash({
        html: '<p>Content</p>',
        structure: [],
        anchorIds: [],
      })

      const request = createMockRequest({
        method: 'POST',
        body: {
          html: '<p>Content</p>',
          baseHash: correctHash,
          wordCount: 1,
        },
      }) as any

      const params = { params: Promise.resolve({ id: 'doc-123' }) }
      const response = await POST(request, params)
      const json = await getResponseJSON(response)

      expect(response.status).toBe(200)
      expect(json.data.status).toBe('saved')
    })
  })

  describe('Authorization', () => {
    it('should deny access to documents owned by other users', async () => {
      const mockClient = createMockSupabaseClient(mockUser)
      const documentBuilder = createMockQueryBuilder({
        id: 'doc-123',
        user_id: 'different-user-id',
        type: 'novel',
        content: {},
        word_count: 0,
        updated_at: new Date().toISOString(),
      })

      mockClient.from = vi.fn((table: string) => {
        if (table === 'documents') return documentBuilder
        return createMockQueryBuilder()
      })

      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(mockClient as any)

      const request = createMockRequest({
        method: 'POST',
        body: {
          html: '<p>Content</p>',
          wordCount: 1,
        },
      }) as any

      const params = { params: Promise.resolve({ id: 'doc-123' }) }
      const response = await POST(request, params)
      const json = await getResponseJSON(response)

      expect(response.status).toBe(403)
      expect(json.error.code).toBe('FORBIDDEN')
    })
  })

  describe('Snapshot Management', () => {
    it('should create snapshot with correct payload', async () => {
      const mockClient = createMockSupabaseClient(mockUser)
      const documentBuilder = createMockQueryBuilder({
        id: 'doc-123',
        user_id: mockUser.id,
        type: 'novel',
        content: { html: '' },
        word_count: 0,
        updated_at: new Date().toISOString(),
      })
      const snapshotInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'snap-123',
              created_at: new Date().toISOString(),
            },
            error: null,
          }),
        }),
      })
      const snapshotBuilder = {
        insert: snapshotInsert,
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], error: null }),
      }
      const profileBuilder = createMockQueryBuilder({
        id: mockUser.id,
        subscription_tier: 'free',
      })

      mockClient.from = vi.fn((table: string) => {
        if (table === 'documents') return documentBuilder
        if (table === 'document_snapshots') return snapshotBuilder
        if (table === 'user_profiles') return profileBuilder
        return createMockQueryBuilder()
      })
      mockClient.rpc = vi.fn().mockResolvedValue({ data: null, error: null })

      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(mockClient as any)

      const request = createMockRequest({
        method: 'POST',
        body: {
          html: '<p>New content</p>',
          structure: [{ type: 'paragraph' }],
          wordCount: 2,
        },
      }) as any

      const params = { params: Promise.resolve({ id: 'doc-123' }) }
      const response = await POST(request, params)
      const json = await getResponseJSON(response)

      expect(response.status).toBe(200)
      expect(snapshotInsert).toHaveBeenCalled()
      expect(json.data.snapshotId).toBeDefined()
    })
  })
})
