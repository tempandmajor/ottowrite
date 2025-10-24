/**
 * Watermark Detection API
 *
 * POST /api/submissions/watermark/detect - Detect watermarks in leaked content
 * Studio-only feature for administrators
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponses, successResponse } from '@/lib/api/error-response'
import { requireAuth } from '@/lib/api/auth-helpers'
import { requireDefaultRateLimit } from '@/lib/api/rate-limit-helpers'
import { canAccessSubmissions } from '@/lib/submissions/access'
import { detectWatermark, createDocumentFingerprint } from '@/lib/submissions/watermark'

/**
 * POST /api/submissions/watermark/detect
 * Detect watermarks in potentially leaked content
 */
export async function POST(request: NextRequest) {
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
    return errorResponses.paymentRequired('Access to watermark detection requires a Studio plan')
  }

  try {
    const body = await request.json()
    const { content, submission_id } = body

    if (!content) {
      return errorResponses.badRequest('content is required')
    }

    // Create fingerprint of the content
    const fingerprint = createDocumentFingerprint(content)

    let results: any[] = []

    if (submission_id) {
      // Check specific submission's watermarks
      const { data: partnerSubmissions } = await supabase
        .from('partner_submissions')
        .select('*, submission_partners(*)')
        .eq('submission_id', submission_id)
        .eq('user_id', user.id)

      if (partnerSubmissions) {
        results = partnerSubmissions
          .filter(ps => ps.watermark_data?.watermarkId)
          .map(ps => {
            const detection = detectWatermark(content, ps.watermark_data.watermarkId)
            return {
              partner_id: ps.partner_id,
              partner_name: ps.submission_partners?.name,
              watermark_id: ps.watermark_data.watermarkId,
              ...detection,
            }
          })
          .filter(r => r.detected)
      }
    } else {
      // Check all user's watermarks
      const { data: partnerSubmissions } = await supabase
        .from('partner_submissions')
        .select('*, submission_partners(*)')
        .eq('user_id', user.id)
        .not('watermark_data', 'is', null)

      if (partnerSubmissions) {
        results = partnerSubmissions
          .map(ps => {
            if (!ps.watermark_data?.watermarkId) return null

            const detection = detectWatermark(content, ps.watermark_data.watermarkId)
            if (!detection.detected) return null

            return {
              submission_id: ps.submission_id,
              partner_id: ps.partner_id,
              partner_name: ps.submission_partners?.name,
              watermark_id: ps.watermark_data.watermarkId,
              submitted_at: ps.submitted_at,
              ...detection,
            }
          })
          .filter(r => r !== null)
      }
    }

    // Sort by confidence
    results.sort((a, b) => (b?.confidence || 0) - (a?.confidence || 0))

    return successResponse({
      fingerprint,
      matches: results,
      total_matches: results.length,
      highest_confidence: results[0]?.confidence || 0,
    })
  } catch (error) {
    return errorResponses.internalError('Failed to detect watermarks', {
      details: error,
      userId: user.id,
    })
  }
}
