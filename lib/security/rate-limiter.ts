/**
 * Rate Limiter using in-memory token bucket algorithm
 *
 * For serverless/edge environments without Redis.
 * Uses LRU cache with automatic cleanup of expired entries.
 */

interface RateLimitEntry {
  tokens: number
  lastRefill: number
  resetAt: number
  burstTokens?: number // Additional burst capacity
}

export interface RateLimitConfig {
  max: number // Maximum tokens in bucket
  windowMs: number // Time window in milliseconds
  message?: string // Custom error message
  burst?: number // Additional burst capacity (e.g., 2x normal rate)
  costPerRequest?: number // Token cost per request (default: 1)
}

// LRU cache for rate limit data
class LRUCache<K, V> {
  private cache = new Map<K, V>()
  private maxSize: number

  constructor(maxSize: number = 10000) {
    this.maxSize = maxSize
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key)
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key)
      this.cache.set(key, value)
    }
    return value
  }

  set(key: K, value: V): void {
    // Remove if exists (will re-add at end)
    this.cache.delete(key)

    // Remove oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      if (firstKey !== undefined) {
        this.cache.delete(firstKey)
      }
    }

    this.cache.set(key, value)
  }

  delete(key: K): void {
    this.cache.delete(key)
  }

  cleanup(isExpired: (value: V) => boolean): void {
    const keysToDelete: K[] = []
    for (const [key, value] of this.cache.entries()) {
      if (isExpired(value)) {
        keysToDelete.push(key)
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key))
  }
}

// Global rate limit stores
const rateLimitStores = new Map<string, LRUCache<string, RateLimitEntry>>()

// Cleanup interval: remove expired entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const store of rateLimitStores.values()) {
    store.cleanup((entry) => now > entry.resetAt)
  }
}, 5 * 60 * 1000)

/**
 * Token bucket rate limiter with burst capacity support
 *
 * @param identifier - Unique identifier (e.g., user ID, IP address)
 * @param config - Rate limit configuration
 * @returns Object with allowed status and remaining tokens
 */
export function rateLimit(
  identifier: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetAt: number; retryAfter?: number; burst?: boolean } {
  const { max, windowMs, burst = 0, costPerRequest = 1 } = config
  const now = Date.now()
  const totalCapacity = max + burst

  // Get or create store for this config
  const storeKey = `${max}-${windowMs}-${burst}`
  let store = rateLimitStores.get(storeKey)
  if (!store) {
    store = new LRUCache<string, RateLimitEntry>(10000)
    rateLimitStores.set(storeKey, store)
  }

  // Get or create entry for this identifier
  let entry = store.get(identifier)

  if (!entry) {
    // First request - start with full capacity
    entry = {
      tokens: max - costPerRequest,
      burstTokens: burst,
      lastRefill: now,
      resetAt: now + windowMs,
    }
    store.set(identifier, entry)
    return {
      allowed: true,
      remaining: entry.tokens + (entry.burstTokens || 0),
      resetAt: entry.resetAt,
      burst: false,
    }
  }

  // Reset if window has passed
  if (now >= entry.resetAt) {
    entry = {
      tokens: max - costPerRequest,
      burstTokens: burst,
      lastRefill: now,
      resetAt: now + windowMs,
    }
    store.set(identifier, entry)
    return {
      allowed: true,
      remaining: entry.tokens + (entry.burstTokens || 0),
      resetAt: entry.resetAt,
      burst: false,
    }
  }

  // Try to consume from normal tokens first
  if (entry.tokens >= costPerRequest) {
    entry.tokens -= costPerRequest
    store.set(identifier, entry)
    return {
      allowed: true,
      remaining: entry.tokens + (entry.burstTokens || 0),
      resetAt: entry.resetAt,
      burst: false,
    }
  }

  // Try to consume from burst tokens if normal tokens exhausted
  if (burst > 0 && (entry.burstTokens || 0) >= costPerRequest) {
    entry.burstTokens = (entry.burstTokens || burst) - costPerRequest
    store.set(identifier, entry)
    return {
      allowed: true,
      remaining: entry.tokens + (entry.burstTokens || 0),
      resetAt: entry.resetAt,
      burst: true, // Indicate this request used burst capacity
    }
  }

  // Rate limit exceeded - no tokens left (normal or burst)
  const retryAfter = Math.ceil((entry.resetAt - now) / 1000) // seconds
  return {
    allowed: false,
    remaining: 0,
    resetAt: entry.resetAt,
    retryAfter,
  }
}

/**
 * Predefined rate limit configurations (Production-Ready)
 *
 * Updated for launch with:
 * - Higher limits to accommodate real user traffic
 * - Burst allowances for occasional spikes
 * - Differentiated costs for expensive operations
 */
export const RateLimits = {
  // AI endpoints: 20 requests per minute (2x increase) + 10 burst
  // Allows sustained usage with occasional burst for better UX
  AI_GENERATE: {
    max: 20,
    windowMs: 60 * 1000, // 1 minute
    burst: 10, // Allow up to 30 requests in a burst
    message: 'AI generation rate limit exceeded. Please wait before trying again.',
  },

  // AI expensive operations (ensemble, complex analysis): 10 requests per minute + 5 burst
  // These consume more AI quota per request
  AI_EXPENSIVE: {
    max: 10,
    windowMs: 60 * 1000,
    burst: 5, // Allow up to 15 in a burst
    costPerRequest: 3, // Costs 3 tokens per request
    message: 'Rate limit exceeded for this operation. Please wait before trying again.',
  },

  // Authentication: 10 attempts per 15 minutes (2x increase) + 5 burst
  // More forgiving for legitimate users who mistype passwords
  AUTH_LOGIN: {
    max: 10,
    windowMs: 15 * 60 * 1000, // 15 minutes
    burst: 5, // Allow up to 15 attempts in edge cases
    message: 'Too many login attempts. Please try again later.',
  },

  // Password reset: 5 attempts per hour (increased from 3) + 2 burst
  AUTH_PASSWORD_RESET: {
    max: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
    burst: 2, // Allow up to 7 in emergencies
    message: 'Too many password reset requests. Please try again later.',
  },

  // General API: 100 requests per minute (increased from 60) + 50 burst
  // Supports interactive usage with autosave and real-time features
  API_GENERAL: {
    max: 100,
    windowMs: 60 * 1000,
    burst: 50, // Allow up to 150 requests/min in short bursts
    message: 'API rate limit exceeded. Please slow down your requests.',
  },

  // File uploads: 20 per 5 minutes (2x increase) + 10 burst
  // Allows batch uploads while preventing abuse
  FILE_UPLOAD: {
    max: 20,
    windowMs: 5 * 60 * 1000,
    burst: 10, // Allow up to 30 uploads in a batch
    message: 'File upload rate limit exceeded. Please wait before uploading more files.',
  },

  // Document autosave: 120 per minute + 60 burst
  // Very high limit for seamless autosave experience
  DOCUMENT_SAVE: {
    max: 120,
    windowMs: 60 * 1000,
    burst: 60, // Allow up to 180 saves/min during heavy editing
    message: 'Too many document saves. Please slow down.',
  },

  // Search/query operations: 60 per minute + 30 burst
  SEARCH: {
    max: 60,
    windowMs: 60 * 1000,
    burst: 30,
    message: 'Search rate limit exceeded. Please wait before searching again.',
  },

  // Email sending: 10 per hour per user + 5 burst
  // Prevents email spam while allowing legitimate bulk operations
  EMAIL_SEND: {
    max: 10,
    windowMs: 60 * 60 * 1000,
    burst: 5,
    message: 'Email rate limit exceeded. Please wait before sending more emails.',
  },

  // Webhook delivery: 1000 per hour (high for external integrations)
  WEBHOOK: {
    max: 1000,
    windowMs: 60 * 60 * 1000,
    burst: 200, // Allow up to 1200/hour in bursts
    message: 'Webhook rate limit exceeded.',
  },
} as const

/**
 * Get current rate limit status WITHOUT consuming tokens
 *
 * This is a read-only check used for adding rate limit headers to responses.
 * Unlike rateLimit(), this does NOT decrement the token count.
 *
 * @param identifier - Unique identifier (e.g., user ID, IP address)
 * @param config - Rate limit configuration
 * @returns Current status without consuming tokens
 */
export function getRateLimitStatus(
  identifier: string,
  config: RateLimitConfig
): { remaining: number; resetAt: number; allowed: boolean } {
  const { max, windowMs, burst = 0 } = config
  const now = Date.now()

  // Get store for this config
  const storeKey = `${max}-${windowMs}-${burst}`
  const store = rateLimitStores.get(storeKey)

  if (!store) {
    // No store yet - full capacity available
    return {
      remaining: max + burst,
      resetAt: now + windowMs,
      allowed: true,
    }
  }

  // Get entry for this identifier
  const entry = store.get(identifier)

  if (!entry) {
    // No entry yet - full capacity available
    return {
      remaining: max + burst,
      resetAt: now + windowMs,
      allowed: true,
    }
  }

  // Window has expired - would reset to full capacity on next request
  if (now >= entry.resetAt) {
    return {
      remaining: max + burst,
      resetAt: now + windowMs,
      allowed: true,
    }
  }

  // Return current state WITHOUT modifying it
  const totalRemaining = entry.tokens + (entry.burstTokens || 0)
  return {
    remaining: Math.max(0, totalRemaining),
    resetAt: entry.resetAt,
    allowed: totalRemaining >= (config.costPerRequest || 1),
  }
}

/**
 * Get client identifier from request
 * Uses user ID if authenticated, otherwise falls back to IP address
 */
export function getClientIdentifier(
  request: Request,
  userId?: string
): string {
  if (userId) {
    return `user:${userId}`
  }

  // Try to get IP from various headers (Vercel, Cloudflare, etc.)
  const headers = request.headers
  const forwardedFor = headers.get('x-forwarded-for')
  const realIp = headers.get('x-real-ip')
  const cfConnectingIp = headers.get('cf-connecting-ip')

  const ip = cfConnectingIp || realIp || forwardedFor?.split(',')[0] || 'unknown'
  return `ip:${ip}`
}

/**
 * Clear rate limit for a specific identifier (useful for testing)
 */
export function clearRateLimit(identifier: string, config: RateLimitConfig): void {
  const storeKey = `${config.max}-${config.windowMs}`
  const store = rateLimitStores.get(storeKey)
  if (store) {
    store.delete(identifier)
  }
}
