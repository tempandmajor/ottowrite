import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GET, POST, PATCH, DELETE } from '@/app/api/characters/route'
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

describe('/api/characters - Character CRUD Endpoint', () => {
  const mockUser = createMockUser()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('GET - List Characters', () => {
    it('should return 401 when user is not authenticated', async () => {
      const mockClient = createMockSupabaseClient(null)
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(mockClient as any)

      const request = createMockRequest({
        method: 'GET',
        searchParams: { project_id: 'project-123' },
      }) as any

      const response = await GET(request)
      const json = await getResponseJSON(response)

      expect(response.status).toBe(401)
      expect(json.error.code).toBe('UNAUTHORIZED')
    })

    it('should validate required project_id parameter', async () => {
      const mockClient = createMockSupabaseClient(mockUser)
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(mockClient as any)

      const request = createMockRequest({
        method: 'GET',
        searchParams: {}, // Missing project_id
      }) as any

      const response = await GET(request)
      const json = await getResponseJSON(response)

      expect(response.status).toBe(422)
      expect(json.error.code).toBe('VALIDATION_ERROR')
    })

    it('should validate project_id is a valid UUID', async () => {
      const mockClient = createMockSupabaseClient(mockUser)
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(mockClient as any)

      const request = createMockRequest({
        method: 'GET',
        searchParams: { project_id: 'not-a-uuid' },
      }) as any

      const response = await GET(request)
      const json = await getResponseJSON(response)

      expect(response.status).toBe(422)
      expect(json.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return characters for authenticated user', async () => {
      const mockClient = createMockSupabaseClient(mockUser)
      const charactersBuilder = createMockQueryBuilder([
        {
          id: 'char-1',
          name: 'John Doe',
          role: 'protagonist',
          user_id: mockUser.id,
          project_id: 'project-123',
        },
        {
          id: 'char-2',
          name: 'Jane Smith',
          role: 'antagonist',
          user_id: mockUser.id,
          project_id: 'project-123',
        },
      ])

      mockClient.from = vi.fn(() => charactersBuilder)

      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(mockClient as any)

      const request = createMockRequest({
        method: 'GET',
        searchParams: { project_id: '550e8400-e29b-41d4-a716-446655440000' },
      }) as any

      const response = await GET(request)
      const json = await getResponseJSON(response)

      expect(response.status).toBe(200)
      expect(json.data.characters).toHaveLength(2)
    })

    it('should filter by role when provided', async () => {
      const mockClient = createMockSupabaseClient(mockUser)
      const charactersBuilder = createMockQueryBuilder([
        {
          id: 'char-1',
          name: 'Hero',
          role: 'protagonist',
          user_id: mockUser.id,
          project_id: 'project-123',
        },
      ])

      mockClient.from = vi.fn(() => charactersBuilder)

      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(mockClient as any)

      const request = createMockRequest({
        method: 'GET',
        searchParams: {
          project_id: '550e8400-e29b-41d4-a716-446655440000',
          role: 'protagonist',
        },
      }) as any

      const response = await GET(request)
      const json = await getResponseJSON(response)

      expect(response.status).toBe(200)
      expect(json.data.characters).toHaveLength(1)
      expect(json.data.characters[0].role).toBe('protagonist')
    })

    it('should apply limit when provided', async () => {
      const mockClient = createMockSupabaseClient(mockUser)
      const charactersBuilder = createMockQueryBuilder([
        { id: 'char-1', name: 'Character 1' },
        { id: 'char-2', name: 'Character 2' },
      ])

      mockClient.from = vi.fn(() => charactersBuilder)

      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(mockClient as any)

      const request = createMockRequest({
        method: 'GET',
        searchParams: {
          project_id: '550e8400-e29b-41d4-a716-446655440000',
          limit: '10',
        },
      }) as any

      const response = await GET(request)

      expect(response.status).toBe(200)
    })
  })

  describe('POST - Create Character', () => {
    it('should return 401 when user is not authenticated', async () => {
      const mockClient = createMockSupabaseClient(null)
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(mockClient as any)

      const request = createMockRequest({
        method: 'POST',
        body: {
          project_id: 'project-123',
          name: 'New Character',
          role: 'supporting',
        },
      }) as any

      const response = await POST(request)
      const json = await getResponseJSON(response)

      expect(response.status).toBe(401)
      expect(json.error.code).toBe('UNAUTHORIZED')
    })

    it('should validate required fields', async () => {
      const mockClient = createMockSupabaseClient(mockUser)
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(mockClient as any)

      const request = createMockRequest({
        method: 'POST',
        body: {
          // Missing required fields
          name: 'Character',
        },
      }) as any

      const response = await POST(request)
      const json = await getResponseJSON(response)

      expect(response.status).toBe(422)
      expect(json.error.code).toBe('VALIDATION_ERROR')
    })

    it('should validate character name length', async () => {
      const mockClient = createMockSupabaseClient(mockUser)
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(mockClient as any)

      const request = createMockRequest({
        method: 'POST',
        body: {
          project_id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'x'.repeat(201), // Exceeds max length
          role: 'supporting',
        },
      }) as any

      const response = await POST(request)
      const json = await getResponseJSON(response)

      expect(response.status).toBe(422)
      expect(json.error.code).toBe('VALIDATION_ERROR')
    })

    it('should validate role enum values', async () => {
      const mockClient = createMockSupabaseClient(mockUser)
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(mockClient as any)

      const request = createMockRequest({
        method: 'POST',
        body: {
          project_id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Character',
          role: 'invalid-role', // Invalid enum value
        },
      }) as any

      const response = await POST(request)
      const json = await getResponseJSON(response)

      expect(response.status).toBe(422)
      expect(json.error.code).toBe('VALIDATION_ERROR')
    })

    it('should create character with valid data', async () => {
      const mockClient = createMockSupabaseClient(mockUser)
      const projectBuilder = createMockQueryBuilder({
        id: 'project-123',
        user_id: mockUser.id,
      })
      const characterBuilder = createMockQueryBuilder({
        id: 'char-new',
        name: 'New Character',
        role: 'supporting',
        user_id: mockUser.id,
        project_id: 'project-123',
      })

      mockClient.from = vi.fn((table: string) => {
        if (table === 'projects') return projectBuilder
        if (table === 'characters') return characterBuilder
        return createMockQueryBuilder()
      })

      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(mockClient as any)

      const request = createMockRequest({
        method: 'POST',
        body: {
          project_id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'New Character',
          role: 'supporting',
          age: 30,
          gender: 'female',
          backstory: 'A mysterious past...',
        },
      }) as any

      const response = await POST(request)
      const json = await getResponseJSON(response)

      expect(response.status).toBe(201)
      expect(json.data.character).toBeDefined()
      expect(json.data.character.name).toBe('New Character')
    })

    it('should deny access to projects owned by other users', async () => {
      const mockClient = createMockSupabaseClient(mockUser)
      const projectBuilder = createMockQueryBuilder(null) // Project not found or not owned

      mockClient.from = vi.fn(() => projectBuilder)

      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(mockClient as any)

      const request = createMockRequest({
        method: 'POST',
        body: {
          project_id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'New Character',
          role: 'supporting',
        },
      }) as any

      const response = await POST(request)
      const json = await getResponseJSON(response)

      expect(response.status).toBe(404)
      expect(json.error.code).toBe('NOT_FOUND')
    })
  })

  describe('PATCH - Update Character', () => {
    it('should return 401 when user is not authenticated', async () => {
      const mockClient = createMockSupabaseClient(null)
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(mockClient as any)

      const request = createMockRequest({
        method: 'PATCH',
        body: {
          id: 'char-123',
          name: 'Updated Name',
        },
      }) as any

      const response = await PATCH(request)
      const json = await getResponseJSON(response)

      expect(response.status).toBe(401)
      expect(json.error.code).toBe('UNAUTHORIZED')
    })

    it('should validate character ID is required', async () => {
      const mockClient = createMockSupabaseClient(mockUser)
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(mockClient as any)

      const request = createMockRequest({
        method: 'PATCH',
        body: {
          // Missing id
          name: 'Updated Name',
        },
      }) as any

      const response = await PATCH(request)
      const json = await getResponseJSON(response)

      expect(response.status).toBe(422)
      expect(json.error.code).toBe('VALIDATION_ERROR')
    })

    it('should update character successfully', async () => {
      const mockClient = createMockSupabaseClient(mockUser)
      const characterBuilder = createMockQueryBuilder({
        id: 'char-123',
        name: 'Updated Character',
        role: 'protagonist',
        user_id: mockUser.id,
      })

      mockClient.from = vi.fn(() => characterBuilder)

      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(mockClient as any)

      const request = createMockRequest({
        method: 'PATCH',
        body: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Updated Character',
          backstory: 'New backstory',
        },
      }) as any

      const response = await PATCH(request)
      const json = await getResponseJSON(response)

      expect(response.status).toBe(200)
      expect(json.data.character).toBeDefined()
    })

    it('should return 404 when character not found', async () => {
      const mockClient = createMockSupabaseClient(mockUser)
      const characterBuilder = createMockQueryBuilder(null) // No character

      mockClient.from = vi.fn(() => characterBuilder)

      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(mockClient as any)

      const request = createMockRequest({
        method: 'PATCH',
        body: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Updated',
        },
      }) as any

      const response = await PATCH(request)
      const json = await getResponseJSON(response)

      expect(response.status).toBe(404)
      expect(json.error.code).toBe('NOT_FOUND')
    })
  })

  describe('DELETE - Delete Character', () => {
    it('should return 401 when user is not authenticated', async () => {
      const mockClient = createMockSupabaseClient(null)
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(mockClient as any)

      const request = createMockRequest({
        method: 'DELETE',
        searchParams: { id: 'char-123' },
      }) as any

      const response = await DELETE(request)
      const json = await getResponseJSON(response)

      expect(response.status).toBe(401)
      expect(json.error.code).toBe('UNAUTHORIZED')
    })

    it('should validate ID parameter is required', async () => {
      const mockClient = createMockSupabaseClient(mockUser)
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(mockClient as any)

      const request = createMockRequest({
        method: 'DELETE',
        searchParams: {}, // Missing id
      }) as any

      const response = await DELETE(request)
      const json = await getResponseJSON(response)

      expect(response.status).toBe(422)
      expect(json.error.code).toBe('VALIDATION_ERROR')
    })

    it('should delete character successfully', async () => {
      const mockClient = createMockSupabaseClient(mockUser)
      const characterBuilder = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }

      mockClient.from = vi.fn(() => characterBuilder)

      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(mockClient as any)

      const request = createMockRequest({
        method: 'DELETE',
        searchParams: { id: '550e8400-e29b-41d4-a716-446655440000' },
      }) as any

      const response = await DELETE(request)
      const json = await getResponseJSON(response)

      expect(response.status).toBe(200)
      expect(json.data.success).toBe(true)
    })
  })
})
