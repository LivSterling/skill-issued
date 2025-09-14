"use client"

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './use-auth'
import { 
  useCachedProfile, 
  useCachedFriends, 
  useCachedFollows, 
  useCachedFriendRequests,
  useCachedSocialStats,
  useCachedRelationship,
  useRealtimeUpdates,
  useCachedSocialActions
} from './use-social-cache'
import { socialCache } from '@/lib/cache/social-cache'

// Enhanced profile hook with caching and real-time updates
export function useEnhancedProfile(userId?: string) {
  const { user } = useAuth()
  const targetUserId = userId || user?.id
  
  const {
    profile,
    loading: profileLoading,
    error: profileError,
    updateProfile,
    refresh: refreshProfile
  } = useCachedProfile(targetUserId)

  const {
    stats,
    loading: statsLoading,
    error: statsError,
    refresh: refreshStats
  } = useCachedSocialStats(targetUserId)

  const { isConnected, lastUpdate } = useRealtimeUpdates(targetUserId)

  // Auto-refresh on real-time updates
  useEffect(() => {
    if (lastUpdate) {
      refreshProfile()
      refreshStats()
    }
  }, [lastUpdate, refreshProfile, refreshStats])

  const loading = profileLoading || statsLoading
  const error = profileError || statsError

  return {
    profile,
    stats,
    loading,
    error,
    isConnected,
    lastUpdate,
    updateProfile,
    refresh: useCallback(() => {
      refreshProfile()
      refreshStats()
    }, [refreshProfile, refreshStats])
  }
}

// Enhanced friends hook with caching and real-time updates
export function useEnhancedFriends(userId?: string) {
  const { user } = useAuth()
  const targetUserId = userId || user?.id
  
  const {
    friends,
    loading: friendsLoading,
    error: friendsError,
    refresh: refreshFriends
  } = useCachedFriends(targetUserId)

  const {
    friendRequests,
    loading: requestsLoading,
    error: requestsError,
    refresh: refreshRequests
  } = useCachedFriendRequests(targetUserId)

  const { isConnected, lastUpdate } = useRealtimeUpdates(targetUserId)
  const { sendFriendRequest, acceptFriendRequest } = useCachedSocialActions(targetUserId)

  // Auto-refresh on real-time updates
  useEffect(() => {
    if (lastUpdate) {
      refreshFriends()
      refreshRequests()
    }
  }, [lastUpdate, refreshFriends, refreshRequests])

  // Enhanced friend request actions with optimistic updates
  const sendFriendRequestOptimistic = useCallback(async (targetId: string) => {
    try {
      // Optimistic update - add to sent requests immediately
      const optimisticRequest = {
        id: `temp-${Date.now()}`,
        requester_id: targetUserId,
        receiver_id: targetId,
        status: 'pending',
        created_at: new Date().toISOString(),
        receiver: { id: targetId } // Minimal profile data
      }

      // Update local state optimistically
      // Note: In a real implementation, you'd update the cached data
      
      await sendFriendRequest(targetId)
      
      // Refresh to get real data
      setTimeout(() => {
        refreshRequests()
        refreshFriends()
      }, 500)
      
    } catch (error) {
      // Revert optimistic update on error
      refreshRequests()
      throw error
    }
  }, [targetUserId, sendFriendRequest, refreshRequests, refreshFriends])

  const acceptFriendRequestOptimistic = useCallback(async (requesterId: string) => {
    try {
      await acceptFriendRequest(requesterId)
      
      // Refresh to get updated data
      setTimeout(() => {
        refreshRequests()
        refreshFriends()
      }, 500)
      
    } catch (error) {
      refreshRequests()
      throw error
    }
  }, [acceptFriendRequest, refreshRequests, refreshFriends])

  const loading = friendsLoading || requestsLoading
  const error = friendsError || requestsError

  return {
    friends,
    friendRequests,
    loading,
    error,
    isConnected,
    lastUpdate,
    sendFriendRequest: sendFriendRequestOptimistic,
    acceptFriendRequest: acceptFriendRequestOptimistic,
    refresh: useCallback(() => {
      refreshFriends()
      refreshRequests()
    }, [refreshFriends, refreshRequests])
  }
}

// Enhanced follows hook with caching and real-time updates
export function useEnhancedFollows(userId?: string) {
  const { user } = useAuth()
  const targetUserId = userId || user?.id
  
  const {
    followers,
    following,
    loading: followsLoading,
    error: followsError,
    refresh: refreshFollows
  } = useCachedFollows(targetUserId)

  const { isConnected, lastUpdate } = useRealtimeUpdates(targetUserId)
  const { followUser, unfollowUser } = useCachedSocialActions(targetUserId)

  // Auto-refresh on real-time updates
  useEffect(() => {
    if (lastUpdate) {
      refreshFollows()
    }
  }, [lastUpdate, refreshFollows])

  // Enhanced follow actions with optimistic updates
  const followUserOptimistic = useCallback(async (targetId: string) => {
    try {
      // Optimistic update - add to following immediately
      // Note: In a real implementation, you'd update the cached data
      
      await followUser(targetId)
      
      // Refresh to get real data
      setTimeout(() => {
        refreshFollows()
      }, 500)
      
    } catch (error) {
      refreshFollows()
      throw error
    }
  }, [followUser, refreshFollows])

  const unfollowUserOptimistic = useCallback(async (targetId: string) => {
    try {
      await unfollowUser(targetId)
      
      // Refresh to get updated data
      setTimeout(() => {
        refreshFollows()
      }, 500)
      
    } catch (error) {
      refreshFollows()
      throw error
    }
  }, [unfollowUser, refreshFollows])

  return {
    followers,
    following,
    loading: followsLoading,
    error: followsError,
    isConnected,
    lastUpdate,
    followUser: followUserOptimistic,
    unfollowUser: unfollowUserOptimistic,
    refresh: refreshFollows
  }
}

// Enhanced relationship hook with caching
export function useEnhancedRelationship(userId1?: string, userId2?: string) {
  const {
    relationship,
    loading,
    error,
    refresh
  } = useCachedRelationship(userId1, userId2)

  return {
    relationship,
    loading,
    error,
    refresh,
    // Convenience getters
    isFriend: relationship?.isFriend || false,
    isFollowing: relationship?.isFollowing || false,
    isFollower: relationship?.isFollower || false,
    friendshipStatus: relationship?.friendshipStatus || null
  }
}

// Social search hook with caching
export function useSocialSearch() {
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setLoading(true)
    setError(null)
    setSearchTerm(query)

    try {
      // First, check cache for any matching profiles
      const cachedResults: any[] = []
      
      // In a real implementation, you'd search the database
      // For now, we'll simulate a search
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // Mock search results
      const mockResults = [
        { id: '1', username: 'gamer_alice', display_name: 'Alice Chen', avatar_url: '/placeholder-user.jpg' },
        { id: '2', username: 'pro_bob', display_name: 'Bob Wilson', avatar_url: '/placeholder-user.jpg' },
        { id: '3', username: 'casual_carol', display_name: 'Carol Davis', avatar_url: '/placeholder-user.jpg' },
      ].filter(user => 
        user.username.toLowerCase().includes(query.toLowerCase()) ||
        user.display_name.toLowerCase().includes(query.toLowerCase())
      )

      // Cache the search results
      mockResults.forEach(user => {
        socialCache.set('profile', user.id, user, undefined, [`search:${query}`])
      })

      setSearchResults(mockResults)
    } catch (err) {
      console.error('Error searching users:', err)
      setError('Search failed')
      setSearchResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const clearSearch = useCallback(() => {
    setSearchResults([])
    setSearchTerm('')
    setError(null)
  }, [])

  return {
    searchResults,
    loading,
    error,
    searchTerm,
    searchUsers,
    clearSearch
  }
}

// Bulk social operations hook
export function useBulkSocialOperations() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  const bulkFollowUsers = useCallback(async (userIds: string[]) => {
    setLoading(true)
    setError(null)
    setProgress(0)

    try {
      for (let i = 0; i < userIds.length; i++) {
        // In a real implementation, you'd call the follow API
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Invalidate cache for each user
        socialCache.invalidateUserSocialData(userIds[i])
        
        setProgress((i + 1) / userIds.length * 100)
      }
    } catch (err) {
      console.error('Error in bulk follow:', err)
      setError('Bulk follow operation failed')
      throw err
    } finally {
      setLoading(false)
      setProgress(0)
    }
  }, [])

  const bulkUnfollowUsers = useCallback(async (userIds: string[]) => {
    setLoading(true)
    setError(null)
    setProgress(0)

    try {
      for (let i = 0; i < userIds.length; i++) {
        // In a real implementation, you'd call the unfollow API
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Invalidate cache for each user
        socialCache.invalidateUserSocialData(userIds[i])
        
        setProgress((i + 1) / userIds.length * 100)
      }
    } catch (err) {
      console.error('Error in bulk unfollow:', err)
      setError('Bulk unfollow operation failed')
      throw err
    } finally {
      setLoading(false)
      setProgress(0)
    }
  }, [])

  return {
    loading,
    error,
    progress,
    bulkFollowUsers,
    bulkUnfollowUsers
  }
}

// Social activity feed hook with caching
export function useEnhancedActivityFeed(userId?: string, feedType: 'personal' | 'friends' | 'following' | 'public' = 'friends') {
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)

  const loadActivities = useCallback(async (pageNum: number = 1, reset: boolean = false) => {
    setLoading(true)
    if (reset) {
      setError(null)
      setPage(1)
    }

    try {
      // Check cache first
      const cacheKey = `activities:${userId}:${feedType}:${pageNum}`
      let cachedActivities = socialCache.get('activity', cacheKey)

      if (!cachedActivities) {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Mock activity data
        cachedActivities = Array.from({ length: 10 }, (_, i) => ({
          id: `activity-${pageNum}-${i}`,
          type: ['game_added', 'review_posted', 'friend_added', 'achievement_earned'][Math.floor(Math.random() * 4)],
          user_id: userId,
          created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
          activity_data: {
            user_profile: {
              id: userId,
              username: 'current_user',
              display_name: 'Current User'
            }
          }
        }))

        // Cache the activities
        socialCache.set('activity', cacheKey, cachedActivities)
      }

      if (reset) {
        setActivities(cachedActivities)
      } else {
        setActivities(prev => [...prev, ...cachedActivities])
      }

      setHasMore(cachedActivities.length === 10) // Assume 10 is page size
      setPage(pageNum + 1)
    } catch (err) {
      console.error('Error loading activities:', err)
      setError('Failed to load activities')
    } finally {
      setLoading(false)
    }
  }, [userId, feedType])

  const refresh = useCallback(() => {
    loadActivities(1, true)
  }, [loadActivities])

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      loadActivities(page)
    }
  }, [loading, hasMore, page, loadActivities])

  // Initial load
  useEffect(() => {
    loadActivities(1, true)
  }, [loadActivities])

  return {
    activities,
    loading,
    error,
    hasMore,
    refresh,
    loadMore
  }
}
