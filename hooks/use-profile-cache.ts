/**
 * React hooks for profile cache management and optimization
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { profileCache, type ProfileCacheMetrics, type ProfileCacheEvent } from '@/lib/cache/profile-cache'
import { profileCacheManager, type CacheStrategy, type InvalidationStrategy } from '@/lib/cache/cache-manager'
import type { ExtendedProfile } from '@/lib/database/types'

/**
 * Hook for cache metrics and monitoring
 */
export function useProfileCacheMetrics() {
  const [metrics, setMetrics] = useState<ProfileCacheMetrics>(profileCache.getMetrics())
  const [events, setEvents] = useState<ProfileCacheEvent[]>([])

  useEffect(() => {
    const updateMetrics = () => {
      setMetrics(profileCache.getMetrics())
    }

    const handleCacheEvent = (event: ProfileCacheEvent) => {
      setEvents(prev => [...prev.slice(-99), event]) // Keep last 100 events
      updateMetrics()
    }

    // Update metrics periodically
    const metricsInterval = setInterval(updateMetrics, 1000)
    
    // Listen to cache events
    profileCache.addEventListener(handleCacheEvent)

    return () => {
      clearInterval(metricsInterval)
      profileCache.removeEventListener(handleCacheEvent)
    }
  }, [])

  const hitRate = useMemo(() => {
    return metrics.totalRequests > 0 ? (metrics.hits / metrics.totalRequests) * 100 : 0
  }, [metrics.hits, metrics.totalRequests])

  const clearEvents = useCallback(() => {
    setEvents([])
  }, [])

  return {
    metrics,
    events,
    hitRate,
    clearEvents,
    cacheSize: metrics.cacheSize,
    memoryUsage: metrics.memoryUsage,
    averageResponseTime: metrics.averageResponseTime
  }
}

/**
 * Hook for cache operations and management
 */
export function useProfileCacheOperations() {
  const [isOptimizing, setIsOptimizing] = useState(false)

  const clearCache = useCallback(() => {
    profileCache.clear()
  }, [])

  const invalidateProfile = useCallback((profileId: string, strategy: InvalidationStrategy = 'immediate') => {
    profileCacheManager.invalidateProfile(profileId, strategy)
  }, [])

  const invalidateProfiles = useCallback((profileIds: string[], strategy: InvalidationStrategy = 'immediate') => {
    profileCacheManager.invalidateProfiles(profileIds, strategy)
  }, [])

  const warmCache = useCallback(async (
    profileIds: string[],
    fetchFunction: (id: string) => Promise<ExtendedProfile | null>
  ) => {
    await profileCacheManager.warmCache(profileIds, fetchFunction)
  }, [])

  const optimizeCache = useCallback(async () => {
    setIsOptimizing(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 100)) // Simulate async work
      profileCacheManager.optimizeCache()
    } finally {
      setIsOptimizing(false)
    }
  }, [])

  const exportCacheState = useCallback(() => {
    return profileCacheManager.exportCacheState()
  }, [])

  const hasCachedProfile = useCallback((profileId: string, extended = true) => {
    return profileCache.has(profileId, extended)
  }, [])

  const getCachedProfile = useCallback((profileId: string, extended = true) => {
    return profileCache.get(profileId, extended)
  }, [])

  return {
    clearCache,
    invalidateProfile,
    invalidateProfiles,
    warmCache,
    optimizeCache,
    exportCacheState,
    hasCachedProfile,
    getCachedProfile,
    isOptimizing
  }
}

/**
 * Hook for cached profile fetching with strategies
 */
export function useCachedProfile(
  profileId: string | undefined,
  fetchFunction: ((id: string) => Promise<ExtendedProfile | null>) | undefined,
  strategy: CacheStrategy = 'cache-first',
  enabled = true
) {
  const [profile, setProfile] = useState<ExtendedProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastFetched, setLastFetched] = useState<number | null>(null)

  const fetchProfile = useCallback(async () => {
    if (!profileId || !fetchFunction || !enabled) return

    setLoading(true)
    setError(null)

    try {
      const result = await profileCacheManager.getProfile(
        profileId,
        fetchFunction,
        strategy,
        true
      )
      
      setProfile(result)
      setLastFetched(Date.now())
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch profile'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [profileId, fetchFunction, strategy, enabled])

  const refetch = useCallback(() => {
    return fetchProfile()
  }, [fetchProfile])

  const invalidate = useCallback((invalidationStrategy: InvalidationStrategy = 'immediate') => {
    if (profileId) {
      profileCacheManager.invalidateProfile(profileId, invalidationStrategy)
    }
  }, [profileId])

  // Auto-fetch when dependencies change
  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  // Check if data is stale
  const isStale = useMemo(() => {
    if (!lastFetched) return false
    const staleThreshold = 5 * 60 * 1000 // 5 minutes
    return Date.now() - lastFetched > staleThreshold
  }, [lastFetched])

  // Check if data is cached
  const isCached = useMemo(() => {
    return profileId ? profileCache.has(profileId, true) : false
  }, [profileId])

  return {
    profile,
    loading,
    error,
    refetch,
    invalidate,
    isStale,
    isCached,
    lastFetched: lastFetched ? new Date(lastFetched) : null
  }
}

/**
 * Hook for batch profile fetching with caching
 */
export function useCachedProfiles(
  profileIds: string[],
  fetchFunction: ((ids: string[]) => Promise<(ExtendedProfile | null)[]>) | undefined,
  strategy: CacheStrategy = 'cache-first',
  enabled = true
) {
  const [profiles, setProfiles] = useState<Map<string, ExtendedProfile | null>>(new Map())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchProfiles = useCallback(async () => {
    if (profileIds.length === 0 || !fetchFunction || !enabled) return

    setLoading(true)
    setError(null)

    try {
      const results = await profileCacheManager.getProfiles(
        profileIds,
        fetchFunction,
        strategy
      )
      
      const profileMap = new Map<string, ExtendedProfile | null>()
      profileIds.forEach((id, index) => {
        profileMap.set(id, results[index])
      })
      
      setProfiles(profileMap)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch profiles'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [profileIds, fetchFunction, strategy, enabled])

  const refetch = useCallback(() => {
    return fetchProfiles()
  }, [fetchProfiles])

  const invalidateAll = useCallback((invalidationStrategy: InvalidationStrategy = 'immediate') => {
    profileCacheManager.invalidateProfiles(profileIds, invalidationStrategy)
  }, [profileIds])

  // Auto-fetch when dependencies change
  useEffect(() => {
    fetchProfiles()
  }, [fetchProfiles])

  // Convert map to array for easier consumption
  const profilesArray = useMemo(() => {
    return profileIds.map(id => profiles.get(id) || null)
  }, [profileIds, profiles])

  // Get cache status for each profile
  const cacheStatus = useMemo(() => {
    const status = new Map<string, boolean>()
    profileIds.forEach(id => {
      status.set(id, profileCache.has(id, true))
    })
    return status
  }, [profileIds])

  return {
    profiles: profilesArray,
    profilesMap: profiles,
    loading,
    error,
    refetch,
    invalidateAll,
    cacheStatus
  }
}

/**
 * Hook for cache warming and preloading
 */
export function useProfileCacheWarming() {
  const [isWarming, setIsWarming] = useState(false)
  const [warmingProgress, setWarmingProgress] = useState(0)

  const warmProfiles = useCallback(async (
    profileIds: string[],
    fetchFunction: (id: string) => Promise<ExtendedProfile | null>,
    onProgress?: (progress: number) => void
  ) => {
    if (profileIds.length === 0) return

    setIsWarming(true)
    setWarmingProgress(0)

    try {
      const batchSize = 5
      const batches = []
      
      for (let i = 0; i < profileIds.length; i += batchSize) {
        batches.push(profileIds.slice(i, i + batchSize))
      }

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i]
        await profileCacheManager.warmCache(batch, fetchFunction)
        
        const progress = ((i + 1) / batches.length) * 100
        setWarmingProgress(progress)
        onProgress?.(progress)
      }
    } finally {
      setIsWarming(false)
      setWarmingProgress(0)
    }
  }, [])

  const preloadProfile = useCallback(async (
    profileId: string,
    fetchFunction: (id: string) => Promise<ExtendedProfile | null>
  ) => {
    if (profileCache.has(profileId, true)) return // Already cached

    try {
      const profile = await fetchFunction(profileId)
      if (profile) {
        profileCache.set(profileId, profile, true)
      }
    } catch (error) {
      console.warn(`Failed to preload profile ${profileId}:`, error)
    }
  }, [])

  return {
    warmProfiles,
    preloadProfile,
    isWarming,
    warmingProgress
  }
}

/**
 * Hook for cache performance monitoring and debugging
 */
export function useProfileCacheDebug() {
  const { metrics, events, hitRate } = useProfileCacheMetrics()
  const { exportCacheState } = useProfileCacheOperations()

  const [debugMode, setDebugMode] = useState(false)
  const [performanceLog, setPerformanceLog] = useState<Array<{
    timestamp: number
    operation: string
    duration: number
    cacheHit: boolean
  }>>([])

  const logPerformance = useCallback((operation: string, duration: number, cacheHit: boolean) => {
    if (!debugMode) return

    setPerformanceLog(prev => [
      ...prev.slice(-99), // Keep last 100 entries
      {
        timestamp: Date.now(),
        operation,
        duration,
        cacheHit
      }
    ])
  }, [debugMode])

  const clearPerformanceLog = useCallback(() => {
    setPerformanceLog([])
  }, [])

  const getCacheReport = useCallback(() => {
    const state = exportCacheState()
    
    return {
      ...state,
      performanceLog,
      recommendations: [
        hitRate < 50 ? 'Consider increasing cache size or TTL' : null,
        metrics.memoryUsage > 1024 * 1024 ? 'High memory usage detected' : null,
        metrics.averageResponseTime > 100 ? 'Slow response times detected' : null
      ].filter(Boolean)
    }
  }, [exportCacheState, performanceLog, hitRate, metrics])

  return {
    debugMode,
    setDebugMode,
    performanceLog,
    logPerformance,
    clearPerformanceLog,
    getCacheReport,
    metrics,
    events,
    hitRate
  }
}
