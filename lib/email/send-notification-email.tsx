/**
 * Notification Email Sender
 *
 * This module handles sending notification emails using Resend and React Email templates.
 *
 * Environment Variables Required:
 * - RESEND_API_KEY: Resend API key
 * - RESEND_FROM_EMAIL: From email address (default: "OttoWrite <noreply@ottowrite.app>")
 * - NEXT_PUBLIC_APP_URL: Base URL for email links
 *
 * Usage:
 * ```typescript
 * import { sendNotificationEmail } from '@/lib/email/send-notification-email'
 *
 * await sendNotificationEmail({
 *   type: 'partner_viewed',
 *   to: 'user@example.com',
 *   data: { userName, partnerName, manuscriptTitle, ... }
 * })
 * ```
 */

import 'server-only'
import { resendClient, isEmailConfigured, getFromEmail } from './resend-client'
import {
  PartnerViewedEmail,
  partnerViewedEmailText,
  MaterialRequestedEmail,
  materialRequestedEmailText,
  ResponseReceivedEmail,
  responseReceivedEmailText,
  SubmissionAcceptedEmail,
  submissionAcceptedEmailText,
  SubmissionRejectedEmail,
  submissionRejectedEmailText,
  SubmissionReminderEmail,
  submissionReminderEmailText,
} from './templates'

// ============================================================================
// TYPES
// ============================================================================

type NotificationType =
  | 'partner_viewed'
  | 'material_requested'
  | 'response_received'
  | 'status_accepted'
  | 'status_rejected'
  | 'submission_reminder'

interface BaseEmailData {
  userName: string
  manuscriptTitle: string
  partnerName: string
  submissionUrl: string
}

interface PartnerViewedData extends BaseEmailData {
  viewedAt: string
}

interface MaterialRequestedData extends BaseEmailData {
  materialType: 'sample' | 'full'
  requestedAt: string
  message?: string
}

interface ResponseReceivedData extends BaseEmailData {
  responseSnippet: string
  receivedAt: string
}

interface SubmissionAcceptedData extends BaseEmailData {
  acceptedAt: string
  message?: string
}

interface SubmissionRejectedData extends BaseEmailData {
  rejectedAt: string
  feedback?: string
}

interface SubmissionReminderData extends BaseEmailData {
  submittedAt: string
  daysSinceSubmission: number
  lastActivity?: string
}

type NotificationEmailData =
  | { type: 'partner_viewed'; data: PartnerViewedData }
  | { type: 'material_requested'; data: MaterialRequestedData }
  | { type: 'response_received'; data: ResponseReceivedData }
  | { type: 'status_accepted'; data: SubmissionAcceptedData }
  | { type: 'status_rejected'; data: SubmissionRejectedData }
  | { type: 'submission_reminder'; data: SubmissionReminderData }

interface SendNotificationEmailParams {
  type: NotificationType
  to: string | string[]
  data: any
  unsubscribeUrl?: string
}

interface SendEmailResult {
  success: boolean
  emailId?: string
  error?: string
}

// ============================================================================
// EMAIL RENDERING
// ============================================================================

/**
 * Get email React component for rendering
 * Resend accepts React components directly
 */
function getEmailComponent(params: NotificationEmailData): React.ReactElement {
  switch (params.type) {
    case 'partner_viewed':
      return <PartnerViewedEmail {...params.data} />
    case 'material_requested':
      return <MaterialRequestedEmail {...params.data} />
    case 'response_received':
      return <ResponseReceivedEmail {...params.data} />
    case 'status_accepted':
      return <SubmissionAcceptedEmail {...params.data} />
    case 'status_rejected':
      return <SubmissionRejectedEmail {...params.data} />
    case 'submission_reminder':
      return <SubmissionReminderEmail {...params.data} />
    default:
      throw new Error(`Unknown notification type: ${(params as any).type}`)
  }
}

/**
 * Get plain text version of email
 */
function renderEmailText(params: NotificationEmailData): string {
  switch (params.type) {
    case 'partner_viewed':
      return partnerViewedEmailText(params.data)
    case 'material_requested':
      return materialRequestedEmailText(params.data)
    case 'response_received':
      return responseReceivedEmailText(params.data)
    case 'status_accepted':
      return submissionAcceptedEmailText(params.data)
    case 'status_rejected':
      return submissionRejectedEmailText(params.data)
    case 'submission_reminder':
      return submissionReminderEmailText(params.data)
    default:
      throw new Error(`Unknown notification type: ${(params as any).type}`)
  }
}

/**
 * Get email subject line based on notification type
 */
function getEmailSubject(params: NotificationEmailData): string {
  const { data } = params

  switch (params.type) {
    case 'partner_viewed':
      return `${data.partnerName} viewed your submission - ${data.manuscriptTitle}`
    case 'material_requested':
      return `${data.partnerName} requested materials - ${data.manuscriptTitle}`
    case 'response_received':
      return `New response from ${data.partnerName} - ${data.manuscriptTitle}`
    case 'status_accepted':
      return `🎉 Submission accepted by ${data.partnerName}!`
    case 'status_rejected':
      return `Update on your submission to ${data.partnerName}`
    case 'submission_reminder':
      return `Submission status update - ${data.manuscriptTitle}`
    default:
      return 'OttoWrite Notification'
  }
}

// ============================================================================
// EMAIL SENDING
// ============================================================================

/**
 * Replace template variables in HTML/text with actual values
 */
function replaceTemplateVariables(
  content: string,
  unsubscribeUrl?: string
): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ottowrite.app'

  return content
    .replace(/\{\{app_url\}\}/g, appUrl)
    .replace(/\{\{unsubscribe_url\}\}/g, unsubscribeUrl || `${appUrl}/settings/notifications`)
}

/**
 * Send a notification email
 *
 * @param params - Email parameters
 * @returns Result object with success status and email ID (or error)
 */
export async function sendNotificationEmail({
  type,
  to,
  data,
  unsubscribeUrl,
}: SendNotificationEmailParams): Promise<SendEmailResult> {
  // Check if email is configured
  if (!isEmailConfigured()) {
    console.warn('[Email] Skipping email send - Resend not configured')
    return {
      success: false,
      error: 'Email service not configured',
    }
  }

  if (!resendClient) {
    console.error('[Email] Resend client not initialized')
    return {
      success: false,
      error: 'Email client not initialized',
    }
  }

  try {
    // Build email data
    const emailData: NotificationEmailData = { type, data } as any

    // Get React component and text version
    const emailComponent = getEmailComponent(emailData)
    const textContent = renderEmailText(emailData)
    const subject = getEmailSubject(emailData)

    // Replace template variables in text version
    const text = replaceTemplateVariables(textContent, unsubscribeUrl)

    // Send email via Resend (React component is rendered server-side by Resend)
    const result = await resendClient.emails.send({
      from: getFromEmail(),
      to: Array.isArray(to) ? to : [to],
      subject,
      react: emailComponent,
      text,
    })

    console.log('[Email] Sent successfully:', {
      type,
      to: Array.isArray(to) ? to.join(', ') : to,
      emailId: result.data?.id,
    })

    return {
      success: true,
      emailId: result.data?.id,
    }
  } catch (error) {
    console.error('[Email] Failed to send:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Send a test email (for testing email configuration)
 *
 * @param to - Recipient email address
 * @returns Result object with success status
 */
export async function sendTestEmail(to: string): Promise<SendEmailResult> {
  if (!isEmailConfigured()) {
    return {
      success: false,
      error: 'Email service not configured',
    }
  }

  if (!resendClient) {
    return {
      success: false,
      error: 'Email client not initialized',
    }
  }

  try {
    const result = await resendClient.emails.send({
      from: getFromEmail(),
      to: [to],
      subject: 'OttoWrite Email Configuration Test',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px;">
          <h1 style="color: #1a1a1a;">Email Configuration Test</h1>
          <p style="color: #525f7f; font-size: 16px; line-height: 24px;">
            This is a test email from OttoWrite to verify your email configuration is working correctly.
          </p>
          <p style="color: #525f7f; font-size: 16px; line-height: 24px;">
            If you received this email, your Resend integration is properly configured! 🎉
          </p>
          <hr style="border: none; border-top: 1px solid #e6ebf1; margin: 24px 0;" />
          <p style="color: #8898aa; font-size: 12px;">
            Sent at: ${new Date().toISOString()}
          </p>
        </div>
      `,
      text: `
OttoWrite Email Configuration Test

This is a test email from OttoWrite to verify your email configuration is working correctly.

If you received this email, your Resend integration is properly configured! 🎉

Sent at: ${new Date().toISOString()}
      `.trim(),
    })

    console.log('[Email] Test email sent successfully:', result.data?.id)

    return {
      success: true,
      emailId: result.data?.id,
    }
  } catch (error) {
    console.error('[Email] Test email failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
