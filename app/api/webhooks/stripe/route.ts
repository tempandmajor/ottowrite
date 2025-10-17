import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getStripeClient, getTierByPriceId } from '@/lib/stripe/config'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event

  const stripe = getStripeClient()
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createServiceRoleClient()
  const isoFromUnix = (value?: number | null) =>
    typeof value === 'number' ? new Date(value * 1000).toISOString() : null

  const updateProfile = (
    update: Record<string, unknown>,
    identifiers: {
      userId?: string | null
      subscriptionId?: string | null
      customerId?: string | null
    }
  ) => {
    let query = supabase.from('user_profiles').update(update)

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
            console.warn(
              'checkout.session.completed missing supabase_user_id metadata',
              { sessionId: session.id }
            )
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
            console.error(
              'Failed to retrieve subscription metadata for invoice.payment_succeeded',
              subscriptionError
            )
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
            console.error(
              'Failed to retrieve subscription metadata for invoice.payment_failed',
              subscriptionError
            )
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
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
