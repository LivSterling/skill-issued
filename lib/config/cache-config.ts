// Social cache configuration
export const SOCIAL_CACHE_CONFIG = {
  // Cache TTL (Time To Live) in milliseconds
  TTL: {
    // Profile data - changes infrequently
    PROFILE: 5 * 60 * 1000,        // 5 minutes
    
    // Social relationships - moderate frequency
    FRIENDS: 2 * 60 * 1000,        // 2 minutes
    FOLLOWERS: 3 * 60 * 1000,      // 3 minutes
    FOLLOWING: 3 * 60 * 1000,      // 3 minutes
    
    // Dynamic data - changes frequently
    ACTIVITY: 1 * 60 * 1000,       // 1 minute
    FRIEND_REQUESTS: 30 * 1000,    // 30 seconds
    
    // Statistics - can be slightly stale
    SOCIAL_STATS: 5 * 60 * 1000,   // 5 minutes
    
    // Settings - rarely change
    PRIVACY_SETTINGS: 10 * 60 * 1000, // 10 minutes
    
    // Relationship status - moderate frequency
    RELATIONSHIP: 2 * 60 * 1000,   // 2 minutes
    
    // Search results - short-lived
    SEARCH_RESULTS: 30 * 1000,     // 30 seconds
  },

  // Maximum number of entries per cache type
  MAX_SIZE: {
    PROFILES: 100,           // Up to 100 profiles
    FRIENDS: 50,            // Up to 50 friend lists
    FOLLOWERS: 50,          // Up to 50 follower lists
    FOLLOWING: 50,          // Up to 50 following lists
    ACTIVITY: 200,          // Up to 200 activity feeds
    FRIEND_REQUESTS: 20,    // Up to 20 friend request lists
    SOCIAL_STATS: 100,      // Up to 100 stat objects
    PRIVACY_SETTINGS: 50,   // Up to 50 privacy settings
    RELATIONSHIP: 500,      // Up to 500 relationship statuses
    SEARCH_RESULTS: 20,     // Up to 20 search result sets
  },

  // Cache warming strategies
  WARMING: {
    // Automatically warm cache on user login
    WARM_ON_LOGIN: true,
    
    // Warm friend caches when loading friends list
    WARM_FRIENDS_ON_VIEW: true,
    
    // Preload relationship data for visible users
    PRELOAD_RELATIONSHIPS: true,
    
    // Batch size for warming operations
    BATCH_SIZE: 10,
    
    // Delay between batch operations (ms)
    BATCH_DELAY: 100,
  },

  // Real-time update configuration
  REALTIME: {
    // Enable real-time updates
    ENABLED: true,
    
    // Reconnection attempts
    MAX_RECONNECT_ATTEMPTS: 5,
    
    // Reconnection delay (ms)
    RECONNECT_DELAY: 1000,
    
    // Heartbeat interval (ms)
    HEARTBEAT_INTERVAL: 30000,
    
    // Tables to subscribe to
    SUBSCRIBED_TABLES: [
      'profiles',
      'friend_requests', 
      'follows',
      'profile_privacy_settings'
    ],
  },

  // Performance monitoring
  MONITORING: {
    // Enable performance logging
    ENABLED: process.env.NODE_ENV === 'development',
    
    // Log interval (ms)
    LOG_INTERVAL: 60000, // 1 minute
    
    // Performance thresholds
    THRESHOLDS: {
      HIT_RATE_WARNING: 0.5,      // Warn if hit rate < 50%
      HIT_RATE_CRITICAL: 0.3,     // Critical if hit rate < 30%
      CACHE_SIZE_WARNING: 0.8,    // Warn if cache > 80% full
      RESPONSE_TIME_WARNING: 1000, // Warn if response > 1s
    },
  },

  // Cache invalidation strategies
  INVALIDATION: {
    // Invalidate related caches on social actions
    INVALIDATE_ON_SOCIAL_ACTION: true,
    
    // Batch invalidation delay (ms)
    BATCH_INVALIDATION_DELAY: 100,
    
    // Maximum tags per invalidation
    MAX_INVALIDATION_TAGS: 50,
  },

  // Development and debugging
  DEBUG: {
    // Enable debug logging
    ENABLED: process.env.NODE_ENV === 'development',
    
    // Log cache operations
    LOG_OPERATIONS: false,
    
    // Log real-time events
    LOG_REALTIME_EVENTS: false,
    
    // Show cache monitor
    SHOW_MONITOR: process.env.NODE_ENV === 'development',
  }
}

// Environment-specific overrides
if (process.env.NODE_ENV === 'production') {
  // Production optimizations
  SOCIAL_CACHE_CONFIG.TTL.PROFILE = 10 * 60 * 1000      // 10 minutes
  SOCIAL_CACHE_CONFIG.TTL.SOCIAL_STATS = 10 * 60 * 1000 // 10 minutes
  SOCIAL_CACHE_CONFIG.MAX_SIZE.PROFILES = 200            // More profiles in production
  SOCIAL_CACHE_CONFIG.MAX_SIZE.ACTIVITY = 500            // More activities in production
}

if (process.env.NODE_ENV === 'test') {
  // Test optimizations
  Object.keys(SOCIAL_CACHE_CONFIG.TTL).forEach(key => {
    (SOCIAL_CACHE_CONFIG.TTL as any)[key] = 1000 // 1 second for tests
  })
  SOCIAL_CACHE_CONFIG.REALTIME.ENABLED = false
}

// Cache strategy configurations
export const CACHE_STRATEGIES = {
  // Cache-first: Check cache first, fallback to network
  CACHE_FIRST: 'cache-first',
  
  // Network-first: Check network first, fallback to cache
  NETWORK_FIRST: 'network-first',
  
  // Stale-while-revalidate: Return cache immediately, update in background
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  
  // Network-only: Always fetch from network
  NETWORK_ONLY: 'network-only',
  
  // Cache-only: Only return cached data
  CACHE_ONLY: 'cache-only',
}

// Default strategies for different data types
export const DEFAULT_STRATEGIES = {
  PROFILE: CACHE_STRATEGIES.STALE_WHILE_REVALIDATE,
  FRIENDS: CACHE_STRATEGIES.CACHE_FIRST,
  FOLLOWERS: CACHE_STRATEGIES.CACHE_FIRST,
  ACTIVITY: CACHE_STRATEGIES.STALE_WHILE_REVALIDATE,
  FRIEND_REQUESTS: CACHE_STRATEGIES.NETWORK_FIRST,
  SOCIAL_STATS: CACHE_STRATEGIES.CACHE_FIRST,
  PRIVACY_SETTINGS: CACHE_STRATEGIES.CACHE_FIRST,
  RELATIONSHIP: CACHE_STRATEGIES.CACHE_FIRST,
  SEARCH_RESULTS: CACHE_STRATEGIES.NETWORK_FIRST,
}

// Cache key generators
export const CACHE_KEYS = {
  profile: (userId: string) => `profile:${userId}`,
  friends: (userId: string) => `friends:${userId}`,
  followers: (userId: string) => `followers:${userId}`,
  following: (userId: string) => `following:${userId}`,
  activity: (userId: string, feedType: string, page: number) => `activity:${userId}:${feedType}:${page}`,
  friendRequests: (userId: string) => `friend_requests:${userId}`,
  socialStats: (userId: string) => `social_stats:${userId}`,
  privacySettings: (userId: string) => `privacy_settings:${userId}`,
  relationship: (userId1: string, userId2: string) => {
    const [id1, id2] = [userId1, userId2].sort()
    return `relationship:${id1}:${id2}`
  },
  searchResults: (query: string, filters?: string) => `search:${query}${filters ? `:${filters}` : ''}`,
}

// Utility functions
export const cacheUtils = {
  // Calculate cache hit rate
  calculateHitRate: (hits: number, misses: number): number => {
    const total = hits + misses
    return total > 0 ? hits / total : 0
  },

  // Check if hit rate is healthy
  isHitRateHealthy: (hitRate: number): boolean => {
    return hitRate >= SOCIAL_CACHE_CONFIG.MONITORING.THRESHOLDS.HIT_RATE_WARNING
  },

  // Check if cache size is healthy
  isCacheSizeHealthy: (currentSize: number, maxSize: number): boolean => {
    const ratio = currentSize / maxSize
    return ratio <= SOCIAL_CACHE_CONFIG.MONITORING.THRESHOLDS.CACHE_SIZE_WARNING
  },

  // Generate cache tags for invalidation
  generateInvalidationTags: (userId: string, action: string): string[] => {
    const tags = [`user:${userId}`]
    
    switch (action) {
      case 'friend_request':
        tags.push(`friends:${userId}`, `friend_requests:${userId}`, `social_stats:${userId}`)
        break
      case 'follow':
        tags.push(`following:${userId}`, `followers:${userId}`, `social_stats:${userId}`)
        break
      case 'profile_update':
        tags.push(`profile:${userId}`)
        break
      case 'privacy_update':
        tags.push(`privacy:${userId}`, `profile:${userId}`)
        break
      default:
        tags.push(`social:${userId}`)
    }
    
    return tags
  },

  // Format cache statistics for display
  formatCacheStats: (stats: any) => {
    return {
      hitRate: `${(stats.hitRate * 100).toFixed(1)}%`,
      missRate: `${(stats.missRate * 100).toFixed(1)}%`,
      totalRequests: stats.hits + stats.misses,
      efficiency: stats.hitRate > 0.7 ? 'Excellent' : stats.hitRate > 0.4 ? 'Good' : 'Poor'
    }
  }
}
