/**
 * Legal Agreements API
 *
 * POST /api/legal/agreements - Record user agreement to legal documents
 * GET /api/legal/agreements - Get user's legal agreements
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponses, successResponse } from '@/lib/api/error-response'
import { requireAuth } from '@/lib/api/auth-helpers'
import { requireDefaultRateLimit } from '@/lib/api/rate-limit-helpers'
import type { UserAgreement } from '@/lib/submissions/legal-documents'

/**
 * GET /api/legal/agreements
 * Get current user's legal agreements
 */
export async function GET(request: Request) {
  try {
    const { user, supabase } = await requireAuth(request)
  await requireDefaultRateLimit(request, user.id)

    const { data: agreements, error: fetchError } = await supabase
      .from('user_legal_agreements')
      .select('*')
      .eq('user_id', user.id)
      .order('agreed_at', { ascending: false })

    if (fetchError) {
      return errorResponses.internalError('Failed to fetch legal agreements', {
        details: fetchError.message,
      })
    }

    const userAgreements: UserAgreement[] = (agreements || []).map((agreement) => ({
      documentId: agreement.document_id,
      version: agreement.document_version,
      agreedAt: agreement.agreed_at,
      ipAddress: agreement.ip_address || undefined,
      userAgent: agreement.user_agent || undefined,
    }))

    return successResponse({
      agreements: userAgreements,
    })
  } catch (error) {
    console.error('Error fetching legal agreements:', error)
    return errorResponses.internalError('An unexpected error occurred')
  }
}

interface RecordAgreementBody {
  documentId: string
  documentType: 'terms' | 'privacy' | 'ip-protection' | 'partner-terms'
  documentVersion: string
}

/**
 * POST /api/legal/agreements
 * Record user agreement to a legal document
 */
export async function POST(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)

    const body: RecordAgreementBody = await request.json()

    if (!body.documentId || !body.documentType || !body.documentVersion) {
      return errorResponses.badRequest(
        'Missing required fields: documentId, documentType, documentVersion'
      )
    }

    // Validate document type
    const validTypes = ['terms', 'privacy', 'ip-protection', 'partner-terms']
    if (!validTypes.includes(body.documentType)) {
      return errorResponses.badRequest('Invalid document type')
    }

    // Get IP address and user agent for audit trail
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
    const userAgent = request.headers.get('user-agent')

    // Record agreement using database function
    const { data, error: recordError } = await supabase.rpc('record_legal_agreement', {
      p_user_id: user.id,
      p_document_id: body.documentId,
      p_document_type: body.documentType,
      p_document_version: body.documentVersion,
      p_ip_address: ipAddress,
      p_user_agent: userAgent,
    })

    if (recordError) {
      return errorResponses.internalError('Failed to record agreement', {
        details: recordError.message,
      })
    }

    return successResponse({
      message: 'Agreement recorded successfully',
      agreement_id: data,
      document_id: body.documentId,
      version: body.documentVersion,
    })
  } catch (error) {
    console.error('Error recording legal agreement:', error)
    return errorResponses.internalError('An unexpected error occurred')
  }
}
