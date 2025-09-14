import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from './use-auth'
import { useProfileContext } from '@/contexts/profile-context'
import { 
  getProfile, 
  getExtendedProfile, 
  updateProfile as updateProfileQuery, 
  createProfile,
  searchProfiles
} from '@/lib/database/queries'
import type { 
  Profile, 
  ExtendedProfile, 
  UpdateProfileData, 
  CreateProfileData,
  ProfileSearchFilters,
  ProfileSearchOptions
} from '@/lib/database/types'

/**
 * Enhanced profile management hook that leverages the profile context
 * for better performance and centralized state management
 */
export function useProfile(userId?: string) {
  const { user, isAuthenticated } = useAuth()
  const {
    currentProfile,
    currentProfileLoading,
    currentProfileError,
    getProfileById,
    getCachedProfile,
    updateCurrentProfile,
    refreshCurrentProfile
  } = useProfileContext()

  // Local state for non-current user profiles
  const [localProfile, setLocalProfile] = useState<ExtendedProfile | null>(null)
  const [localLoading, setLocalLoading] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const targetUserId = userId || user?.id
  const isOwnProfile = targetUserId === user?.id

  // Memoized profile data
  const profile = useMemo(() => {
    if (isOwnProfile) {
      return currentProfile
    }
    return localProfile || getCachedProfile(targetUserId || '')
  }, [isOwnProfile, currentProfile, localProfile, getCachedProfile, targetUserId])

  // Memoized loading state
  const loading = useMemo(() => {
    if (isOwnProfile) {
      return currentProfileLoading
    }
    return localLoading
  }, [isOwnProfile, currentProfileLoading, localLoading])

  // Memoized error state
  const error = useMemo(() => {
    if (isOwnProfile) {
      return currentProfileError
    }
    return localError
  }, [isOwnProfile, currentProfileError, localError])

  // Fetch profile data
  const fetchProfile = useCallback(async (id?: string, extended = true) => {
    const profileId = id || targetUserId
    if (!profileId) {
      return { success: false, error: 'No user ID provided' }
    }

    if (profileId === user?.id) {
      // Use context for current user
      await refreshCurrentProfile()
      return { success: true, data: currentProfile }
    }

    // Handle other users
    setLocalLoading(true)
    setLocalError(null)

    try {
      const profileData = await getProfileById(profileId, extended)
      if (profileData) {
        setLocalProfile(profileData)
        return { success: true, data: profileData }
      } else {
        setLocalError('Profile not found')
        return { success: false, error: 'Profile not found' }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch profile'
      setLocalError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLocalLoading(false)
    }
  }, [targetUserId, user?.id, refreshCurrentProfile, currentProfile, getProfileById])

  // Update profile
  const updateUserProfile = useCallback(async (updates: UpdateProfileData) => {
    if (!targetUserId) {
      return { success: false, error: 'No user ID provided' }
    }

    if (isOwnProfile) {
      // Use context for current user
      return await updateCurrentProfile(updates)
    }

    // For other users, we can't update their profiles
    return { success: false, error: 'Cannot update other users\' profiles' }
  }, [targetUserId, isOwnProfile, updateCurrentProfile])

  // Create profile (only for current user)
  const createUserProfile = useCallback(async (profileData: CreateProfileData) => {
    if (!user?.id) {
      return { success: false, error: 'User not authenticated' }
    }

    if (!isOwnProfile) {
      return { success: false, error: 'Can only create own profile' }
    }

    try {
      const { data, error: createError } = await createProfile(user.id, profileData)
      if (createError) {
        return { success: false, error: createError.message || 'Failed to create profile' }
      }

      // Refresh current profile to get the created profile
      await refreshCurrentProfile()
      return { success: true, data }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create profile'
      return { success: false, error: errorMessage }
    }
  }, [user?.id, isOwnProfile, refreshCurrentProfile])

  // Refresh profile
  const refreshProfile = useCallback(async () => {
    return await fetchProfile(targetUserId, true)
  }, [fetchProfile, targetUserId])

  // Load profile on mount or user change
  useEffect(() => {
    if (targetUserId && isAuthenticated) {
      // For current user, the context handles loading automatically
      if (!isOwnProfile) {
        fetchProfile(targetUserId, true)
      }
    } else {
      // Clear local state when no user
      setLocalProfile(null)
      setLocalError(null)
      setLocalLoading(false)
    }
  }, [targetUserId, isAuthenticated, isOwnProfile, fetchProfile])

  // Clear local state when switching to own profile
  useEffect(() => {
    if (isOwnProfile) {
      setLocalProfile(null)
      setLocalError(null)
      setLocalLoading(false)
    }
  }, [isOwnProfile])

  return {
    profile,
    extendedProfile: profile, // For backward compatibility
    loading,
    error,
    fetchProfile,
    updateProfile: updateUserProfile,
    createProfile: createUserProfile,
    refreshProfile,
    // Helper properties
    hasProfile: !!profile,
    isOwnProfile,
    canEdit: isAuthenticated && isOwnProfile
  }
}

/**
 * Profile search hook that leverages the profile context for better performance
 */
export function useProfileSearch() {
  const {
    searchResults,
    searchLoading,
    searchError,
    searchUsers: contextSearchUsers,
    clearSearchResults
  } = useProfileContext()

  const searchUsers = useCallback(async (
    filters: ProfileSearchFilters = {},
    options: ProfileSearchOptions = {}
  ) => {
    return await contextSearchUsers(filters, options)
  }, [contextSearchUsers])

  return {
    results: searchResults,
    loading: searchLoading,
    error: searchError,
    totalCount: searchResults.length, // Context doesn't track total count separately
    searchUsers,
    clearResults: clearSearchResults,
    hasResults: searchResults.length > 0
  }
}

/**
 * Social features hook that leverages the profile context for better performance
 */
export function useSocialFeatures(userId?: string) {
  const { user } = useAuth()
  const {
    friends,
    followers,
    following,
    friendsLoading,
    followersLoading,
    followingLoading,
    refreshSocialData: contextRefreshSocialData,
    sendFriendRequestTo,
    acceptFriendRequest,
    declineFriendRequest,
    removeFriend,
    followUserById,
    unfollowUserById
  } = useProfileContext()

  const targetUserId = userId || user?.id
  const isOwnSocialData = targetUserId === user?.id

  // For now, we only support social data for the current user through context
  // For other users, we'd need to fetch their social data separately
  const [otherUserSocialData, setOtherUserSocialData] = useState<{
    friends: Profile[]
    followers: Profile[]
    following: Profile[]
    loading: boolean
    error: string | null
  }>({
    friends: [],
    followers: [],
    following: [],
    loading: false,
    error: null
  })

  // If viewing another user's social data, we need to fetch it separately
  // This is a simplified implementation - in a real app you might want to extend the context
  const fetchOtherUserSocialData = useCallback(async (userId: string) => {
    if (userId === user?.id) return // Use context data for current user

    setOtherUserSocialData(prev => ({ ...prev, loading: true, error: null }))

    try {
      // Note: These functions would need to be imported if we want to support other users
      // For now, we'll just return empty data
      setOtherUserSocialData({
        friends: [],
        followers: [],
        following: [],
        loading: false,
        error: null
      })
    } catch (err) {
      setOtherUserSocialData(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to fetch social data'
      }))
    }
  }, [user?.id])

  // Get the appropriate social data based on whether it's own data or other user's data
  const socialData = useMemo(() => {
    if (isOwnSocialData) {
      return {
        friends,
        followers,
        following,
        loading: friendsLoading || followersLoading || followingLoading,
        error: null // Context doesn't expose individual errors
      }
    } else {
      return otherUserSocialData
    }
  }, [isOwnSocialData, friends, followers, following, friendsLoading, followersLoading, followingLoading, otherUserSocialData])

  // Refresh social data
  const refreshSocialData = useCallback(async () => {
    if (isOwnSocialData) {
      await contextRefreshSocialData()
    } else if (targetUserId) {
      await fetchOtherUserSocialData(targetUserId)
    }
  }, [isOwnSocialData, contextRefreshSocialData, targetUserId, fetchOtherUserSocialData])

  // Load social data on mount for other users
  useEffect(() => {
    if (targetUserId && !isOwnSocialData) {
      fetchOtherUserSocialData(targetUserId)
    }
  }, [targetUserId, isOwnSocialData, fetchOtherUserSocialData])

  return {
    friends: socialData.friends,
    followers: socialData.followers,
    following: socialData.following,
    loading: socialData.loading,
    error: socialData.error,
    sendFriendRequest: sendFriendRequestTo,
    acceptFriendRequest,
    declineFriendRequest,
    removeFriend,
    followUser: followUserById,
    unfollowUser: unfollowUserById,
    refreshSocialData,
    // Counts
    friendsCount: socialData.friends.length,
    followersCount: socialData.followers.length,
    followingCount: socialData.following.length,
    // Helper properties
    isOwnSocialData
  }
}

// Combined hook for comprehensive profile management
export function useProfileManagement(userId?: string) {
  const profileHook = useProfile(userId)
  const socialHook = useSocialFeatures(userId)

  return {
    ...profileHook,
    social: {
      ...socialHook
    },
    // Combined loading state
    isLoading: profileHook.loading || socialHook.loading,
    // Combined error state
    hasError: !!profileHook.error || !!socialHook.error,
    errors: [profileHook.error, socialHook.error].filter(Boolean)
  }
}
