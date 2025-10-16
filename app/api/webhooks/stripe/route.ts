import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getStripeClient } from '@/lib/stripe/config'
import { createClient } from '@/lib/supabase/server'
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

  const supabase = await createClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        if (session.mode === 'subscription' && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string,
            { expand: ['items.data.price'] }
          )

          const priceId = subscription.items.data[0]?.price?.id

          if (priceId) {
            // Update user profile with subscription details
            await supabase
              .from('user_profiles')
              .update({
                stripe_customer_id: session.customer as string,
                stripe_subscription_id: subscription.id,
                stripe_price_id: priceId,
                subscription_status: subscription.status,
                subscription_tier: getPriceIdTier(priceId),
                subscription_current_period_start: new Date(
                  (subscription as any).current_period_start * 1000
                ).toISOString(),
                subscription_current_period_end: new Date(
                  (subscription as any).current_period_end * 1000
                ).toISOString(),
                ai_words_used_this_month: 0,
                ai_words_reset_date: new Date(
                  (subscription as any).current_period_end * 1000
                ).toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('email', session.customer_details?.email)
          }
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const priceId = subscription.items.data[0]?.price?.id

        if (priceId) {
          await supabase
            .from('user_profiles')
            .update({
              stripe_price_id: priceId,
              subscription_status: subscription.status,
              subscription_tier: getPriceIdTier(priceId),
              subscription_current_period_start: new Date(
                (subscription as any).current_period_start * 1000
              ).toISOString(),
              subscription_current_period_end: new Date(
                (subscription as any).current_period_end * 1000
              ).toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', subscription.id)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription

        await supabase
          .from('user_profiles')
          .update({
            subscription_status: 'canceled',
            subscription_tier: 'free',
            stripe_subscription_id: null,
            stripe_price_id: null,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as any

        if (invoice.subscription && typeof invoice.subscription === 'string') {
          // Reset monthly usage on successful payment
          await supabase
            .from('user_profiles')
            .update({
              ai_words_used_this_month: 0,
              ai_words_reset_date: new Date().toISOString(),
              subscription_status: 'active',
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', invoice.subscription)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any

        if (invoice.subscription && typeof invoice.subscription === 'string') {
          await supabase
            .from('user_profiles')
            .update({
              subscription_status: 'past_due',
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', invoice.subscription)
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

// Helper function to map price IDs to subscription tiers
function getPriceIdTier(priceId: string): string {
  const priceMap: Record<string, string> = {
    [process.env.STRIPE_PRICE_HOBBYIST!]: 'hobbyist',
    [process.env.STRIPE_PRICE_PROFESSIONAL!]: 'professional',
    [process.env.STRIPE_PRICE_STUDIO!]: 'studio',
  }
  return priceMap[priceId] || 'free'
}
