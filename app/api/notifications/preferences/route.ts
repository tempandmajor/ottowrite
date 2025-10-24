/**
 * Notification Preferences API Endpoint
 *
 * GET: Returns user's notification preferences
 * PATCH: Updates user's notification preferences
 *
 * Ticket: MS-4.2
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponses } from '@/lib/api/error-response'
import { requireAuth } from '@/lib/api/auth-helpers'
import { requireDefaultRateLimit } from '@/lib/api/rate-limit-helpers'

export async function GET(request: Request) {
  try {
    const { user, supabase } = await requireAuth(request)
  await requireDefaultRateLimit(request, user.id)

    // Get preferences using RPC function
    const { data: prefsData, error: prefsError } = await supabase
      .rpc('get_notification_preferences', { p_user_id: user.id })
      .single()

    if (prefsError || !prefsData) {
      return errorResponses.internalError('Failed to fetch preferences', {
        details: prefsError,
      })
    }

    // Convert snake_case to camelCase
    const prefs = prefsData as any
    const preferences = {
      emailEnabled: prefs.email_enabled,
      inAppEnabled: prefs.in_app_enabled,
      notifyPartnerViewed: prefs.notify_partner_viewed,
      notifyMaterialRequested: prefs.notify_material_requested,
      notifyResponseReceived: prefs.notify_response_received,
      notifyStatusAccepted: prefs.notify_status_accepted,
      notifyStatusRejected: prefs.notify_status_rejected,
      notifySubmissionReminder: prefs.notify_submission_reminder,
      emailDigestFrequency: prefs.email_digest_frequency,
    }

    return NextResponse.json({ preferences })
  } catch (error) {
    console.error('Error fetching notification preferences:', error)
    return errorResponses.internalError(
      error instanceof Error ? error.message : 'Failed to fetch preferences',
      { details: error }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)

    const body = await request.json()

    // Validate input
    const {
      emailEnabled,
      inAppEnabled,
      notifyPartnerViewed,
      notifyMaterialRequested,
      notifyResponseReceived,
      notifyStatusAccepted,
      notifyStatusRejected,
      notifySubmissionReminder,
      emailDigestFrequency,
    } = body

    // Validate email digest frequency
    const validFrequencies = ['immediate', 'daily', 'weekly', 'never']
    if (emailDigestFrequency && !validFrequencies.includes(emailDigestFrequency)) {
      return errorResponses.validationError('Invalid email digest frequency')
    }

    // Convert camelCase to snake_case for database
    const updates: Record<string, any> = {}

    if (typeof emailEnabled === 'boolean') updates.email_enabled = emailEnabled
    if (typeof inAppEnabled === 'boolean') updates.in_app_enabled = inAppEnabled
    if (typeof notifyPartnerViewed === 'boolean')
      updates.notify_partner_viewed = notifyPartnerViewed
    if (typeof notifyMaterialRequested === 'boolean')
      updates.notify_material_requested = notifyMaterialRequested
    if (typeof notifyResponseReceived === 'boolean')
      updates.notify_response_received = notifyResponseReceived
    if (typeof notifyStatusAccepted === 'boolean')
      updates.notify_status_accepted = notifyStatusAccepted
    if (typeof notifyStatusRejected === 'boolean')
      updates.notify_status_rejected = notifyStatusRejected
    if (typeof notifySubmissionReminder === 'boolean')
      updates.notify_submission_reminder = notifySubmissionReminder
    if (emailDigestFrequency) updates.email_digest_frequency = emailDigestFrequency

    // Update preferences
    const { data: updatedPrefs, error: updateError } = await supabase
      .from('submission_notification_preferences')
      .update(updates)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      // If no preferences exist, create them
      if (updateError.code === 'PGRST116') {
        const { data: newPrefs, error: insertError } = await supabase
          .from('submission_notification_preferences')
          .insert({ user_id: user.id, ...updates })
          .select()
          .single()

        if (insertError) {
          return errorResponses.internalError('Failed to create preferences', {
            details: insertError,
          })
        }

        return NextResponse.json({ success: true, preferences: newPrefs })
      }

      return errorResponses.internalError('Failed to update preferences', {
        details: updateError,
      })
    }

    return NextResponse.json({ success: true, preferences: updatedPrefs })
  } catch (error) {
    console.error('Error updating notification preferences:', error)
    return errorResponses.internalError(
      error instanceof Error ? error.message : 'Failed to update preferences',
      { details: error }
    )
  }
}
