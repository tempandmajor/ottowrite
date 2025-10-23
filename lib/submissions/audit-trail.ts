/**
 * Manuscript Access Audit Trail
 *
 * Comprehensive logging and monitoring of manuscript access
 * Includes suspicious activity detection and alerting
 */

import { createClient } from '@/lib/supabase/server'

// ============================================================================
// TYPES
// ============================================================================

export type AccessAction =
  | 'view_query'
  | 'view_synopsis'
  | 'view_samples'
  | 'download_attempted'
  | 'print_attempted'
  | 'copy_attempted'
  | 'share_attempted'

export type AlertType =
  | 'rapid_access'
  | 'unusual_location'
  | 'multiple_devices'
  | 'access_after_expiry'
  | 'unauthorized_action'
  | 'ip_mismatch'
  | 'suspicious_user_agent'
  | 'excessive_duration'
  | 'concurrent_sessions'

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical'

export type AlertStatus = 'new' | 'investigating' | 'confirmed' | 'false_positive' | 'resolved'

export interface AccessLogEntry {
  id: string
  submissionId: string
  accessTokenId?: string
  partnerId?: string
  partnerEmail?: string
  partnerName?: string
  accessedAt: string
  sessionDurationSeconds?: number
  ipAddress?: string
  userAgent?: string
  deviceFingerprint?: string
  locationCountry?: string
  locationCity?: string
  action: AccessAction
  accessGranted: boolean
  denialReason?: string
  watermarkId?: string
  drmFlags?: Record<string, unknown>
}

export interface SuspiciousActivityAlert {
  id: string
  submissionId: string
  partnerId?: string
  alertType: AlertType
  severity: AlertSeverity
  description: string
  metadata?: Record<string, unknown>
  relatedLogIds?: string[]
  status: AlertStatus
  reviewedBy?: string
  reviewedAt?: string
  reviewNotes?: string
  detectedAt: string
}

export interface AccessSummary {
  submissionId: string
  totalAccesses: number
  uniquePartners: number
  uniqueIps: number
  uniqueDevices: number
  lastAccessed?: string
  firstAccessed?: string
  queryViews: number
  synopsisViews: number
  sampleViews: number
  downloadAttempts: number
  printAttempts: number
  copyAttempts: number
  deniedAccesses: number
  avgSessionDuration?: number
}

export interface LogAccessParams {
  submissionId: string
  accessTokenId?: string
  partnerId: string
  action: AccessAction
  ipAddress?: string
  userAgent?: string
  deviceFingerprint?: string
  watermarkId?: string
  drmFlags?: Record<string, unknown>
  accessGranted?: boolean
  denialReason?: string
}

// ============================================================================
// DEVICE FINGERPRINTING
// ============================================================================

/**
 * Create a device fingerprint from request headers
 */
export function createDeviceFingerprint(headers: Headers): string {
  const components = [
    headers.get('user-agent') || '',
    headers.get('accept-language') || '',
    headers.get('accept-encoding') || '',
    headers.get('sec-ch-ua-platform') || '',
    headers.get('sec-ch-ua-mobile') || '',
  ]

  // Create a hash-like string (simplified version)
  const fingerprint = components
    .filter(Boolean)
    .join('|')
    .split('')
    .reduce((hash, char) => {
      const chr = char.charCodeAt(0)
      hash = (hash << 5) - hash + chr
      return hash & hash
    }, 0)

  return `fp_${Math.abs(fingerprint).toString(36)}`
}

/**
 * Extract IP address from request
 */
export function getClientIp(headers: Headers): string | undefined {
  // Check common headers for IP address
  const forwardedFor = headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  const realIp = headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }

  return undefined
}

// ============================================================================
// SUSPICIOUS ACTIVITY DETECTION
// ============================================================================

/**
 * Detect if user agent appears to be an automated tool
 */
export function isSuspiciousUserAgent(userAgent: string): boolean {
  const suspiciousPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python/i,
    /java(?!script)/i, // Java but not JavaScript
    /postman/i,
    /insomnia/i,
  ]

  return suspiciousPatterns.some((pattern) => pattern.test(userAgent))
}

/**
 * Detect if action is unauthorized based on permissions
 */
export function isUnauthorizedAction(
  action: AccessAction,
  permissions: string[]
): boolean {
  const permissionMap: Record<string, string> = {
    download_attempted: 'download',
    print_attempted: 'print',
    copy_attempted: 'copy',
    share_attempted: 'share',
  }

  const requiredPermission = permissionMap[action]
  if (!requiredPermission) {
    return false // View actions are always allowed
  }

  return !permissions.includes(requiredPermission)
}

/**
 * Calculate session duration from timestamps
 */
export function calculateSessionDuration(
  startTime: Date,
  endTime: Date = new Date()
): number {
  return Math.floor((endTime.getTime() - startTime.getTime()) / 1000)
}

/**
 * Detect if session duration is excessive (> 4 hours)
 */
export function isExcessiveDuration(durationSeconds: number): boolean {
  const FOUR_HOURS = 4 * 60 * 60
  return durationSeconds > FOUR_HOURS
}

// ============================================================================
// AUDIT LOGGING
// ============================================================================

/**
 * Log manuscript access with automatic suspicious activity detection
 */
export async function logManuscriptAccess(
  params: LogAccessParams
): Promise<{ success: boolean; logId?: string; error?: string }> {
  try {
    const supabase = await createClient()

    // Use the database function which includes automatic detection
    const { data, error } = await supabase.rpc('log_manuscript_access', {
      p_submission_id: params.submissionId,
      p_access_token_id: params.accessTokenId || null,
      p_partner_id: params.partnerId,
      p_action: params.action,
      p_ip_address: params.ipAddress || null,
      p_user_agent: params.userAgent || null,
      p_device_fingerprint: params.deviceFingerprint || null,
      p_watermark_id: params.watermarkId || null,
      p_drm_flags: params.drmFlags || null,
    })

    if (error) {
      console.error('Failed to log manuscript access:', error)
      return { success: false, error: error.message }
    }

    return { success: true, logId: data }
  } catch (error) {
    console.error('Error logging manuscript access:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Manually create a suspicious activity alert
 */
export async function createSuspiciousActivityAlert(params: {
  submissionId: string
  partnerId?: string
  alertType: AlertType
  severity: AlertSeverity
  description: string
  metadata?: Record<string, unknown>
  relatedLogIds?: string[]
}): Promise<{ success: boolean; alertId?: string; error?: string }> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('suspicious_activity_alerts')
      .insert({
        submission_id: params.submissionId,
        partner_id: params.partnerId || null,
        alert_type: params.alertType,
        severity: params.severity,
        description: params.description,
        metadata: params.metadata || null,
        related_log_ids: params.relatedLogIds || null,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Failed to create alert:', error)
      return { success: false, error: error.message }
    }

    return { success: true, alertId: data.id }
  } catch (error) {
    console.error('Error creating alert:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// ============================================================================
// QUERYING
// ============================================================================

/**
 * Get access history for a submission
 */
export async function getAccessHistory(
  submissionId: string,
  limit: number = 50
): Promise<{ success: boolean; logs?: AccessLogEntry[]; error?: string }> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('get_submission_access_history', {
      p_submission_id: submissionId,
      p_limit: limit,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    // Transform to camelCase
    const logs: AccessLogEntry[] = (data || []).map((log: any) => ({
      id: log.id,
      submissionId,
      partnerName: log.partner_name,
      partnerEmail: log.partner_email,
      action: log.action,
      accessedAt: log.accessed_at,
      ipAddress: log.ip_address,
      locationCountry: log.location_country,
      sessionDurationSeconds: log.session_duration_seconds,
      accessGranted: true,
    }))

    return { success: true, logs }
  } catch (error) {
    console.error('Error fetching access history:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get suspicious activity alerts for a submission
 */
export async function getSuspiciousActivityAlerts(
  submissionId: string,
  status?: AlertStatus
): Promise<{ success: boolean; alerts?: SuspiciousActivityAlert[]; error?: string }> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('get_submission_alerts', {
      p_submission_id: submissionId,
      p_status: status || null,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    // Transform to camelCase
    const alerts: SuspiciousActivityAlert[] = (data || []).map((alert: any) => ({
      id: alert.id,
      submissionId,
      alertType: alert.alert_type,
      severity: alert.severity,
      description: alert.description,
      status: alert.status,
      detectedAt: alert.detected_at,
      metadata: alert.metadata,
    }))

    return { success: true, alerts }
  } catch (error) {
    console.error('Error fetching alerts:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get access summary statistics for a submission
 */
export async function getAccessSummary(
  submissionId: string
): Promise<{ success: boolean; summary?: AccessSummary; error?: string }> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('manuscript_access_summary')
      .select('*')
      .eq('submission_id', submissionId)
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    if (!data) {
      // No access logs yet
      return {
        success: true,
        summary: {
          submissionId,
          totalAccesses: 0,
          uniquePartners: 0,
          uniqueIps: 0,
          uniqueDevices: 0,
          queryViews: 0,
          synopsisViews: 0,
          sampleViews: 0,
          downloadAttempts: 0,
          printAttempts: 0,
          copyAttempts: 0,
          deniedAccesses: 0,
        },
      }
    }

    const summary: AccessSummary = {
      submissionId: data.submission_id,
      totalAccesses: data.total_accesses || 0,
      uniquePartners: data.unique_partners || 0,
      uniqueIps: data.unique_ips || 0,
      uniqueDevices: data.unique_devices || 0,
      lastAccessed: data.last_accessed,
      firstAccessed: data.first_accessed,
      queryViews: data.query_views || 0,
      synopsisViews: data.synopsis_views || 0,
      sampleViews: data.sample_views || 0,
      downloadAttempts: data.download_attempts || 0,
      printAttempts: data.print_attempts || 0,
      copyAttempts: data.copy_attempts || 0,
      deniedAccesses: data.denied_accesses || 0,
      avgSessionDuration: data.avg_session_duration,
    }

    return { success: true, summary }
  } catch (error) {
    console.error('Error fetching access summary:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Update alert status (for reviewing alerts)
 */
export async function updateAlertStatus(
  alertId: string,
  status: AlertStatus,
  reviewerId: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const { error } = await supabase.rpc('update_alert_status', {
      p_alert_id: alertId,
      p_status: status,
      p_reviewer_id: reviewerId,
      p_notes: notes || null,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error updating alert status:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get severity color for UI display
 */
export function getSeverityColor(severity: AlertSeverity): string {
  const colors: Record<AlertSeverity, string> = {
    low: 'text-blue-600',
    medium: 'text-yellow-600',
    high: 'text-orange-600',
    critical: 'text-red-600',
  }
  return colors[severity]
}

/**
 * Get severity badge variant
 */
export function getSeverityVariant(
  severity: AlertSeverity
): 'default' | 'secondary' | 'destructive' | 'outline' {
  const variants: Record<AlertSeverity, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    low: 'secondary',
    medium: 'outline',
    high: 'default',
    critical: 'destructive',
  }
  return variants[severity]
}

/**
 * Format action for display
 */
export function formatAction(action: AccessAction): string {
  const labels: Record<AccessAction, string> = {
    view_query: 'Viewed Query Letter',
    view_synopsis: 'Viewed Synopsis',
    view_samples: 'Viewed Sample Pages',
    download_attempted: 'Attempted Download',
    print_attempted: 'Attempted Print',
    copy_attempted: 'Attempted Copy',
    share_attempted: 'Attempted Share',
  }
  return labels[action]
}

/**
 * Format alert type for display
 */
export function formatAlertType(alertType: AlertType): string {
  const labels: Record<AlertType, string> = {
    rapid_access: 'Rapid Access',
    unusual_location: 'Unusual Location',
    multiple_devices: 'Multiple Devices',
    access_after_expiry: 'Access After Expiry',
    unauthorized_action: 'Unauthorized Action',
    ip_mismatch: 'IP Address Mismatch',
    suspicious_user_agent: 'Suspicious User Agent',
    excessive_duration: 'Excessive Session Duration',
    concurrent_sessions: 'Concurrent Sessions',
  }
  return labels[alertType]
}
