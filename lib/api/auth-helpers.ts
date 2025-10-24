/**
 * Standardized Authentication Helpers for API Routes
 *
 * Provides consistent authentication and authorization patterns across all API routes.
 * Use these helpers to ensure security best practices are followed.
 *
 * Usage:
 *   import { requireAuth, requireOwnership } from '@/lib/api/auth-helpers'
 *
 *   export async function GET(request: Request) {
 *     const { user, supabase } = await requireAuth(request)
 *     // User is guaranteed to be authenticated
 *   }
 */

import { createClient } from '@/lib/supabase/server'
import { errorResponses } from './error-response'
import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient, User } from '@supabase/supabase-js'

export interface AuthResult {
  user: User
  supabase: SupabaseClient
}

/**
 * Require authentication for API route
 *
 * Returns authenticated user and supabase client, or throws error response.
 * Use this at the start of any protected API route.
 *
 * @example
 * export async function GET(request: Request) {
 *   const { user, supabase } = await requireAuth(request)
 *   // Proceed with authenticated logic
 * }
 */
export async function requireAuth(request: Request): Promise<AuthResult> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    throw await errorResponses.unauthorized()
  }

  return { user, supabase }
}

/**
 * Require ownership of a resource
 *
 * Verifies that the authenticated user owns the specified resource.
 * Returns the resource if owned, otherwise throws 403 or 404.
 *
 * @param supabase - Supabase client (from requireAuth)
 * @param table - Table name
 * @param resourceId - Resource ID to check
 * @param userId - User ID to verify ownership
 * @param select - Columns to select (default: '*')
 *
 * @example
 * const { user, supabase } = await requireAuth(request)
 * const project = await requireOwnership(
 *   supabase,
 *   'projects',
 *   projectId,
 *   user.id
 * )
 */
export async function requireOwnership<T = any>(
  supabase: SupabaseClient,
  table: string,
  resourceId: string,
  userId: string,
  select: string = '*'
): Promise<T> {
  const { data, error } = await supabase
    .from(table)
    .select(select)
    .eq('id', resourceId)
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    // Don't reveal whether resource exists or user just doesn't own it
    throw await errorResponses.notFound(`Resource not found`)
  }

  return data as T
}

/**
 * Require ownership with custom ownership field
 *
 * For tables where the ownership field is not 'user_id'
 *
 * @example
 * const submission = await requireOwnershipCustom(
 *   supabase,
 *   'manuscript_submissions',
 *   submissionId,
 *   user.id,
 *   'author_id'  // Custom ownership field
 * )
 */
export async function requireOwnershipCustom<T = any>(
  supabase: SupabaseClient,
  table: string,
  resourceId: string,
  userId: string,
  ownershipField: string,
  select: string = '*'
): Promise<T> {
  const { data, error } = await supabase
    .from(table)
    .select(select)
    .eq('id', resourceId)
    .eq(ownershipField, userId)
    .single()

  if (error || !data) {
    throw await errorResponses.notFound(`Resource not found`)
  }

  return data as T
}

/**
 * Require project ownership
 *
 * Common helper for project-scoped resources.
 * Verifies user owns the project before allowing access.
 *
 * @example
 * const { user, supabase } = await requireAuth(request)
 * const project = await requireProjectOwnership(supabase, projectId, user.id)
 */
export async function requireProjectOwnership(
  supabase: SupabaseClient,
  projectId: string,
  userId: string
) {
  return requireOwnership(
    supabase,
    'projects',
    projectId,
    userId,
    'id, title, user_id'
  )
}

/**
 * Require document ownership
 *
 * Verifies user owns the document (through project ownership)
 *
 * @example
 * const { user, supabase } = await requireAuth(request)
 * const document = await requireDocumentOwnership(supabase, documentId, user.id)
 */
export async function requireDocumentOwnership(
  supabase: SupabaseClient,
  documentId: string,
  userId: string
) {
  // Documents are owned through projects
  const { data, error } = await supabase
    .from('documents')
    .select(`
      *,
      project:projects!inner(user_id)
    `)
    .eq('id', documentId)
    .eq('project.user_id', userId)
    .single()

  if (error || !data) {
    throw await errorResponses.notFound(`Document not found`)
  }

  return data
}

/**
 * Optional authentication
 *
 * Returns user if authenticated, undefined if not.
 * Use for endpoints that behave differently for authenticated vs anonymous users.
 *
 * @example
 * export async function GET(request: Request) {
 *   const auth = await optionalAuth(request)
 *   if (auth) {
 *     // User is authenticated
 *     const { user, supabase } = auth
 *   } else {
 *     // Anonymous user
 *   }
 * }
 */
export async function optionalAuth(
  request: Request
): Promise<AuthResult | undefined> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return undefined
  }

  return { user, supabase }
}

/**
 * Check if user has specific role or permission
 *
 * @example
 * const { user, supabase } = await requireAuth(request)
 * const isAdmin = await hasRole(supabase, user.id, 'admin')
 * if (!isAdmin) {
 *   throw errorResponses.forbidden('Admin access required')
 * }
 */
export async function hasRole(
  supabase: SupabaseClient,
  userId: string,
  role: string
): Promise<boolean> {
  const { data } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', userId)
    .single()

  return data?.role === role
}

/**
 * Require admin access
 *
 * @example
 * export async function GET(request: Request) {
 *   const { user, supabase } = await requireAdmin(request)
 *   // User is guaranteed to be admin
 * }
 */
export async function requireAdmin(request: Request): Promise<AuthResult> {
  const auth = await requireAuth(request)
  const isAdmin = await hasRole(auth.supabase, auth.user.id, 'admin')

  if (!isAdmin) {
    throw await errorResponses.forbidden('Admin access required')
  }

  return auth
}

/**
 * Verify submission access (author or partner)
 *
 * Submissions can be accessed by:
 * - Author (who created it)
 * - Partners (who received it)
 * - Admins
 *
 * @example
 * const { user, supabase } = await requireAuth(request)
 * const submission = await requireSubmissionAccess(
 *   supabase,
 *   submissionId,
 *   user.id
 * )
 */
export async function requireSubmissionAccess(
  supabase: SupabaseClient,
  submissionId: string,
  userId: string
) {
  // Check if user is author
  const { data: authorSubmission } = await supabase
    .from('manuscript_submissions')
    .select('*')
    .eq('id', submissionId)
    .eq('author_id', userId)
    .single()

  if (authorSubmission) {
    return authorSubmission
  }

  // Check if user is a partner who received this submission
  const { data: partnerSubmission } = await supabase
    .from('manuscript_submissions')
    .select(`
      *,
      submission_partners!inner(partner_id)
    `)
    .eq('id', submissionId)
    .eq('submission_partners.partner_id', userId)
    .single()

  if (partnerSubmission) {
    return partnerSubmission
  }

  // Check if user is admin
  const isAdmin = await hasRole(supabase, userId, 'admin')
  if (isAdmin) {
    const { data: adminSubmission } = await supabase
      .from('manuscript_submissions')
      .select('*')
      .eq('id', submissionId)
      .single()

    if (adminSubmission) {
      return adminSubmission
    }
  }

  throw await errorResponses.notFound('Submission not found')
}

/**
 * Verify collaboration access
 *
 * Check if user has access to a project through collaboration
 *
 * @example
 * const { user, supabase } = await requireAuth(request)
 * const hasAccess = await hasCollaborationAccess(
 *   supabase,
 *   projectId,
 *   user.id
 * )
 */
export async function hasCollaborationAccess(
  supabase: SupabaseClient,
  projectId: string,
  userId: string
): Promise<boolean> {
  // Check if user is owner
  const { data: project } = await supabase
    .from('projects')
    .select('user_id')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single()

  if (project) {
    return true
  }

  // Check if user is a collaborator
  const { data: collaboration } = await supabase
    .from('project_collaborators')
    .select('user_id')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .single()

  return !!collaboration
}

/**
 * Type-safe error thrower for use in helpers
 *
 * TypeScript helper that ensures thrown errors are NextResponse
 */
export function throwResponse(response: NextResponse): never {
  throw response
}

/**
 * Handle API route errors properly
 *
 * Detects if error is already a NextResponse (thrown by auth helpers)
 * and returns it directly. Otherwise returns null to let the route
 * handle the error with its own error response.
 *
 * @example
 * try {
 *   const { user, supabase } = await requireAuth(request)
 *   // ... route logic
 * } catch (error) {
 *   const authError = handleAuthError(error)
 *   if (authError) return authError
 *
 *   // Handle other errors
 *   return errorResponse('Something went wrong', { status: 500 })
 * }
 */
export function handleAuthError(error: unknown): NextResponse | null {
  // If error is already a NextResponse (from requireAuth, etc.), return it
  if (error && typeof error === 'object' && 'status' in error && 'headers' in error) {
    return error as NextResponse
  }
  return null
}
