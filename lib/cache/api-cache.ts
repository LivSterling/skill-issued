import { NextRequest, NextResponse } from 'next/server'

// Cache configuration
interface CacheConfig {
  ttl: number // Time to live in seconds
  staleWhileRevalidate?: number // Serve stale content while revalidating
  tags?: string[] // Cache tags for invalidation
  vary?: string[] // Headers to vary cache on
  private?: boolean // Whether cache is private (user-specific)
}

// Cache entry interface
interface CacheEntry {
  data: any
  timestamp: number
  ttl: number
  tags: string[]
  etag: string
  staleWhileRevalidate?: number
}

// In-memory cache store (in production, use Redis or similar)
class ApiCache {
  private static instance: ApiCache | null = null
  private cache = new Map<string, CacheEntry>()
  private maxSize = 1000 // Maximum cache entries

  private constructor() {}

  static getInstance(): ApiCache {
    if (!ApiCache.instance) {
      ApiCache.instance = new ApiCache()
    }
    return ApiCache.instance
  }

  // Generate cache key from request
  private generateKey(req: NextRequest, config: CacheConfig): string {
    const url = new URL(req.url)
    const baseKey = `${req.method}:${url.pathname}${url.search}`
    
    // Add vary headers to key if specified
    if (config.vary) {
      const varyValues = config.vary
        .map(header => `${header}:${req.headers.get(header) || ''}`)
        .join('|')
      return `${baseKey}|${varyValues}`
    }
    
    return baseKey
  }

  // Generate ETag from data
  private generateETag(data: any): string {
    const str = typeof data === 'string' ? data : JSON.stringify(data)
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return `"${Math.abs(hash).toString(16)}"`
  }

  // Check if entry is stale
  private isStale(entry: CacheEntry): boolean {
    const now = Date.now()
    return (now - entry.timestamp) > (entry.ttl * 1000)
  }

  // Check if entry is within stale-while-revalidate window
  private isStaleButRevalidating(entry: CacheEntry): boolean {
    if (!entry.staleWhileRevalidate) return false
    const now = Date.now()
    const staleTime = (entry.ttl + entry.staleWhileRevalidate) * 1000
    return (now - entry.timestamp) <= staleTime
  }

  // Get cached response
  get(req: NextRequest, config: CacheConfig): CacheEntry | null {
    const key = this.generateKey(req, config)
    const entry = this.cache.get(key)
    
    if (!entry) return null
    
    // Check if completely expired
    if (this.isStale(entry) && !this.isStaleButRevalidating(entry)) {
      this.cache.delete(key)
      return null
    }
    
    return entry
  }

  // Set cached response
  set(req: NextRequest, data: any, config: CacheConfig): void {
    const key = this.generateKey(req, config)
    const etag = this.generateETag(data)
    
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      ttl: config.ttl,
      tags: config.tags || [],
      etag,
      staleWhileRevalidate: config.staleWhileRevalidate
    }
    
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) {
        this.cache.delete(oldestKey)
      }
    }
    
    this.cache.set(key, entry)
  }

  // Invalidate by tags
  invalidateByTags(tags: string[]): number {
    let invalidated = 0
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.some(tag => tags.includes(tag))) {
        this.cache.delete(key)
        invalidated++
      }
    }
    
    return invalidated
  }

  // Clear all cache
  clear(): void {
    this.cache.clear()
  }

  // Get cache stats
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      utilization: (this.cache.size / this.maxSize) * 100
    }
  }
}

// Singleton instance
const apiCache = ApiCache.getInstance()

// Cache middleware function
export function withCache(config: CacheConfig) {
  return function cacheMiddleware(
    handler: (req: NextRequest) => Promise<NextResponse>
  ) {
    return async function cachedHandler(req: NextRequest): Promise<NextResponse> {
      // Skip caching for non-GET requests unless explicitly configured
      if (req.method !== 'GET' && !config.private) {
        return handler(req)
      }

      // Check for conditional request headers
      const ifNoneMatch = req.headers.get('if-none-match')
      
      // Try to get cached response
      const cached = apiCache.get(req, config)
      
      if (cached) {
        // Check ETag for conditional requests
        if (ifNoneMatch === cached.etag) {
          return new NextResponse(null, { status: 304 })
        }
        
        // Determine cache status
        const isStale = apiCache['isStale'](cached)
        const isStaleButRevalidating = apiCache['isStaleButRevalidating'](cached)
        
        // If fresh or stale-while-revalidate, return cached response
        if (!isStale || isStaleButRevalidating) {
          const response = NextResponse.json(cached.data)
          
          // Add cache headers
          response.headers.set('ETag', cached.etag)
          response.headers.set('Cache-Control', 
            isStale 
              ? `max-age=0, stale-while-revalidate=${config.staleWhileRevalidate || 60}`
              : `max-age=${config.ttl}${config.staleWhileRevalidate ? `, stale-while-revalidate=${config.staleWhileRevalidate}` : ''}`
          )
          response.headers.set('X-Cache', isStale ? 'STALE' : 'HIT')
          
          // If stale, trigger background revalidation
          if (isStale && isStaleButRevalidating) {
            // Background revalidation (don't await)
            handler(req).then(freshResponse => {
              if (freshResponse.ok) {
                freshResponse.json().then(freshData => {
                  apiCache.set(req, freshData, config)
                })
              }
            }).catch(console.error)
          }
          
          return response
        }
      }
      
      // No cache or expired, call handler
      try {
        const response = await handler(req)
        
        // Only cache successful responses
        if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
          const data = await response.json()
          apiCache.set(req, data, config)
          
          const newResponse = NextResponse.json(data)
          const etag = apiCache['generateETag'](data)
          
          // Add cache headers
          newResponse.headers.set('ETag', etag)
          newResponse.headers.set('Cache-Control', 
            `max-age=${config.ttl}${config.staleWhileRevalidate ? `, stale-while-revalidate=${config.staleWhileRevalidate}` : ''}`
          )
          newResponse.headers.set('X-Cache', 'MISS')
          
          return newResponse
        }
        
        return response
      } catch (error) {
        // If fresh request fails and we have stale data, return stale
        if (cached && apiCache['isStaleButRevalidating'](cached)) {
          const response = NextResponse.json(cached.data)
          response.headers.set('ETag', cached.etag)
          response.headers.set('Cache-Control', 'max-age=0, must-revalidate')
          response.headers.set('X-Cache', 'STALE-ERROR')
          return response
        }
        
        throw error
      }
    }
  }
}

// Predefined cache configurations
export const cacheConfigs = {
  // Short-lived cache for frequently changing data
  short: {
    ttl: 60, // 1 minute
    staleWhileRevalidate: 30
  },
  
  // Medium cache for semi-static data
  medium: {
    ttl: 300, // 5 minutes
    staleWhileRevalidate: 60
  },
  
  // Long cache for static data
  long: {
    ttl: 1800, // 30 minutes
    staleWhileRevalidate: 300
  },
  
  // User-specific cache
  user: {
    ttl: 120, // 2 minutes
    private: true,
    vary: ['authorization']
  },
  
  // Public profile cache
  profile: {
    ttl: 600, // 10 minutes
    staleWhileRevalidate: 120,
    tags: ['profiles']
  }
}

// Cache invalidation helpers
export function invalidateUserCache(userId: string) {
  return apiCache.invalidateByTags([`user:${userId}`])
}

export function invalidateProfileCache(username?: string) {
  const tags = ['profiles']
  if (username) tags.push(`profile:${username}`)
  return apiCache.invalidateByTags(tags)
}

export function invalidateSocialCache(userId: string) {
  return apiCache.invalidateByTags([
    `social:${userId}`,
    `friends:${userId}`,
    `follows:${userId}`
  ])
}

// Cache warming functions
export async function warmCache(
  requests: { url: string; config: CacheConfig }[]
): Promise<void> {
  const warmPromises = requests.map(async ({ url, config }) => {
    try {
      const req = new Request(url) as NextRequest
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        apiCache.set(req, data, config)
      }
    } catch (error) {
      console.warn(`Cache warming failed for ${url}:`, error)
    }
  })
  
  await Promise.allSettled(warmPromises)
}

// Health check endpoint data
export function getCacheHealth() {
  const stats = apiCache.getStats()
  
  return {
    status: stats.utilization > 90 ? 'degraded' : 'healthy',
    stats,
    timestamp: new Date().toISOString()
  }
}

// Cleanup old entries periodically
if (typeof window === 'undefined') { // Only run on server
  setInterval(() => {
    // Force cleanup by attempting to add a dummy entry when at capacity
    if (apiCache.getStats().size >= apiCache['maxSize']) {
      const dummyReq = new Request('http://localhost/cleanup') as NextRequest
      apiCache.set(dummyReq, {}, { ttl: 1 })
    }
  }, 10 * 60 * 1000) // Every 10 minutes
}

export { apiCache }
