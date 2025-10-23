/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  createDeviceFingerprint,
  getClientIp,
  isSuspiciousUserAgent,
  isUnauthorizedAction,
  calculateSessionDuration,
  isExcessiveDuration,
  formatAction,
  formatAlertType,
  getSeverityColor,
  getSeverityVariant,
  type AccessAction,
  type AlertType,
  type AlertSeverity,
} from '@/lib/submissions/audit-trail'

describe('Device Fingerprinting', () => {
  it('should create a consistent fingerprint from headers', () => {
    const headers = new Headers({
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'accept-language': 'en-US,en;q=0.9',
      'accept-encoding': 'gzip, deflate, br',
    })

    const fingerprint1 = createDeviceFingerprint(headers)
    const fingerprint2 = createDeviceFingerprint(headers)

    expect(fingerprint1).toBe(fingerprint2)
    expect(fingerprint1).toMatch(/^fp_/)
  })

  it('should create different fingerprints for different headers', () => {
    const headers1 = new Headers({
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    })

    const headers2 = new Headers({
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    })

    const fingerprint1 = createDeviceFingerprint(headers1)
    const fingerprint2 = createDeviceFingerprint(headers2)

    expect(fingerprint1).not.toBe(fingerprint2)
  })

  it('should handle missing headers gracefully', () => {
    const headers = new Headers()
    const fingerprint = createDeviceFingerprint(headers)

    expect(fingerprint).toBeDefined()
    expect(fingerprint).toMatch(/^fp_/)
  })
})

describe('IP Address Extraction', () => {
  it('should extract IP from x-forwarded-for header', () => {
    const headers = new Headers({
      'x-forwarded-for': '192.168.1.1, 10.0.0.1',
    })

    const ip = getClientIp(headers)
    expect(ip).toBe('192.168.1.1')
  })

  it('should extract IP from x-real-ip header', () => {
    const headers = new Headers({
      'x-real-ip': '192.168.1.1',
    })

    const ip = getClientIp(headers)
    expect(ip).toBe('192.168.1.1')
  })

  it('should prefer x-forwarded-for over x-real-ip', () => {
    const headers = new Headers({
      'x-forwarded-for': '192.168.1.1',
      'x-real-ip': '10.0.0.1',
    })

    const ip = getClientIp(headers)
    expect(ip).toBe('192.168.1.1')
  })

  it('should return undefined if no IP headers present', () => {
    const headers = new Headers()
    const ip = getClientIp(headers)
    expect(ip).toBeUndefined()
  })
})

describe('Suspicious User Agent Detection', () => {
  it('should detect bot user agents', () => {
    expect(isSuspiciousUserAgent('Googlebot/2.1')).toBe(true)
    expect(isSuspiciousUserAgent('Mozilla/5.0 (compatible; bingbot/2.0)')).toBe(true)
  })

  it('should detect crawler user agents', () => {
    expect(isSuspiciousUserAgent('Mozilla/5.0 (compatible; AhrefsCrawler/1.0)')).toBe(true)
  })

  it('should detect automated tools', () => {
    expect(isSuspiciousUserAgent('curl/7.64.1')).toBe(true)
    expect(isSuspiciousUserAgent('Wget/1.20.3')).toBe(true)
    expect(isSuspiciousUserAgent('python-requests/2.28.0')).toBe(true)
    expect(isSuspiciousUserAgent('PostmanRuntime/7.29.0')).toBe(true)
  })

  it('should not flag normal browser user agents', () => {
    expect(
      isSuspiciousUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
    ).toBe(false)
    expect(isSuspiciousUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')).toBe(false)
    expect(
      isSuspiciousUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)')
    ).toBe(false)
  })

  it('should not flag JavaScript in user agent', () => {
    expect(isSuspiciousUserAgent('Mozilla/5.0 (compatible; JavaScriptCore/1.0)')).toBe(false)
  })

  it('should flag Java (but not JavaScript)', () => {
    expect(isSuspiciousUserAgent('Java/1.8.0_191')).toBe(true)
  })
})

describe('Unauthorized Action Detection', () => {
  it('should detect unauthorized download attempts', () => {
    const permissions = ['view_query', 'view_synopsis']
    expect(isUnauthorizedAction('download_attempted', permissions)).toBe(true)
  })

  it('should detect unauthorized print attempts', () => {
    const permissions = ['view_query', 'view_synopsis']
    expect(isUnauthorizedAction('print_attempted', permissions)).toBe(true)
  })

  it('should detect unauthorized copy attempts', () => {
    const permissions = ['view_query', 'view_synopsis']
    expect(isUnauthorizedAction('copy_attempted', permissions)).toBe(true)
  })

  it('should allow authorized actions', () => {
    const permissions = ['view_query', 'download', 'print', 'copy']
    expect(isUnauthorizedAction('download_attempted', permissions)).toBe(false)
    expect(isUnauthorizedAction('print_attempted', permissions)).toBe(false)
    expect(isUnauthorizedAction('copy_attempted', permissions)).toBe(false)
  })

  it('should always allow view actions', () => {
    const permissions: string[] = []
    expect(isUnauthorizedAction('view_query', permissions)).toBe(false)
    expect(isUnauthorizedAction('view_synopsis', permissions)).toBe(false)
    expect(isUnauthorizedAction('view_samples', permissions)).toBe(false)
  })
})

describe('Session Duration', () => {
  it('should calculate session duration in seconds', () => {
    const startTime = new Date('2025-01-27T10:00:00Z')
    const endTime = new Date('2025-01-27T10:05:30Z')

    const duration = calculateSessionDuration(startTime, endTime)
    expect(duration).toBe(330) // 5 minutes 30 seconds = 330 seconds
  })

  it('should handle zero duration', () => {
    const time = new Date()
    const duration = calculateSessionDuration(time, time)
    expect(duration).toBe(0)
  })

  it('should detect excessive session duration (> 4 hours)', () => {
    const fourHours = 4 * 60 * 60
    expect(isExcessiveDuration(fourHours + 1)).toBe(true)
    expect(isExcessiveDuration(fourHours)).toBe(false)
    expect(isExcessiveDuration(fourHours - 1)).toBe(false)
  })

  it('should not flag normal session durations', () => {
    expect(isExcessiveDuration(30 * 60)).toBe(false) // 30 minutes
    expect(isExcessiveDuration(60 * 60)).toBe(false) // 1 hour
    expect(isExcessiveDuration(2 * 60 * 60)).toBe(false) // 2 hours
  })
})

describe('Action Formatting', () => {
  it('should format view actions correctly', () => {
    expect(formatAction('view_query')).toBe('Viewed Query Letter')
    expect(formatAction('view_synopsis')).toBe('Viewed Synopsis')
    expect(formatAction('view_samples')).toBe('Viewed Sample Pages')
  })

  it('should format attempt actions correctly', () => {
    expect(formatAction('download_attempted')).toBe('Attempted Download')
    expect(formatAction('print_attempted')).toBe('Attempted Print')
    expect(formatAction('copy_attempted')).toBe('Attempted Copy')
    expect(formatAction('share_attempted')).toBe('Attempted Share')
  })
})

describe('Alert Type Formatting', () => {
  it('should format all alert types', () => {
    const alertTypes: AlertType[] = [
      'rapid_access',
      'unusual_location',
      'multiple_devices',
      'access_after_expiry',
      'unauthorized_action',
      'ip_mismatch',
      'suspicious_user_agent',
      'excessive_duration',
      'concurrent_sessions',
    ]

    alertTypes.forEach((type) => {
      const formatted = formatAlertType(type)
      expect(formatted).toBeDefined()
      expect(formatted.length).toBeGreaterThan(0)
      expect(formatted).not.toContain('_')
    })
  })

  it('should format specific alert types correctly', () => {
    expect(formatAlertType('rapid_access')).toBe('Rapid Access')
    expect(formatAlertType('multiple_devices')).toBe('Multiple Devices')
    expect(formatAlertType('suspicious_user_agent')).toBe('Suspicious User Agent')
  })
})

describe('Severity Styling', () => {
  it('should return correct colors for each severity level', () => {
    expect(getSeverityColor('low')).toBe('text-blue-600')
    expect(getSeverityColor('medium')).toBe('text-yellow-600')
    expect(getSeverityColor('high')).toBe('text-orange-600')
    expect(getSeverityColor('critical')).toBe('text-red-600')
  })

  it('should return correct badge variants for each severity level', () => {
    expect(getSeverityVariant('low')).toBe('secondary')
    expect(getSeverityVariant('medium')).toBe('outline')
    expect(getSeverityVariant('high')).toBe('default')
    expect(getSeverityVariant('critical')).toBe('destructive')
  })
})

describe('Type Definitions', () => {
  it('should accept valid access actions', () => {
    const actions: AccessAction[] = [
      'view_query',
      'view_synopsis',
      'view_samples',
      'download_attempted',
      'print_attempted',
      'copy_attempted',
      'share_attempted',
    ]

    expect(actions).toHaveLength(7)
  })

  it('should accept valid alert types', () => {
    const types: AlertType[] = [
      'rapid_access',
      'unusual_location',
      'multiple_devices',
      'access_after_expiry',
      'unauthorized_action',
      'ip_mismatch',
      'suspicious_user_agent',
      'excessive_duration',
      'concurrent_sessions',
    ]

    expect(types).toHaveLength(9)
  })

  it('should accept valid severity levels', () => {
    const severities: AlertSeverity[] = ['low', 'medium', 'high', 'critical']
    expect(severities).toHaveLength(4)
  })
})
