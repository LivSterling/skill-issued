"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from './use-auth'
import { socialCache, warmCache, cacheMetrics } from '@/lib/cache/social-cache'

// Hook for cached profile data
export function useCachedProfile(userId?: string) {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadProfile = useCallback(async () => {
    if (!userId) {
      setProfile(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const profileData = await socialCache.getProfile(userId)
      setProfile(profileData)
    } catch (err) {
      console.error('Error loading cached profile:', err)
      setError('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const updateProfile = useCallback(async (updates: any) => {
    if (!userId) return

    try {
      await socialCache.updateProfile(userId, updates)
      await loadProfile()
    } catch (err) {
      console.error('Error updating profile:', err)
      throw err
    }
  }, [userId, loadProfile])

  return {
    profile,
    loading,
    error,
    updateProfile,
    refresh: loadProfile
  }
}

// Hook for cached friends data
export function useCachedFriends(userId?: string) {
  const [friends, setFriends] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadFriends = useCallback(async () => {
    if (!userId) {
      setFriends([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      const friendsData = await socialCache.getFriends(userId)
      setFriends(friendsData)
    } catch (err) {
      console.error('Error loading cached friends:', err)
      setError('Failed to load friends')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    loadFriends()
  }, [loadFriends])

  return {
    friends,
    loading,
    error,
    refresh: loadFriends
  }
}

// Hook for cached followers/following data
export function useCachedFollows(userId?: string) {
  const [followers, setFollowers] = useState<any[]>([])
  const [following, setFollowing] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadFollows = useCallback(async () => {
    if (!userId) {
      setFollowers([])
      setFollowing([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      const [followersData, followingData] = await Promise.all([
        socialCache.getFollowers(userId),
        socialCache.getFollowing(userId)
      ])
      
      setFollowers(followersData)
      setFollowing(followingData)
    } catch (err) {
      console.error('Error loading cached follows:', err)
      setError('Failed to load follows')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    loadFollows()
  }, [loadFollows])

  return {
    followers,
    following,
    loading,
    error,
    refresh: loadFollows
  }
}

// Hook for cached friend requests
export function useCachedFriendRequests(userId?: string) {
  const [friendRequests, setFriendRequests] = useState<{ sent: any[]; received: any[] }>({
    sent: [],
    received: []
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadFriendRequests = useCallback(async () => {
    if (!userId) {
      setFriendRequests({ sent: [], received: [] })
      return
    }

    setLoading(true)
    setError(null)

    try {
      const requestsData = await socialCache.getFriendRequests(userId)
      setFriendRequests(requestsData)
    } catch (err) {
      console.error('Error loading cached friend requests:', err)
      setError('Failed to load friend requests')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    loadFriendRequests()
  }, [loadFriendRequests])

  return {
    friendRequests,
    loading,
    error,
    refresh: loadFriendRequests
  }
}

// Hook for cached social stats
export function useCachedSocialStats(userId?: string) {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadStats = useCallback(async () => {
    if (!userId) {
      setStats(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const statsData = await socialCache.getSocialStats(userId)
      setStats(statsData)
    } catch (err) {
      console.error('Error loading cached social stats:', err)
      setError('Failed to load social stats')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  return {
    stats,
    loading,
    error,
    refresh: loadStats
  }
}

// Hook for cached relationship status
export function useCachedRelationship(userId1?: string, userId2?: string) {
  const [relationship, setRelationship] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadRelationship = useCallback(async () => {
    if (!userId1 || !userId2 || userId1 === userId2) {
      setRelationship(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const relationshipData = await socialCache.getRelationshipStatus(userId1, userId2)
      setRelationship(relationshipData)
    } catch (err) {
      console.error('Error loading cached relationship:', err)
      setError('Failed to load relationship')
    } finally {
      setLoading(false)
    }
  }, [userId1, userId2])

  useEffect(() => {
    loadRelationship()
  }, [loadRelationship])

  return {
    relationship,
    loading,
    error,
    refresh: loadRelationship
  }
}

// Hook for real-time updates
export function useRealtimeUpdates(userId?: string) {
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const unsubscribeRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!userId) return

    // Subscribe to real-time updates
    const unsubscribe = socialCache.subscribeToUserUpdates(userId, (payload) => {
      setLastUpdate(new Date())
      
      // Log the update for debugging
      console.log('Real-time update received:', {
        userId,
        table: payload.table,
        eventType: payload.eventType,
        timestamp: new Date().toISOString()
      })
    })

    unsubscribeRef.current = unsubscribe
    setIsConnected(true)

    // Cleanup on unmount
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
      setIsConnected(false)
    }
  }, [userId])

  return {
    isConnected,
    lastUpdate
  }
}

// Hook for cache management
export function useCacheManager() {
  const { user } = useAuth()
  const [cacheStats, setCacheStats] = useState<any>(null)

  // Get cache statistics
  const getStats = useCallback(() => {
    const stats = cacheMetrics.getStats()
    setCacheStats(stats)
    return stats
  }, [])

  // Clear cache
  const clearCache = useCallback(() => {
    socialCache.clear()
    setCacheStats(cacheMetrics.getStats())
  }, [])

  // Invalidate user's social data
  const invalidateUserData = useCallback((userId?: string) => {
    const targetUserId = userId || user?.id
    if (targetUserId) {
      socialCache.invalidateUserSocialData(targetUserId)
      setCacheStats(cacheMetrics.getStats())
    }
  }, [user?.id])

  // Warm cache for current user
  const warmUserCache = useCallback(async (userId?: string) => {
    const targetUserId = userId || user?.id
    if (targetUserId) {
      await warmCache.warmUserCache(targetUserId)
      setCacheStats(cacheMetrics.getStats())
    }
  }, [user?.id])

  // Warm cache for user's friends
  const warmFriendsCache = useCallback(async (userId?: string) => {
    const targetUserId = userId || user?.id
    if (targetUserId) {
      await warmCache.warmFriendsCache(targetUserId)
      setCacheStats(cacheMetrics.getStats())
    }
  }, [user?.id])

  // Log performance metrics
  const logPerformance = useCallback(() => {
    cacheMetrics.logPerformance()
  }, [])

  // Reset statistics
  const resetStats = useCallback(() => {
    cacheMetrics.resetStats()
    setCacheStats(cacheMetrics.getStats())
  }, [])

  useEffect(() => {
    // Update stats periodically
    const interval = setInterval(() => {
      setCacheStats(cacheMetrics.getStats())
    }, 5000) // Update every 5 seconds

    return () => clearInterval(interval)
  }, [])

  return {
    cacheStats,
    getStats,
    clearCache,
    invalidateUserData,
    warmUserCache,
    warmFriendsCache,
    logPerformance,
    resetStats
  }
}

// Hook for batch social data loading
export function useSocialDataLoader() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load all social data for a user
  const loadUserSocialData = useCallback(async (userId: string) => {
    setLoading(true)
    setError(null)

    try {
      await socialCache.preloadUserData(userId)
    } catch (err) {
      console.error('Error loading user social data:', err)
      setError('Failed to load social data')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // Load social data for multiple users
  const loadMultipleUsers = useCallback(async (userIds: string[]) => {
    setLoading(true)
    setError(null)

    try {
      await warmCache.warmMultipleUsers(userIds)
    } catch (err) {
      console.error('Error loading multiple users data:', err)
      setError('Failed to load users data')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    loadUserSocialData,
    loadMultipleUsers
  }
}

// Hook for cache-aware social actions
export function useCachedSocialActions(userId?: string) {
  const { user } = useAuth()

  // Send friend request with cache invalidation
  const sendFriendRequest = useCallback(async (targetUserId: string) => {
    if (!user?.id) throw new Error('User not authenticated')

    // Perform the action (this would typically call your social service)
    // await socialService.sendFriendRequest(targetUserId)

    // Invalidate relevant caches
    socialCache.invalidateUserSocialData(user.id)
    socialCache.invalidateUserSocialData(targetUserId)
  }, [user?.id])

  // Accept friend request with cache invalidation
  const acceptFriendRequest = useCallback(async (requesterId: string) => {
    if (!user?.id) throw new Error('User not authenticated')

    // Perform the action
    // await socialService.acceptFriendRequest(requesterId)

    // Invalidate relevant caches
    socialCache.invalidateUserSocialData(user.id)
    socialCache.invalidateUserSocialData(requesterId)
  }, [user?.id])

  // Follow user with cache invalidation
  const followUser = useCallback(async (targetUserId: string) => {
    if (!user?.id) throw new Error('User not authenticated')

    // Perform the action
    // await socialService.followUser(targetUserId)

    // Invalidate relevant caches
    socialCache.invalidateUserSocialData(user.id)
    socialCache.invalidateUserSocialData(targetUserId)
  }, [user?.id])

  // Unfollow user with cache invalidation
  const unfollowUser = useCallback(async (targetUserId: string) => {
    if (!user?.id) throw new Error('User not authenticated')

    // Perform the action
    // await socialService.unfollowUser(targetUserId)

    // Invalidate relevant caches
    socialCache.invalidateUserSocialData(user.id)
    socialCache.invalidateUserSocialData(targetUserId)
  }, [user?.id])

  return {
    sendFriendRequest,
    acceptFriendRequest,
    followUser,
    unfollowUser
  }
}
