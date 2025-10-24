/**
 * Collaboration Access Check API
 * Verifies if the current user has access to real-time collaboration features
 */

import { NextRequest, NextResponse } from 'next/server'
import {requireAuth, handleAuthError} from '@/lib/api/auth-helpers'
import { requireDefaultRateLimit } from '@/lib/api/rate-limit-helpers'
import { canAccessFeature, type SubscriptionTier, isSubscriptionActive } from '@/lib/stripe/config'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)
    await requireDefaultRateLimit(request, user.id)

    // Get user's subscription tier
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('subscription_tier, subscription_status, subscription_current_period_end')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('[Collaboration Access] Error fetching profile:', profileError)
      return NextResponse.json(
        { error: 'Failed to fetch subscription info', hasAccess: false },
        { status: 500 }
      )
    }

    // Check if subscription is active (includes trialing and expiration check)
    const hasActiveSubscription = isSubscriptionActive(profile)
    const tier = (profile.subscription_tier || 'free') as SubscriptionTier

    // Check if tier has collaboration feature
    const hasCollaboration = canAccessFeature(tier, 'collaboration')

    return NextResponse.json({
      hasAccess: hasActiveSubscription && hasCollaboration,
      tier,
      subscriptionStatus: profile.subscription_status,
      requiresUpgrade: !hasCollaboration,
      minimumTier: 'studio',
    })
  } catch (error) {
        const authError = handleAuthError(error)
    if (authError) return authError

    console.error('[Collaboration Access] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', hasAccess: false },
      { status: 500 }
    )
  }
}
