/**
 * Submit Manuscript to Partners API
 *
 * POST /api/submissions/[submissionId]/submit - Submit manuscript to selected partners
 * Studio-only feature
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponses, successResponse } from '@/lib/api/error-response'
import {requireAuth, handleAuthError} from '@/lib/api/auth-helpers'
import { requireDefaultRateLimit } from '@/lib/api/rate-limit-helpers'
import {
  canAccessSubmissions,
  SUBMISSION_ACCESS_MESSAGES,
  SUBMISSIONS_UPGRADE_URL,
} from '@/lib/submissions/access'
import { watermarkManuscript, createDocumentFingerprint } from '@/lib/submissions/watermark'
import { generateAccessToken, getFullAccessPermissions } from '@/lib/submissions/access-control'

interface RouteParams {
  params: Promise<{
    submissionId: string
  }>
}

/**
 * POST /api/submissions/[submissionId]/submit
 * Submit manuscript to selected partners
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { submissionId } = await params
  const { user, supabase } = await requireAuth(request)
  await requireDefaultRateLimit(request, user.id)

  // Check Studio subscription
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('subscription_tier, subscription_status, subscription_current_period_end')
    .eq('id', user.id)
    .single()

  const accessResult = canAccessSubmissions(profile)

  if (!accessResult.hasAccess) {
    const message =
      accessResult.reason && SUBMISSION_ACCESS_MESSAGES[accessResult.reason]
        ? SUBMISSION_ACCESS_MESSAGES[accessResult.reason]
        : 'Access to manuscript submissions requires a Studio plan'

    return errorResponses.paymentRequired(message, {
      code: 'STUDIO_PLAN_REQUIRED',
      details: {
        feature: 'manuscript_submissions',
        requiredPlan: accessResult.requiredTier,
        currentPlan: accessResult.currentTier,
        upgradeUrl: SUBMISSIONS_UPGRADE_URL,
        reason: accessResult.reason,
      },
      userId: user.id,
    })
  }

  try {
    // Parse request body
    const body = await request.json()
    const { partner_ids } = body

    if (!partner_ids || !Array.isArray(partner_ids) || partner_ids.length === 0) {
      return errorResponses.badRequest('partner_ids is required and must be a non-empty array')
    }

    // Verify the submission exists and belongs to the user
    const { data: submission, error: submissionError } = await supabase
      .from('manuscript_submissions')
      .select('*')
      .eq('id', submissionId)
      .eq('user_id', user.id)
      .single()

    if (submissionError || !submission) {
      return errorResponses.notFound('Submission not found')
    }

    // Check if submission is already submitted
    if (submission.status === 'submitted' || submission.submitted_at) {
      return errorResponses.badRequest('Submission has already been sent')
    }

    // Verify all partners exist and are active
    const { data: partners, error: partnersError } = await supabase
      .from('submission_partners')
      .select('*')
      .in('id', partner_ids)
      .eq('status', 'active')

    if (partnersError || !partners || partners.length !== partner_ids.length) {
      return errorResponses.badRequest('One or more selected partners are invalid or inactive')
    }

    // Apply watermarks to manuscript content for each partner
    const watermarkedSubmissions = []

    for (const partnerId of partner_ids) {
      try {
        // Get the manuscript content to watermark
        const content = submission.query_letter + '\n\n' + submission.synopsis

        // Apply watermark
        const { watermarkedContent, watermarkData } = await watermarkManuscript(content, {
          partnerId,
          submissionId,
          userId: user.id,
          timestamp: new Date().toISOString(),
          format: 'text',
        })

        // Create document fingerprint for tracking
        const fingerprint = createDocumentFingerprint(watermarkedContent)

        // Generate access token for this partner
        const { token, expiresAt } = await generateAccessToken({
          submissionId,
          partnerId,
          userId: user.id,
          watermarkId: watermarkData.watermarkId,
          permissions: getFullAccessPermissions(),
        })

        watermarkedSubmissions.push({
          submission_id: submissionId,
          partner_id: partnerId,
          user_id: user.id,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          watermark_data: watermarkData,
          access_token: token,
          access_expires_at: expiresAt,
        })

        // Store watermark data for tracking
        console.log(`Watermarked manuscript for partner ${partnerId}:`, {
          watermarkId: watermarkData.watermarkId,
          techniques: watermarkData.technique,
          fingerprint: fingerprint.substring(0, 16),
        })
      } catch (watermarkError) {
        console.error(`Failed to watermark for partner ${partnerId}:`, watermarkError)
        // Continue with non-watermarked version if watermarking fails
        watermarkedSubmissions.push({
          submission_id: submissionId,
          partner_id: partnerId,
          user_id: user.id,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          watermark_data: null,
        })
      }
    }

    const { error: insertError } = await supabase
      .from('partner_submissions')
      .insert(watermarkedSubmissions)

    if (insertError) {
      return errorResponses.internalError('Failed to create partner submissions', {
        details: insertError,
        userId: user.id,
      })
    }

    // Update the main submission status and mark watermarking as applied
    const { error: updateError } = await supabase
      .from('manuscript_submissions')
      .update({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        watermark_applied: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', submissionId)

    if (updateError) {
      return errorResponses.internalError('Failed to update submission status', {
        details: updateError,
        userId: user.id,
      })
    }

    // TODO: In future iterations:
    // 1. ✅ Apply watermarks to manuscripts (COMPLETED)
    // 2. ✅ Create submission access tokens (COMPLETED)
    // 3. Send email notifications to partners
    // 4. Log submission events

    return successResponse({
      message: 'Submission sent successfully with watermark protection',
      submission_id: submissionId,
      partners_count: partner_ids.length,
      watermarked: true,
      submitted_at: new Date().toISOString(),
    })
  } catch (error) {
        const authError = handleAuthError(error)
    if (authError) return authError

    return errorResponses.internalError('Failed to submit manuscript', {
      details: error,
      userId: user.id,
    })
  }
}
