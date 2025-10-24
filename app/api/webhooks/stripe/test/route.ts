/**
 * Stripe Webhook Test Endpoint
 *
 * This endpoint allows testing webhook event handlers without requiring
 * actual Stripe events or signature verification.
 *
 * ⚠️ ONLY ENABLED IN DEVELOPMENT
 *
 * Usage:
 * POST /api/webhooks/stripe/test?event=checkout.session.completed
 *
 * Query params:
 * - event: The event type to simulate
 * - userId: Optional user ID to use in metadata
 */

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development' },
      { status: 403 }
    )
  }

  const { searchParams } = new URL(request.url)
  const eventType = searchParams.get('event')
  const userId = searchParams.get('userId') || 'test-user-' + Math.random().toString(36).substr(2, 9)

  if (!eventType) {
    return NextResponse.json(
      {
        error: 'Missing event parameter',
        usage: 'POST /api/webhooks/stripe/test?event=checkout.session.completed&userId=optional-user-id',
        availableEvents: [
          'checkout.session.completed',
          'customer.subscription.created',
          'customer.subscription.updated',
          'customer.subscription.deleted',
          'invoice.payment_succeeded',
          'invoice.payment_failed',
        ],
      },
      { status: 400 }
    )
  }

  // Generate mock Stripe event
  const mockEvent = generateMockEvent(eventType, userId)

  if (!mockEvent) {
    return NextResponse.json(
      { error: 'Unsupported event type', eventType },
      { status: 400 }
    )
  }

  // Import the actual webhook handler
  const { POST: webhookHandler } = await import('../route')

  // Create a mock request with the event
  const mockRequest = new Request(new URL('/api/webhooks/stripe', request.url), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'stripe-signature': 'test-signature',
    },
    body: JSON.stringify(mockEvent),
  })

  // Temporarily disable signature verification by setting a test secret
  const originalSecret = process.env.STRIPE_WEBHOOK_SECRET
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'

  try {
    // Call the actual webhook handler
    const response = await webhookHandler(mockRequest as any)
    const result = await response.json()

    // Restore original secret
    process.env.STRIPE_WEBHOOK_SECRET = originalSecret

    return NextResponse.json({
      success: true,
      eventType,
      userId,
      mockEvent,
      webhookResponse: result,
      note: 'This is a simulated event - no actual Stripe data was used',
    })
  } catch (error) {
    // Restore original secret
    process.env.STRIPE_WEBHOOK_SECRET = originalSecret

    return NextResponse.json(
      {
        error: 'Webhook handler failed',
        eventType,
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * Generate mock Stripe events for testing
 */
function generateMockEvent(eventType: string, userId: string): Stripe.Event | null {
  const baseEvent = {
    id: 'evt_test_' + Math.random().toString(36).substr(2, 9),
    object: 'event' as const,
    api_version: '2024-01-01',
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 0,
    request: null,
  }

  const customerId = 'cus_test_' + Math.random().toString(36).substr(2, 9)
  const subscriptionId = 'sub_test_' + Math.random().toString(36).substr(2, 9)
  const priceId = 'price_test_professional'

  switch (eventType) {
    case 'checkout.session.completed':
      return {
        ...baseEvent,
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_' + Math.random().toString(36).substr(2, 9),
            object: 'checkout.session',
            mode: 'subscription',
            customer: customerId,
            subscription: subscriptionId,
            metadata: {
              supabase_user_id: userId,
              subscription_tier: 'professional',
            },
            status: 'complete',
          } as any,
        },
      }

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      return {
        ...baseEvent,
        type: eventType as any,
        data: {
          object: {
            id: subscriptionId,
            object: 'subscription',
            customer: customerId,
            status: 'active',
            items: {
              object: 'list',
              data: [
                {
                  id: 'si_test',
                  price: {
                    id: priceId,
                    object: 'price',
                    currency: 'usd',
                    unit_amount: 2400,
                  },
                },
              ],
            },
            metadata: {
              supabase_user_id: userId,
              subscription_tier: 'professional',
            },
            current_period_start: Math.floor(Date.now() / 1000),
            current_period_end: Math.floor(Date.now() / 1000) + 2592000, // +30 days
          } as any,
        },
      }

    case 'customer.subscription.deleted':
      return {
        ...baseEvent,
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: subscriptionId,
            object: 'subscription',
            customer: customerId,
            status: 'canceled',
            items: {
              object: 'list',
              data: [
                {
                  id: 'si_test',
                  price: {
                    id: priceId,
                  },
                },
              ],
            },
            metadata: {
              supabase_user_id: userId,
            },
            canceled_at: Math.floor(Date.now() / 1000),
          } as any,
        },
      }

    case 'invoice.payment_succeeded':
      return {
        ...baseEvent,
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            id: 'in_test_' + Math.random().toString(36).substr(2, 9),
            object: 'invoice',
            customer: customerId,
            subscription: subscriptionId,
            status: 'paid',
            amount_paid: 2400,
            currency: 'usd',
            paid: true,
          } as any,
        },
      }

    case 'invoice.payment_failed':
      return {
        ...baseEvent,
        type: 'invoice.payment_failed',
        data: {
          object: {
            id: 'in_test_' + Math.random().toString(36).substr(2, 9),
            object: 'invoice',
            customer: customerId,
            subscription: subscriptionId,
            status: 'open',
            amount_due: 2400,
            currency: 'usd',
            paid: false,
            attempt_count: 1,
          } as any,
        },
      }

    default:
      return null
  }
}

/**
 * GET endpoint for usage instructions
 */
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development' },
      { status: 403 }
    )
  }

  return NextResponse.json({
    message: 'Stripe Webhook Test Endpoint',
    usage: 'POST /api/webhooks/stripe/test?event={eventType}&userId={optional}',
    availableEvents: [
      {
        event: 'checkout.session.completed',
        description: 'Simulates a successful checkout session with subscription',
      },
      {
        event: 'customer.subscription.created',
        description: 'Simulates a new subscription being created',
      },
      {
        event: 'customer.subscription.updated',
        description: 'Simulates a subscription update (upgrade/downgrade)',
      },
      {
        event: 'customer.subscription.deleted',
        description: 'Simulates a subscription cancellation',
      },
      {
        event: 'invoice.payment_succeeded',
        description: 'Simulates a successful subscription payment',
      },
      {
        event: 'invoice.payment_failed',
        description: 'Simulates a failed subscription payment',
      },
    ],
    examples: [
      'POST /api/webhooks/stripe/test?event=checkout.session.completed',
      'POST /api/webhooks/stripe/test?event=customer.subscription.updated&userId=my-user-id',
      'POST /api/webhooks/stripe/test?event=invoice.payment_succeeded',
    ],
    note: 'This endpoint is only available in development mode. It bypasses signature verification and uses mock data.',
  })
}
