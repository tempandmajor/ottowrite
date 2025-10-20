import { z } from 'zod'

/**
 * Validation schemas for webhook endpoints
 * Critical: Prevents webhook replay attacks and unauthorized requests
 */

/**
 * Schema for Stripe webhook validation
 * Note: Actual signature validation happens in the route handler using Stripe SDK
 */
export const stripeWebhookSchema = z.object({
  /** Stripe signature header (required for verification) */
  stripeSignature: z.string().min(1, 'Stripe signature required'),

  /** Raw request body (required for signature verification) */
  rawBody: z.string().min(1, 'Raw body required for signature verification'),
})

export type StripeWebhookInput = z.infer<typeof stripeWebhookSchema>

/**
 * Stripe event types we handle
 */
export const STRIPE_EVENT_TYPES = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
  'customer.created',
  'customer.updated',
  'customer.deleted',
] as const

/**
 * Schema for processed Stripe events (after signature verification)
 */
export const stripeEventSchema = z.object({
  /** Event ID */
  id: z.string(),

  /** Event type */
  type: z.enum(STRIPE_EVENT_TYPES),

  /** Event data */
  data: z.object({
    object: z.record(z.string(), z.unknown()),
  }),

  /** Event created timestamp */
  created: z.number(),

  /** Livemode flag */
  livemode: z.boolean(),
})

export type StripeEventInput = z.infer<typeof stripeEventSchema>

/**
 * Schema for webhook retry attempts
 */
export const webhookRetrySchema = z.object({
  /** Webhook ID */
  webhookId: z.string(),

  /** Retry attempt number (1-5) */
  attempt: z.number().int().min(1).max(5),

  /** Timestamp of previous attempt */
  previousAttempt: z.number().optional(),
})

export type WebhookRetryInput = z.infer<typeof webhookRetrySchema>

/**
 * Webhook security constants
 */
export const WEBHOOK_SECURITY = {
  /** Maximum age of webhook event (5 minutes) */
  MAX_EVENT_AGE_MS: 5 * 60 * 1000,

  /** Maximum retry attempts */
  MAX_RETRIES: 5,

  /** Required headers for webhook requests */
  REQUIRED_HEADERS: {
    STRIPE: ['stripe-signature'],
  },
} as const
