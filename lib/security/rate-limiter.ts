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
}

export interface RateLimitConfig {
  max: number // Maximum tokens in bucket
  windowMs: number // Time window in milliseconds
  message?: string // Custom error message
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
 * Token bucket rate limiter
 *
 * @param identifier - Unique identifier (e.g., user ID, IP address)
 * @param config - Rate limit configuration
 * @returns Object with allowed status and remaining tokens
 */
export function rateLimit(
  identifier: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetAt: number; retryAfter?: number } {
  const { max, windowMs } = config
  const now = Date.now()

  // Get or create store for this config
  const storeKey = `${max}-${windowMs}`
  let store = rateLimitStores.get(storeKey)
  if (!store) {
    store = new LRUCache<string, RateLimitEntry>(10000)
    rateLimitStores.set(storeKey, store)
  }

  // Get or create entry for this identifier
  let entry = store.get(identifier)

  if (!entry) {
    // First request
    entry = {
      tokens: max - 1, // Consume one token
      lastRefill: now,
      resetAt: now + windowMs,
    }
    store.set(identifier, entry)
    return {
      allowed: true,
      remaining: entry.tokens,
      resetAt: entry.resetAt,
    }
  }

  // Reset if window has passed
  if (now >= entry.resetAt) {
    entry = {
      tokens: max - 1, // Consume one token
      lastRefill: now,
      resetAt: now + windowMs,
    }
    store.set(identifier, entry)
    return {
      allowed: true,
      remaining: entry.tokens,
      resetAt: entry.resetAt,
    }
  }

  // Check if tokens available
  if (entry.tokens > 0) {
    entry.tokens -= 1
    store.set(identifier, entry)
    return {
      allowed: true,
      remaining: entry.tokens,
      resetAt: entry.resetAt,
    }
  }

  // Rate limit exceeded
  const retryAfter = Math.ceil((entry.resetAt - now) / 1000) // seconds
  return {
    allowed: false,
    remaining: 0,
    resetAt: entry.resetAt,
    retryAfter,
  }
}

/**
 * Predefined rate limit configurations
 */
export const RateLimits = {
  // AI endpoints: 10 requests per minute
  AI_GENERATE: {
    max: 10,
    windowMs: 60 * 1000, // 1 minute
    message: 'AI generation rate limit exceeded. Please wait before trying again.',
  },

  // AI expensive operations: 5 requests per minute
  AI_EXPENSIVE: {
    max: 5,
    windowMs: 60 * 1000,
    message: 'Rate limit exceeded for this operation. Please wait before trying again.',
  },

  // Authentication: 5 attempts per 15 minutes
  AUTH_LOGIN: {
    max: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many login attempts. Please try again later.',
  },

  // Password reset: 3 attempts per hour
  AUTH_PASSWORD_RESET: {
    max: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Too many password reset requests. Please try again later.',
  },

  // General API: 60 requests per minute
  API_GENERAL: {
    max: 60,
    windowMs: 60 * 1000,
    message: 'API rate limit exceeded. Please slow down your requests.',
  },

  // File uploads: 10 per 5 minutes
  FILE_UPLOAD: {
    max: 10,
    windowMs: 5 * 60 * 1000,
    message: 'File upload rate limit exceeded. Please wait before uploading more files.',
  },
} as const

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
