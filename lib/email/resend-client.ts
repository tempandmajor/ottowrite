/**
 * Resend Email Client Configuration
 *
 * This module provides a singleton Resend client instance for sending transactional emails.
 *
 * Environment Variables Required:
 * - RESEND_API_KEY: Your Resend API key (re_...)
 * - RESEND_FROM_EMAIL: Default "from" email address (e.g., "OttoWrite <noreply@ottowrite.app>")
 *
 * Usage:
 * ```typescript
 * import { resendClient, isEmailConfigured } from '@/lib/email/resend-client'
 *
 * if (isEmailConfigured()) {
 *   await resendClient.emails.send({...})
 * }
 * ```
 */

import { Resend } from 'resend'

// Environment variables
const RESEND_API_KEY = process.env.RESEND_API_KEY
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'OttoWrite <noreply@ottowrite.app>'

/**
 * Check if email service is properly configured
 */
export function isEmailConfigured(): boolean {
  return !!RESEND_API_KEY && RESEND_API_KEY.startsWith('re_')
}

/**
 * Singleton Resend client instance
 * Only initialized if RESEND_API_KEY is configured
 */
export const resendClient = RESEND_API_KEY
  ? new Resend(RESEND_API_KEY)
  : null

/**
 * Get the default "from" email address
 */
export function getFromEmail(): string {
  return RESEND_FROM_EMAIL
}

/**
 * Log email configuration status on module load (development only)
 */
if (process.env.NODE_ENV === 'development') {
  if (isEmailConfigured()) {
    console.log('[Email] Resend configured with key:', RESEND_API_KEY?.substring(0, 10) + '...')
  } else {
    console.warn('[Email] Resend not configured. Set RESEND_API_KEY environment variable.')
  }
}
