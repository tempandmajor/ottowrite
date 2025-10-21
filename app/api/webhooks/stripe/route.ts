import { NextRequest } from 'next/server'
import { headers } from 'next/headers'
import { getStripeClient, getTierByPriceId } from '@/lib/stripe/config'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import Stripe from 'stripe'
import { errorResponses, successResponse } from '@/lib/api/error-response'
import { logger } from '@/lib/monitoring/structured-logger'
import { WEBHOOK_SECURITY } from '@/lib/validation/schemas/webhooks'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  // Security: Validate required headers
  if (!signature) {
    logger.warn('Webhook missing signature', {
      operation: 'webhook:stripe:missing_signature',
    })
    return errorResponses.badRequest('No signature provided')
  }

  // Security: Validate webhook secret is configured
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    logger.error('STRIPE_WEBHOOK_SECRET not configured', {
      operation: 'webhook:stripe:config_error',
    })
    return errorResponses.internalError('Webhook not configured')
  }

  let event: Stripe.Event

  const stripe = getStripeClient()
  try {
    // Security: Verify webhook signature to prevent replay attacks
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    logger.error('Webhook signature verification failed', {
      operation: 'webhook:stripe:verify_failed',
    }, err instanceof Error ? err : undefined)
    return errorResponses.badRequest('Invalid signature')
  }

  // Security: Check event age to prevent replay attacks
  if (typeof event.created === 'number') {
    const eventAge = Date.now() - event.created * 1000
    if (eventAge > WEBHOOK_SECURITY.MAX_EVENT_AGE_MS) {
      logger.warn('Webhook event too old', {
        operation: 'webhook:stripe:event_too_old',
        eventId: event.id,
        eventAge,
        maxAge: WEBHOOK_SECURITY.MAX_EVENT_AGE_MS,
      })
      return errorResponses.badRequest('Event too old')
    }
  } else {
    logger.warn('Webhook event missing created timestamp', {
      operation: 'webhook:stripe:missing_created',
      eventId: event.id,
      eventType: event.type,
    })
  }

  // Security: Log event type for monitoring
  logger.info('Processing Stripe webhook', {
    operation: 'webhook:stripe:process',
    eventType: event.type,
    eventId: event.id,
  })

  const supabase = createServiceRoleClient()
  const isoFromUnix = (value?: number | null) =>
    typeof value === 'number' ? new Date(value * 1000).toISOString() : null

  const updateProfile = async (
    update: Record<string, unknown>,
    identifiers: {
      userId?: string | null
      subscriptionId?: string | null
      customerId?: string | null
    }
  ) => {
    let query = supabase.from('user_profiles').update(update as Record<string, any>)

    if (identifiers.userId) {
      query = query.eq('id', identifiers.userId)
    } else if (identifiers.subscriptionId) {
      query = query.eq('stripe_subscription_id', identifiers.subscriptionId)
    } else if (identifiers.customerId) {
      query = query.eq('stripe_customer_id', identifiers.customerId)
    } else {
      throw new Error('No identifier provided for profile update')
    }

    return query
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        if (session.mode === 'subscription' && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string,
            { expand: ['items.data.price'] }
          ) as Stripe.Subscription

          const priceId = subscription.items.data[0]?.price?.id ?? null
          const subscriptionTier =
            getTierByPriceId(priceId) ??
            ((subscription.metadata?.subscription_tier as string | undefined) ??
              (session.metadata?.subscription_tier as string | undefined) ??
              'free')
          const supabaseUserId =
            (session.metadata?.supabase_user_id as string | undefined) ??
            (subscription.metadata?.supabase_user_id as string | undefined)
          const stripeCustomerId =
            typeof session.customer === 'string'
              ? session.customer
              : session.customer?.id ?? null

          if (!supabaseUserId) {
            logger.warn('Webhook missing supabase_user_id', {
              operation: 'webhook:stripe:checkout_completed',
              sessionId: session.id,
            })
            break
          }

          const { error } = await updateProfile(
            {
              stripe_customer_id: stripeCustomerId,
              stripe_subscription_id: subscription.id,
              stripe_price_id: priceId,
              subscription_status: subscription.status,
              subscription_tier: subscriptionTier,
              subscription_current_period_start: isoFromUnix(
                (subscription as any).current_period_start
              ),
              subscription_current_period_end: isoFromUnix(
                (subscription as any).current_period_end
              ),
              ai_words_used_this_month: 0,
              ai_words_reset_date: isoFromUnix(
                (subscription as any).current_period_end
              ),
              updated_at: new Date().toISOString(),
            },
            {
              userId: supabaseUserId,
              subscriptionId: subscription.id,
              customerId: stripeCustomerId,
            }
          )

          if (error) {
            throw error
          }
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const priceId = subscription.items.data[0]?.price?.id ?? null
        const subscriptionTier =
          getTierByPriceId(priceId) ??
          (subscription.metadata?.subscription_tier as string | undefined) ??
          'free'
        const supabaseUserId =
          (subscription.metadata?.supabase_user_id as string | undefined) ??
          null
        const stripeCustomerId =
          typeof subscription.customer === 'string'
            ? subscription.customer
            : subscription.customer?.id ?? null

        const { error } = await updateProfile(
          {
            stripe_price_id: priceId,
            subscription_status: subscription.status,
            subscription_tier: subscriptionTier,
            subscription_current_period_start: isoFromUnix(
              (subscription as any).current_period_start
            ),
            subscription_current_period_end: isoFromUnix(
              (subscription as any).current_period_end
            ),
            updated_at: new Date().toISOString(),
          },
          {
            userId: supabaseUserId,
            subscriptionId: subscription.id,
            customerId: stripeCustomerId,
          }
        )

        if (error) {
          throw error
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription

        const supabaseUserId =
          (subscription.metadata?.supabase_user_id as string | undefined) ??
          null
        const stripeCustomerId =
          typeof subscription.customer === 'string'
            ? subscription.customer
            : subscription.customer?.id ?? null

        const { error } = await updateProfile(
          {
            subscription_status: 'canceled',
            subscription_tier: 'free',
            stripe_subscription_id: null,
            stripe_price_id: null,
            updated_at: new Date().toISOString(),
          },
          {
            userId: supabaseUserId,
            subscriptionId: subscription.id,
            customerId: stripeCustomerId,
          }
        )

        if (error) {
          throw error
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId =
          typeof (invoice as any).subscription === 'string'
            ? (invoice as any).subscription
            : (invoice as any).subscription?.id

        if (subscriptionId) {
          let supabaseUserId: string | null = null

          try {
            const subscription = await stripe.subscriptions.retrieve(
              subscriptionId,
              { expand: ['items.data.price'] }
            )
            supabaseUserId =
              (subscription.metadata?.supabase_user_id as string | undefined) ??
              null
          } catch (subscriptionError) {
            logger.error('Failed to retrieve subscription for invoice.payment_succeeded', {
              operation: 'webhook:stripe:invoice_payment_succeeded',
              subscriptionId,
            }, subscriptionError instanceof Error ? subscriptionError : undefined)
          }

          const stripeCustomerId =
            typeof invoice.customer === 'string'
              ? invoice.customer
              : invoice.customer?.id ?? null

          const { error } = await updateProfile(
            {
              ai_words_used_this_month: 0,
              ai_words_reset_date: new Date().toISOString(),
              subscription_status: 'active',
              updated_at: new Date().toISOString(),
            },
            {
              userId: supabaseUserId,
              subscriptionId,
              customerId: stripeCustomerId,
            }
          )

          if (error) {
            throw error
          }
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId =
          typeof (invoice as any).subscription === 'string'
            ? (invoice as any).subscription
            : (invoice as any).subscription?.id

        if (subscriptionId) {
          let supabaseUserId: string | null = null

          try {
            const subscription = await stripe.subscriptions.retrieve(
              subscriptionId
            )
            supabaseUserId =
              (subscription.metadata?.supabase_user_id as string | undefined) ??
              null
          } catch (subscriptionError) {
            logger.error('Failed to retrieve subscription for invoice.payment_failed', {
              operation: 'webhook:stripe:invoice_payment_failed',
              subscriptionId,
            }, subscriptionError instanceof Error ? subscriptionError : undefined)
          }

          const stripeCustomerId =
            typeof invoice.customer === 'string'
              ? invoice.customer
              : invoice.customer?.id ?? null

          const { error } = await updateProfile(
            {
              subscription_status: 'past_due',
              updated_at: new Date().toISOString(),
            },
            {
              userId: supabaseUserId,
              subscriptionId,
              customerId: stripeCustomerId,
            }
          )

          if (error) {
            throw error
          }
        }
        break
      }

      default:
        logger.info('Unhandled webhook event type', {
          operation: 'webhook:stripe',
          eventType: event.type,
        })
    }

    return successResponse({ received: true })
  } catch (error) {
    logger.error('Webhook handler error', {
      operation: 'webhook:stripe:handler',
      eventType: event.type,
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Webhook handler failed', { details: error })
  }
}
