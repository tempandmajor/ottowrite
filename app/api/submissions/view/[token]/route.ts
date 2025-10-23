/**
 * Secure Manuscript Viewing API
 *
 * GET /api/submissions/view/[token] - View manuscript with access token
 * Enforces DRM rules and tracks access
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponses } from '@/lib/api/error-response'
import { verifyAccessToken, hasPermission, getDRMSecurityHeaders } from '@/lib/submissions/access-control'
import {
  logManuscriptAccess,
  getClientIp,
  isSuspiciousUserAgent,
  createSuspiciousActivityAlert,
  createDeviceFingerprint,
  type AccessAction,
} from '@/lib/submissions/audit-trail'

interface RouteParams {
  params: Promise<{
    token: string
  }>
}

/**
 * GET /api/submissions/view/[token]
 * Secure manuscript viewing with DRM enforcement
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { token } = await params
  const supabase = await createClient()

  // Verify access token
  const verification = await verifyAccessToken(token)

  if (!verification.valid || !verification.payload) {
    // Log denied access attempt
    if (verification.payload) {
      await logManuscriptAccess({
        submissionId: verification.payload.submissionId,
        accessTokenId: token,
        partnerId: verification.payload.partnerId,
        action: 'view_query',
        ipAddress: getClientIp(request.headers),
        userAgent: request.headers.get('user-agent') || undefined,
        deviceFingerprint: createDeviceFingerprint(request.headers),
        accessGranted: false,
        denialReason: verification.error || 'Invalid or expired access token',
      })

      // Create alert for access after expiry
      if (verification.error?.includes('expired')) {
        await createSuspiciousActivityAlert({
          submissionId: verification.payload.submissionId,
          partnerId: verification.payload.partnerId,
          alertType: 'access_after_expiry',
          severity: 'medium',
          description: 'Attempted access with expired token',
          metadata: {
            token: token.substring(0, 20) + '...',
            error: verification.error,
          },
        })
      }
    }

    return errorResponses.unauthorized(verification.error || 'Invalid or expired access token')
  }

  const { submissionId, partnerId, watermarkId, permissions } = verification.payload

  try {
    // Fetch the partner submission
    const { data: partnerSubmission, error: submissionError } = await supabase
      .from('partner_submissions')
      .select('*, manuscript_submissions(*)')
      .eq('submission_id', submissionId)
      .eq('partner_id', partnerId)
      .eq('access_token', token)
      .single()

    if (submissionError || !partnerSubmission) {
      return errorResponses.notFound('Submission not found')
    }

    // Check if access has been revoked
    if (partnerSubmission.access_revoked_at) {
      return errorResponses.forbidden('Access to this submission has been revoked')
    }

    // Check if access has expired
    const expiresAt = new Date(partnerSubmission.access_expires_at)
    if (expiresAt < new Date()) {
      return errorResponses.forbidden('Access to this submission has expired')
    }

    // Extract request metadata
    const userAgent = request.headers.get('user-agent') || ''
    const ipAddress = getClientIp(request.headers) || ''
    const deviceFingerprint = createDeviceFingerprint(request.headers)

    // Determine which section is being viewed
    const searchParams = request.nextUrl.searchParams
    const section = searchParams.get('section') || 'query'

    let action: AccessAction = 'view_query'
    if (section === 'synopsis') action = 'view_synopsis'
    else if (section === 'samples') action = 'view_samples'

    // Check for suspicious activity
    if (userAgent && isSuspiciousUserAgent(userAgent)) {
      await createSuspiciousActivityAlert({
        submissionId,
        partnerId,
        alertType: 'suspicious_user_agent',
        severity: 'medium',
        description: `Suspicious user agent detected: ${userAgent.substring(0, 100)}`,
        metadata: { userAgent, ipAddress },
      })
    }

    // Log access with comprehensive audit trail
    await logManuscriptAccess({
      submissionId,
      accessTokenId: token,
      partnerId,
      action,
      ipAddress,
      userAgent,
      deviceFingerprint,
      watermarkId,
      drmFlags: {
        allowDownload: hasPermission(permissions, 'download'),
        allowPrint: hasPermission(permissions, 'print'),
        allowCopy: hasPermission(permissions, 'copy'),
      },
      accessGranted: true,
    })

    // Update view tracking
    if (!partnerSubmission.viewed_by_partner) {
      await supabase
        .from('partner_submissions')
        .update({
          viewed_by_partner: true,
          first_viewed_at: new Date().toISOString(),
          last_viewed_at: new Date().toISOString(),
          view_count: 1,
        })
        .eq('id', partnerSubmission.id)
    } else {
      await supabase
        .from('partner_submissions')
        .update({
          last_viewed_at: new Date().toISOString(),
          view_count: (partnerSubmission.view_count || 0) + 1,
        })
        .eq('id', partnerSubmission.id)
    }

    // Prepare response data based on permissions
    const responseData: any = {
      submission: {
        id: submissionId,
        title: partnerSubmission.manuscript_submissions.title,
        genre: partnerSubmission.manuscript_submissions.genre,
        word_count: partnerSubmission.manuscript_submissions.word_count,
        type: partnerSubmission.manuscript_submissions.type,
      },
      watermarkId, // Include for tracking
      permissions,
    }

    // Add content based on permissions
    if (hasPermission(permissions, 'view_query')) {
      responseData.query_letter = partnerSubmission.manuscript_submissions.query_letter
    }

    if (hasPermission(permissions, 'view_synopsis')) {
      responseData.synopsis = partnerSubmission.manuscript_submissions.synopsis
    }

    if (hasPermission(permissions, 'view_sample')) {
      responseData.sample_pages = partnerSubmission.manuscript_submissions.sample_pages_content
      responseData.sample_pages_count = partnerSubmission.manuscript_submissions.sample_pages_count
    }

    if (hasPermission(permissions, 'view_full')) {
      // In production, this would fetch the full manuscript content
      // For now, just indicate it's available
      responseData.full_manuscript_available = partnerSubmission.manuscript_submissions.full_manuscript_available
    }

    // Add DRM rules
    responseData.drm = {
      allowDownload: hasPermission(permissions, 'download'),
      allowPrint: hasPermission(permissions, 'print'),
      allowCopy: hasPermission(permissions, 'copy'),
      watermarkNotice: 'This manuscript is watermarked and tracked for unauthorized distribution.',
    }

    // Add DRM security headers to response
    const drmHeaders = getDRMSecurityHeaders()
    const headers = new Headers(drmHeaders)

    return NextResponse.json(
      {
        success: true,
        ...responseData,
      },
      { headers }
    )
  } catch (error) {
    return errorResponses.internalError('Failed to access manuscript', {
      details: error,
    })
  }
}
