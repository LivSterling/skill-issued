/**
 * Cache management utilities for profile data optimization
 */

import { profileCache, type ProfileCacheEvent, type ProfileCacheMetrics } from './profile-cache'
import type { ExtendedProfile } from '@/lib/database/types'

// Cache strategies
export type CacheStrategy = 
  | 'cache-first'     // Check cache first, fallback to network
  | 'network-first'   // Check network first, fallback to cache
  | 'cache-only'      // Only use cache
  | 'network-only'    // Only use network
  | 'stale-while-revalidate' // Return cache, update in background

// Cache invalidation strategies
export type InvalidationStrategy = 
  | 'immediate'       // Invalidate immediately
  | 'delayed'         // Invalidate after a delay
  | 'lazy'            // Invalidate on next access
  | 'background'      // Invalidate in background

// Cache warming configuration
export interface CacheWarmingConfig {
  enabled: boolean
  profileIds: string[]
  strategy: 'immediate' | 'lazy' | 'scheduled'
  scheduleInterval?: number
  batchSize: number
  maxRetries: number
}

// Performance monitoring
export interface CachePerformanceMetrics extends ProfileCacheMetrics {
  networkLatency: number
  cacheLatency: number
  dataFreshness: number
  errorRate: number
}

/**
 * Advanced cache manager for profile data
 */
export class ProfileCacheManager {
  private performanceMetrics: CachePerformanceMetrics
  private warmingConfig: CacheWarmingConfig
  private warmingTimer: NodeJS.Timeout | null = null
  private invalidationQueue = new Map<string, { strategy: InvalidationStrategy; timestamp: number }>()

  constructor() {
    this.performanceMetrics = {
      ...profileCache.getMetrics(),
      networkLatency: 0,
      cacheLatency: 0,
      dataFreshness: 0,
      errorRate: 0
    }

    this.warmingConfig = {
      enabled: false,
      profileIds: [],
      strategy: 'lazy',
      batchSize: 5,
      maxRetries: 3
    }

    // Listen to cache events for metrics
    profileCache.addEventListener(this.handleCacheEvent.bind(this))
  }

  /**
   * Get profile with specified cache strategy
   */
  async getProfile(
    profileId: string,
    fetchFunction: (id: string) => Promise<ExtendedProfile | null>,
    strategy: CacheStrategy = 'cache-first',
    extended = true
  ): Promise<ExtendedProfile | null> {
    const startTime = performance.now()

    try {
      switch (strategy) {
        case 'cache-first':
          return await this.cacheFirstStrategy(profileId, fetchFunction, extended)
        
        case 'network-first':
          return await this.networkFirstStrategy(profileId, fetchFunction, extended)
        
        case 'cache-only':
          return this.cacheOnlyStrategy(profileId, extended)
        
        case 'network-only':
          return await this.networkOnlyStrategy(profileId, fetchFunction, extended)
        
        case 'stale-while-revalidate':
          return await this.staleWhileRevalidateStrategy(profileId, fetchFunction, extended)
        
        default:
          return await this.cacheFirstStrategy(profileId, fetchFunction, extended)
      }
    } catch (error) {
      this.updateErrorMetrics()
      throw error
    } finally {
      this.updateLatencyMetrics(startTime, 'total')
    }
  }

  /**
   * Batch get profiles with optimization
   */
  async getProfiles(
    profileIds: string[],
    fetchFunction: (ids: string[]) => Promise<(ExtendedProfile | null)[]>,
    strategy: CacheStrategy = 'cache-first'
  ): Promise<(ExtendedProfile | null)[]> {
    // Separate cached and uncached profiles
    const cachedProfiles = new Map<string, ExtendedProfile | null>()
    const uncachedIds: string[] = []

    for (const id of profileIds) {
      const cached = profileCache.get(id, true)
      if (cached && strategy !== 'network-only') {
        cachedProfiles.set(id, cached)
      } else {
        uncachedIds.push(id)
      }
    }

    // Fetch uncached profiles
    let fetchedProfiles: (ExtendedProfile | null)[] = []
    if (uncachedIds.length > 0 && strategy !== 'cache-only') {
      fetchedProfiles = await fetchFunction(uncachedIds)
      
      // Cache the fetched profiles
      fetchedProfiles.forEach((profile, index) => {
        if (profile) {
          const profileId = uncachedIds[index]
          profileCache.set(profileId, profile, true)
          cachedProfiles.set(profileId, profile)
        }
      })
    }

    // Return profiles in original order
    return profileIds.map(id => cachedProfiles.get(id) || null)
  }

  /**
   * Invalidate profile cache with strategy
   */
  invalidateProfile(profileId: string, strategy: InvalidationStrategy = 'immediate'): void {
    switch (strategy) {
      case 'immediate':
        profileCache.delete(profileId)
        break
      
      case 'delayed':
        setTimeout(() => profileCache.delete(profileId), 1000)
        break
      
      case 'lazy':
        this.invalidationQueue.set(profileId, { strategy, timestamp: Date.now() })
        break
      
      case 'background':
        setTimeout(() => {
          profileCache.delete(profileId)
        }, 0)
        break
    }
  }

  /**
   * Invalidate multiple profiles
   */
  invalidateProfiles(profileIds: string[], strategy: InvalidationStrategy = 'immediate'): void {
    profileIds.forEach(id => this.invalidateProfile(id, strategy))
  }

  /**
   * Warm cache with specified profiles
   */
  async warmCache(
    profileIds: string[],
    fetchFunction: (id: string) => Promise<ExtendedProfile | null>
  ): Promise<void> {
    const uncachedIds = profileIds.filter(id => !profileCache.has(id, true))
    
    if (uncachedIds.length === 0) return

    // Process in batches
    const batches = this.createBatches(uncachedIds, this.warmingConfig.batchSize)
    
    for (const batch of batches) {
      await profileCache.prefetch(batch, fetchFunction)
      
      // Small delay between batches to avoid overwhelming the system
      if (batches.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
  }

  /**
   * Configure cache warming
   */
  configureCacheWarming(config: Partial<CacheWarmingConfig>): void {
    this.warmingConfig = { ...this.warmingConfig, ...config }
    
    if (config.enabled && config.strategy === 'scheduled' && config.scheduleInterval) {
      this.startScheduledWarming(config.scheduleInterval)
    } else if (!config.enabled) {
      this.stopScheduledWarming()
    }
  }

  /**
   * Get comprehensive performance metrics
   */
  getPerformanceMetrics(): CachePerformanceMetrics {
    return {
      ...profileCache.getMetrics(),
      ...this.performanceMetrics
    }
  }

  /**
   * Optimize cache based on usage patterns
   */
  optimizeCache(): void {
    const metrics = profileCache.getMetrics()
    
    // If hit rate is low, consider increasing cache size
    const hitRate = profileCache.getHitRate()
    if (hitRate < 0.5 && metrics.cacheSize < 200) {
      console.log('Cache hit rate is low, consider increasing cache size')
    }
    
    // Clean up invalidation queue
    this.cleanupInvalidationQueue()
    
    // Suggest cache warming for frequently missed profiles
    this.suggestCacheWarming()
  }

  /**
   * Export cache state for debugging
   */
  exportCacheState(): {
    metrics: CachePerformanceMetrics
    size: number
    hitRate: number
    invalidationQueue: Array<{ profileId: string; strategy: InvalidationStrategy; timestamp: number }>
  } {
    return {
      metrics: this.getPerformanceMetrics(),
      size: profileCache.size(),
      hitRate: profileCache.getHitRate(),
      invalidationQueue: Array.from(this.invalidationQueue.entries()).map(([profileId, data]) => ({
        profileId,
        ...data
      }))
    }
  }

  // Private methods

  private async cacheFirstStrategy(
    profileId: string,
    fetchFunction: (id: string) => Promise<ExtendedProfile | null>,
    extended: boolean
  ): Promise<ExtendedProfile | null> {
    const startTime = performance.now()
    
    // Check cache first
    const cached = profileCache.get(profileId, extended)
    if (cached) {
      this.updateLatencyMetrics(startTime, 'cache')
      return cached
    }
    
    // Fallback to network
    const networkStartTime = performance.now()
    const profile = await fetchFunction(profileId)
    this.updateLatencyMetrics(networkStartTime, 'network')
    
    if (profile) {
      profileCache.set(profileId, profile, extended)
    }
    
    return profile
  }

  private async networkFirstStrategy(
    profileId: string,
    fetchFunction: (id: string) => Promise<ExtendedProfile | null>,
    extended: boolean
  ): Promise<ExtendedProfile | null> {
    const networkStartTime = performance.now()
    
    try {
      const profile = await fetchFunction(profileId)
      this.updateLatencyMetrics(networkStartTime, 'network')
      
      if (profile) {
        profileCache.set(profileId, profile, extended)
        return profile
      }
    } catch (error) {
      // Fallback to cache on network error
      const cached = profileCache.get(profileId, extended)
      if (cached) {
        return cached
      }
      throw error
    }
    
    // Fallback to cache if network returned null
    return profileCache.get(profileId, extended)
  }

  private cacheOnlyStrategy(profileId: string, extended: boolean): ExtendedProfile | null {
    const startTime = performance.now()
    const result = profileCache.get(profileId, extended)
    this.updateLatencyMetrics(startTime, 'cache')
    return result
  }

  private async networkOnlyStrategy(
    profileId: string,
    fetchFunction: (id: string) => Promise<ExtendedProfile | null>,
    extended: boolean
  ): Promise<ExtendedProfile | null> {
    const networkStartTime = performance.now()
    const profile = await fetchFunction(profileId)
    this.updateLatencyMetrics(networkStartTime, 'network')
    
    if (profile) {
      profileCache.set(profileId, profile, extended)
    }
    
    return profile
  }

  private async staleWhileRevalidateStrategy(
    profileId: string,
    fetchFunction: (id: string) => Promise<ExtendedProfile | null>,
    extended: boolean
  ): Promise<ExtendedProfile | null> {
    const startTime = performance.now()
    
    // Return cached version immediately if available
    const cached = profileCache.get(profileId, extended)
    
    // Revalidate in background
    fetchFunction(profileId).then(profile => {
      if (profile) {
        profileCache.set(profileId, profile, extended)
      }
    }).catch(error => {
      console.warn('Background revalidation failed:', error)
    })
    
    if (cached) {
      this.updateLatencyMetrics(startTime, 'cache')
      return cached
    }
    
    // If no cached version, wait for network
    const networkStartTime = performance.now()
    const profile = await fetchFunction(profileId)
    this.updateLatencyMetrics(networkStartTime, 'network')
    
    if (profile) {
      profileCache.set(profileId, profile, extended)
    }
    
    return profile
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = []
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize))
    }
    return batches
  }

  private startScheduledWarming(interval: number): void {
    this.stopScheduledWarming()
    
    this.warmingTimer = setInterval(() => {
      // This would need to be implemented with actual fetch function
      console.log('Scheduled cache warming triggered')
    }, interval)
  }

  private stopScheduledWarming(): void {
    if (this.warmingTimer) {
      clearInterval(this.warmingTimer)
      this.warmingTimer = null
    }
  }

  private handleCacheEvent(event: ProfileCacheEvent): void {
    // Update metrics based on cache events
    switch (event.type) {
      case 'hit':
      case 'miss':
        // Metrics are already tracked by the cache itself
        break
      case 'evict':
        // Could track eviction patterns here
        break
    }
  }

  private updateLatencyMetrics(startTime: number, type: 'cache' | 'network' | 'total'): void {
    const latency = performance.now() - startTime
    
    switch (type) {
      case 'cache':
        this.performanceMetrics.cacheLatency = 
          (this.performanceMetrics.cacheLatency + latency) / 2
        break
      case 'network':
        this.performanceMetrics.networkLatency = 
          (this.performanceMetrics.networkLatency + latency) / 2
        break
    }
  }

  private updateErrorMetrics(): void {
    this.performanceMetrics.errorRate = 
      (this.performanceMetrics.errorRate * 0.9) + (1 * 0.1) // Exponential moving average
  }

  private cleanupInvalidationQueue(): void {
    const now = Date.now()
    const maxAge = 5 * 60 * 1000 // 5 minutes
    
    for (const [profileId, data] of this.invalidationQueue.entries()) {
      if (now - data.timestamp > maxAge) {
        this.invalidationQueue.delete(profileId)
      }
    }
  }

  private suggestCacheWarming(): void {
    // This could analyze access patterns and suggest profiles to warm
    // For now, just a placeholder
    console.log('Cache warming suggestions would be generated here')
  }
}

// Global cache manager instance
export const profileCacheManager = new ProfileCacheManager()
