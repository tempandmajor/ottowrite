import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getAllowedPriceIds,
  getStripeClient,
  getTierByPriceId,
} from '@/lib/stripe/config'
import { errorResponses, successResponse } from '@/lib/api/error-response'
import {requireAuth, handleAuthError} from '@/lib/api/auth-helpers'
import { requireDefaultRateLimit } from '@/lib/api/rate-limit-helpers'
import { logger } from '@/lib/monitoring/structured-logger'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)
  await requireDefaultRateLimit(request, user.id)

    const body = await request.json()
    const priceId = typeof body.priceId === 'string' ? body.priceId : null

    if (!priceId) {
      return errorResponses.badRequest('Price ID required', { userId: user.id })
    }

    const allowedPriceIds = getAllowedPriceIds()
    if (!allowedPriceIds.includes(priceId)) {
      return errorResponses.badRequest('Invalid price ID', { userId: user.id })
    }

    const subscriptionTier = getTierByPriceId(priceId)
    if (!subscriptionTier) {
      return errorResponses.badRequest('Subscription tier not found for price', { userId: user.id })
    }

    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('stripe_customer_id, email')
      .eq('id', user.id)
      .single()

    let customerId = profile?.stripe_customer_id

    const stripe = getStripeClient()
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email!,
        metadata: {
          supabase_user_id: user.id,
        },
      })
      customerId = customer.id

      await supabase
        .from('user_profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/pricing`,
      metadata: {
        supabase_user_id: user.id,
        subscription_tier: subscriptionTier,
      },
      subscription_data: {
        trial_period_days: 7,
        metadata: {
          supabase_user_id: user.id,
          subscription_tier: subscriptionTier,
        },
      },
    })

    return successResponse({ url: session.url })
  } catch (error) {
        const authError = handleAuthError(error)
    if (authError) return authError

    logger.error('Checkout session error', {
      operation: 'checkout:create_session',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to create checkout session', {
      details: error,
    })
  }
}
