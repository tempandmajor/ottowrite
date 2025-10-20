import { vi } from 'vitest'

/**
 * API Test Utilities
 *
 * Provides mocking utilities for testing API routes without making real
 * database calls or external API requests.
 */

export interface MockUser {
  id: string
  email: string
}

export interface MockSupabaseClient {
  auth: {
    getUser: ReturnType<typeof vi.fn>
  }
  from: ReturnType<typeof vi.fn>
  rpc: ReturnType<typeof vi.fn>
}

/**
 * Creates a mock authenticated user for testing
 */
export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    ...overrides,
  }
}

/**
 * Creates a mock Supabase client for testing
 */
export function createMockSupabaseClient(user: MockUser | null = null): MockSupabaseClient {
  const mockClient: MockSupabaseClient = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: null,
      }),
    },
    from: vi.fn(),
    rpc: vi.fn(),
  }

  return mockClient
}

/**
 * Creates a mock query builder for Supabase table operations
 */
export function createMockQueryBuilder(data: any = null, error: any = null) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    textSearch: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
  }

  // Handle array responses (for queries without single())
  builder.select = vi.fn().mockReturnValue({
    ...builder,
    then: (resolve: (value: { data: any; error: any }) => void) => {
      resolve({ data, error })
    },
  })

  return builder
}

/**
 * Creates a mock Next.js request object
 */
export function createMockRequest(options: {
  method?: string
  url?: string
  headers?: Record<string, string>
  body?: any
  searchParams?: Record<string, string>
} = {}) {
  const {
    method = 'GET',
    url = 'http://localhost:3000/api/test',
    headers = {},
    body,
    searchParams = {},
  } = options

  const urlObj = new URL(url)
  Object.entries(searchParams).forEach(([key, value]) => {
    urlObj.searchParams.set(key, value)
  })

  return {
    method,
    url: urlObj.toString(),
    headers: new Headers(headers),
    json: body ? vi.fn().mockResolvedValue(body) : vi.fn(),
    text: vi.fn().mockResolvedValue(body ? JSON.stringify(body) : ''),
  }
}

/**
 * Extracts JSON from a Next.js Response object
 */
export async function getResponseJSON(response: Response) {
  const text = await response.text()
  return JSON.parse(text)
}

/**
 * Mocks environment variables for testing
 */
export function mockEnv(vars: Record<string, string>) {
  const original: Record<string, string | undefined> = {}

  Object.entries(vars).forEach(([key, value]) => {
    original[key] = process.env[key]
    process.env[key] = value
  })

  return () => {
    Object.entries(original).forEach(([key, value]) => {
      if (value === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    })
  }
}
