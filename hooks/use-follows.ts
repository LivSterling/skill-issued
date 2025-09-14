import { useState, useCallback, useEffect } from 'react'
import { useAuth } from './use-auth'
import {
  followUserWithValidation,
  unfollowUserWithValidation,
  getFollowersWithValidation,
  getFollowingWithValidation,
  isUserFollowing,
  isUserFollowedBy,
  getFollowersCount,
  getFollowingCount,
  getFollowRelationship,
  getRecentFollowers,
  bulkFollowUsers,
  bulkUnfollowUsers
} from '@/lib/database/follows'
import type {
  FollowUserInput,
  UnfollowUserInput,
  GetFollowersInput,
  GetFollowingInput
} from '@/lib/validations/social-schemas'

// Types for the hook
interface FollowProfile {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  followed_at: string
}

interface FollowsState {
  followers: FollowProfile[]
  following: FollowProfile[]
  loading: boolean
  error: string | null
  followersCount: number
  followingCount: number
}

/**
 * Hook for managing follows and followers
 */
export function useFollows(userId?: string) {
  const { user } = useAuth()
  const targetUserId = userId || user?.id
  
  const [state, setState] = useState<FollowsState>({
    followers: [],
    following: [],
    loading: false,
    error: null,
    followersCount: 0,
    followingCount: 0
  })

  // Follow a user
  const followUser = useCallback(async (input: FollowUserInput) => {
    if (!user?.id) {
      return { success: false, error: 'User not authenticated' }
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const result = await followUserWithValidation(user.id, input)
      
      if (result.error) {
        setState(prev => ({ ...prev, loading: false, error: result.error!.message }))
        return { success: false, error: result.error.message }
      }

      // Update following count optimistically
      setState(prev => ({ 
        ...prev, 
        loading: false,
        followingCount: prev.followingCount + 1
      }))

      return { success: true, data: result.data }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to follow user'
      setState(prev => ({ ...prev, loading: false, error: errorMessage }))
      return { success: false, error: errorMessage }
    }
  }, [user?.id])

  // Unfollow a user
  const unfollowUser = useCallback(async (input: UnfollowUserInput) => {
    if (!user?.id) {
      return { success: false, error: 'User not authenticated' }
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const result = await unfollowUserWithValidation(user.id, input)
      
      if (result.error) {
        setState(prev => ({ ...prev, loading: false, error: result.error!.message }))
        return { success: false, error: result.error.message }
      }

      // Update following count optimistically
      setState(prev => ({ 
        ...prev, 
        loading: false,
        followingCount: Math.max(0, prev.followingCount - 1),
        following: prev.following.filter(profile => profile.id !== input.targetUserId)
      }))

      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to unfollow user'
      setState(prev => ({ ...prev, loading: false, error: errorMessage }))
      return { success: false, error: errorMessage }
    }
  }, [user?.id])

  // Refresh followers list
  const refreshFollowers = useCallback(async (options?: Partial<GetFollowersInput>) => {
    if (!targetUserId) return

    setState(prev => ({ ...prev, loading: true }))

    try {
      const input: GetFollowersInput = {
        userId: targetUserId,
        limit: 20,
        offset: 0,
        ...options
      }

      const result = await getFollowersWithValidation(input)
      
      if (result.error) {
        setState(prev => ({ ...prev, loading: false, error: result.error!.message }))
        return
      }

      // Also get the count
      const count = await getFollowersCount(targetUserId)

      setState(prev => ({
        ...prev,
        loading: false,
        followers: result.data || [],
        followersCount: count
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch followers'
      setState(prev => ({ ...prev, loading: false, error: errorMessage }))
    }
  }, [targetUserId])

  // Refresh following list
  const refreshFollowing = useCallback(async (options?: Partial<GetFollowingInput>) => {
    if (!targetUserId) return

    setState(prev => ({ ...prev, loading: true }))

    try {
      const input: GetFollowingInput = {
        userId: targetUserId,
        limit: 20,
        offset: 0,
        ...options
      }

      const result = await getFollowingWithValidation(input)
      
      if (result.error) {
        setState(prev => ({ ...prev, loading: false, error: result.error!.message }))
        return
      }

      // Also get the count
      const count = await getFollowingCount(targetUserId)

      setState(prev => ({
        ...prev,
        loading: false,
        following: result.data || [],
        followingCount: count
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch following'
      setState(prev => ({ ...prev, loading: false, error: errorMessage }))
    }
  }, [targetUserId])

  // Refresh counts only
  const refreshCounts = useCallback(async () => {
    if (!targetUserId) return

    try {
      const [followersCount, followingCount] = await Promise.all([
        getFollowersCount(targetUserId),
        getFollowingCount(targetUserId)
      ])

      setState(prev => ({
        ...prev,
        followersCount,
        followingCount
      }))
    } catch (error) {
      console.error('Error refreshing counts:', error)
    }
  }, [targetUserId])

  // Refresh all data
  const refreshAll = useCallback(async () => {
    await Promise.all([
      refreshFollowers(),
      refreshFollowing(),
      refreshCounts()
    ])
  }, [refreshFollowers, refreshFollowing, refreshCounts])

  // Load data on mount and when targetUserId changes
  useEffect(() => {
    if (targetUserId) {
      refreshAll()
    }
  }, [targetUserId, refreshAll])

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  return {
    // State
    followers: state.followers,
    following: state.following,
    loading: state.loading,
    error: state.error,
    followersCount: state.followersCount,
    followingCount: state.followingCount,

    // Actions
    followUser,
    unfollowUser,

    // Refresh functions
    refreshFollowers,
    refreshFollowing,
    refreshCounts,
    refreshAll,

    // Utility
    clearError,

    // Helper properties
    hasFollowers: state.followersCount > 0,
    hasFollowing: state.followingCount > 0,
    isOwnProfile: targetUserId === user?.id
  }
}

/**
 * Hook for checking follow relationship with another user
 */
export function useFollowRelationship(otherUserId?: string) {
  const { user } = useAuth()
  const [relationship, setRelationship] = useState<{
    isFollowing: boolean
    isFollowedBy: boolean
    followingSince?: string
    followedBySince?: string
    loading: boolean
    error: string | null
  }>({
    isFollowing: false,
    isFollowedBy: false,
    loading: false,
    error: null
  })

  const checkRelationship = useCallback(async () => {
    if (!user?.id || !otherUserId || user.id === otherUserId) {
      setRelationship(prev => ({ 
        ...prev, 
        isFollowing: false, 
        isFollowedBy: false, 
        loading: false 
      }))
      return
    }

    setRelationship(prev => ({ ...prev, loading: true, error: null }))

    try {
      const result = await getFollowRelationship(user.id, otherUserId)
      
      if (result.error) {
        setRelationship(prev => ({ 
          ...prev, 
          loading: false, 
          error: result.error!.message 
        }))
        return
      }

      setRelationship(prev => ({
        ...prev,
        loading: false,
        isFollowing: result.data!.isFollowing,
        isFollowedBy: result.data!.isFollowedBy,
        followingSince: result.data!.followingSince,
        followedBySince: result.data!.followedBySince
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to check relationship'
      setRelationship(prev => ({ ...prev, loading: false, error: errorMessage }))
    }
  }, [user?.id, otherUserId])

  // Follow/unfollow actions that update the relationship state
  const followUserAndUpdate = useCallback(async () => {
    if (!otherUserId) return { success: false, error: 'No user specified' }

    const result = await followUserWithValidation(user!.id, { targetUserId: otherUserId })
    
    if (result.error) {
      return { success: false, error: result.error.message }
    }

    // Update relationship state optimistically
    setRelationship(prev => ({
      ...prev,
      isFollowing: true,
      followingSince: new Date().toISOString()
    }))

    return { success: true }
  }, [user?.id, otherUserId])

  const unfollowUserAndUpdate = useCallback(async () => {
    if (!otherUserId) return { success: false, error: 'No user specified' }

    const result = await unfollowUserWithValidation(user!.id, { targetUserId: otherUserId })
    
    if (result.error) {
      return { success: false, error: result.error.message }
    }

    // Update relationship state optimistically
    setRelationship(prev => ({
      ...prev,
      isFollowing: false,
      followingSince: undefined
    }))

    return { success: true }
  }, [user?.id, otherUserId])

  useEffect(() => {
    checkRelationship()
  }, [checkRelationship])

  return {
    ...relationship,
    refresh: checkRelationship,
    followUser: followUserAndUpdate,
    unfollowUser: unfollowUserAndUpdate,
    canFollow: !relationship.isFollowing && user?.id !== otherUserId,
    canUnfollow: relationship.isFollowing,
    isMutualFollow: relationship.isFollowing && relationship.isFollowedBy
  }
}

/**
 * Simple hook to check if current user is following another user
 */
export function useIsFollowing(otherUserId?: string) {
  const { user } = useAuth()
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(false)

  const checkFollowing = useCallback(async () => {
    if (!user?.id || !otherUserId || user.id === otherUserId) {
      setIsFollowing(false)
      return
    }

    setLoading(true)

    try {
      const result = await isUserFollowing(user.id, otherUserId)
      setIsFollowing(result)
    } catch (error) {
      console.error('Error checking following status:', error)
      setIsFollowing(false)
    } finally {
      setLoading(false)
    }
  }, [user?.id, otherUserId])

  useEffect(() => {
    checkFollowing()
  }, [checkFollowing])

  return {
    isFollowing,
    loading,
    refresh: checkFollowing
  }
}

/**
 * Hook for bulk follow/unfollow operations
 */
export function useBulkFollows() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const bulkFollow = useCallback(async (userIds: string[]) => {
    if (!user?.id) {
      return { success: false, error: 'User not authenticated' }
    }

    setLoading(true)
    setError(null)

    try {
      const result = await bulkFollowUsers(user.id, userIds)
      
      if (result.error) {
        setError(result.error.message)
        setLoading(false)
        return { success: false, error: result.error.message }
      }

      setLoading(false)
      return { 
        success: true, 
        data: result.data,
        successCount: result.data!.successful.length,
        failureCount: result.data!.failed.length
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to follow users'
      setError(errorMessage)
      setLoading(false)
      return { success: false, error: errorMessage }
    }
  }, [user?.id])

  const bulkUnfollow = useCallback(async (userIds: string[]) => {
    if (!user?.id) {
      return { success: false, error: 'User not authenticated' }
    }

    setLoading(true)
    setError(null)

    try {
      const result = await bulkUnfollowUsers(user.id, userIds)
      
      if (result.error) {
        setError(result.error.message)
        setLoading(false)
        return { success: false, error: result.error.message }
      }

      setLoading(false)
      return { 
        success: true, 
        data: result.data,
        successCount: result.data!.successful.length,
        failureCount: result.data!.failed.length
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to unfollow users'
      setError(errorMessage)
      setLoading(false)
      return { success: false, error: errorMessage }
    }
  }, [user?.id])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    loading,
    error,
    bulkFollow,
    bulkUnfollow,
    clearError
  }
}

/**
 * Hook for getting recent followers
 */
export function useRecentFollowers(userId?: string, limit = 5) {
  const { user } = useAuth()
  const targetUserId = userId || user?.id
  const [recentFollowers, setRecentFollowers] = useState<FollowProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchRecentFollowers = useCallback(async () => {
    if (!targetUserId) return

    setLoading(true)
    setError(null)

    try {
      const result = await getRecentFollowers(targetUserId, limit)
      
      if (result.error) {
        setError(result.error.message)
        setRecentFollowers([])
      } else {
        setRecentFollowers(result.data || [])
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch recent followers'
      setError(errorMessage)
      setRecentFollowers([])
    } finally {
      setLoading(false)
    }
  }, [targetUserId, limit])

  useEffect(() => {
    fetchRecentFollowers()
  }, [fetchRecentFollowers])

  return {
    recentFollowers,
    loading,
    error,
    refresh: fetchRecentFollowers,
    hasRecentFollowers: recentFollowers.length > 0
  }
}
