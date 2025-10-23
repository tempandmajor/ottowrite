/**
 * Tests for Access Control & DRM System
 *
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest'
import {
  generateAccessToken,
  verifyAccessToken,
  hasPermission,
  getDefaultPermissions,
  getFullAccessPermissions,
  getDRMRules,
  createDeviceFingerprint,
  checkAccessRules,
  generateSessionId,
  calculateSessionDuration,
  detectSuspiciousActivity,
  getDRMSecurityHeaders,
  generateSecureLink,
  isTokenRevoked,
  type AccessPermission,
  type AccessControlRules,
  type AccessSession,
} from '@/lib/submissions/access-control'

describe('Access Control & DRM System', () => {
  const mockPayload = {
    submissionId: 'sub_123',
    partnerId: 'partner_456',
    userId: 'user_789',
    watermarkId: 'wm_abc123',
    permissions: getFullAccessPermissions(),
  }

  describe('generateAccessToken', () => {
    it('should generate a valid JWT token with default expiry', async () => {
      const result = await generateAccessToken(mockPayload)

      expect(result.token).toBeDefined()
      expect(typeof result.token).toBe('string')
      expect(result.token.split('.').length).toBe(3) // JWT format: header.payload.signature
      expect(result.expiresAt).toBeDefined()

      // Check expiry is approximately 90 days from now
      const expiryDate = new Date(result.expiresAt)
      const now = new Date()
      const diffDays = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      expect(diffDays).toBeGreaterThan(89)
      expect(diffDays).toBeLessThan(91)
    })

    it('should generate token with custom expiry', async () => {
      const customExpiryDays = 30
      const result = await generateAccessToken(mockPayload, customExpiryDays)

      const expiryDate = new Date(result.expiresAt)
      const now = new Date()
      const diffDays = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      expect(diffDays).toBeGreaterThan(29)
      expect(diffDays).toBeLessThan(31)
    })

    it('should generate different tokens for different payloads', async () => {
      const result1 = await generateAccessToken(mockPayload)
      const result2 = await generateAccessToken({
        ...mockPayload,
        partnerId: 'different_partner',
      })

      expect(result1.token).not.toBe(result2.token)
    })

    it('should include all payload data in token', async () => {
      const result = await generateAccessToken(mockPayload)
      const verification = await verifyAccessToken(result.token)

      expect(verification.valid).toBe(true)
      expect(verification.payload?.submissionId).toBe(mockPayload.submissionId)
      expect(verification.payload?.partnerId).toBe(mockPayload.partnerId)
      expect(verification.payload?.userId).toBe(mockPayload.userId)
      expect(verification.payload?.watermarkId).toBe(mockPayload.watermarkId)
      expect(verification.payload?.permissions).toEqual(mockPayload.permissions)
    })
  })

  describe('verifyAccessToken', () => {
    it('should verify valid token', async () => {
      const { token } = await generateAccessToken(mockPayload)
      const result = await verifyAccessToken(token)

      expect(result.valid).toBe(true)
      expect(result.payload).toBeDefined()
      expect(result.error).toBeUndefined()
    })

    it('should reject invalid token', async () => {
      const result = await verifyAccessToken('invalid.token.here')

      expect(result.valid).toBe(false)
      expect(result.payload).toBeUndefined()
      expect(result.error).toBeDefined()
    })

    it('should reject malformed token', async () => {
      const result = await verifyAccessToken('not-a-jwt')

      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should reject expired token', async () => {
      // Generate token with very short expiry (1 millisecond)
      const { token } = await generateAccessToken(mockPayload, 1 / (24 * 60 * 60 * 1000))

      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 10))

      const result = await verifyAccessToken(token)

      expect(result.valid).toBe(false)
      // jose library returns '"exp" claim timestamp check failed' for expired tokens
      expect(result.error).toMatch(/exp.*claim.*timestamp.*check.*failed|expired/i)
    })

    it('should extract correct payload from token', async () => {
      const { token } = await generateAccessToken(mockPayload)
      const result = await verifyAccessToken(token)

      expect(result.payload?.submissionId).toBe(mockPayload.submissionId)
      expect(result.payload?.partnerId).toBe(mockPayload.partnerId)
      expect(result.payload?.userId).toBe(mockPayload.userId)
      expect(result.payload?.watermarkId).toBe(mockPayload.watermarkId)
      expect(result.payload?.createdAt).toBeDefined()
      expect(result.payload?.expiresAt).toBeDefined()
    })
  })

  describe('hasPermission', () => {
    it('should return true when permission exists', () => {
      const permissions: AccessPermission[] = ['view', 'view_query', 'download']

      expect(hasPermission(permissions, 'view')).toBe(true)
      expect(hasPermission(permissions, 'view_query')).toBe(true)
      expect(hasPermission(permissions, 'download')).toBe(true)
    })

    it('should return false when permission does not exist', () => {
      const permissions: AccessPermission[] = ['view', 'view_query']

      expect(hasPermission(permissions, 'download')).toBe(false)
      expect(hasPermission(permissions, 'print')).toBe(false)
      expect(hasPermission(permissions, 'copy')).toBe(false)
    })

    it('should handle empty permissions array', () => {
      const permissions: AccessPermission[] = []

      expect(hasPermission(permissions, 'view')).toBe(false)
    })
  })

  describe('getDefaultPermissions', () => {
    it('should return view-only permissions', () => {
      const permissions = getDefaultPermissions()

      expect(permissions).toContain('view')
      expect(permissions).toContain('view_query')
      expect(permissions).toContain('view_synopsis')
      expect(permissions).toContain('view_sample')
      expect(permissions).not.toContain('view_full')
      expect(permissions).not.toContain('download')
      expect(permissions).not.toContain('print')
      expect(permissions).not.toContain('copy')
    })
  })

  describe('getFullAccessPermissions', () => {
    it('should return full view permissions without DRM violations', () => {
      const permissions = getFullAccessPermissions()

      expect(permissions).toContain('view')
      expect(permissions).toContain('view_query')
      expect(permissions).toContain('view_synopsis')
      expect(permissions).toContain('view_sample')
      expect(permissions).toContain('view_full')
      expect(permissions).not.toContain('download')
      expect(permissions).not.toContain('print')
      expect(permissions).not.toContain('copy')
    })
  })

  describe('getDRMRules', () => {
    it('should return DRM-safe rules', () => {
      const rules = getDRMRules()

      expect(rules.allowDownload).toBe(false)
      expect(rules.allowPrint).toBe(false)
      expect(rules.allowCopy).toBe(false)
      expect(rules.allowScreenshots).toBe(false)
      expect(rules.maxViewDuration).toBe(120)
    })
  })

  describe('createDeviceFingerprint', () => {
    it('should create consistent fingerprint for same inputs', () => {
      const fp1 = createDeviceFingerprint('Mozilla/5.0', '192.168.1.1')
      const fp2 = createDeviceFingerprint('Mozilla/5.0', '192.168.1.1')

      expect(fp1).toBe(fp2)
      expect(fp1).toHaveLength(32)
      expect(fp1).toMatch(/^[a-f0-9]{32}$/)
    })

    it('should create different fingerprints for different inputs', () => {
      const fp1 = createDeviceFingerprint('Mozilla/5.0', '192.168.1.1')
      const fp2 = createDeviceFingerprint('Chrome/90.0', '192.168.1.2')

      expect(fp1).not.toBe(fp2)
    })

    it('should handle additional data', () => {
      const fp1 = createDeviceFingerprint('Mozilla/5.0', '192.168.1.1', {
        screenResolution: '1920x1080',
      })
      const fp2 = createDeviceFingerprint('Mozilla/5.0', '192.168.1.1', {
        screenResolution: '1366x768',
      })

      expect(fp1).not.toBe(fp2)
    })

    it('should handle empty strings', () => {
      const fp = createDeviceFingerprint('', '')

      expect(fp).toBeDefined()
      expect(fp).toHaveLength(32)
    })
  })

  describe('checkAccessRules', () => {
    it('should allow access when all rules pass', () => {
      const rules: AccessControlRules = {
        allowDownload: false,
        allowPrint: false,
        allowCopy: false,
        allowScreenshots: false,
      }

      const result = checkAccessRules(rules, {
        currentTime: new Date(),
      })

      expect(result.allowed).toBe(true)
      expect(result.reason).toBeUndefined()
    })

    it('should deny access when expired', () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const rules: AccessControlRules = {
        allowDownload: false,
        allowPrint: false,
        allowCopy: false,
        allowScreenshots: false,
        expiryDate: yesterday,
      }

      const result = checkAccessRules(rules, {
        currentTime: new Date(),
      })

      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('expired')
    })

    it('should deny access when IP not authorized', () => {
      const rules: AccessControlRules = {
        allowDownload: false,
        allowPrint: false,
        allowCopy: false,
        allowScreenshots: false,
        ipRestrictions: ['192.168.1.1', '192.168.1.2'],
      }

      const result = checkAccessRules(rules, {
        ipAddress: '10.0.0.1',
        currentTime: new Date(),
      })

      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('IP')
    })

    it('should allow access when IP is authorized', () => {
      const rules: AccessControlRules = {
        allowDownload: false,
        allowPrint: false,
        allowCopy: false,
        allowScreenshots: false,
        ipRestrictions: ['192.168.1.1', '192.168.1.2'],
      }

      const result = checkAccessRules(rules, {
        ipAddress: '192.168.1.1',
        currentTime: new Date(),
      })

      expect(result.allowed).toBe(true)
    })

    it('should deny access when device not authorized', () => {
      const rules: AccessControlRules = {
        allowDownload: false,
        allowPrint: false,
        allowCopy: false,
        allowScreenshots: false,
        deviceRestrictions: ['device_123', 'device_456'],
      }

      const result = checkAccessRules(rules, {
        deviceFingerprint: 'device_789',
        currentTime: new Date(),
      })

      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('Device')
    })

    it('should allow access when device is authorized', () => {
      const rules: AccessControlRules = {
        allowDownload: false,
        allowPrint: false,
        allowCopy: false,
        allowScreenshots: false,
        deviceRestrictions: ['device_123', 'device_456'],
      }

      const result = checkAccessRules(rules, {
        deviceFingerprint: 'device_123',
        currentTime: new Date(),
      })

      expect(result.allowed).toBe(true)
    })
  })

  describe('generateSecureLink', () => {
    it('should generate URL with token and partner params', () => {
      const baseUrl = 'https://ottowrite.com/view'
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
      const partnerId = 'partner_123'

      const link = generateSecureLink(baseUrl, token, partnerId)

      expect(link).toContain(baseUrl)
      expect(link).toContain(`token=${encodeURIComponent(token)}`)
      expect(link).toContain(`partner=${partnerId}`)
    })

    it('should handle base URL with existing query params', () => {
      const baseUrl = 'https://ottowrite.com/view?foo=bar'
      const token = 'token123'
      const partnerId = 'partner_456'

      const link = generateSecureLink(baseUrl, token, partnerId)

      expect(link).toContain('foo=bar')
      expect(link).toContain('token=token123')
      expect(link).toContain('partner=partner_456')
    })
  })

  describe('isTokenRevoked', () => {
    it('should return true for revoked tokens', async () => {
      const revokedTokens = new Set(['token1', 'token2', 'token3'])
      const result = await isTokenRevoked('token2', revokedTokens)

      expect(result).toBe(true)
    })

    it('should return false for non-revoked tokens', async () => {
      const revokedTokens = new Set(['token1', 'token2', 'token3'])
      const result = await isTokenRevoked('token4', revokedTokens)

      expect(result).toBe(false)
    })

    it('should handle empty revoked set', async () => {
      const revokedTokens = new Set<string>()
      const result = await isTokenRevoked('any_token', revokedTokens)

      expect(result).toBe(false)
    })
  })

  describe('generateSessionId', () => {
    it('should generate unique session IDs', () => {
      const id1 = generateSessionId()
      const id2 = generateSessionId()

      expect(id1).not.toBe(id2)
      expect(id1).toHaveLength(24)
      expect(id2).toHaveLength(24)
      expect(id1).toMatch(/^[a-f0-9]{24}$/)
      expect(id2).toMatch(/^[a-f0-9]{24}$/)
    })
  })

  describe('calculateSessionDuration', () => {
    it('should calculate duration in seconds', () => {
      const start = new Date('2025-01-01T10:00:00Z')
      const end = new Date('2025-01-01T10:05:30Z')

      const duration = calculateSessionDuration(start, end)

      expect(duration).toBe(330) // 5 minutes 30 seconds = 330 seconds
    })

    it('should handle same start and end time', () => {
      const time = new Date()
      const duration = calculateSessionDuration(time, time)

      expect(duration).toBe(0)
    })

    it('should handle long durations', () => {
      const start = new Date('2025-01-01T10:00:00Z')
      const end = new Date('2025-01-01T18:00:00Z')

      const duration = calculateSessionDuration(start, end)

      expect(duration).toBe(8 * 60 * 60) // 8 hours = 28800 seconds
    })
  })

  describe('detectSuspiciousActivity', () => {
    it('should detect rapid page viewing', () => {
      const session: AccessSession = {
        sessionId: 'sess_123',
        token: 'token_123',
        submissionId: 'sub_123',
        partnerId: 'partner_123',
        startTime: new Date(),
        duration: 30,
        actions: Array(150).fill({
          type: 'view',
          timestamp: new Date(),
        }),
      }

      const result = detectSuspiciousActivity(session)

      expect(result.suspicious).toBe(true)
      expect(result.reasons).toContain('Rapid page viewing detected')
    })

    it('should detect multiple download attempts', () => {
      const session: AccessSession = {
        sessionId: 'sess_123',
        token: 'token_123',
        submissionId: 'sub_123',
        partnerId: 'partner_123',
        startTime: new Date(),
        duration: 300,
        actions: [
          { type: 'attempt_download', timestamp: new Date() },
          { type: 'attempt_download', timestamp: new Date() },
          { type: 'attempt_download', timestamp: new Date() },
          { type: 'attempt_download', timestamp: new Date() },
          { type: 'view', timestamp: new Date() },
        ],
      }

      const result = detectSuspiciousActivity(session)

      expect(result.suspicious).toBe(true)
      expect(result.reasons).toContain('Multiple download attempts')
    })

    it('should detect multiple copy attempts', () => {
      const session: AccessSession = {
        sessionId: 'sess_123',
        token: 'token_123',
        submissionId: 'sub_123',
        partnerId: 'partner_123',
        startTime: new Date(),
        duration: 300,
        actions: Array(15).fill({
          type: 'attempt_copy',
          timestamp: new Date(),
        }),
      }

      const result = detectSuspiciousActivity(session)

      expect(result.suspicious).toBe(true)
      expect(result.reasons).toContain('Multiple copy attempts')
    })

    it('should detect unusually long sessions', () => {
      const session: AccessSession = {
        sessionId: 'sess_123',
        token: 'token_123',
        submissionId: 'sub_123',
        partnerId: 'partner_123',
        startTime: new Date(),
        duration: 10 * 60 * 60, // 10 hours
        actions: [{ type: 'view', timestamp: new Date() }],
      }

      const result = detectSuspiciousActivity(session)

      expect(result.suspicious).toBe(true)
      expect(result.reasons).toContain('Unusually long session')
    })

    it('should not flag normal usage', () => {
      const session: AccessSession = {
        sessionId: 'sess_123',
        token: 'token_123',
        submissionId: 'sub_123',
        partnerId: 'partner_123',
        startTime: new Date(),
        duration: 600, // 10 minutes
        actions: [
          { type: 'view', timestamp: new Date() },
          { type: 'scroll', timestamp: new Date() },
          { type: 'zoom', timestamp: new Date() },
          { type: 'view', timestamp: new Date() },
        ],
      }

      const result = detectSuspiciousActivity(session)

      expect(result.suspicious).toBe(false)
      expect(result.reasons).toHaveLength(0)
    })

    it('should detect multiple suspicious patterns', () => {
      const session: AccessSession = {
        sessionId: 'sess_123',
        token: 'token_123',
        submissionId: 'sub_123',
        partnerId: 'partner_123',
        startTime: new Date(),
        duration: 30, // Short duration
        actions: [
          ...Array(150).fill({ type: 'view', timestamp: new Date() }),
          ...Array(15).fill({ type: 'attempt_copy', timestamp: new Date() }),
        ],
      }

      const result = detectSuspiciousActivity(session)

      expect(result.suspicious).toBe(true)
      expect(result.reasons.length).toBeGreaterThan(1)
      expect(result.reasons).toContain('Rapid page viewing detected')
      expect(result.reasons).toContain('Multiple copy attempts')
    })
  })

  describe('getDRMSecurityHeaders', () => {
    it('should return security headers for DRM enforcement', () => {
      const headers = getDRMSecurityHeaders()

      expect(headers['Content-Security-Policy']).toBeDefined()
      expect(headers['X-Frame-Options']).toBe('DENY')
      expect(headers['X-Content-Type-Options']).toBe('nosniff')
      expect(headers['X-XSS-Protection']).toBe('1; mode=block')
      expect(headers['Referrer-Policy']).toBe('no-referrer')
      expect(headers['Permissions-Policy']).toBeDefined()
    })

    it('should have strict CSP policy', () => {
      const headers = getDRMSecurityHeaders()
      const csp = headers['Content-Security-Policy']

      expect(csp).toContain("default-src 'self'")
      expect(csp).toContain("frame-ancestors 'none'")
    })

    it('should restrict permissions', () => {
      const headers = getDRMSecurityHeaders()
      const permissions = headers['Permissions-Policy']

      expect(permissions).toContain('camera=()')
      expect(permissions).toContain('microphone=()')
      expect(permissions).toContain('geolocation=()')
    })
  })

  describe('Integration Tests', () => {
    it('should complete full token lifecycle', async () => {
      // Generate token
      const { token } = await generateAccessToken(mockPayload, 30)

      expect(token).toBeDefined()

      // Verify token
      const verification = await verifyAccessToken(token)
      expect(verification.valid).toBe(true)
      expect(verification.payload).toBeDefined()

      // Check permissions
      const hasViewPermission = hasPermission(
        verification.payload!.permissions,
        'view'
      )
      expect(hasViewPermission).toBe(true)

      // Generate secure link
      const link = generateSecureLink(
        'https://ottowrite.com/view',
        token,
        mockPayload.partnerId
      )
      expect(link).toContain(token)

      // Check token not revoked
      const isRevoked = await isTokenRevoked(token, new Set())
      expect(isRevoked).toBe(false)
    })

    it('should enforce DRM rules end-to-end', () => {
      const rules = getDRMRules()
      const headers = getDRMSecurityHeaders()
      const permissions = getFullAccessPermissions()

      // Verify DRM rules are strict
      expect(rules.allowDownload).toBe(false)
      expect(rules.allowPrint).toBe(false)
      expect(rules.allowCopy).toBe(false)

      // Verify permissions don't include DRM violations
      expect(permissions).not.toContain('download')
      expect(permissions).not.toContain('print')
      expect(permissions).not.toContain('copy')

      // Verify security headers are set
      expect(headers['X-Frame-Options']).toBe('DENY')
      expect(headers['Content-Security-Policy']).toContain("frame-ancestors 'none'")
    })
  })
})
