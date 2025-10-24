/**
 * Project Members API Route
 *
 * Handles project member invitations with team seat quota enforcement
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkTeamSeatQuota } from '@/lib/account/quota'
import { canAccessFeature } from '@/lib/stripe/config'
import { isSubscriptionActive } from '@/lib/stripe/config'
import { errorResponses } from '@/lib/api/error-response'
import {requireAuth, handleAuthError} from '@/lib/api/auth-helpers'
import { requireDefaultRateLimit } from '@/lib/api/rate-limit-helpers'

interface RouteContext {
  params: Promise<{
    projectId: string
  }>
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { projectId } = await context.params
    const { user, supabase } = await requireAuth(request)
  await requireDefaultRateLimit(request, user.id)

    // Get user profile with subscription info
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('subscription_tier, subscription_status, subscription_current_period_end')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return errorResponses.internalError('Failed to fetch user profile')
    }

    const tier = (profile.subscription_tier || 'free') as 'free' | 'hobbyist' | 'professional' | 'studio'

    // Check if subscription is active
    if (!isSubscriptionActive(profile)) {
      return errorResponses.paymentRequired(
        'Your subscription is not active. Please update your subscription to use collaboration features.',
        {
          code: 'SUBSCRIPTION_INACTIVE',
        }
      )
    }

    // Check if user has access to collaboration feature
    if (!canAccessFeature(tier, 'collaboration')) {
      return errorResponses.paymentRequired(
        'Collaboration is a Studio plan feature. Upgrade to Studio to invite team members.',
        {
          code: 'COLLABORATION_REQUIRES_STUDIO',
          details: {
            currentTier: tier,
            requiredTier: 'studio',
            upgradeUrl: '/pricing',
          },
        }
      )
    }

    // Verify user owns the project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('user_id')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return errorResponses.notFound('Project not found')
    }

    if (project.user_id !== user.id) {
      return errorResponses.forbidden('Only the project owner can invite members')
    }

    // Check team seat quota
    const quotaCheck = await checkTeamSeatQuota(supabase, user.id, tier)

    if (!quotaCheck.allowed) {
      return errorResponses.paymentRequired(
        `You've reached your plan's limit of ${quotaCheck.limit} team members. You currently have ${quotaCheck.used} team members across all projects.`,
        {
          code: 'TEAM_SEAT_LIMIT_EXCEEDED',
          details: {
            used: quotaCheck.used,
            limit: quotaCheck.limit,
            currentTier: tier,
            upgradeUrl: '/pricing',
          },
        }
      )
    }

    // Parse request body
    const body = await request.json()
    const { email, role = 'editor' } = body

    // Validate required fields
    if (!email) {
      return errorResponses.badRequest('Missing required field: email')
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return errorResponses.badRequest('Invalid email format')
    }

    // Validate role
    if (!['editor', 'viewer'].includes(role)) {
      return errorResponses.badRequest('Invalid role. Must be "editor" or "viewer"')
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('project_members')
      .select('id, status')
      .eq('project_id', projectId)
      .eq('email', email)
      .maybeSingle()

    if (existingMember) {
      if (existingMember.status === 'accepted') {
        return errorResponses.conflict('This user is already a member of the project')
      } else if (existingMember.status === 'invited') {
        return errorResponses.conflict('An invitation has already been sent to this email')
      }
    }

    // Create the invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('project_members')
      .insert({
        project_id: projectId,
        inviter_id: user.id,
        email: email.toLowerCase(),
        role,
        status: 'invited',
      })
      .select('id, project_id, email, role, status, created_at')
      .single()

    if (inviteError) {
      console.error('Invitation creation error:', inviteError)

      // Check if error is from the collaborator limit trigger
      if (inviteError.message?.includes('allows')) {
        return errorResponses.paymentRequired(inviteError.message, {
          code: 'TEAM_SEAT_LIMIT_EXCEEDED',
        })
      }

      return errorResponses.internalError('Failed to create invitation')
    }

    // Refresh usage stats (non-blocking)
    try {
      await supabase.rpc('refresh_user_plan_usage', { p_user_id: user.id })
    } catch (refreshError) {
      console.warn('refresh_user_plan_usage failed after member invite', refreshError)
    }

    // Get updated quota info
    const updatedQuota = await checkTeamSeatQuota(supabase, user.id, tier)

    return NextResponse.json(
      {
        invitation,
        quota: {
          used: updatedQuota.used,
          limit: updatedQuota.limit,
        },
      },
      { status: 201 }
    )
  } catch (error) {
        const authError = handleAuthError(error)
    if (authError) return authError

    console.error('Unexpected error in POST /api/projects/[projectId]/members:', error)
    return errorResponses.internalError()
  }
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { projectId } = await context.params
    const { user, supabase } = await requireAuth(request)

    // Verify user has access to the project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('user_id')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return errorResponses.notFound('Project not found')
    }

    // Check if user is the owner or a member
    const { data: membership } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('member_id', user.id)
      .maybeSingle()

    if (project.user_id !== user.id && !membership) {
      return errorResponses.forbidden('You do not have access to this project')
    }

    // Get all members
    const { data: members, error: membersError } = await supabase
      .from('project_members')
      .select('id, email, role, status, created_at, accepted_at, member_id')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (membersError) {
      console.error('Failed to fetch members:', membersError)
      return errorResponses.internalError('Failed to fetch project members')
    }

    return NextResponse.json({ members })
  } catch (error) {
        const authError = handleAuthError(error)
    if (authError) return authError

    console.error('Unexpected error in GET /api/projects/[projectId]/members:', error)
    return errorResponses.internalError()
  }
}
