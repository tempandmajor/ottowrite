/**
 * Notification Creation Utility
 *
 * Helper functions for creating submission notifications.
 * Now includes email sending via Resend when user preferences indicate immediate email delivery.
 *
 * Ticket: MS-4.2, PROD-007
 */

import { createClient } from '@/lib/supabase/server'
import { sendNotificationEmail } from '@/lib/email/send-notification-email'

export type NotificationType =
  | 'partner_viewed'
  | 'material_requested'
  | 'response_received'
  | 'status_accepted'
  | 'status_rejected'
  | 'submission_reminder'

export interface CreateNotificationParams {
  userId: string
  submissionId: string
  type: NotificationType
  title: string
  message: string
  actionUrl?: string
  emailData?: EmailNotificationData
}

export interface EmailNotificationData {
  userName: string
  userEmail: string
  manuscriptTitle: string
  partnerName: string
  [key: string]: any // Additional type-specific data
}

/**
 * Creates a submission notification using the database RPC function.
 * If user preferences indicate immediate email delivery, sends an email notification.
 * Returns the notification ID if created, null if user has disabled this notification type.
 */
export async function createSubmissionNotification(
  params: CreateNotificationParams
): Promise<string | null> {
  try {
    const supabase = await createClient()

    // Create in-app notification via database function
    const { data: notificationId, error } = await supabase.rpc(
      'create_submission_notification',
      {
        p_user_id: params.userId,
        p_submission_id: params.submissionId,
        p_type: params.type,
        p_title: params.title,
        p_message: params.message,
        p_action_url: params.actionUrl || null,
      }
    )

    if (error) {
      console.error('Error creating notification:', error)
      return null
    }

    // If notification was not created (user disabled), return null
    if (!notificationId) {
      return null
    }

    // Check if email should be sent (database function sets email_sent = true for immediate delivery)
    const { data: notification } = await supabase
      .from('submission_notifications')
      .select('email_sent, channel')
      .eq('id', notificationId)
      .single()

    // Send email if needed and email data is provided
    if (notification?.email_sent && params.emailData) {
      await sendEmailNotification(params, notificationId)
    }

    return notificationId
  } catch (error) {
    console.error('Error creating notification:', error)
    return null
  }
}

/**
 * Send email notification based on type
 */
async function sendEmailNotification(
  params: CreateNotificationParams,
  notificationId: string
): Promise<void> {
  if (!params.emailData) {
    console.warn('[Notification] No email data provided, skipping email')
    return
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ottowrite.app'
  const submissionUrl = `${appUrl}${params.actionUrl}`
  const unsubscribeUrl = `${appUrl}/settings/notifications`

  try {
    const result = await sendNotificationEmail({
      type: params.type,
      to: params.emailData.userEmail,
      data: {
        ...params.emailData,
        submissionUrl,
      },
      unsubscribeUrl,
    })

    if (!result.success) {
      console.error('[Notification] Failed to send email:', result.error)
    }
  } catch (error) {
    console.error('[Notification] Error sending email:', error)
  }
}

/**
 * Helper function to create a "partner viewed" notification
 */
export async function notifyPartnerViewed(
  userId: string,
  submissionId: string,
  submissionTitle: string,
  partnerName: string,
  emailData?: { userName: string; userEmail: string; viewedAt: string }
) {
  return createSubmissionNotification({
    userId,
    submissionId,
    type: 'partner_viewed',
    title: 'Partner viewed your submission',
    message: `${partnerName} viewed "${submissionTitle}"`,
    actionUrl: `/dashboard/submissions/${submissionId}`,
    emailData: emailData
      ? {
          ...emailData,
          manuscriptTitle: submissionTitle,
          partnerName,
        }
      : undefined,
  })
}

/**
 * Helper function to create a "material requested" notification
 */
export async function notifyMaterialRequested(
  userId: string,
  submissionId: string,
  submissionTitle: string,
  partnerName: string,
  requestType: 'sample' | 'full',
  emailData?: { userName: string; userEmail: string; requestedAt: string; message?: string }
) {
  const materialType = requestType === 'sample' ? 'sample pages' : 'full manuscript'

  return createSubmissionNotification({
    userId,
    submissionId,
    type: 'material_requested',
    title: 'Material requested',
    message: `${partnerName} requested ${materialType} for "${submissionTitle}"`,
    actionUrl: `/dashboard/submissions/${submissionId}`,
    emailData: emailData
      ? {
          ...emailData,
          manuscriptTitle: submissionTitle,
          partnerName,
          materialType: requestType,
        }
      : undefined,
  })
}

/**
 * Helper function to create a "response received" notification
 */
export async function notifyResponseReceived(
  userId: string,
  submissionId: string,
  submissionTitle: string,
  partnerName: string,
  emailData?: { userName: string; userEmail: string; responseSnippet: string; receivedAt: string }
) {
  return createSubmissionNotification({
    userId,
    submissionId,
    type: 'response_received',
    title: 'Response received',
    message: `${partnerName} sent a response for "${submissionTitle}"`,
    actionUrl: `/dashboard/submissions/${submissionId}`,
    emailData: emailData
      ? {
          ...emailData,
          manuscriptTitle: submissionTitle,
          partnerName,
        }
      : undefined,
  })
}

/**
 * Helper function to create a "submission accepted" notification
 */
export async function notifySubmissionAccepted(
  userId: string,
  submissionId: string,
  submissionTitle: string,
  partnerName: string,
  emailData?: { userName: string; userEmail: string; acceptedAt: string; message?: string }
) {
  return createSubmissionNotification({
    userId,
    submissionId,
    type: 'status_accepted',
    title: 'Congratulations! Submission accepted',
    message: `${partnerName} accepted "${submissionTitle}"! 🎉`,
    actionUrl: `/dashboard/submissions/${submissionId}`,
    emailData: emailData
      ? {
          ...emailData,
          manuscriptTitle: submissionTitle,
          partnerName,
        }
      : undefined,
  })
}

/**
 * Helper function to create a "submission rejected" notification
 */
export async function notifySubmissionRejected(
  userId: string,
  submissionId: string,
  submissionTitle: string,
  partnerName: string,
  emailData?: { userName: string; userEmail: string; rejectedAt: string; feedback?: string }
) {
  return createSubmissionNotification({
    userId,
    submissionId,
    type: 'status_rejected',
    title: 'Submission declined',
    message: `${partnerName} declined "${submissionTitle}"`,
    actionUrl: `/dashboard/submissions/${submissionId}`,
    emailData: emailData
      ? {
          ...emailData,
          manuscriptTitle: submissionTitle,
          partnerName,
        }
      : undefined,
  })
}

/**
 * Helper function to create a "submission reminder" notification
 */
export async function notifySubmissionReminder(
  userId: string,
  submissionId: string,
  submissionTitle: string,
  daysSinceSubmission: number,
  emailData?: {
    userName: string
    userEmail: string
    partnerName: string
    submittedAt: string
    lastActivity?: string
  }
) {
  return createSubmissionNotification({
    userId,
    submissionId,
    type: 'submission_reminder',
    title: 'Submission reminder',
    message: `"${submissionTitle}" has been awaiting response for ${daysSinceSubmission} days`,
    actionUrl: `/dashboard/submissions/${submissionId}`,
    emailData: emailData
      ? {
          ...emailData,
          manuscriptTitle: submissionTitle,
          daysSinceSubmission,
        }
      : undefined,
  })
}
