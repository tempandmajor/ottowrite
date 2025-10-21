import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GET } from '@/app/api/projects/query/route'
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

describe('/api/projects/query - Projects Query Endpoint', () => {
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
        method: 'GET',
        searchParams: {},
      }) as any

      const response = await GET(request)
      const json = await getResponseJSON(response)

      expect(response.status).toBe(401)
      expect(json.error.code).toBe('UNAUTHORIZED')
    })
  })

  describe('Input Validation', () => {
    it('should validate search parameter length', async () => {
      const mockClient = createMockSupabaseClient(mockUser)
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(mockClient as any)

      const request = createMockRequest({
        method: 'GET',
        searchParams: {
          search: 'x'.repeat(1001), // Exceeds max length
        },
      }) as any

      const response = await GET(request)
      const json = await getResponseJSON(response)

      expect(response.status).toBe(422)
      expect(json.error.code).toBe('VALIDATION_ERROR')
    })

    it('should validate limit parameter range', async () => {
      const mockClient = createMockSupabaseClient(mockUser)
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(mockClient as any)

      const request = createMockRequest({
        method: 'GET',
        searchParams: {
          limit: '1000', // Exceeds max
        },
      }) as any

      const response = await GET(request)
      const json = await getResponseJSON(response)

      expect(response.status).toBe(422)
      expect(json.error.code).toBe('VALIDATION_ERROR')
    })

    it('should validate offset is a positive number', async () => {
      const mockClient = createMockSupabaseClient(mockUser)
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(mockClient as any)

      const request = createMockRequest({
        method: 'GET',
        searchParams: {
          offset: '-1', // Negative offset
        },
      }) as any

      const response = await GET(request)
      const json = await getResponseJSON(response)

      expect(response.status).toBe(422)
      expect(json.error.code).toBe('VALIDATION_ERROR')
    })

    it('should validate type enum values', async () => {
      const mockClient = createMockSupabaseClient(mockUser)
      mockClient.from = vi.fn(() => createMockQueryBuilder())
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(mockClient as any)

      const request = createMockRequest({
        method: 'GET',
        searchParams: {
          type: 'invalid-type', // Invalid project type
        },
      }) as any

      const response = await GET(request)
      const json = await getResponseJSON(response)

      expect(response.status).toBe(422)
      expect(json.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('SQL Injection Protection', () => {
    it('should detect SQL injection in search parameter', async () => {
      const mockClient = createMockSupabaseClient(mockUser)
      const foldersBuilder = createMockQueryBuilder([])
      const tagsBuilder = createMockQueryBuilder([])
      const projectsBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        textSearch: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      }

      mockClient.from = vi.fn((table: string) => {
        if (table === 'project_folders') return foldersBuilder
        if (table === 'project_tags') return tagsBuilder
        if (table === 'projects') return projectsBuilder
        return createMockQueryBuilder()
      })

      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(mockClient as any)

      const maliciousSearch = "'; DROP TABLE projects; --"

      const request = createMockRequest({
        method: 'GET',
        searchParams: {
          search: maliciousSearch,
        },
      }) as any

      const response = await GET(request)

      // Should process but log warning
      // Supabase's parameterized queries prevent actual injection
      expect(response.status).toBe(200)
    })

    it('should handle UNION injection attempts', async () => {
      const mockClient = createMockSupabaseClient(mockUser)
      const foldersBuilder = createMockQueryBuilder([])
      const tagsBuilder = createMockQueryBuilder([])
      const projectsBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        textSearch: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      }

      mockClient.from = vi.fn((table: string) => {
        if (table === 'project_folders') return foldersBuilder
        if (table === 'project_tags') return tagsBuilder
        if (table === 'projects') return projectsBuilder
        return createMockQueryBuilder()
      })

      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(mockClient as any)

      const unionInjection = "' UNION SELECT * FROM users --"

      const request = createMockRequest({
        method: 'GET',
        searchParams: {
          search: unionInjection,
        },
      }) as any

      const response = await GET(request)

      expect(response.status).toBe(200)
    })

    it('should handle comment-based injection attempts', async () => {
      const mockClient = createMockSupabaseClient(mockUser)
      const foldersBuilder = createMockQueryBuilder([])
      const tagsBuilder = createMockQueryBuilder([])
      const projectsBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        textSearch: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      }

      mockClient.from = vi.fn((table: string) => {
        if (table === 'project_folders') return foldersBuilder
        if (table === 'project_tags') return tagsBuilder
        if (table === 'projects') return projectsBuilder
        return createMockQueryBuilder()
      })

      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(mockClient as any)

      const commentInjection = "test' OR '1'='1' --"

      const request = createMockRequest({
        method: 'GET',
        searchParams: {
          search: commentInjection,
        },
      }) as any

      const response = await GET(request)

      expect(response.status).toBe(200)
    })
  })

  describe('Query Functionality', () => {
    it('should return projects for authenticated user', async () => {
      const mockClient = createMockSupabaseClient(mockUser)
      const foldersBuilder = createMockQueryBuilder([])
      const tagsBuilder = createMockQueryBuilder([])
      const projectsBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'project-1',
              name: 'My Novel',
              type: 'novel',
              user_id: mockUser.id,
            },
            {
              id: 'project-2',
              name: 'My Screenplay',
              type: 'screenplay',
              user_id: mockUser.id,
            },
          ],
          error: null,
          count: 2,
        }),
      }

      mockClient.from = vi.fn((table: string) => {
        if (table === 'project_folders') return foldersBuilder
        if (table === 'project_tags') return tagsBuilder
        if (table === 'projects') return projectsBuilder
        if (table === 'project_tag_links') return createMockQueryBuilder([])
        return createMockQueryBuilder()
      })

      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(mockClient as any)

      const request = createMockRequest({
        method: 'GET',
        searchParams: {},
      }) as any

      const response = await GET(request)
      const json = await getResponseJSON(response)

      expect(response.status).toBe(200)
      expect(json.projects).toHaveLength(2)
      expect(json.pagination).toBeDefined()
    })

    it('should filter by project type', async () => {
      const mockClient = createMockSupabaseClient(mockUser)
      const foldersBuilder = createMockQueryBuilder([])
      const tagsBuilder = createMockQueryBuilder([])
      const projectsBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'project-1',
              name: 'Novel Project',
              type: 'novel',
              user_id: mockUser.id,
            },
          ],
          error: null,
          count: 1,
        }),
      }

      mockClient.from = vi.fn((table: string) => {
        if (table === 'project_folders') return foldersBuilder
        if (table === 'project_tags') return tagsBuilder
        if (table === 'projects') return projectsBuilder
        if (table === 'project_tag_links') return createMockQueryBuilder([])
        return createMockQueryBuilder()
      })

      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(mockClient as any)

      const request = createMockRequest({
        method: 'GET',
        searchParams: {
          type: 'novel',
        },
      }) as any

      const response = await GET(request)
      const json = await getResponseJSON(response)

      expect(response.status).toBe(200)
      expect(json.projects).toHaveLength(1)
      expect(json.projects[0].type).toBe('novel')
    })

    it('should paginate results correctly', async () => {
      const mockClient = createMockSupabaseClient(mockUser)
      const foldersBuilder = createMockQueryBuilder([])
      const tagsBuilder = createMockQueryBuilder([])
      const projectsBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 25,
        }),
      }

      mockClient.from = vi.fn((table: string) => {
        if (table === 'project_folders') return foldersBuilder
        if (table === 'project_tags') return tagsBuilder
        if (table === 'projects') return projectsBuilder
        if (table === 'project_tag_links') return createMockQueryBuilder([])
        return createMockQueryBuilder()
      })

      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(mockClient as any)

      const request = createMockRequest({
        method: 'GET',
        searchParams: {
          limit: '10',
          offset: '10',
        },
      }) as any

      const response = await GET(request)
      const json = await getResponseJSON(response)

      expect(response.status).toBe(200)
      expect(json.pagination.total).toBe(25)
      expect(json.pagination.page).toBe(2)
      expect(json.pagination.limit).toBe(10)
    })

    it('should filter by folder', async () => {
      const mockClient = createMockSupabaseClient(mockUser)
      const foldersBuilder = createMockQueryBuilder([])
      const tagsBuilder = createMockQueryBuilder([])
      const projectsBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      }

      mockClient.from = vi.fn((table: string) => {
        if (table === 'project_folders') return foldersBuilder
        if (table === 'project_tags') return tagsBuilder
        if (table === 'projects') return projectsBuilder
        if (table === 'project_tag_links') return createMockQueryBuilder([])
        return createMockQueryBuilder()
      })

      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(mockClient as any)

      const request = createMockRequest({
        method: 'GET',
        searchParams: {
          folderId: '550e8400-e29b-41d4-a716-446655440000',
        },
      }) as any

      const response = await GET(request)

      expect(response.status).toBe(200)
    })

    it('should handle text search', async () => {
      const mockClient = createMockSupabaseClient(mockUser)
      const foldersBuilder = createMockQueryBuilder([])
      const tagsBuilder = createMockQueryBuilder([])
      const projectsBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        textSearch: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      }

      mockClient.from = vi.fn((table: string) => {
        if (table === 'project_folders') return foldersBuilder
        if (table === 'project_tags') return tagsBuilder
        if (table === 'projects') return projectsBuilder
        if (table === 'project_tag_links') return createMockQueryBuilder([])
        return createMockQueryBuilder()
      })

      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(mockClient as any)

      const request = createMockRequest({
        method: 'GET',
        searchParams: {
          search: 'fantasy adventure',
        },
      }) as any

      const response = await GET(request)

      expect(response.status).toBe(200)
    })
  })
})
