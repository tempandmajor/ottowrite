/**
 * Notification Creation Utility
 *
 * Helper functions for creating submission notifications.
 *
 * Ticket: MS-4.2
 */

import { createClient } from '@/lib/supabase/server'

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
}

/**
 * Creates a submission notification using the database RPC function.
 * Returns the notification ID if created, null if user has disabled this notification type.
 */
export async function createSubmissionNotification(
  params: CreateNotificationParams
): Promise<string | null> {
  try {
    const supabase = await createClient()

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

    return notificationId
  } catch (error) {
    console.error('Error creating notification:', error)
    return null
  }
}

/**
 * Helper function to create a "partner viewed" notification
 */
export async function notifyPartnerViewed(
  userId: string,
  submissionId: string,
  submissionTitle: string,
  partnerName: string
) {
  return createSubmissionNotification({
    userId,
    submissionId,
    type: 'partner_viewed',
    title: 'Partner viewed your submission',
    message: `${partnerName} viewed "${submissionTitle}"`,
    actionUrl: `/dashboard/submissions/${submissionId}`,
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
  requestType: 'sample' | 'full'
) {
  const materialType = requestType === 'sample' ? 'sample pages' : 'full manuscript'

  return createSubmissionNotification({
    userId,
    submissionId,
    type: 'material_requested',
    title: 'Material requested',
    message: `${partnerName} requested ${materialType} for "${submissionTitle}"`,
    actionUrl: `/dashboard/submissions/${submissionId}`,
  })
}

/**
 * Helper function to create a "response received" notification
 */
export async function notifyResponseReceived(
  userId: string,
  submissionId: string,
  submissionTitle: string,
  partnerName: string
) {
  return createSubmissionNotification({
    userId,
    submissionId,
    type: 'response_received',
    title: 'Response received',
    message: `${partnerName} sent a response for "${submissionTitle}"`,
    actionUrl: `/dashboard/submissions/${submissionId}`,
  })
}

/**
 * Helper function to create a "submission accepted" notification
 */
export async function notifySubmissionAccepted(
  userId: string,
  submissionId: string,
  submissionTitle: string,
  partnerName: string
) {
  return createSubmissionNotification({
    userId,
    submissionId,
    type: 'status_accepted',
    title: 'Congratulations! Submission accepted',
    message: `${partnerName} accepted "${submissionTitle}"! 🎉`,
    actionUrl: `/dashboard/submissions/${submissionId}`,
  })
}

/**
 * Helper function to create a "submission rejected" notification
 */
export async function notifySubmissionRejected(
  userId: string,
  submissionId: string,
  submissionTitle: string,
  partnerName: string
) {
  return createSubmissionNotification({
    userId,
    submissionId,
    type: 'status_rejected',
    title: 'Submission declined',
    message: `${partnerName} declined "${submissionTitle}"`,
    actionUrl: `/dashboard/submissions/${submissionId}`,
  })
}

/**
 * Helper function to create a "submission reminder" notification
 */
export async function notifySubmissionReminder(
  userId: string,
  submissionId: string,
  submissionTitle: string,
  daysSinceSubmission: number
) {
  return createSubmissionNotification({
    userId,
    submissionId,
    type: 'submission_reminder',
    title: 'Submission reminder',
    message: `"${submissionTitle}" has been awaiting response for ${daysSinceSubmission} days`,
    actionUrl: `/dashboard/submissions/${submissionId}`,
  })
}
