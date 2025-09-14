import { createClient } from '@/lib/supabase/client'

// Cache configuration
const CACHE_CONFIG = {
  // Cache TTL in milliseconds
  TTL: {
    PROFILE: 5 * 60 * 1000,        // 5 minutes
    FRIENDS: 2 * 60 * 1000,        // 2 minutes
    FOLLOWERS: 3 * 60 * 1000,      // 3 minutes
    ACTIVITY: 1 * 60 * 1000,       // 1 minute
    FRIEND_REQUESTS: 30 * 1000,    // 30 seconds
    SOCIAL_STATS: 5 * 60 * 1000,   // 5 minutes
    PRIVACY_SETTINGS: 10 * 60 * 1000, // 10 minutes
  },
  // Maximum cache size (number of entries)
  MAX_SIZE: {
    PROFILES: 100,
    FRIENDS: 50,
    FOLLOWERS: 50,
    ACTIVITY: 200,
    FRIEND_REQUESTS: 20,
    SOCIAL_STATS: 100,
    PRIVACY_SETTINGS: 50,
  }
}

// Cache entry interface
interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
  tags: string[]
}

// Cache statistics
interface CacheStats {
  hits: number
  misses: number
  sets: number
  deletes: number
  evictions: number
  size: number
}

// Cache invalidation tags
export const CACHE_TAGS = {
  USER: (userId: string) => `user:${userId}`,
  PROFILE: (userId: string) => `profile:${userId}`,
  FRIENDS: (userId: string) => `friends:${userId}`,
  FOLLOWERS: (userId: string) => `followers:${userId}`,
  FOLLOWING: (userId: string) => `following:${userId}`,
  ACTIVITY: (userId: string) => `activity:${userId}`,
  FRIEND_REQUESTS: (userId: string) => `friend_requests:${userId}`,
  SOCIAL_STATS: (userId: string) => `social_stats:${userId}`,
  PRIVACY: (userId: string) => `privacy:${userId}`,
  RELATIONSHIP: (userId1: string, userId2: string) => `relationship:${userId1}:${userId2}`,
} as const

// Social cache class
export class SocialCache {
  private cache = new Map<string, CacheEntry<any>>()
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    evictions: 0,
    size: 0
  }
  private supabase = createClient()
  private realtimeChannels = new Map<string, any>()

  // Get cache key
  private getCacheKey(type: string, key: string): string {
    return `${type}:${key}`
  }

  // Check if cache entry is valid
  private isValid(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp < entry.ttl
  }

  // Evict expired entries
  private evictExpired(): void {
    const now = Date.now()
    let evicted = 0
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp >= entry.ttl) {
        this.cache.delete(key)
        evicted++
      }
    }
    
    this.stats.evictions += evicted
    this.stats.size = this.cache.size
  }

  // Evict LRU entries if cache is full
  private evictLRU(maxSize: number): void {
    if (this.cache.size <= maxSize) return

    // Sort by timestamp (oldest first)
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp)

    const toEvict = this.cache.size - maxSize
    for (let i = 0; i < toEvict; i++) {
      this.cache.delete(entries[i][0])
      this.stats.evictions++
    }
    
    this.stats.size = this.cache.size
  }

  // Get from cache
  get<T>(type: string, key: string): T | null {
    this.evictExpired()
    
    const cacheKey = this.getCacheKey(type, key)
    const entry = this.cache.get(cacheKey)
    
    if (!entry || !this.isValid(entry)) {
      this.stats.misses++
      return null
    }
    
    // Update timestamp for LRU
    entry.timestamp = Date.now()
    this.stats.hits++
    return entry.data
  }

  // Set in cache
  set<T>(type: string, key: string, data: T, ttl?: number, tags: string[] = []): void {
    const cacheKey = this.getCacheKey(type, key)
    const defaultTtl = (CACHE_CONFIG.TTL as any)[type.toUpperCase()] || CACHE_CONFIG.TTL.PROFILE
    const maxSize = (CACHE_CONFIG.MAX_SIZE as any)[type.toUpperCase()] || CACHE_CONFIG.MAX_SIZE.PROFILES
    
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || defaultTtl,
      tags: [...tags, type]
    }
    
    this.cache.set(cacheKey, entry)
    this.stats.sets++
    this.stats.size = this.cache.size
    
    // Evict if necessary
    this.evictLRU(maxSize)
  }

  // Delete from cache
  delete(type: string, key: string): boolean {
    const cacheKey = this.getCacheKey(type, key)
    const deleted = this.cache.delete(cacheKey)
    
    if (deleted) {
      this.stats.deletes++
      this.stats.size = this.cache.size
    }
    
    return deleted
  }

  // Invalidate by tags
  invalidateByTags(tags: string[]): number {
    let invalidated = 0
    
    for (const [key, entry] of this.cache.entries()) {
      if (tags.some(tag => entry.tags.includes(tag))) {
        this.cache.delete(key)
        invalidated++
      }
    }
    
    this.stats.deletes += invalidated
    this.stats.size = this.cache.size
    return invalidated
  }

  // Clear all cache
  clear(): void {
    const size = this.cache.size
    this.cache.clear()
    this.stats.deletes += size
    this.stats.size = 0
  }

  // Get cache statistics
  getStats(): CacheStats & { hitRate: number; missRate: number } {
    const total = this.stats.hits + this.stats.misses
    return {
      ...this.stats,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      missRate: total > 0 ? this.stats.misses / total : 0
    }
  }

  // Profile caching methods
  async getProfile(userId: string): Promise<any> {
    let profile = this.get('profile', userId)
    
    if (!profile) {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (!error && data) {
        profile = data
        this.set('profile', userId, profile, undefined, [
          CACHE_TAGS.USER(userId),
          CACHE_TAGS.PROFILE(userId)
        ])
      }
    }
    
    return profile
  }

  async updateProfile(userId: string, updates: any): Promise<void> {
    // Update in database
    const { error } = await this.supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
    
    if (!error) {
      // Invalidate profile cache
      this.invalidateByTags([CACHE_TAGS.PROFILE(userId)])
      
      // Refresh cache with updated data
      await this.getProfile(userId)
    }
  }

  // Friends caching methods
  async getFriends(userId: string): Promise<any[]> {
    let friends = this.get('friends', userId)
    
    if (!friends) {
      const { data, error } = await this.supabase
        .from('friend_requests')
        .select(`
          *,
          requester:profiles!friend_requests_requester_id_fkey(*),
          receiver:profiles!friend_requests_receiver_id_fkey(*)
        `)
        .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
        .eq('status', 'accepted')
      
      if (!error && data) {
        friends = data.map((friendship: any) => {
          return friendship.requester_id === userId 
            ? friendship.receiver 
            : friendship.requester
        })
        
        this.set('friends', userId, friends, undefined, [
          CACHE_TAGS.USER(userId),
          CACHE_TAGS.FRIENDS(userId)
        ])
      } else {
        friends = []
      }
    }
    
    return friends || []
  }

  // Followers caching methods
  async getFollowers(userId: string): Promise<any[]> {
    let followers = this.get('followers', userId)
    
    if (!followers) {
      const { data, error } = await this.supabase
        .from('follows')
        .select(`
          *,
          follower:profiles!follows_follower_id_fkey(*)
        `)
        .eq('following_id', userId)
      
      if (!error && data) {
        followers = data.map((follow: any) => follow.follower)
        
        this.set('followers', userId, followers, undefined, [
          CACHE_TAGS.USER(userId),
          CACHE_TAGS.FOLLOWERS(userId)
        ])
      } else {
        followers = []
      }
    }
    
    return followers || []
  }

  async getFollowing(userId: string): Promise<any[]> {
    let following = this.get('following', userId)
    
    if (!following) {
      const { data, error } = await this.supabase
        .from('follows')
        .select(`
          *,
          following:profiles!follows_following_id_fkey(*)
        `)
        .eq('follower_id', userId)
      
      if (!error && data) {
        following = data.map((follow: any) => follow.following)
        
        this.set('following', userId, following, undefined, [
          CACHE_TAGS.USER(userId),
          CACHE_TAGS.FOLLOWING(userId)
        ])
      } else {
        following = []
      }
    }
    
    return following || []
  }

  // Friend requests caching
  async getFriendRequests(userId: string): Promise<{ sent: any[]; received: any[] }> {
    const cacheKey = `friend_requests:${userId}`
    let requests = this.get('friend_requests', userId)
    
    if (!requests) {
      const [sentResult, receivedResult] = await Promise.all([
        this.supabase
          .from('friend_requests')
          .select(`
            *,
            receiver:profiles!friend_requests_receiver_id_fkey(*)
          `)
          .eq('requester_id', userId)
          .eq('status', 'pending'),
        
        this.supabase
          .from('friend_requests')
          .select(`
            *,
            requester:profiles!friend_requests_requester_id_fkey(*)
          `)
          .eq('receiver_id', userId)
          .eq('status', 'pending')
      ])
      
      requests = {
        sent: sentResult.data || [],
        received: receivedResult.data || []
      }
      
      this.set('friend_requests', userId, requests, undefined, [
        CACHE_TAGS.USER(userId),
        CACHE_TAGS.FRIEND_REQUESTS(userId)
      ])
    }
    
    return requests || { sent: [], received: [] }
  }

  // Social stats caching
  async getSocialStats(userId: string): Promise<any> {
    let stats = this.get('social_stats', userId)
    
    if (!stats) {
      const [friendsCount, followersCount, followingCount] = await Promise.all([
        this.supabase
          .from('friend_requests')
          .select('id', { count: 'exact' })
          .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
          .eq('status', 'accepted'),
        
        this.supabase
          .from('follows')
          .select('id', { count: 'exact' })
          .eq('following_id', userId),
        
        this.supabase
          .from('follows')
          .select('id', { count: 'exact' })
          .eq('follower_id', userId)
      ])
      
      stats = {
        friendsCount: friendsCount.count || 0,
        followersCount: followersCount.count || 0,
        followingCount: followingCount.count || 0,
        updatedAt: new Date().toISOString()
      }
      
      this.set('social_stats', userId, stats, undefined, [
        CACHE_TAGS.USER(userId),
        CACHE_TAGS.SOCIAL_STATS(userId)
      ])
    }
    
    return stats
  }

  // Relationship status caching
  async getRelationshipStatus(userId1: string, userId2: string): Promise<any> {
    const relationshipKey = `${Math.min(userId1, userId2)}-${Math.max(userId1, userId2)}`
    let status = this.get('relationship', relationshipKey)
    
    if (!status) {
      const [friendship, follow1, follow2] = await Promise.all([
        this.supabase
          .from('friend_requests')
          .select('status')
          .or(`and(requester_id.eq.${userId1},receiver_id.eq.${userId2}),and(requester_id.eq.${userId2},receiver_id.eq.${userId1})`)
          .single(),
        
        this.supabase
          .from('follows')
          .select('id')
          .eq('follower_id', userId1)
          .eq('following_id', userId2)
          .single(),
        
        this.supabase
          .from('follows')
          .select('id')
          .eq('follower_id', userId2)
          .eq('following_id', userId1)
          .single()
      ])
      
      status = {
        isFriend: friendship.data?.status === 'accepted',
        isFollowing: !!follow1.data,
        isFollower: !!follow2.data,
        friendshipStatus: friendship.data?.status || null
      }
      
      this.set('relationship', relationshipKey, status, undefined, [
        CACHE_TAGS.RELATIONSHIP(userId1, userId2),
        CACHE_TAGS.USER(userId1),
        CACHE_TAGS.USER(userId2)
      ])
    }
    
    return status
  }

  // Real-time subscriptions
  subscribeToUserUpdates(userId: string, callback: (payload: any) => void): () => void {
    const channelName = `user_updates:${userId}`
    
    if (this.realtimeChannels.has(channelName)) {
      return () => {} // Already subscribed
    }
    
    const channel = this.supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${userId}`
      }, (payload) => {
        // Invalidate profile cache
        this.invalidateByTags([CACHE_TAGS.PROFILE(userId)])
        callback(payload)
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'friend_requests',
        filter: `requester_id=eq.${userId}`
      }, (payload) => {
        // Invalidate friend-related caches
        this.invalidateByTags([
          CACHE_TAGS.FRIENDS(userId),
          CACHE_TAGS.FRIEND_REQUESTS(userId)
        ])
        callback(payload)
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'friend_requests',
        filter: `receiver_id=eq.${userId}`
      }, (payload) => {
        // Invalidate friend-related caches
        this.invalidateByTags([
          CACHE_TAGS.FRIENDS(userId),
          CACHE_TAGS.FRIEND_REQUESTS(userId)
        ])
        callback(payload)
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'follows',
        filter: `follower_id=eq.${userId}`
      }, (payload) => {
        // Invalidate follow-related caches
        this.invalidateByTags([
          CACHE_TAGS.FOLLOWING(userId),
          CACHE_TAGS.SOCIAL_STATS(userId)
        ])
        callback(payload)
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'follows',
        filter: `following_id=eq.${userId}`
      }, (payload) => {
        // Invalidate follower-related caches
        this.invalidateByTags([
          CACHE_TAGS.FOLLOWERS(userId),
          CACHE_TAGS.SOCIAL_STATS(userId)
        ])
        callback(payload)
      })
      .subscribe()
    
    this.realtimeChannels.set(channelName, channel)
    
    // Return unsubscribe function
    return () => {
      channel.unsubscribe()
      this.realtimeChannels.delete(channelName)
    }
  }

  // Batch invalidation for social actions
  invalidateUserSocialData(userId: string): void {
    this.invalidateByTags([
      CACHE_TAGS.USER(userId),
      CACHE_TAGS.PROFILE(userId),
      CACHE_TAGS.FRIENDS(userId),
      CACHE_TAGS.FOLLOWERS(userId),
      CACHE_TAGS.FOLLOWING(userId),
      CACHE_TAGS.SOCIAL_STATS(userId),
      CACHE_TAGS.FRIEND_REQUESTS(userId)
    ])
  }

  // Preload common data
  async preloadUserData(userId: string): Promise<void> {
    await Promise.all([
      this.getProfile(userId),
      this.getFriends(userId),
      this.getFollowers(userId),
      this.getFollowing(userId),
      this.getFriendRequests(userId),
      this.getSocialStats(userId)
    ])
  }
}

// Export singleton instance
export const socialCache = new SocialCache()

// Cache warming utilities
export const warmCache = {
  // Warm cache for user's social data
  async warmUserCache(userId: string): Promise<void> {
    await socialCache.preloadUserData(userId)
  },

  // Warm cache for multiple users (batch)
  async warmMultipleUsers(userIds: string[]): Promise<void> {
    await Promise.all(
      userIds.map(userId => socialCache.preloadUserData(userId))
    )
  },

  // Warm cache for user's friends
  async warmFriendsCache(userId: string): Promise<void> {
    const friends = await socialCache.getFriends(userId)
    const friendIds = friends.map((friend: any) => friend.id)
    await this.warmMultipleUsers(friendIds)
  }
}

// Cache metrics and monitoring
export const cacheMetrics = {
  // Get comprehensive cache statistics
  getStats(): any {
    return socialCache.getStats()
  },

  // Log cache performance
  logPerformance(): void {
    const stats = socialCache.getStats()
    console.log('Social Cache Performance:', {
      hitRate: `${(stats.hitRate * 100).toFixed(2)}%`,
      missRate: `${(stats.missRate * 100).toFixed(2)}%`,
      size: stats.size,
      hits: stats.hits,
      misses: stats.misses,
      evictions: stats.evictions
    })
  },

  // Reset statistics
  resetStats(): void {
    const stats = socialCache.getStats()
    Object.keys(stats).forEach(key => {
      if (key !== 'size') {
        (stats as any)[key] = 0
      }
    })
  }
}
