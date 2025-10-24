/**
 * Session Management Security Module
 *
 * Provides advanced session security features:
 * - Session fingerprinting (device/IP/User-Agent tracking)
 * - Session rotation after privilege escalation
 * - Concurrent session limits
 * - Session activity monitoring
 * - Session invalidation tracking
 */

import { createClient } from '@/lib/supabase/server'
import type { NextRequest } from 'next/server'
import { createHash } from 'crypto'

const MAX_CONCURRENT_SESSIONS = 5
// Reserved for future use when implementing automatic session rotation
// const _SESSION_ROTATION_EVENTS = ['password_change', 'email_change', 'mfa_enable']
// const _SESSION_ACTIVITY_WINDOW = 60 * 60 * 1000 // 1 hour in ms

export type SessionFingerprint = {
  userAgent: string
  ipAddress: string
  deviceHash: string
  createdAt: string
  lastActivityAt: string
}

export type SessionMetadata = {
  userId: string
  fingerprint: SessionFingerprint
  rotationCount: number
  invalidated: boolean
  invalidatedAt?: string
  invalidationReason?: string
}

/**
 * Generate a unique device fingerprint from request headers
 */
export function generateDeviceFingerprint(request: NextRequest): string {
  const userAgent = request.headers.get('user-agent') || 'unknown'
  const acceptLanguage = request.headers.get('accept-language') || 'unknown'
  const acceptEncoding = request.headers.get('accept-encoding') || 'unknown'

  // Combine multiple headers for more unique fingerprint
  const fingerprintData = `${userAgent}|${acceptLanguage}|${acceptEncoding}`

  return createHash('sha256')
    .update(fingerprintData)
    .digest('hex')
    .substring(0, 32)
}

/**
 * Get client IP address from request, considering proxies
 */
export function getClientIP(request: NextRequest): string {
  // Check common proxy headers in order of preference
  const xForwardedFor = request.headers.get('x-forwarded-for')
  const xRealIp = request.headers.get('x-real-ip')
  const cfConnectingIp = request.headers.get('cf-connecting-ip') // Cloudflare

  if (cfConnectingIp) return cfConnectingIp
  if (xRealIp) return xRealIp
  if (xForwardedFor) {
    // X-Forwarded-For can contain multiple IPs, use the first one
    return xForwardedFor.split(',')[0].trim()
  }

  // Note: request.ip is not available in Edge Runtime
  // For now, use the header-based approach only
  return 'unknown'
}

/**
 * Create session fingerprint from request
 */
export function createSessionFingerprint(request: NextRequest): SessionFingerprint {
  const userAgent = request.headers.get('user-agent') || 'unknown'
  const ipAddress = getClientIP(request)
  const deviceHash = generateDeviceFingerprint(request)
  const now = new Date().toISOString()

  return {
    userAgent,
    ipAddress,
    deviceHash,
    createdAt: now,
    lastActivityAt: now,
  }
}

/**
 * Verify session fingerprint matches current request
 * Returns true if fingerprint is valid (allows for some drift)
 */
export function verifySessionFingerprint(
  stored: SessionFingerprint,
  current: SessionFingerprint
): { valid: boolean; reason?: string } {
  // Device hash must match exactly
  if (stored.deviceHash !== current.deviceHash) {
    return {
      valid: false,
      reason: 'Device fingerprint mismatch',
    }
  }

  // IP can change (mobile networks, VPNs) but log it
  if (stored.ipAddress !== current.ipAddress) {
    console.warn('Session IP address changed', {
      stored: stored.ipAddress,
      current: current.ipAddress,
    })
  }

  // User agent should match (minor version differences allowed)
  if (stored.userAgent !== current.userAgent) {
    console.warn('Session User-Agent changed', {
      stored: stored.userAgent,
      current: current.userAgent,
    })
  }

  return { valid: true }
}

/**
 * Generate a combined fingerprint hash for storage
 */
export function generateSessionFingerprint(request: NextRequest): string {
  const userAgent = request.headers.get('user-agent') || 'unknown'
  const ipAddress = getClientIP(request)
  const deviceHash = generateDeviceFingerprint(request)

  return createHash('sha256')
    .update(`${deviceHash}|${ipAddress}|${userAgent}`)
    .digest('hex')
}

/**
 * Store or update session fingerprint in database
 */
export async function storeSessionMetadata(
  userId: string,
  request: NextRequest
): Promise<string | null> {
  const supabase = await createClient()

  const userAgent = request.headers.get('user-agent') || 'unknown'
  const ipAddress = getClientIP(request)
  const fingerprintHash = generateSessionFingerprint(request)

  const { data, error } = await supabase
    .from('session_fingerprints')
    .upsert({
      user_id: userId,
      fingerprint_hash: fingerprintHash,
      ip_address: ipAddress,
      user_agent: userAgent,
      device_info: {
        deviceHash: generateDeviceFingerprint(request),
        browser: userAgent,
      },
      last_seen_at: new Date().toISOString(),
      is_active: true,
    }, {
      onConflict: 'fingerprint_hash',
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error storing session metadata:', error)
    return null
  }

  return data?.id || null
}

/**
 * Detailed session validation result
 */
export interface SessionValidationResult {
  valid: boolean
  reason?: 'no_fingerprint' | 'fingerprint_mismatch' | 'session_expired' | 'session_inactive'
  needsStorage?: boolean // True if this is a first-time session that needs fingerprint stored
}

/**
 * Validate session fingerprint against stored data
 *
 * Returns detailed validation result to distinguish between:
 * - No fingerprint stored (first-time session)
 * - Fingerprint mismatch (suspicious activity)
 * - Session expired (old session)
 *
 * @deprecated Use validateSessionDetailed() instead for better error handling
 */
export async function validateSession(
  userId: string,
  fingerprintHash: string
): Promise<boolean> {
  const result = await validateSessionDetailed(userId, fingerprintHash)
  return result.valid
}

/**
 * Validate session fingerprint with detailed results
 */
export async function validateSessionDetailed(
  userId: string,
  fingerprintHash: string
): Promise<SessionValidationResult> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('session_fingerprints')
    .select('is_active, last_seen_at')
    .eq('user_id', userId)
    .eq('fingerprint_hash', fingerprintHash)
    .eq('is_active', true)
    .single()

  // No fingerprint stored - this is a first-time session
  if (error?.code === 'PGRST116' || !data) {
    return {
      valid: false,
      reason: 'no_fingerprint',
      needsStorage: true,
    }
  }

  // Other database errors
  if (error) {
    console.error('Error validating session:', error)
    return {
      valid: false,
      reason: 'fingerprint_mismatch',
    }
  }

  // Session is inactive
  if (!data.is_active) {
    return {
      valid: false,
      reason: 'session_inactive',
    }
  }

  // Check if session is recent (within 14 days)
  const lastSeen = new Date(data.last_seen_at)
  const daysSinceLastSeen = (Date.now() - lastSeen.getTime()) / (1000 * 60 * 60 * 24)

  if (daysSinceLastSeen > 14) {
    return {
      valid: false,
      reason: 'session_expired',
    }
  }

  // Session is valid
  return {
    valid: true,
  }
}

/**
 * Update the last_seen_at timestamp for an active session
 */
export async function updateSessionActivity(
  userId: string,
  fingerprintHash: string
): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('session_fingerprints')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('fingerprint_hash', fingerprintHash)
    .eq('is_active', true)

  if (error) {
    console.error('Error updating session activity:', error)
  }
}

/**
 * Check concurrent session limit using database function
 */
export async function checkConcurrentSessionLimit(
  userId: string
): Promise<{ allowed: boolean; activeCount: number }> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('get_active_session_count', {
    p_user_id: userId,
  })

  if (error) {
    console.error('Error checking concurrent sessions:', error)
    return { allowed: true, activeCount: 0 } // Fail open
  }

  const activeCount = data || 0

  return {
    allowed: activeCount < MAX_CONCURRENT_SESSIONS,
    activeCount,
  }
}

/**
 * Rotate session (create new fingerprint) after privilege escalation
 */
export async function rotateSession(
  userId: string,
  request: NextRequest,
  reason: string
): Promise<string | null> {
  const supabase = await createClient()

  // Invalidate old sessions
  await supabase.rpc('invalidate_all_user_sessions', {
    p_user_id: userId,
    p_reason: reason,
  })

  // Create new session
  const sessionId = await storeSessionMetadata(userId, request)

  // Log the rotation
  if (sessionId) {
    await supabase.rpc('log_session_activity', {
      p_user_id: userId,
      p_session_id: sessionId,
      p_activity_type: 'session_rotated',
      p_ip_address: getClientIP(request),
      p_user_agent: request.headers.get('user-agent') || null,
      p_metadata: { reason },
    })
  }

  return sessionId
}
