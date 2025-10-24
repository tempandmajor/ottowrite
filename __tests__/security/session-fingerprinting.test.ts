/**
 * Security Fix Test: Session Fingerprinting (SEC-003)
 *
 * Verifies that session fingerprinting is properly stored and validated.
 * Before fix: storeSessionMetadata() never called, validation always fails.
 * After fix: Fingerprints stored on first login, validated on subsequent requests.
 *
 * Test Cases:
 * 1. First-time session stores fingerprint
 * 2. Subsequent requests validate stored fingerprint
 * 3. Different user agent triggers warning
 * 4. Different IP address triggers warning
 * 5. Session expiry after 14 days
 * 6. Session activity updates on valid requests
 * 7. Inactive sessions fail validation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  generateSessionFingerprint,
  validateSessionDetailed,
  storeSessionMetadata,
  updateSessionActivity,
  type SessionValidationResult,
} from '@/lib/security/session-manager'
import { createClient } from '@/lib/supabase/server'
import type { NextRequest } from 'next/server'

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

describe('SEC-003: Session Fingerprinting (Security Fix)', () => {
  const mockUserId = '550e8400-e29b-41d4-a716-446655440000'
  const mockFingerprintHash = 'abc123def456'

  // Mock request objects
  const createMockRequest = (overrides?: {
    userAgent?: string
    ip?: string
    acceptLanguage?: string
  }): Partial<NextRequest> => ({
    headers: {
      get: vi.fn((name: string) => {
        switch (name.toLowerCase()) {
          case 'user-agent':
            return overrides?.userAgent || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
          case 'x-forwarded-for':
            return overrides?.ip || '192.168.1.1'
          case 'accept-language':
            return overrides?.acceptLanguage || 'en-US,en;q=0.9'
          default:
            return null
        }
      }),
    } as any,
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('1. First-Time Session Stores Fingerprint', () => {
    it('should return needsStorage=true when no fingerprint exists', async () => {
      // Mock Supabase query that returns no results
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn(() =>
                    Promise.resolve({
                      data: null,
                      error: { code: 'PGRST116', message: 'No rows found' },
                    })
                  ),
                })),
              })),
            })),
          })),
        })),
      }

      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const result = await validateSessionDetailed(mockUserId, mockFingerprintHash)

      expect(result).toEqual({
        valid: false,
        reason: 'no_fingerprint',
        needsStorage: true,
      })
    })

    it('should store session metadata on first login', async () => {
      const upsertMock = vi.fn(() => Promise.resolve({ data: {}, error: null }))

      const mockSupabase = {
        from: vi.fn(() => ({
          upsert: upsertMock,
        })),
      }

      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const mockRequest = createMockRequest() as NextRequest

      await storeSessionMetadata(mockUserId, mockRequest)

      expect(upsertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockUserId,
          is_active: true,
        })
      )
    })
  })

  describe('2. Subsequent Requests Validate Stored Fingerprint', () => {
    it('should return valid=true when fingerprint matches', async () => {
      // Mock Supabase query that returns matching fingerprint
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn(() =>
                    Promise.resolve({
                      data: {
                        user_id: mockUserId,
                        fingerprint_hash: mockFingerprintHash,
                        is_active: true,
                        last_seen_at: new Date().toISOString(), // Recent activity
                      },
                      error: null,
                    })
                  ),
                })),
              })),
            })),
          })),
        })),
      }

      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const result = await validateSessionDetailed(mockUserId, mockFingerprintHash)

      expect(result).toEqual({
        valid: true,
      })
    })

    it('should update session activity on valid requests', async () => {
      const updateMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null })),
          })),
        })),
      }))

      const mockSupabase = {
        from: vi.fn(() => ({
          update: updateMock,
        })),
      }

      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      await updateSessionActivity(mockUserId, mockFingerprintHash)

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          last_seen_at: expect.any(String),
        })
      )
    })
  })

  describe('3. Session Expiry After 14 Days', () => {
    it('should return session_expired when last_seen_at > 14 days', async () => {
      // Mock session last seen 15 days ago
      const fifteenDaysAgo = new Date()
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15)

      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn(() =>
                    Promise.resolve({
                      data: {
                        user_id: mockUserId,
                        fingerprint_hash: mockFingerprintHash,
                        is_active: true,
                        last_seen_at: fifteenDaysAgo.toISOString(),
                      },
                      error: null,
                    })
                  ),
                })),
              })),
            })),
          })),
        })),
      }

      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const result = await validateSessionDetailed(mockUserId, mockFingerprintHash)

      expect(result).toEqual({
        valid: false,
        reason: 'session_expired',
      })
    })

    it('should return valid=true when last_seen_at < 14 days', async () => {
      // Mock session last seen 10 days ago
      const tenDaysAgo = new Date()
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10)

      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn(() =>
                    Promise.resolve({
                      data: {
                        user_id: mockUserId,
                        fingerprint_hash: mockFingerprintHash,
                        is_active: true,
                        last_seen_at: tenDaysAgo.toISOString(),
                      },
                      error: null,
                    })
                  ),
                })),
              })),
            })),
          })),
        })),
      }

      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const result = await validateSessionDetailed(mockUserId, mockFingerprintHash)

      expect(result).toEqual({
        valid: true,
      })
    })
  })

  describe('4. Inactive Sessions Fail Validation', () => {
    it('should return session_inactive when is_active=false', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn(() =>
                    Promise.resolve({
                      data: {
                        user_id: mockUserId,
                        fingerprint_hash: mockFingerprintHash,
                        is_active: false, // Inactive session
                        last_seen_at: new Date().toISOString(),
                      },
                      error: null,
                    })
                  ),
                })),
              })),
            })),
          })),
        })),
      }

      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const result = await validateSessionDetailed(mockUserId, mockFingerprintHash)

      expect(result).toEqual({
        valid: false,
        reason: 'session_inactive',
      })
    })
  })

  describe('5. Fingerprint Generation', () => {
    it('should generate consistent fingerprints for same request', () => {
      const mockRequest = createMockRequest() as NextRequest

      const fingerprint1 = generateSessionFingerprint(mockRequest)
      const fingerprint2 = generateSessionFingerprint(mockRequest)

      expect(fingerprint1).toBe(fingerprint2)
      expect(fingerprint1).toBeTruthy()
    })

    it('should generate different fingerprints for different user agents', () => {
      const mockRequest1 = createMockRequest({
        userAgent: 'Mozilla/5.0 (Macintosh)',
      }) as NextRequest
      const mockRequest2 = createMockRequest({
        userAgent: 'Mozilla/5.0 (Windows)',
      }) as NextRequest

      const fingerprint1 = generateSessionFingerprint(mockRequest1)
      const fingerprint2 = generateSessionFingerprint(mockRequest2)

      expect(fingerprint1).not.toBe(fingerprint2)
    })

    it('should generate different fingerprints for different IPs', () => {
      const mockRequest1 = createMockRequest({
        ip: '192.168.1.1',
      }) as NextRequest
      const mockRequest2 = createMockRequest({
        ip: '10.0.0.1',
      }) as NextRequest

      const fingerprint1 = generateSessionFingerprint(mockRequest1)
      const fingerprint2 = generateSessionFingerprint(mockRequest2)

      expect(fingerprint1).not.toBe(fingerprint2)
    })
  })

  describe('6. Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn(() =>
                    Promise.resolve({
                      data: null,
                      error: { code: 'PGRST000', message: 'Database error' },
                    })
                  ),
                })),
              })),
            })),
          })),
        })),
      }

      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const result = await validateSessionDetailed(mockUserId, mockFingerprintHash)

      expect(result).toEqual({
        valid: false,
        reason: 'fingerprint_mismatch',
      })
    })
  })
})

describe('SEC-003: Real-World Scenarios', () => {
  const mockUserId = '550e8400-e29b-41d4-a716-446655440000'

  describe('New User Login Flow', () => {
    it('should store fingerprint on first login and validate on second request', async () => {
      const mockRequest = {
        headers: {
          get: vi.fn((name: string) => {
            switch (name.toLowerCase()) {
              case 'user-agent':
                return 'Mozilla/5.0 (Macintosh)'
              case 'x-forwarded-for':
                return '192.168.1.100'
              case 'accept-language':
                return 'en-US'
              default:
                return null
            }
          }),
        },
      } as any

      const fingerprint = generateSessionFingerprint(mockRequest)

      // First request - no fingerprint stored
      const mockSupabaseFirstRequest = {
        from: vi.fn((table: string) => {
          if (table === 'session_fingerprints') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    eq: vi.fn(() => ({
                      single: vi.fn(() =>
                        Promise.resolve({
                          data: null,
                          error: { code: 'PGRST116', message: 'No rows found' },
                        })
                      ),
                    })),
                  })),
                })),
              })),
              upsert: vi.fn(() => Promise.resolve({ data: {}, error: null })),
            }
          }
          return {}
        }),
      }

      vi.mocked(createClient).mockResolvedValue(mockSupabaseFirstRequest as any)

      // Validate - should indicate needs storage
      const firstValidation = await validateSessionDetailed(mockUserId, fingerprint)
      expect(firstValidation.needsStorage).toBe(true)

      // Store fingerprint
      await storeSessionMetadata(mockUserId, mockRequest)

      // Second request - fingerprint stored
      const mockSupabaseSecondRequest = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn(() =>
                    Promise.resolve({
                      data: {
                        user_id: mockUserId,
                        fingerprint_hash: fingerprint,
                        is_active: true,
                        last_seen_at: new Date().toISOString(),
                      },
                      error: null,
                    })
                  ),
                })),
              })),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ error: null })),
              })),
            })),
          })),
        })),
      }

      vi.mocked(createClient).mockResolvedValue(mockSupabaseSecondRequest as any)

      // Validate again - should be valid
      const secondValidation = await validateSessionDetailed(mockUserId, fingerprint)
      expect(secondValidation.valid).toBe(true)

      // Update activity
      await updateSessionActivity(mockUserId, fingerprint)
    })
  })

  describe('Session Hijacking Detection', () => {
    it('should detect when user agent changes between requests', () => {
      const mockRequest1 = {
        headers: {
          get: vi.fn((name: string) => {
            switch (name.toLowerCase()) {
              case 'user-agent':
                return 'Mozilla/5.0 (Macintosh)'
              case 'x-forwarded-for':
                return '192.168.1.100'
              default:
                return null
            }
          }),
        },
      } as any

      const mockRequest2 = {
        headers: {
          get: vi.fn((name: string) => {
            switch (name.toLowerCase()) {
              case 'user-agent':
                return 'Mozilla/5.0 (Windows)' // Different user agent
              case 'x-forwarded-for':
                return '192.168.1.100' // Same IP
              default:
                return null
            }
          }),
        },
      } as any

      const fingerprint1 = generateSessionFingerprint(mockRequest1)
      const fingerprint2 = generateSessionFingerprint(mockRequest2)

      // Different fingerprints = potential session hijacking
      expect(fingerprint1).not.toBe(fingerprint2)
    })

    it('should detect when IP changes between requests', () => {
      const mockRequest1 = {
        headers: {
          get: vi.fn((name: string) => {
            switch (name.toLowerCase()) {
              case 'user-agent':
                return 'Mozilla/5.0 (Macintosh)'
              case 'x-forwarded-for':
                return '192.168.1.100'
              default:
                return null
            }
          }),
        },
      } as any

      const mockRequest2 = {
        headers: {
          get: vi.fn((name: string) => {
            switch (name.toLowerCase()) {
              case 'user-agent':
                return 'Mozilla/5.0 (Macintosh)' // Same user agent
              case 'x-forwarded-for':
                return '10.0.0.50' // Different IP
              default:
                return null
            }
          }),
        },
      } as any

      const fingerprint1 = generateSessionFingerprint(mockRequest1)
      const fingerprint2 = generateSessionFingerprint(mockRequest2)

      // Different fingerprints = potential session hijacking
      expect(fingerprint1).not.toBe(fingerprint2)
    })
  })
})
