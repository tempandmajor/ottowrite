/**
 * Partner Verification API
 *
 * POST /api/partners/verification - Submit verification request
 * GET /api/partners/verification - Get verification requests (partner or admin)
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponses, successResponse } from '@/lib/api/error-response'
import {requireAuth, handleAuthError} from '@/lib/api/auth-helpers'
import { requireDefaultRateLimit } from '@/lib/api/rate-limit-helpers'
import {
  calculateVerificationScore,
  getRecommendedLevel,
  isValidBusinessEmail,
  isValidBusinessWebsite,
  shouldAutoVerify,
} from '@/lib/submissions/partner-verification'

interface SubmitVerificationBody {
  partnerId: string
  businessName: string
  website: string
  email: string
  phone?: string
  address?: string
  industryAssociations?: string[]
  membershipProof?: string[]
  salesHistory?: string
  clientList?: string
  linkedIn?: string
  twitter?: string
  publishersMarketplace?: string
  queryTracker?: string
  manuscriptWishList?: string
  documents?: Array<{ type: string; url: string; name: string }>
  notes?: string
}

/**
 * POST /api/partners/verification
 * Submit a partner verification request
 */
export async function POST(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)
  await requireDefaultRateLimit(request, user.id)

    const body: SubmitVerificationBody = await request.json()

    // Validate required fields
    if (!body.partnerId || !body.businessName || !body.website || !body.email) {
      return errorResponses.badRequest(
        'Missing required fields: partnerId, businessName, website, email'
      )
    }

    // Verify partner exists and user owns it
    const { data: partner, error: partnerError } = await supabase
      .from('submission_partners')
      .select('*')
      .eq('id', body.partnerId)
      .single()

    if (partnerError || !partner) {
      return errorResponses.notFound('Partner not found')
    }

    // Check if there's already a pending request
    const { data: existingRequest } = await supabase
      .from('partner_verification_requests')
      .select('*')
      .eq('partner_id', body.partnerId)
      .eq('status', 'pending')
      .maybeSingle()

    if (existingRequest) {
      return errorResponses.badRequest(
        'A verification request is already pending for this partner'
      )
    }

    // Validate business email and website
    if (!isValidBusinessEmail(body.email)) {
      return errorResponses.badRequest(
        'Please use a business email address (not a free email provider)'
      )
    }

    if (!isValidBusinessWebsite(body.website)) {
      return errorResponses.badRequest(
        'Please use a professional business website (not a free hosting service)'
      )
    }

    // Calculate verification score
    // Convert body to VerificationRequest format for scoring
    const requestForScoring = {
      email: body.email,
      website: body.website,
      phone: body.phone,
      address: body.address,
      industryAssociations: body.industryAssociations,
      membershipProof: body.membershipProof,
      salesHistory: body.salesHistory,
      clientList: body.clientList,
      linkedIn: body.linkedIn,
      twitter: body.twitter,
      publishersMarketplace: body.publishersMarketplace,
      queryTracker: body.queryTracker,
      manuscriptWishList: body.manuscriptWishList,
    }
    const score = calculateVerificationScore(requestForScoring)
    const recommendedLevel = getRecommendedLevel(score)

    // Check for auto-verification (major publishers)
    const autoVerify = shouldAutoVerify(body.email, body.website)

    // Create verification request
    const { data: verificationRequest, error: createError } = await supabase
      .from('partner_verification_requests')
      .insert({
        partner_id: body.partnerId,
        requested_by: user.id,
        status: autoVerify ? 'approved' : 'pending',
        level: autoVerify ? 'basic' : recommendedLevel,
        business_name: body.businessName,
        website: body.website,
        email: body.email,
        phone: body.phone,
        address: body.address,
        industry_associations: body.industryAssociations,
        membership_proof: body.membershipProof,
        sales_history: body.salesHistory,
        client_list: body.clientList,
        linkedin: body.linkedIn,
        twitter: body.twitter,
        publishers_marketplace: body.publishersMarketplace,
        query_tracker: body.queryTracker,
        manuscript_wish_list: body.manuscriptWishList,
        documents: body.documents || [],
        notes: body.notes,
        verification_score: score,
        reviewed_by: autoVerify ? user.id : null,
        reviewed_at: autoVerify ? new Date().toISOString() : null,
      })
      .select()
      .single()

    if (createError) {
      return errorResponses.internalError('Failed to create verification request', {
        details: createError.message,
      })
    }

    // If auto-verified, update partner status
    if (autoVerify) {
      await supabase
        .from('submission_partners')
        .update({
          verification_status: 'verified',
          verification_level: 'basic',
          verified_at: new Date().toISOString(),
          verified_by: user.id,
        })
        .eq('id', body.partnerId)
    } else {
      // Update partner status to pending
      await supabase
        .from('submission_partners')
        .update({
          verification_status: 'pending',
        })
        .eq('id', body.partnerId)
    }

    return successResponse({
      message: autoVerify
        ? 'Partner automatically verified!'
        : 'Verification request submitted successfully',
      request: verificationRequest,
      auto_verified: autoVerify,
      verification_score: score,
      recommended_level: recommendedLevel,
    })
  } catch (error) {
        const authError = handleAuthError(error)
    if (authError) return authError

    console.error('Error submitting verification request:', error)
    return errorResponses.internalError('An unexpected error occurred')
  }
}

/**
 * GET /api/partners/verification
 * Get verification requests (own requests or all if admin)
 */
export async function GET(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)

    const searchParams = request.nextUrl.searchParams
    const partnerId = searchParams.get('partnerId')
    const status = searchParams.get('status')

    // Check if user is admin
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('role')
      .eq('user_id', user.id)
      .single()

    const isAdmin = userSettings?.role === 'admin'

    let query = supabase
      .from('partner_verification_requests')
      .select('*')
      .order('created_at', { ascending: false })

    // If not admin, only show own requests
    if (!isAdmin) {
      query = query.eq('requested_by', user.id)
    }

    // Filter by partner ID if provided
    if (partnerId) {
      query = query.eq('partner_id', partnerId)
    }

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status)
    }

    const { data: requests, error: fetchError } = await query

    if (fetchError) {
      return errorResponses.internalError('Failed to fetch verification requests', {
        details: fetchError.message,
      })
    }

    return successResponse({
      requests: requests || [],
      is_admin: isAdmin,
    })
  } catch (error) {
        const authError = handleAuthError(error)
    if (authError) return authError

    console.error('Error fetching verification requests:', error)
    return errorResponses.internalError('An unexpected error occurred')
  }
}
