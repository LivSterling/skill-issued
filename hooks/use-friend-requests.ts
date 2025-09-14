import { useState, useCallback, useEffect } from 'react'
import { useAuth } from './use-auth'
import {
  sendFriendRequestWithValidation,
  acceptFriendRequestWithValidation,
  declineFriendRequestWithValidation,
  cancelFriendRequestWithValidation,
  removeFriendWithValidation,
  getPendingFriendRequestsWithPagination,
  getSentFriendRequestsWithPagination,
  getFriendshipStatusBetweenUsers,
  getFriendsListWithProfiles,
  areUsersFriends,
  getFriendsCount
} from '@/lib/database/friend-requests'
import type {
  SendFriendRequestInput,
  RespondToFriendRequestInput,
  RemoveFriendInput
} from '@/lib/validations/social-schemas'

// Types for the hook
interface FriendRequest {
  id: string
  user_id: string
  friend_id: string
  status: 'pending' | 'accepted' | 'declined' | 'blocked'
  created_at: string
  sender_profile?: any
  recipient_profile?: any
}

interface FriendProfile {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  friendship_date: string
}

interface FriendRequestsState {
  pendingRequests: FriendRequest[]
  sentRequests: FriendRequest[]
  friends: FriendProfile[]
  loading: boolean
  error: string | null
}

/**
 * Hook for managing friend requests and friendships
 */
export function useFriendRequests() {
  const { user } = useAuth()
  const [state, setState] = useState<FriendRequestsState>({
    pendingRequests: [],
    sentRequests: [],
    friends: [],
    loading: false,
    error: null
  })

  // Send a friend request
  const sendFriendRequest = useCallback(async (input: SendFriendRequestInput) => {
    if (!user?.id) {
      return { success: false, error: 'User not authenticated' }
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const result = await sendFriendRequestWithValidation(user.id, input)
      
      if (result.error) {
        setState(prev => ({ ...prev, loading: false, error: result.error!.message }))
        return { success: false, error: result.error.message }
      }

      setState(prev => ({ ...prev, loading: false }))
      return { success: true, data: result.data }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send friend request'
      setState(prev => ({ ...prev, loading: false, error: errorMessage }))
      return { success: false, error: errorMessage }
    }
  }, [user?.id])

  // Accept a friend request
  const acceptFriendRequest = useCallback(async (input: RespondToFriendRequestInput) => {
    if (!user?.id) {
      return { success: false, error: 'User not authenticated' }
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const result = await acceptFriendRequestWithValidation(user.id, input)
      
      if (result.error) {
        setState(prev => ({ ...prev, loading: false, error: result.error!.message }))
        return { success: false, error: result.error.message }
      }

      // Remove from pending requests and refresh friends list
      setState(prev => ({
        ...prev,
        loading: false,
        pendingRequests: prev.pendingRequests.filter(req => req.id !== input.requestId)
      }))

      // Refresh friends list
      await refreshFriendsList()
      
      return { success: true, data: result.data }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to accept friend request'
      setState(prev => ({ ...prev, loading: false, error: errorMessage }))
      return { success: false, error: errorMessage }
    }
  }, [user?.id])

  // Decline a friend request
  const declineFriendRequest = useCallback(async (input: RespondToFriendRequestInput) => {
    if (!user?.id) {
      return { success: false, error: 'User not authenticated' }
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const result = await declineFriendRequestWithValidation(user.id, input)
      
      if (result.error) {
        setState(prev => ({ ...prev, loading: false, error: result.error!.message }))
        return { success: false, error: result.error.message }
      }

      // Remove from pending requests
      setState(prev => ({
        ...prev,
        loading: false,
        pendingRequests: prev.pendingRequests.filter(req => req.id !== input.requestId)
      }))
      
      return { success: true, data: result.data }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to decline friend request'
      setState(prev => ({ ...prev, loading: false, error: errorMessage }))
      return { success: false, error: errorMessage }
    }
  }, [user?.id])

  // Cancel a sent friend request
  const cancelFriendRequest = useCallback(async (requestId: string) => {
    if (!user?.id) {
      return { success: false, error: 'User not authenticated' }
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const result = await cancelFriendRequestWithValidation(user.id, requestId)
      
      if (result.error) {
        setState(prev => ({ ...prev, loading: false, error: result.error!.message }))
        return { success: false, error: result.error.message }
      }

      // Remove from sent requests
      setState(prev => ({
        ...prev,
        loading: false,
        sentRequests: prev.sentRequests.filter(req => req.id !== requestId)
      }))
      
      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel friend request'
      setState(prev => ({ ...prev, loading: false, error: errorMessage }))
      return { success: false, error: errorMessage }
    }
  }, [user?.id])

  // Remove a friend
  const removeFriend = useCallback(async (input: RemoveFriendInput) => {
    if (!user?.id) {
      return { success: false, error: 'User not authenticated' }
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const result = await removeFriendWithValidation(user.id, input)
      
      if (result.error) {
        setState(prev => ({ ...prev, loading: false, error: result.error!.message }))
        return { success: false, error: result.error.message }
      }

      // Remove from friends list
      setState(prev => ({
        ...prev,
        loading: false,
        friends: prev.friends.filter(friend => friend.id !== input.friendId)
      }))
      
      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove friend'
      setState(prev => ({ ...prev, loading: false, error: errorMessage }))
      return { success: false, error: errorMessage }
    }
  }, [user?.id])

  // Refresh pending friend requests
  const refreshPendingRequests = useCallback(async () => {
    if (!user?.id) return

    setState(prev => ({ ...prev, loading: true }))

    try {
      const result = await getPendingFriendRequestsWithPagination(user.id)
      
      if (result.error) {
        setState(prev => ({ ...prev, loading: false, error: result.error!.message }))
        return
      }

      setState(prev => ({
        ...prev,
        loading: false,
        pendingRequests: result.data || []
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch pending requests'
      setState(prev => ({ ...prev, loading: false, error: errorMessage }))
    }
  }, [user?.id])

  // Refresh sent friend requests
  const refreshSentRequests = useCallback(async () => {
    if (!user?.id) return

    setState(prev => ({ ...prev, loading: true }))

    try {
      const result = await getSentFriendRequestsWithPagination(user.id)
      
      if (result.error) {
        setState(prev => ({ ...prev, loading: false, error: result.error!.message }))
        return
      }

      setState(prev => ({
        ...prev,
        loading: false,
        sentRequests: result.data || []
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch sent requests'
      setState(prev => ({ ...prev, loading: false, error: errorMessage }))
    }
  }, [user?.id])

  // Refresh friends list
  const refreshFriendsList = useCallback(async () => {
    if (!user?.id) return

    setState(prev => ({ ...prev, loading: true }))

    try {
      const result = await getFriendsListWithProfiles(user.id)
      
      if (result.error) {
        setState(prev => ({ ...prev, loading: false, error: result.error!.message }))
        return
      }

      setState(prev => ({
        ...prev,
        loading: false,
        friends: result.data || []
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch friends list'
      setState(prev => ({ ...prev, loading: false, error: errorMessage }))
    }
  }, [user?.id])

  // Refresh all data
  const refreshAll = useCallback(async () => {
    await Promise.all([
      refreshPendingRequests(),
      refreshSentRequests(),
      refreshFriendsList()
    ])
  }, [refreshPendingRequests, refreshSentRequests, refreshFriendsList])

  // Load data on mount
  useEffect(() => {
    if (user?.id) {
      refreshAll()
    }
  }, [user?.id, refreshAll])

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  return {
    // State
    pendingRequests: state.pendingRequests,
    sentRequests: state.sentRequests,
    friends: state.friends,
    loading: state.loading,
    error: state.error,

    // Actions
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    cancelFriendRequest,
    removeFriend,

    // Refresh functions
    refreshPendingRequests,
    refreshSentRequests,
    refreshFriendsList,
    refreshAll,

    // Utility
    clearError,

    // Counts
    pendingRequestsCount: state.pendingRequests.length,
    sentRequestsCount: state.sentRequests.length,
    friendsCount: state.friends.length
  }
}

/**
 * Hook for checking friendship status with another user
 */
export function useFriendshipStatus(otherUserId?: string) {
  const { user } = useAuth()
  const [status, setStatus] = useState<'loading' | 'friends' | 'pending' | 'none' | 'error'>('loading')
  const [friendship, setFriendship] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const checkStatus = useCallback(async () => {
    if (!user?.id || !otherUserId) {
      setStatus('none')
      return
    }

    if (user.id === otherUserId) {
      setStatus('none')
      return
    }

    setLoading(true)

    try {
      const result = await getFriendshipStatusBetweenUsers(user.id, otherUserId)
      
      if (result.error) {
        setStatus('error')
        setLoading(false)
        return
      }

      if (!result.data?.status) {
        setStatus('none')
      } else {
        switch (result.data.status) {
          case 'accepted':
            setStatus('friends')
            break
          case 'pending':
            setStatus('pending')
            break
          case 'declined':
          case 'blocked':
          default:
            setStatus('none')
            break
        }
      }

      setFriendship(result.data?.friendship || null)
      setLoading(false)
    } catch (error) {
      console.error('Error checking friendship status:', error)
      setStatus('error')
      setLoading(false)
    }
  }, [user?.id, otherUserId])

  useEffect(() => {
    checkStatus()
  }, [checkStatus])

  return {
    status,
    friendship,
    loading,
    refresh: checkStatus,
    isFriends: status === 'friends',
    isPending: status === 'pending',
    canSendRequest: status === 'none' && user?.id !== otherUserId
  }
}

/**
 * Simple hook to check if two users are friends
 */
export function useAreFriends(otherUserId?: string) {
  const { user } = useAuth()
  const [areFriends, setAreFriends] = useState(false)
  const [loading, setLoading] = useState(false)

  const checkFriendship = useCallback(async () => {
    if (!user?.id || !otherUserId || user.id === otherUserId) {
      setAreFriends(false)
      return
    }

    setLoading(true)

    try {
      const result = await areUsersFriends(user.id, otherUserId)
      setAreFriends(result)
    } catch (error) {
      console.error('Error checking friendship:', error)
      setAreFriends(false)
    } finally {
      setLoading(false)
    }
  }, [user?.id, otherUserId])

  useEffect(() => {
    checkFriendship()
  }, [checkFriendship])

  return {
    areFriends,
    loading,
    refresh: checkFriendship
  }
}
