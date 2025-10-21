/**
 * Collaboration Access Check API
 * Verifies if the current user has access to real-time collaboration features
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canAccessFeature, type SubscriptionTier } from '@/lib/stripe/config'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', hasAccess: false },
        { status: 401 }
      )
    }

    // Get user's subscription tier
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('subscription_tier, subscription_status')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('[Collaboration Access] Error fetching profile:', profileError)
      return NextResponse.json(
        { error: 'Failed to fetch subscription info', hasAccess: false },
        { status: 500 }
      )
    }

    // Check if subscription is active
    const isActive = profile.subscription_status === 'active'
    const tier = (profile.subscription_tier || 'free') as SubscriptionTier

    // Check if tier has collaboration feature
    const hasCollaboration = canAccessFeature(tier, 'collaboration')

    return NextResponse.json({
      hasAccess: isActive && hasCollaboration,
      tier,
      subscriptionStatus: profile.subscription_status,
      requiresUpgrade: !hasCollaboration,
      minimumTier: 'studio',
    })
  } catch (error) {
    console.error('[Collaboration Access] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', hasAccess: false },
      { status: 500 }
    )
  }
}
