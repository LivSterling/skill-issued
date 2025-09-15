import { NextRequest, NextResponse } from 'next/server'

// ============================================================================
// RATE LIMIT CONFIGURATION
// ============================================================================

export interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  keyGenerator?: (request: NextRequest) => string // Custom key generator
  skipSuccessfulRequests?: boolean // Don't count successful requests
  skipFailedRequests?: boolean // Don't count failed requests
  message?: string // Custom error message
  standardHeaders?: boolean // Add standard rate limit headers
  legacyHeaders?: boolean // Add legacy X-RateLimit headers
}

// Default configurations for different endpoints
export const RATE_LIMIT_CONFIGS = {
  // RAWG API limits (external API protection)
  RAWG_API: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 requests per minute (conservative)
    message: 'Too many requests to game API, please try again later.',
    standardHeaders: true,
    legacyHeaders: true
  },
  
  // User-specific endpoints
  USER_ACTIONS: {
    windowMs: 60 * 1000, // 1 minute  
    maxRequests: 60, // 60 requests per minute per user
    message: 'Too many user actions, please slow down.',
    standardHeaders: true
  },
  
  // Search endpoints (more restrictive)
  SEARCH: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20, // 20 searches per minute
    message: 'Too many search requests, please wait before searching again.',
    standardHeaders: true
  },
  
  // General API endpoints
  GENERAL: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 1000, // 1000 requests per 15 minutes
    message: 'Too many requests, please try again later.',
    standardHeaders: true
  }
} as const

// ============================================================================
// IN-MEMORY RATE LIMIT STORE
// ============================================================================

interface RateLimitEntry {
  count: number
  resetTime: number
  firstRequest: number
}

class InMemoryRateLimitStore {
  private store = new Map<string, RateLimitEntry>()
  private cleanupInterval: NodeJS.Timeout

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 5 * 60 * 1000)
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key)
      }
    }
  }

  increment(key: string, windowMs: number): RateLimitEntry {
    const now = Date.now()
    const existing = this.store.get(key)

    if (!existing || now > existing.resetTime) {
      // Create new entry or reset expired entry
      const entry: RateLimitEntry = {
        count: 1,
        resetTime: now + windowMs,
        firstRequest: now
      }
      this.store.set(key, entry)
      return entry
    }

    // Increment existing entry
    existing.count++
    this.store.set(key, existing)
    return existing
  }

  get(key: string): RateLimitEntry | undefined {
    const entry = this.store.get(key)
    if (entry && Date.now() > entry.resetTime) {
      this.store.delete(key)
      return undefined
    }
    return entry
  }

  reset(key: string): void {
    this.store.delete(key)
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    this.store.clear()
  }
}

// Global store instance
const globalStore = new InMemoryRateLimitStore()

// ============================================================================
// KEY GENERATORS
// ============================================================================

/**
 * Generate rate limit key based on IP address
 */
export function generateIPKey(request: NextRequest, prefix: string = 'ip'): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : 
             request.headers.get('x-real-ip') || 
             request.ip || 
             'unknown'
  return `${prefix}:${ip}`
}

/**
 * Generate rate limit key based on user ID (requires authentication)
 */
export function generateUserKey(userId: string, prefix: string = 'user'): string {
  return `${prefix}:${userId}`
}

/**
 * Generate rate limit key based on API key
 */
export function generateAPIKey(apiKey: string, prefix: string = 'api'): string {
  // Hash the API key for privacy
  const hash = Buffer.from(apiKey).toString('base64').slice(0, 8)
  return `${prefix}:${hash}`
}

/**
 * Generate rate limit key for RAWG API calls
 */
export function generateRAWGKey(request: NextRequest): string {
  // Combine IP and endpoint for RAWG rate limiting
  const ip = generateIPKey(request, '')
  const pathname = new URL(request.url).pathname
  return `rawg:${ip}:${pathname}`
}

// ============================================================================
// RATE LIMIT MIDDLEWARE
// ============================================================================

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
  retryAfter?: number
}

/**
 * Core rate limiting function
 */
export function rateLimit(
  key: string, 
  config: RateLimitConfig,
  store: InMemoryRateLimitStore = globalStore
): RateLimitResult {
  const entry = store.increment(key, config.windowMs)
  const limit = config.maxRequests
  const remaining = Math.max(0, limit - entry.count)
  const reset = Math.ceil(entry.resetTime / 1000) // Unix timestamp
  const success = entry.count <= limit

  const result: RateLimitResult = {
    success,
    limit,
    remaining,
    reset
  }

  if (!success) {
    result.retryAfter = Math.ceil((entry.resetTime - Date.now()) / 1000)
  }

  return result
}

/**
 * Rate limit middleware for Next.js API routes
 */
export function createRateLimitMiddleware(config: RateLimitConfig) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    // Generate rate limit key
    const key = config.keyGenerator ? 
      config.keyGenerator(request) : 
      generateIPKey(request)

    // Check rate limit
    const result = rateLimit(key, config)

    // Add rate limit headers
    const headers: Record<string, string> = {}

    if (config.standardHeaders) {
      headers['RateLimit-Limit'] = result.limit.toString()
      headers['RateLimit-Remaining'] = result.remaining.toString()
      headers['RateLimit-Reset'] = result.reset.toString()
    }

    if (config.legacyHeaders) {
      headers['X-RateLimit-Limit'] = result.limit.toString()
      headers['X-RateLimit-Remaining'] = result.remaining.toString()
      headers['X-RateLimit-Reset'] = result.reset.toString()
    }

    if (!result.success) {
      if (result.retryAfter) {
        headers['Retry-After'] = result.retryAfter.toString()
      }

      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: config.message || 'Too many requests',
          retryAfter: result.retryAfter,
          limit: result.limit,
          reset: result.reset
        },
        {
          status: 429,
          headers
        }
      )
    }

    // Rate limit passed - return null to continue
    return null
  }
}

// ============================================================================
// SPECIALIZED RATE LIMITERS
// ============================================================================

/**
 * Rate limiter for RAWG API endpoints
 */
export const rawgRateLimit = createRateLimitMiddleware({
  ...RATE_LIMIT_CONFIGS.RAWG_API,
  keyGenerator: generateRAWGKey
})

/**
 * Rate limiter for user-specific actions
 */
export function createUserRateLimit(userId: string) {
  return createRateLimitMiddleware({
    ...RATE_LIMIT_CONFIGS.USER_ACTIONS,
    keyGenerator: () => generateUserKey(userId)
  })
}

/**
 * Rate limiter for search endpoints
 */
export const searchRateLimit = createRateLimitMiddleware({
  ...RATE_LIMIT_CONFIGS.SEARCH,
  keyGenerator: (request) => generateIPKey(request, 'search')
})

/**
 * General rate limiter for API endpoints
 */
export const generalRateLimit = createRateLimitMiddleware({
  ...RATE_LIMIT_CONFIGS.GENERAL,
  keyGenerator: generateIPKey
})

// ============================================================================
// RATE LIMIT UTILITIES
// ============================================================================

/**
 * Check if request should be rate limited
 */
export function shouldRateLimit(request: NextRequest): boolean {
  // Skip rate limiting in development
  if (process.env.NODE_ENV === 'development') {
    return false
  }

  // Skip rate limiting for certain user agents (health checks, etc.)
  const userAgent = request.headers.get('user-agent') || ''
  const skipUserAgents = ['health-check', 'monitor', 'uptime']
  
  return !skipUserAgents.some(agent => 
    userAgent.toLowerCase().includes(agent)
  )
}

/**
 * Get rate limit info without incrementing
 */
export function getRateLimitInfo(key: string): RateLimitResult | null {
  const entry = globalStore.get(key)
  if (!entry) return null

  return {
    success: true,
    limit: 0, // Would need to be passed in
    remaining: 0, // Would need to be calculated
    reset: Math.ceil(entry.resetTime / 1000)
  }
}

/**
 * Reset rate limit for a specific key
 */
export function resetRateLimit(key: string): void {
  globalStore.reset(key)
}

/**
 * Add rate limit headers to existing response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult,
  config: RateLimitConfig
): NextResponse {
  if (config.standardHeaders) {
    response.headers.set('RateLimit-Limit', result.limit.toString())
    response.headers.set('RateLimit-Remaining', result.remaining.toString())
    response.headers.set('RateLimit-Reset', result.reset.toString())
  }

  if (config.legacyHeaders) {
    response.headers.set('X-RateLimit-Limit', result.limit.toString())
    response.headers.set('X-RateLimit-Remaining', result.remaining.toString())
    response.headers.set('X-RateLimit-Reset', result.reset.toString())
  }

  return response
}

// ============================================================================
// ENHANCED RAWG SERVICE RATE LIMITING
// ============================================================================

/**
 * Rate-limited RAWG API caller with exponential backoff
 */
export class RateLimitedRAWGCaller {
  private lastCallTime = 0
  private minInterval = 1000 / 30 // 30 calls per second max
  private backoffMultiplier = 1
  private maxBackoff = 30000 // 30 seconds max backoff

  async callWithRateLimit<T>(apiCall: () => Promise<T>): Promise<T> {
    const now = Date.now()
    const timeSinceLastCall = now - this.lastCallTime
    const requiredWait = this.minInterval * this.backoffMultiplier

    if (timeSinceLastCall < requiredWait) {
      const waitTime = requiredWait - timeSinceLastCall
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }

    try {
      this.lastCallTime = Date.now()
      const result = await apiCall()
      
      // Success - reset backoff
      this.backoffMultiplier = 1
      return result
    } catch (error: any) {
      // Check if it's a rate limit error
      if (error?.status === 429 || error?.message?.includes('rate limit')) {
        // Exponential backoff
        this.backoffMultiplier = Math.min(
          this.backoffMultiplier * 2,
          this.maxBackoff / this.minInterval
        )
        
        console.warn(`RAWG API rate limited, backing off by ${this.backoffMultiplier}x`)
      }
      
      throw error
    }
  }
}

// Global instance
export const rateLimitedRAWGCaller = new RateLimitedRAWGCaller()

// ============================================================================
// EXPORTS
// ============================================================================

export const rateLimitMiddleware = {
  // Core functions
  rateLimit,
  createRateLimitMiddleware,
  
  // Specialized limiters
  rawgRateLimit,
  createUserRateLimit,
  searchRateLimit,
  generalRateLimit,
  
  // Utilities
  shouldRateLimit,
  getRateLimitInfo,
  resetRateLimit,
  addRateLimitHeaders,
  
  // Key generators
  generateIPKey,
  generateUserKey,
  generateAPIKey,
  generateRAWGKey,
  
  // Enhanced caller
  rateLimitedRAWGCaller,
  
  // Store
  store: globalStore,
  
  // Configs
  CONFIGS: RATE_LIMIT_CONFIGS
} as const
