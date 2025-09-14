import { useCallback, useMemo } from 'react'
import { useAuth } from './use-auth'
import { useProfileContext } from '@/contexts/profile-context'
import type { 
  ExtendedProfile, 
  UpdateProfileData,
  ProfileSearchFilters,
  ProfileSearchOptions
} from '@/lib/database/types'

/**
 * Enhanced profile hook that leverages the profile context
 * This provides better performance through caching and centralized state management
 */
export function useProfileEnhanced(userId?: string) {
  const { user } = useAuth()
  const {
    currentProfile,
    currentProfileLoading,
    currentProfileError,
    getProfileById,
    getCachedProfile,
    updateCurrentProfile,
    refreshCurrentProfile
  } = useProfileContext()

  const targetUserId = userId || user?.id
  const isOwnProfile = targetUserId === user?.id

  // Get profile data
  const profile = useMemo(() => {
    if (isOwnProfile) {
      return currentProfile
    }
    
    if (targetUserId) {
      return getCachedProfile(targetUserId)
    }
    
    return null
  }, [isOwnProfile, currentProfile, targetUserId, getCachedProfile])

  // Loading state
  const loading = useMemo(() => {
    if (isOwnProfile) {
      return currentProfileLoading
    }
    
    // For other users, we consider it loading if we don't have cached data
    return !profile && !!targetUserId
  }, [isOwnProfile, currentProfileLoading, profile, targetUserId])

  // Error state
  const error = useMemo(() => {
    if (isOwnProfile) {
      return currentProfileError
    }
    
    // For other users, we don't track individual errors in the context
    return null
  }, [isOwnProfile, currentProfileError])

  // Fetch profile (with caching)
  const fetchProfile = useCallback(async (extended = true) => {
    if (!targetUserId) return { success: false, error: 'No user ID provided' }
    
    if (isOwnProfile) {
      await refreshCurrentProfile()
      return { success: true, data: currentProfile }
    }
    
    const profileData = await getProfileById(targetUserId, extended)
    return { 
      success: !!profileData, 
      data: profileData,
      error: profileData ? undefined : 'Failed to fetch profile'
    }
  }, [targetUserId, isOwnProfile, refreshCurrentProfile, currentProfile, getProfileById])

  // Update profile
  const updateProfile = useCallback(async (data: UpdateProfileData) => {
    if (!isOwnProfile) {
      return { success: false, error: 'Can only update own profile' }
    }
    
    return await updateCurrentProfile(data)
  }, [isOwnProfile, updateCurrentProfile])

  // Refresh profile
  const refreshProfile = useCallback(async () => {
    return await fetchProfile(true)
  }, [fetchProfile])

  return {
    profile,
    loading,
    error,
    fetchProfile,
    updateProfile,
    refreshProfile,
    isOwnProfile
  }
}

/**
 * Hook for profile search functionality
 */
export function useProfileSearch() {
  const {
    searchResults,
    searchLoading,
    searchError,
    searchUsers,
    clearSearchResults
  } = useProfileContext()

  const search = useCallback(async (
    filters: ProfileSearchFilters, 
    options?: ProfileSearchOptions
  ) => {
    return await searchUsers(filters, options)
  }, [searchUsers])

  return {
    results: searchResults,
    loading: searchLoading,
    error: searchError,
    search,
    clearResults: clearSearchResults
  }
}

/**
 * Hook for social features (friends, followers, following)
 */
export function useProfileSocial() {
  const {
    friends,
    followers,
    following,
    friendsLoading,
    followersLoading,
    followingLoading,
    refreshSocialData,
    sendFriendRequestTo,
    acceptFriendRequest,
    declineFriendRequest,
    removeFriend,
    followUserById,
    unfollowUserById
  } = useProfileContext()

  // Check if user is friend
  const isFriend = useCallback((userId: string) => {
    return friends.some(friend => friend.id === userId)
  }, [friends])

  // Check if user is followed
  const isFollowing = useCallback((userId: string) => {
    return following.some(user => user.id === userId)
  }, [following])

  // Check if user follows current user
  const isFollower = useCallback((userId: string) => {
    return followers.some(user => user.id === userId)
  }, [followers])

  // Get social stats
  const socialStats = useMemo(() => ({
    friendsCount: friends.length,
    followersCount: followers.length,
    followingCount: following.length
  }), [friends.length, followers.length, following.length])

  return {
    // Data
    friends,
    followers,
    following,
    socialStats,
    
    // Loading states
    friendsLoading,
    followersLoading,
    followingLoading,
    
    // Helper functions
    isFriend,
    isFollowing,
    isFollower,
    
    // Actions
    refreshSocialData,
    sendFriendRequest: sendFriendRequestTo,
    acceptFriendRequest,
    declineFriendRequest,
    removeFriend,
    followUser: followUserById,
    unfollowUser: unfollowUserById
  }
}

/**
 * Hook for profile cache management
 */
export function useProfileCache() {
  const {
    profileCache,
    getProfileById,
    getCachedProfile,
    clearProfileCache
  } = useProfileContext()

  const cacheSize = profileCache.size

  const preloadProfile = useCallback(async (userId: string, extended = true) => {
    return await getProfileById(userId, extended)
  }, [getProfileById])

  const hasCachedProfile = useCallback((userId: string) => {
    return !!getCachedProfile(userId)
  }, [getCachedProfile])

  return {
    cacheSize,
    preloadProfile,
    hasCachedProfile,
    getCachedProfile,
    clearCache: clearProfileCache
  }
}
