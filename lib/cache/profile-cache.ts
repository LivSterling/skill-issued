/**
 * Advanced profile caching system with persistence, invalidation, and optimization
 */

import type { ExtendedProfile, Profile } from '@/lib/database/types'

// Cache entry structure
export interface ProfileCacheEntry {
  profile: ExtendedProfile
  timestamp: number
  lastAccessed: number
  accessCount: number
  extended: boolean
  version: number
  tags: string[]
}

// Cache configuration
export interface ProfileCacheConfig {
  maxSize: number
  defaultTtl: number // Time to live in milliseconds
  persistToStorage: boolean
  storageKey: string
  enableMetrics: boolean
  cleanupInterval: number
  compressionEnabled: boolean
}

// Cache metrics
export interface ProfileCacheMetrics {
  hits: number
  misses: number
  evictions: number
  totalRequests: number
  averageResponseTime: number
  cacheSize: number
  memoryUsage: number
}

// Cache events
export type ProfileCacheEvent = 
  | { type: 'hit'; profileId: string; timestamp: number }
  | { type: 'miss'; profileId: string; timestamp: number }
  | { type: 'set'; profileId: string; timestamp: number }
  | { type: 'evict'; profileId: string; reason: 'ttl' | 'lru' | 'manual'; timestamp: number }
  | { type: 'clear'; timestamp: number }

export type ProfileCacheEventListener = (event: ProfileCacheEvent) => void

// Default configuration
const DEFAULT_CONFIG: ProfileCacheConfig = {
  maxSize: 100, // Maximum number of profiles to cache
  defaultTtl: 5 * 60 * 1000, // 5 minutes
  persistToStorage: true,
  storageKey: 'skill-issued-profile-cache',
  enableMetrics: true,
  cleanupInterval: 60 * 1000, // 1 minute
  compressionEnabled: false // Disable for now, can enable later with a compression library
}

/**
 * Advanced profile cache implementation with LRU eviction, persistence, and metrics
 */
export class ProfileCache {
  private cache = new Map<string, ProfileCacheEntry>()
  private config: ProfileCacheConfig
  private metrics: ProfileCacheMetrics
  private cleanupTimer: NodeJS.Timeout | null = null
  private eventListeners: ProfileCacheEventListener[] = []
  private isInitialized = false

  constructor(config: Partial<ProfileCacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.metrics = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalRequests: 0,
      averageResponseTime: 0,
      cacheSize: 0,
      memoryUsage: 0
    }
  }

  /**
   * Initialize the cache system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    // Load persisted cache if enabled
    if (this.config.persistToStorage && typeof window !== 'undefined') {
      await this.loadFromStorage()
    }

    // Start cleanup timer
    if (this.config.cleanupInterval > 0) {
      this.cleanupTimer = setInterval(() => {
        this.cleanup()
      }, this.config.cleanupInterval)
    }

    this.isInitialized = true
  }

  /**
   * Get a profile from cache
   */
  get(profileId: string, extended = true): ExtendedProfile | null {
    const startTime = performance.now()
    this.metrics.totalRequests++

    const entry = this.cache.get(profileId)
    
    if (!entry) {
      this.metrics.misses++
      this.emitEvent({ type: 'miss', profileId, timestamp: Date.now() })
      this.updateMetrics(startTime)
      return null
    }

    // Check if entry is expired
    if (this.isExpired(entry)) {
      this.cache.delete(profileId)
      this.metrics.misses++
      this.metrics.evictions++
      this.emitEvent({ type: 'evict', profileId, reason: 'ttl', timestamp: Date.now() })
      this.updateMetrics(startTime)
      return null
    }

    // Check if we need extended data but only have basic
    if (extended && !entry.extended) {
      this.metrics.misses++
      this.emitEvent({ type: 'miss', profileId, timestamp: Date.now() })
      this.updateMetrics(startTime)
      return null
    }

    // Update access statistics
    entry.lastAccessed = Date.now()
    entry.accessCount++

    this.metrics.hits++
    this.emitEvent({ type: 'hit', profileId, timestamp: Date.now() })
    this.updateMetrics(startTime)
    
    return entry.profile
  }

  /**
   * Set a profile in cache
   */
  set(profileId: string, profile: ExtendedProfile, extended = true, customTtl?: number): void {
    // Ensure we don't exceed max size
    if (this.cache.size >= this.config.maxSize && !this.cache.has(profileId)) {
      this.evictLeastRecentlyUsed()
    }

    const now = Date.now()
    const entry: ProfileCacheEntry = {
      profile,
      timestamp: now,
      lastAccessed: now,
      accessCount: 1,
      extended,
      version: 1,
      tags: this.generateTags(profile)
    }

    // Update existing entry or create new one
    const existingEntry = this.cache.get(profileId)
    if (existingEntry) {
      entry.accessCount = existingEntry.accessCount + 1
      entry.version = existingEntry.version + 1
    }

    this.cache.set(profileId, entry)
    this.emitEvent({ type: 'set', profileId, timestamp: now })

    // Persist to storage if enabled
    if (this.config.persistToStorage) {
      this.persistToStorage()
    }

    this.updateCacheMetrics()
  }

  /**
   * Remove a profile from cache
   */
  delete(profileId: string): boolean {
    const deleted = this.cache.delete(profileId)
    if (deleted) {
      this.emitEvent({ type: 'evict', profileId, reason: 'manual', timestamp: Date.now() })
      this.updateCacheMetrics()
      
      if (this.config.persistToStorage) {
        this.persistToStorage()
      }
    }
    return deleted
  }

  /**
   * Clear all cached profiles
   */
  clear(): void {
    this.cache.clear()
    this.emitEvent({ type: 'clear', timestamp: Date.now() })
    this.updateCacheMetrics()
    
    if (this.config.persistToStorage && typeof window !== 'undefined') {
      localStorage.removeItem(this.config.storageKey)
    }
  }

  /**
   * Check if a profile is cached
   */
  has(profileId: string, extended = true): boolean {
    const entry = this.cache.get(profileId)
    if (!entry) return false
    
    if (this.isExpired(entry)) {
      this.cache.delete(profileId)
      return false
    }
    
    return !extended || entry.extended
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size
  }

  /**
   * Get cache metrics
   */
  getMetrics(): ProfileCacheMetrics {
    return { ...this.metrics }
  }

  /**
   * Get cache hit rate
   */
  getHitRate(): number {
    if (this.metrics.totalRequests === 0) return 0
    return this.metrics.hits / this.metrics.totalRequests
  }

  /**
   * Invalidate profiles by tags
   */
  invalidateByTags(tags: string[]): number {
    let invalidated = 0
    
    for (const [profileId, entry] of this.cache.entries()) {
      if (entry.tags.some(tag => tags.includes(tag))) {
        this.cache.delete(profileId)
        this.emitEvent({ type: 'evict', profileId, reason: 'manual', timestamp: Date.now() })
        invalidated++
      }
    }
    
    if (invalidated > 0) {
      this.updateCacheMetrics()
      if (this.config.persistToStorage) {
        this.persistToStorage()
      }
    }
    
    return invalidated
  }

  /**
   * Prefetch profiles
   */
  async prefetch(profileIds: string[], fetchFunction: (id: string) => Promise<ExtendedProfile | null>): Promise<void> {
    const uncachedIds = profileIds.filter(id => !this.has(id, true))
    
    if (uncachedIds.length === 0) return
    
    const fetchPromises = uncachedIds.map(async (id) => {
      try {
        const profile = await fetchFunction(id)
        if (profile) {
          this.set(id, profile, true)
        }
      } catch (error) {
        console.warn(`Failed to prefetch profile ${id}:`, error)
      }
    })
    
    await Promise.allSettled(fetchPromises)
  }

  /**
   * Add event listener
   */
  addEventListener(listener: ProfileCacheEventListener): void {
    this.eventListeners.push(listener)
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: ProfileCacheEventListener): void {
    const index = this.eventListeners.indexOf(listener)
    if (index > -1) {
      this.eventListeners.splice(index, 1)
    }
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now()
    let evicted = 0
    
    for (const [profileId, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(profileId)
        this.emitEvent({ type: 'evict', profileId, reason: 'ttl', timestamp: now })
        evicted++
      }
    }
    
    if (evicted > 0) {
      this.metrics.evictions += evicted
      this.updateCacheMetrics()
      
      if (this.config.persistToStorage) {
        this.persistToStorage()
      }
    }
  }

  /**
   * Evict least recently used entry
   */
  private evictLeastRecentlyUsed(): void {
    let oldestEntry: { id: string; lastAccessed: number } | null = null
    
    for (const [profileId, entry] of this.cache.entries()) {
      if (!oldestEntry || entry.lastAccessed < oldestEntry.lastAccessed) {
        oldestEntry = { id: profileId, lastAccessed: entry.lastAccessed }
      }
    }
    
    if (oldestEntry) {
      this.cache.delete(oldestEntry.id)
      this.metrics.evictions++
      this.emitEvent({ 
        type: 'evict', 
        profileId: oldestEntry.id, 
        reason: 'lru', 
        timestamp: Date.now() 
      })
    }
  }

  /**
   * Check if entry is expired
   */
  private isExpired(entry: ProfileCacheEntry): boolean {
    return Date.now() - entry.timestamp > this.config.defaultTtl
  }

  /**
   * Generate tags for a profile
   */
  private generateTags(profile: ExtendedProfile): string[] {
    const tags: string[] = ['profile']
    
    if (profile.privacy_level) {
      tags.push(`privacy:${profile.privacy_level}`)
    }
    
    if (profile.gaming_preferences?.favoriteGenres) {
      profile.gaming_preferences.favoriteGenres.forEach(genre => {
        tags.push(`genre:${genre}`)
      })
    }
    
    if (profile.gaming_preferences?.favoritePlatforms) {
      profile.gaming_preferences.favoritePlatforms.forEach(platform => {
        tags.push(`platform:${platform}`)
      })
    }
    
    return tags
  }

  /**
   * Emit cache event
   */
  private emitEvent(event: ProfileCacheEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        console.error('Error in cache event listener:', error)
      }
    })
  }

  /**
   * Update response time metrics
   */
  private updateMetrics(startTime: number): void {
    const responseTime = performance.now() - startTime
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + responseTime) / 
      this.metrics.totalRequests
  }

  /**
   * Update cache size metrics
   */
  private updateCacheMetrics(): void {
    this.metrics.cacheSize = this.cache.size
    
    // Estimate memory usage (rough calculation)
    let memoryUsage = 0
    for (const entry of this.cache.values()) {
      memoryUsage += JSON.stringify(entry).length * 2 // Rough estimate
    }
    this.metrics.memoryUsage = memoryUsage
  }

  /**
   * Persist cache to localStorage
   */
  private persistToStorage(): void {
    if (typeof window === 'undefined') return
    
    try {
      const cacheData = Array.from(this.cache.entries()).map(([id, entry]) => ({
        id,
        ...entry
      }))
      
      localStorage.setItem(this.config.storageKey, JSON.stringify({
        data: cacheData,
        timestamp: Date.now(),
        version: '1.0'
      }))
    } catch (error) {
      console.warn('Failed to persist profile cache:', error)
    }
  }

  /**
   * Load cache from localStorage
   */
  private async loadFromStorage(): Promise<void> {
    if (typeof window === 'undefined') return
    
    try {
      const stored = localStorage.getItem(this.config.storageKey)
      if (!stored) return
      
      const { data, timestamp, version } = JSON.parse(stored)
      
      // Check if stored data is too old
      if (Date.now() - timestamp > this.config.defaultTtl * 2) {
        localStorage.removeItem(this.config.storageKey)
        return
      }
      
      // Restore cache entries
      for (const item of data) {
        const { id, ...entry } = item
        this.cache.set(id, entry)
      }
      
      this.updateCacheMetrics()
    } catch (error) {
      console.warn('Failed to load profile cache from storage:', error)
      localStorage.removeItem(this.config.storageKey)
    }
  }

  /**
   * Destroy the cache instance
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
    
    this.cache.clear()
    this.eventListeners.length = 0
    this.isInitialized = false
  }
}

// Global cache instance
export const profileCache = new ProfileCache()

// Initialize cache when module is loaded (client-side only)
if (typeof window !== 'undefined') {
  profileCache.initialize()
}
