/**
 * Documents API Route
 *
 * Handles document creation with quota enforcement
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkDocumentQuota } from '@/lib/account/quota'
import { errorResponses } from '@/lib/api/error-response'
import { requireAuth } from '@/lib/api/auth-helpers'
import { requireDefaultRateLimit } from '@/lib/api/rate-limit-helpers'

export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireAuth(request)
  await requireDefaultRateLimit(request, user.id)

    // Get user profile with subscription info
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return errorResponses.internalError('Failed to fetch user profile')
    }

    const tier = profile.subscription_tier || 'free'

    // Parse request body
    const body = await request.json()
    const { project_id, parent_folder_id, title, type, is_folder, folder_type, position, content } = body

    // Validate required fields
    if (!project_id || !type) {
      return errorResponses.badRequest('Missing required fields: project_id and type')
    }

    // Only check quota for actual documents, not folders
    if (!is_folder) {
      const quotaCheck = await checkDocumentQuota(supabase, user.id, tier)

      if (!quotaCheck.allowed) {
        return errorResponses.paymentRequired(
          `You've reached your plan's limit of ${quotaCheck.limit} documents. Upgrade to create more documents.`,
          {
            code: 'DOCUMENT_LIMIT_EXCEEDED',
            details: {
              used: quotaCheck.used,
              limit: quotaCheck.limit,
              currentTier: tier,
              upgradeUrl: '/pricing',
            },
          }
        )
      }
    }

    // Create document
    const insertData: any = {
      user_id: user.id,
      project_id,
      parent_folder_id: parent_folder_id || null,
      title: title || (is_folder ? 'New Folder' : 'Untitled Document'),
      type,
      is_folder: is_folder || false,
      position: position ?? 0,
      word_count: 0,
    }

    // Add folder-specific fields
    if (is_folder && folder_type) {
      insertData.folder_type = folder_type
    }

    // Add content for documents (not folders)
    if (!is_folder) {
      insertData.content = content || { html: '', structure: [] }
    }

    const { data: document, error: createError } = await supabase
      .from('documents')
      .insert(insertData)
      .select('id, title, type, is_folder, folder_type, word_count, status, position, parent_folder_id, created_at, updated_at')
      .single()

    if (createError) {
      console.error('Document creation error:', createError)
      return errorResponses.internalError('Failed to create document')
    }

    // Get updated quota info
    let quota = null
    if (!is_folder) {
      const quotaCheck = await checkDocumentQuota(supabase, user.id, tier)
      quota = {
        used: quotaCheck.used,
        limit: quotaCheck.limit,
      }
    }

    return NextResponse.json(
      {
        document,
        quota,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Unexpected error in POST /api/documents:', error)
    return errorResponses.internalError()
  }
}
