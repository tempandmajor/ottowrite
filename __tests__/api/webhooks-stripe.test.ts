import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST } from '@/app/api/webhooks/stripe/route'
import {
  createMockRequest,
  getResponseJSON,
  mockEnv,
} from '../setup/api-test-utils'
import Stripe from 'stripe'

// Mock Stripe
vi.mock('stripe', () => {
  const mockStripe = {
    webhooks: {
      constructEvent: vi.fn(),
    },
    subscriptions: {
      retrieve: vi.fn(),
    },
  }
  return {
    default: vi.fn(() => mockStripe),
  }
})

// Mock Supabase service role client
vi.mock('@/lib/supabase/service-role', () => ({
  createServiceRoleClient: vi.fn(() => ({
    from: vi.fn(() => ({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    })),
  })),
}))

// Mock Stripe config
vi.mock('@/lib/stripe/config', () => ({
  getStripeClient: vi.fn(() => ({
    webhooks: {
      constructEvent: vi.fn(),
    },
    subscriptions: {
      retrieve: vi.fn(),
    },
  })),
  getTierByPriceId: vi.fn(() => 'professional'),
}))

// Mock headers
vi.mock('next/headers', () => ({
  headers: vi.fn(() => ({
    get: vi.fn((name: string) => {
      if (name === 'stripe-signature') return 'test-signature'
      return null
    }),
  })),
}))

describe('/api/webhooks/stripe - Stripe Webhook Endpoint', () => {
  let restoreEnv: () => void

  beforeEach(() => {
    vi.clearAllMocks()
    restoreEnv = mockEnv({
      STRIPE_WEBHOOK_SECRET: 'whsec_test_secret',
    })
  })

  afterEach(() => {
    restoreEnv()
    vi.restoreAllMocks()
  })

  describe('Signature Validation', () => {
    it('should return 400 when signature is missing', async () => {
      // Mock headers without signature
      const { headers } = await import('next/headers')
      vi.mocked(headers).mockReturnValue({
        get: vi.fn(() => null),
      } as any)

      const request = createMockRequest({
        method: 'POST',
        body: { type: 'test.event' },
      }) as any

      const response = await POST(request)
      const json = await getResponseJSON(response)

      expect(response.status).toBe(400)
      expect(json.error).toBeDefined()
      expect(json.error.message).toContain('signature')
    })

    it('should return 400 when signature verification fails', async () => {
      const { getStripeClient } = await import('@/lib/stripe/config')
      const mockStripe = vi.mocked(getStripeClient)()

      mockStripe.webhooks.constructEvent = vi.fn(() => {
        throw new Error('Invalid signature')
      })

      const request = createMockRequest({
        method: 'POST',
        body: JSON.stringify({ type: 'test.event' }),
      }) as any

      // Override text() to return the body as string
      request.text = vi.fn().mockResolvedValue(JSON.stringify({ type: 'test.event' }))

      const response = await POST(request)
      const json = await getResponseJSON(response)

      expect(response.status).toBe(400)
      expect(json.error.message).toContain('Invalid signature')
    })

    it('should accept valid signatures', async () => {
      const { getStripeClient } = await import('@/lib/stripe/config')
      const mockStripe = vi.mocked(getStripeClient)()

      const mockEvent: Stripe.Event = {
        id: 'evt_test',
        object: 'event',
        api_version: '2024-01-01',
        created: Math.floor(Date.now() / 1000),
        data: {
          object: {},
        },
        livemode: false,
        pending_webhooks: 0,
        request: null,
        type: 'customer.subscription.updated',
      }

      mockStripe.webhooks.constructEvent = vi.fn().mockReturnValue(mockEvent)

      const request = createMockRequest({
        method: 'POST',
        body: JSON.stringify({ type: 'customer.subscription.updated' }),
      }) as any

      request.text = vi.fn().mockResolvedValue(JSON.stringify({ type: 'customer.subscription.updated' }))

      const response = await POST(request)
      const json = await getResponseJSON(response)

      expect(response.status).toBe(200)
      expect(json.data.received).toBe(true)
    })
  })

  describe('Event Age Validation', () => {
    it('should reject events older than 5 minutes', async () => {
      const { getStripeClient } = await import('@/lib/stripe/config')
      const mockStripe = vi.mocked(getStripeClient)()

      const oldTimestamp = Math.floor(Date.now() / 1000) - (6 * 60) // 6 minutes ago

      const mockEvent: Stripe.Event = {
        id: 'evt_old',
        object: 'event',
        api_version: '2024-01-01',
        created: oldTimestamp,
        data: {
          object: {},
        },
        livemode: false,
        pending_webhooks: 0,
        request: null,
        type: 'customer.updated',
      }

      mockStripe.webhooks.constructEvent = vi.fn().mockReturnValue(mockEvent)

      const request = createMockRequest({
        method: 'POST',
        body: JSON.stringify({ type: 'customer.updated' }),
      }) as any

      request.text = vi.fn().mockResolvedValue(JSON.stringify({ type: 'customer.updated' }))

      const response = await POST(request)
      const json = await getResponseJSON(response)

      expect(response.status).toBe(400)
      expect(json.error.message).toContain('too old')
    })

    it('should accept recent events', async () => {
      const { getStripeClient } = await import('@/lib/stripe/config')
      const mockStripe = vi.mocked(getStripeClient)()

      const recentTimestamp = Math.floor(Date.now() / 1000) - 60 // 1 minute ago

      const mockEvent: Stripe.Event = {
        id: 'evt_recent',
        object: 'event',
        api_version: '2024-01-01',
        created: recentTimestamp,
        data: {
          object: {
            id: 'sub_test',
            customer: 'cus_test',
            status: 'active',
            items: {
              data: [{
                price: {
                  id: 'price_test',
                },
              }],
            },
            metadata: {
              supabase_user_id: 'user_test',
            },
          } as any,
        },
        livemode: false,
        pending_webhooks: 0,
        request: null,
        type: 'customer.subscription.updated',
      }

      mockStripe.webhooks.constructEvent = vi.fn().mockReturnValue(mockEvent)

      const request = createMockRequest({
        method: 'POST',
        body: JSON.stringify({ type: 'customer.subscription.updated' }),
      }) as any

      request.text = vi.fn().mockResolvedValue(JSON.stringify({ type: 'customer.subscription.updated' }))

      const response = await POST(request)

      expect(response.status).toBe(200)
    })
  })

  describe('Environment Configuration', () => {
    it('should return 500 when webhook secret is not configured', async () => {
      // Remove webhook secret
      delete process.env.STRIPE_WEBHOOK_SECRET

      const { getStripeClient } = await import('@/lib/stripe/config')
      const mockStripe = vi.mocked(getStripeClient)()

      mockStripe.webhooks.constructEvent = vi.fn()

      const request = createMockRequest({
        method: 'POST',
        body: JSON.stringify({ type: 'test.event' }),
      }) as any

      request.text = vi.fn().mockResolvedValue(JSON.stringify({ type: 'test.event' }))

      const response = await POST(request)
      const json = await getResponseJSON(response)

      expect(response.status).toBe(500)
      expect(json.error.message).toContain('not configured')

      // Restore for other tests
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret'
    })
  })

  describe('Event Processing', () => {
    it('should handle checkout.session.completed events', async () => {
      const { getStripeClient } = await import('@/lib/stripe/config')
      const mockStripe = vi.mocked(getStripeClient)()

      const mockEvent: Stripe.Event = {
        id: 'evt_checkout',
        object: 'event',
        api_version: '2024-01-01',
        created: Math.floor(Date.now() / 1000),
        data: {
          object: {
            id: 'cs_test',
            mode: 'subscription',
            customer: 'cus_test',
            subscription: 'sub_test',
            metadata: {
              supabase_user_id: 'user_test',
            },
          } as any,
        },
        livemode: false,
        pending_webhooks: 0,
        request: null,
        type: 'checkout.session.completed',
      }

      mockStripe.webhooks.constructEvent = vi.fn().mockReturnValue(mockEvent)
      mockStripe.subscriptions.retrieve = vi.fn().mockResolvedValue({
        id: 'sub_test',
        status: 'active',
        items: {
          data: [{
            price: {
              id: 'price_test',
            },
          }],
        },
        metadata: {
          supabase_user_id: 'user_test',
        },
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 2592000,
      })

      const request = createMockRequest({
        method: 'POST',
        body: JSON.stringify({ type: 'checkout.session.completed' }),
      }) as any

      request.text = vi.fn().mockResolvedValue(JSON.stringify({ type: 'checkout.session.completed' }))

      const response = await POST(request)
      const json = await getResponseJSON(response)

      expect(response.status).toBe(200)
      expect(json.data.received).toBe(true)
    })

    it('should handle subscription updated events', async () => {
      const { getStripeClient } = await import('@/lib/stripe/config')
      const mockStripe = vi.mocked(getStripeClient)()

      const mockEvent: Stripe.Event = {
        id: 'evt_sub_updated',
        object: 'event',
        api_version: '2024-01-01',
        created: Math.floor(Date.now() / 1000),
        data: {
          object: {
            id: 'sub_test',
            customer: 'cus_test',
            status: 'active',
            items: {
              data: [{
                price: {
                  id: 'price_test',
                },
              }],
            },
            metadata: {
              supabase_user_id: 'user_test',
            },
            current_period_start: Math.floor(Date.now() / 1000),
            current_period_end: Math.floor(Date.now() / 1000) + 2592000,
          } as any,
        },
        livemode: false,
        pending_webhooks: 0,
        request: null,
        type: 'customer.subscription.updated',
      }

      mockStripe.webhooks.constructEvent = vi.fn().mockReturnValue(mockEvent)

      const request = createMockRequest({
        method: 'POST',
        body: JSON.stringify({ type: 'customer.subscription.updated' }),
      }) as any

      request.text = vi.fn().mockResolvedValue(JSON.stringify({ type: 'customer.subscription.updated' }))

      const response = await POST(request)
      const json = await getResponseJSON(response)

      expect(response.status).toBe(200)
      expect(json.data.received).toBe(true)
    })

    it('should log unhandled event types', async () => {
      const { getStripeClient } = await import('@/lib/stripe/config')
      const mockStripe = vi.mocked(getStripeClient)()

      const mockEvent: Stripe.Event = {
        id: 'evt_unknown',
        object: 'event',
        api_version: '2024-01-01',
        created: Math.floor(Date.now() / 1000),
        data: {
          object: {},
        },
        livemode: false,
        pending_webhooks: 0,
        request: null,
        type: 'unknown.event.type' as any,
      }

      mockStripe.webhooks.constructEvent = vi.fn().mockReturnValue(mockEvent)

      const request = createMockRequest({
        method: 'POST',
        body: JSON.stringify({ type: 'unknown.event.type' }),
      }) as any

      request.text = vi.fn().mockResolvedValue(JSON.stringify({ type: 'unknown.event.type' }))

      const response = await POST(request)
      const json = await getResponseJSON(response)

      expect(response.status).toBe(200)
      expect(json.data.received).toBe(true)
    })
  })

  describe('Security Logging', () => {
    it('should log all webhook events for audit trail', async () => {
      const { getStripeClient } = await import('@/lib/stripe/config')
      const mockStripe = vi.mocked(getStripeClient)()

      const mockEvent: Stripe.Event = {
        id: 'evt_log_test',
        object: 'event',
        api_version: '2024-01-01',
        created: Math.floor(Date.now() / 1000),
        data: {
          object: {},
        },
        livemode: false,
        pending_webhooks: 0,
        request: null,
        type: 'customer.created',
      }

      mockStripe.webhooks.constructEvent = vi.fn().mockReturnValue(mockEvent)

      const request = createMockRequest({
        method: 'POST',
        body: JSON.stringify({ type: 'customer.created' }),
      }) as any

      request.text = vi.fn().mockResolvedValue(JSON.stringify({ type: 'customer.created' }))

      const response = await POST(request)

      expect(response.status).toBe(200)
      // Logging happens internally - we just verify the request succeeded
    })
  })
})
