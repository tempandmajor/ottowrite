import { createClient } from '@/lib/supabase/server'
import { getStripeClient } from '@/lib/stripe/config'
import { errorResponses, successResponse } from '@/lib/api/error-response'
import {requireAuth, handleAuthError} from '@/lib/api/auth-helpers'
import { requireDefaultRateLimit } from '@/lib/api/rate-limit-helpers'
import { logger } from '@/lib/monitoring/structured-logger'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireAuth(request)
  await requireDefaultRateLimit(request, user.id)

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('stripe_customer_id, email')
      .eq('id', user.id)
      .single()

    if (profileError) {
      logger.error('Failed to fetch user profile for customer portal', {
        userId: user.id,
        operation: 'customer_portal:fetch_profile',
      }, profileError)
      return errorResponses.internalError('Failed to access customer portal', {
        details: profileError,
        userId: user.id,
      })
    }

    const stripe = getStripeClient()

    let customerId = profile?.stripe_customer_id ?? null

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile?.email ?? user.email ?? undefined,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id

      await supabase
        .from('user_profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/settings`,
    })

    return successResponse({ url: session.url })
  } catch (error) {
        const authError = handleAuthError(error)
    if (authError) return authError

    logger.error('Failed to create customer portal session', {
      operation: 'customer_portal:create_session',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to open customer portal', { details: error })
  }
}
