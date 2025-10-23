/**
 * Manuscript Access Control & DRM System
 *
 * Provides token-based access control for manuscript viewing with:
 * - Time-limited access tokens (JWT-based)
 * - Revocable access
 * - View-only enforcement (no download/copy/print)
 * - Access expiration
 * - Usage tracking
 */

import { SignJWT, jwtVerify } from 'jose'
import { createHash } from 'crypto'

// Access token configuration
// HS256 requires at least 32 characters (256 bits)
const ACCESS_TOKEN_SECRET = process.env.MANUSCRIPT_ACCESS_SECRET || 'your-secret-key-change-in-production-must-be-at-least-32-characters-long'
const DEFAULT_EXPIRY_DAYS = 90 // 90 days default access

export interface AccessTokenPayload {
  submissionId: string
  partnerId: string
  userId: string
  watermarkId: string
  permissions: AccessPermission[]
  expiresAt: string
  createdAt: string
}

export type AccessPermission =
  | 'view'           // Can view manuscript
  | 'view_query'     // Can view query letter
  | 'view_synopsis'  // Can view synopsis
  | 'view_sample'    // Can view sample pages
  | 'view_full'      // Can view full manuscript
  | 'download'       // Can download (disabled by default for DRM)
  | 'print'          // Can print (disabled by default for DRM)
  | 'copy'           // Can copy text (disabled by default for DRM)

export interface AccessControlRules {
  allowDownload: boolean
  allowPrint: boolean
  allowCopy: boolean
  allowScreenshots: boolean // Note: Hard to enforce, but tracked
  maxViewDuration?: number  // Max time per session in minutes
  expiryDate?: Date
  ipRestrictions?: string[] // Allowed IP addresses
  deviceRestrictions?: string[] // Allowed device fingerprints
}

/**
 * Generate a secure access token for manuscript viewing
 */
export async function generateAccessToken(
  payload: Omit<AccessTokenPayload, 'createdAt' | 'expiresAt'>,
  expiryDays: number = DEFAULT_EXPIRY_DAYS
): Promise<{ token: string; expiresAt: string }> {
  const now = new Date()
  const expiresAt = new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000)

  const secret = new TextEncoder().encode(ACCESS_TOKEN_SECRET)

  const jwtPayload = {
    submissionId: payload.submissionId,
    partnerId: payload.partnerId,
    userId: payload.userId,
    watermarkId: payload.watermarkId,
    permissions: payload.permissions,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  }

  const token = await new SignJWT(jwtPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000)) // Unix timestamp in seconds
    .setSubject(`submission:${payload.submissionId}:partner:${payload.partnerId}`)
    .sign(secret)

  return {
    token,
    expiresAt: expiresAt.toISOString(),
  }
}

/**
 * Verify and decode an access token
 */
export async function verifyAccessToken(
  token: string
): Promise<{ valid: boolean; payload?: AccessTokenPayload; error?: string }> {
  try {
    const secret = new TextEncoder().encode(ACCESS_TOKEN_SECRET)

    const { payload } = await jwtVerify(token, secret)

    // Check if token is expired
    const tokenPayload = payload as unknown as AccessTokenPayload
    const expiresAt = new Date(tokenPayload.expiresAt)

    if (expiresAt < new Date()) {
      return {
        valid: false,
        error: 'Token has expired',
      }
    }

    return {
      valid: true,
      payload: tokenPayload,
    }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid token',
    }
  }
}

/**
 * Check if a specific permission is granted
 */
export function hasPermission(
  permissions: AccessPermission[],
  required: AccessPermission
): boolean {
  return permissions.includes(required)
}

/**
 * Get default access permissions (view-only, no DRM violations)
 */
export function getDefaultPermissions(): AccessPermission[] {
  return ['view', 'view_query', 'view_synopsis', 'view_sample']
}

/**
 * Get full access permissions (including full manuscript)
 */
export function getFullAccessPermissions(): AccessPermission[] {
  return [
    'view',
    'view_query',
    'view_synopsis',
    'view_sample',
    'view_full',
  ]
}

/**
 * Get DRM-safe access control rules
 */
export function getDRMRules(): AccessControlRules {
  return {
    allowDownload: false,
    allowPrint: false,
    allowCopy: false,
    allowScreenshots: false,
    maxViewDuration: 120, // 2 hours per session
  }
}

/**
 * Create a device fingerprint for tracking
 */
export function createDeviceFingerprint(
  userAgent: string,
  ipAddress: string,
  additionalData?: Record<string, string>
): string {
  const data = {
    userAgent,
    ipAddress,
    ...additionalData,
  }

  return createHash('sha256')
    .update(JSON.stringify(data))
    .digest('hex')
    .substring(0, 32)
}

/**
 * Check if access should be granted based on rules
 */
export function checkAccessRules(
  rules: AccessControlRules,
  context: {
    ipAddress?: string
    deviceFingerprint?: string
    currentTime: Date
  }
): { allowed: boolean; reason?: string } {
  // Check expiry
  if (rules.expiryDate && rules.expiryDate < context.currentTime) {
    return {
      allowed: false,
      reason: 'Access has expired',
    }
  }

  // Check IP restrictions
  if (rules.ipRestrictions && rules.ipRestrictions.length > 0 && context.ipAddress) {
    if (!rules.ipRestrictions.includes(context.ipAddress)) {
      return {
        allowed: false,
        reason: 'IP address not authorized',
      }
    }
  }

  // Check device restrictions
  if (
    rules.deviceRestrictions &&
    rules.deviceRestrictions.length > 0 &&
    context.deviceFingerprint
  ) {
    if (!rules.deviceRestrictions.includes(context.deviceFingerprint)) {
      return {
        allowed: false,
        reason: 'Device not authorized',
      }
    }
  }

  return { allowed: true }
}

/**
 * Generate a secure shareable link with embedded token
 */
export function generateSecureLink(
  baseUrl: string,
  token: string,
  partnerId: string
): string {
  const url = new URL(baseUrl)
  url.searchParams.set('token', token)
  url.searchParams.set('partner', partnerId)

  return url.toString()
}

/**
 * Revoke access token (mark as revoked in database)
 */
export interface RevokeAccessResult {
  success: boolean
  revokedAt?: string
  error?: string
}

/**
 * Check if a token has been revoked
 * This should be checked against the database
 */
export async function isTokenRevoked(
  token: string,
  revokedTokens: Set<string>
): Promise<boolean> {
  return revokedTokens.has(token)
}

/**
 * Create access session data for tracking
 */
export interface AccessSession {
  sessionId: string
  token: string
  submissionId: string
  partnerId: string
  startTime: Date
  endTime?: Date
  duration?: number // in seconds
  ipAddress?: string
  userAgent?: string
  deviceFingerprint?: string
  pagesViewed?: number[]
  actions: AccessAction[]
}

export interface AccessAction {
  type: 'view' | 'scroll' | 'zoom' | 'attempt_download' | 'attempt_copy' | 'attempt_print'
  timestamp: Date
  metadata?: Record<string, unknown>
}

/**
 * Generate unique session ID
 */
export function generateSessionId(): string {
  return createHash('sha256')
    .update(`${Date.now()}-${Math.random()}`)
    .digest('hex')
    .substring(0, 24)
}

/**
 * Calculate session duration
 */
export function calculateSessionDuration(startTime: Date, endTime: Date): number {
  return Math.floor((endTime.getTime() - startTime.getTime()) / 1000)
}

/**
 * Detect suspicious access patterns
 */
export function detectSuspiciousActivity(session: AccessSession): {
  suspicious: boolean
  reasons: string[]
} {
  const reasons: string[] = []

  // Check for rapid page viewing (possible scraping)
  if (session.actions.length > 100 && session.duration && session.duration < 60) {
    reasons.push('Rapid page viewing detected')
  }

  // Check for multiple download attempts
  const downloadAttempts = session.actions.filter(a => a.type === 'attempt_download').length
  if (downloadAttempts > 3) {
    reasons.push('Multiple download attempts')
  }

  // Check for multiple copy attempts
  const copyAttempts = session.actions.filter(a => a.type === 'attempt_copy').length
  if (copyAttempts > 10) {
    reasons.push('Multiple copy attempts')
  }

  // Check for unusual session duration (>8 hours)
  if (session.duration && session.duration > 8 * 60 * 60) {
    reasons.push('Unusually long session')
  }

  return {
    suspicious: reasons.length > 0,
    reasons,
  }
}

/**
 * Enforce DRM rules client-side (returns CSP headers)
 */
export function getDRMSecurityHeaders(): Record<string, string> {
  return {
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
    ].join('; '),
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': [
      'camera=()',
      'microphone=()',
      'geolocation=()',
    ].join(', '),
  }
}
