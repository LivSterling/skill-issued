"use client"

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { profileCacheManager, type CacheStrategy } from '@/lib/cache/cache-manager'
import { profileCache } from '@/lib/cache/profile-cache'
import { 
  getProfile, 
  getExtendedProfile, 
  updateProfile as updateProfileQuery, 
  createProfile,
  searchProfiles,
  getUserFriends,
  getUserFollowers,
  getUserFollowing,
  sendFriendRequest,
  updateFriendshipStatus,
  removeFriendship,
  followUser,
  unfollowUser
} from '@/lib/database/queries'
import type { 
  Profile, 
  ExtendedProfile, 
  UpdateProfileData, 
  CreateProfileData,
  ProfileSearchFilters,
  ProfileSearchOptions,
  Friendship,
  Follow
} from '@/lib/database/types'

// Profile cache entry
interface ProfileCacheEntry {
  profile: ExtendedProfile
  timestamp: number
  extended: boolean
}

// Profile context state
interface ProfileContextState {
  // Current user's profile
  currentProfile: ExtendedProfile | null
  currentProfileLoading: boolean
  currentProfileError: string | null
  
  // Profile cache for other users
  profileCache: Map<string, ProfileCacheEntry>
  
  // Social data
  friends: Profile[]
  followers: Profile[]
  following: Profile[]
  friendsLoading: boolean
  followersLoading: boolean
  followingLoading: boolean
  
  // Search state
  searchResults: Profile[]
  searchLoading: boolean
  searchError: string | null
  
  // UI state
  refreshing: boolean
}

// Profile context actions
interface ProfileContextActions {
  // Profile management
  refreshCurrentProfile: () => Promise<void>
  updateCurrentProfile: (data: UpdateProfileData) => Promise<{ success: boolean; error?: string; data?: ExtendedProfile }>
  
  // Profile fetching
  getProfileById: (userId: string, extended?: boolean) => Promise<ExtendedProfile | null>
  getCachedProfile: (userId: string) => ExtendedProfile | null
  clearProfileCache: (userId?: string) => void
  
  // Social actions
  refreshSocialData: () => Promise<void>
  sendFriendRequestTo: (userId: string) => Promise<{ success: boolean; error?: string }>
  acceptFriendRequest: (userId: string) => Promise<{ success: boolean; error?: string }>
  declineFriendRequest: (userId: string) => Promise<{ success: boolean; error?: string }>
  removeFriend: (userId: string) => Promise<{ success: boolean; error?: string }>
  followUserById: (userId: string) => Promise<{ success: boolean; error?: string }>
  unfollowUserById: (userId: string) => Promise<{ success: boolean; error?: string }>
  
  // Search
  searchUsers: (filters: ProfileSearchFilters, options?: ProfileSearchOptions) => Promise<{ success: boolean; error?: string; results?: Profile[] }>
  clearSearchResults: () => void
}

// Combined context type
type ProfileContextType = ProfileContextState & ProfileContextActions

// Create context
const ProfileContext = createContext<ProfileContextType | undefined>(undefined)

// Custom hook to use profile context
export function useProfileContext() {
  const context = useContext(ProfileContext)
  if (context === undefined) {
    throw new Error('useProfileContext must be used within a ProfileProvider')
  }
  return context
}

// Profile provider props
interface ProfileProviderProps {
  children: React.ReactNode
  cacheTimeout?: number // Cache timeout in milliseconds (default: 5 minutes)
}

// Profile provider component
export function ProfileProvider({ 
  children, 
  cacheTimeout = 5 * 60 * 1000 // 5 minutes
}: ProfileProviderProps) {
  const { user, isAuthenticated } = useAuth()
  
  // State
  const [state, setState] = useState<ProfileContextState>({
    currentProfile: null,
    currentProfileLoading: false,
    currentProfileError: null,
    profileCache: new Map(),
    friends: [],
    followers: [],
    following: [],
    friendsLoading: false,
    followersLoading: false,
    followingLoading: false,
    searchResults: [],
    searchLoading: false,
    searchError: null,
    refreshing: false
  })

  // Helper function to update state
  const updateState = useCallback((updates: Partial<ProfileContextState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }, [])

  // Check if cache entry is valid
  const isCacheValid = useCallback((entry: ProfileCacheEntry): boolean => {
    return Date.now() - entry.timestamp < cacheTimeout
  }, [cacheTimeout])

  // Refresh current user's profile
  const refreshCurrentProfile = useCallback(async () => {
    if (!user?.id || !isAuthenticated) {
      updateState({
        currentProfile: null,
        currentProfileError: null,
        currentProfileLoading: false
      })
      return
    }

    updateState({ currentProfileLoading: true, currentProfileError: null })

    try {
      const { data, error } = await getExtendedProfile(user.id, user.id)
      
      if (error) {
        updateState({
          currentProfileError: error.message || 'Failed to load profile',
          currentProfileLoading: false
        })
      } else {
        updateState({
          currentProfile: data,
          currentProfileError: null,
          currentProfileLoading: false
        })

        // Update cache
        setState(prev => {
          const newCache = new Map(prev.profileCache)
          newCache.set(user.id, {
            profile: data,
            timestamp: Date.now(),
            extended: true
          })
          return { ...prev, profileCache: newCache }
        })
      }
    } catch (error) {
      updateState({
        currentProfileError: error instanceof Error ? error.message : 'Failed to load profile',
        currentProfileLoading: false
      })
    }
  }, [user?.id, isAuthenticated, updateState])

  // Update current user's profile
  const updateCurrentProfile = useCallback(async (data: UpdateProfileData) => {
    if (!user?.id || !isAuthenticated) {
      return { success: false, error: 'Not authenticated' }
    }

    try {
      const result = await updateProfileQuery(user.id, data)
      
      if (result.success && result.data) {
        // Update current profile
        updateState({ currentProfile: result.data })
        
        // Update cache
        setState(prev => {
          const newCache = new Map(prev.profileCache)
          newCache.set(user.id, {
            profile: result.data!,
            timestamp: Date.now(),
            extended: true
          })
          return { ...prev, profileCache: newCache }
        })

        return { success: true, data: result.data }
      } else {
        return { success: false, error: result.error || 'Failed to update profile' }
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update profile' 
      }
    }
  }, [user?.id, isAuthenticated, updateState])

  // Get profile by ID (with advanced caching)
  const getProfileById = useCallback(async (userId: string, extended = true): Promise<ExtendedProfile | null> => {
    const fetchFunction = async (id: string) => {
      const { data, error } = extended 
        ? await getExtendedProfile(id, user?.id)
        : await getProfile(id)
      
      if (error || !data) {
        return null
      }
      
      return data
    }

    // Use cache manager with cache-first strategy
    return await profileCacheManager.getProfile(userId, fetchFunction, 'cache-first', extended)
  }, [user?.id])

  // Get cached profile
  const getCachedProfile = useCallback((userId: string): ExtendedProfile | null => {
    return profileCache.get(userId, true)
  }, [])

  // Clear profile cache
  const clearProfileCache = useCallback((userId?: string) => {
    if (userId) {
      profileCache.delete(userId)
    } else {
      profileCache.clear()
    }
  }, [])

  // Refresh social data
  const refreshSocialData = useCallback(async () => {
    if (!user?.id || !isAuthenticated) return

    updateState({
      friendsLoading: true,
      followersLoading: true,
      followingLoading: true
    })

    try {
      const [friendsResult, followersResult, followingResult] = await Promise.allSettled([
        getUserFriends(user.id),
        getUserFollowers(user.id),
        getUserFollowing(user.id)
      ])

      const friends = friendsResult.status === 'fulfilled' && friendsResult.value.success 
        ? friendsResult.value.data || [] 
        : []
      
      const followers = followersResult.status === 'fulfilled' && followersResult.value.success 
        ? followersResult.value.data || [] 
        : []
      
      const following = followingResult.status === 'fulfilled' && followingResult.value.success 
        ? followingResult.value.data || [] 
        : []

      updateState({
        friends,
        followers,
        following,
        friendsLoading: false,
        followersLoading: false,
        followingLoading: false
      })
    } catch (error) {
      updateState({
        friendsLoading: false,
        followersLoading: false,
        followingLoading: false
      })
    }
  }, [user?.id, isAuthenticated, updateState])

  // Social action helpers
  const sendFriendRequestTo = useCallback(async (userId: string) => {
    if (!user?.id || !isAuthenticated) {
      return { success: false, error: 'Not authenticated' }
    }

    try {
      const result = await sendFriendRequest(user.id, userId)
      if (result.success) {
        // Refresh social data to update UI
        refreshSocialData()
      }
      return result
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send friend request' 
      }
    }
  }, [user?.id, isAuthenticated, refreshSocialData])

  const acceptFriendRequest = useCallback(async (userId: string) => {
    if (!user?.id || !isAuthenticated) {
      return { success: false, error: 'Not authenticated' }
    }

    try {
      const result = await updateFriendshipStatus(userId, user.id, 'accepted')
      if (result.success) {
        refreshSocialData()
      }
      return result
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to accept friend request' 
      }
    }
  }, [user?.id, isAuthenticated, refreshSocialData])

  const declineFriendRequest = useCallback(async (userId: string) => {
    if (!user?.id || !isAuthenticated) {
      return { success: false, error: 'Not authenticated' }
    }

    try {
      const result = await updateFriendshipStatus(userId, user.id, 'declined')
      if (result.success) {
        refreshSocialData()
      }
      return result
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to decline friend request' 
      }
    }
  }, [user?.id, isAuthenticated, refreshSocialData])

  const removeFriend = useCallback(async (userId: string) => {
    if (!user?.id || !isAuthenticated) {
      return { success: false, error: 'Not authenticated' }
    }

    try {
      const result = await removeFriendship(user.id, userId)
      if (result.success) {
        refreshSocialData()
      }
      return result
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to remove friend' 
      }
    }
  }, [user?.id, isAuthenticated, refreshSocialData])

  const followUserById = useCallback(async (userId: string) => {
    if (!user?.id || !isAuthenticated) {
      return { success: false, error: 'Not authenticated' }
    }

    try {
      const result = await followUser(user.id, userId)
      if (result.success) {
        refreshSocialData()
      }
      return result
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to follow user' 
      }
    }
  }, [user?.id, isAuthenticated, refreshSocialData])

  const unfollowUserById = useCallback(async (userId: string) => {
    if (!user?.id || !isAuthenticated) {
      return { success: false, error: 'Not authenticated' }
    }

    try {
      const result = await unfollowUser(user.id, userId)
      if (result.success) {
        refreshSocialData()
      }
      return result
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to unfollow user' 
      }
    }
  }, [user?.id, isAuthenticated, refreshSocialData])

  // Search users
  const searchUsers = useCallback(async (filters: ProfileSearchFilters, options?: ProfileSearchOptions) => {
    updateState({ searchLoading: true, searchError: null })

    try {
      const result = await searchProfiles(filters, options)
      
      if (result.success) {
        updateState({
          searchResults: result.data || [],
          searchLoading: false,
          searchError: null
        })
        return { success: true, results: result.data }
      } else {
        updateState({
          searchResults: [],
          searchLoading: false,
          searchError: result.error || 'Search failed'
        })
        return { success: false, error: result.error }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Search failed'
      updateState({
        searchResults: [],
        searchLoading: false,
        searchError: errorMessage
      })
      return { success: false, error: errorMessage }
    }
  }, [updateState])

  // Clear search results
  const clearSearchResults = useCallback(() => {
    updateState({
      searchResults: [],
      searchError: null
    })
  }, [updateState])

  // Load current profile on auth state change
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      refreshCurrentProfile()
      refreshSocialData()
    } else {
      updateState({
        currentProfile: null,
        currentProfileError: null,
        currentProfileLoading: false,
        friends: [],
        followers: [],
        following: [],
        friendsLoading: false,
        followersLoading: false,
        followingLoading: false
      })
    }
  }, [isAuthenticated, user?.id, refreshCurrentProfile, refreshSocialData, updateState])

  // Cache cleanup effect
  useEffect(() => {
    const interval = setInterval(() => {
      setState(prev => {
        const newCache = new Map()
        const now = Date.now()
        
        for (const [userId, entry] of prev.profileCache.entries()) {
          if (now - entry.timestamp < cacheTimeout) {
            newCache.set(userId, entry)
          }
        }
        
        return { ...prev, profileCache: newCache }
      })
    }, cacheTimeout) // Clean up expired entries periodically

    return () => clearInterval(interval)
  }, [cacheTimeout])

  // Context value
  const contextValue: ProfileContextType = {
    // State
    ...state,
    
    // Actions
    refreshCurrentProfile,
    updateCurrentProfile,
    getProfileById,
    getCachedProfile,
    clearProfileCache,
    refreshSocialData,
    sendFriendRequestTo,
    acceptFriendRequest,
    declineFriendRequest,
    removeFriend,
    followUserById,
    unfollowUserById,
    searchUsers,
    clearSearchResults
  }

  return (
    <ProfileContext.Provider value={contextValue}>
      {children}
    </ProfileContext.Provider>
  )
}
