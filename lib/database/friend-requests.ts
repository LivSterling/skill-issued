import { supabase } from '@/lib/supabase/client'
import type { 
  Profile, 
  Friendship,
  FriendshipStatus,
  DatabaseResponse,
  DatabaseListResponse
} from './types'
import { 
  sendFriendRequestSchema,
  respondToFriendRequestSchema,
  removeFriendSchema,
  type SendFriendRequestInput,
  type RespondToFriendRequestInput,
  type RemoveFriendInput
} from '@/lib/validations/social-schemas'

// ========================================
// FRIEND REQUEST SYSTEM
// ========================================

/**
 * Send a friend request with validation
 */
export async function sendFriendRequestWithValidation(
  senderId: string,
  input: SendFriendRequestInput
): Promise<DatabaseResponse<any>> {
  try {
    // Validate input
    const validation = sendFriendRequestSchema.safeParse(input)
    if (!validation.success) {
      return {
        data: null,
        error: new Error(`Validation error: ${validation.error.errors[0].message}`)
      }
    }

    const { recipientId, message } = validation.data

    // Check if users are already friends or have pending request
    const { data: existingFriendship } = await supabase
      .from('friendships')
      .select('*')
      .or(`and(user_id.eq.${senderId},friend_id.eq.${recipientId}),and(user_id.eq.${recipientId},friend_id.eq.${senderId})`)
      .maybeSingle()

    if (existingFriendship) {
      const status = existingFriendship.status
      let errorMessage = 'Friend request already exists'
      
      switch (status) {
        case 'accepted':
          errorMessage = 'You are already friends with this user'
          break
        case 'pending':
          errorMessage = 'A friend request is already pending with this user'
          break
        case 'declined':
          errorMessage = 'This user has declined your friend request'
          break
        case 'blocked':
          errorMessage = 'Unable to send friend request to this user'
          break
      }
      
      return { 
        data: null, 
        error: new Error(errorMessage)
      }
    }

    // Check if sender is trying to add themselves
    if (senderId === recipientId) {
      return {
        data: null,
        error: new Error('You cannot send a friend request to yourself')
      }
    }

    // Check if recipient exists
    const { data: recipientProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', recipientId)
      .single()

    if (!recipientProfile) {
      return {
        data: null,
        error: new Error('User not found')
      }
    }

    // Create the friend request
    const { data: friendship, error: friendshipError } = await supabase
      .from('friendships')
      .insert({
        user_id: senderId,
        friend_id: recipientId,
        status: 'pending'
      })
      .select()
      .single()

    if (friendshipError) {
      console.error('Error creating friend request:', friendshipError)
      return { data: null, error: friendshipError }
    }

    // Create notification for recipient (if notifications table exists)
    try {
      await supabase
        .from('notifications')
        .insert({
          user_id: recipientId,
          sender_id: senderId,
          type: 'friend_request',
          title: 'New Friend Request',
          message: `You have received a friend request${message ? `: "${message}"` : ''}`,
          read: false
        })
    } catch (notificationError) {
      // Ignore notification errors for now
      console.warn('Could not create notification:', notificationError)
    }

    return { data: friendship, error: null }

  } catch (err) {
    console.error('Unexpected error sending friend request:', err)
    return {
      data: null,
      error: new Error('An unexpected error occurred while sending friend request')
    }
  }
}

/**
 * Accept a friend request with validation
 */
export async function acceptFriendRequestWithValidation(
  userId: string,
  input: RespondToFriendRequestInput
): Promise<DatabaseResponse<any>> {
  try {
    // Validate input
    const validation = respondToFriendRequestSchema.safeParse(input)
    if (!validation.success) {
      return {
        data: null,
        error: new Error(`Validation error: ${validation.error.errors[0].message}`)
      }
    }

    const { requestId, action, message } = validation.data

    if (action !== 'accept') {
      return {
        data: null,
        error: new Error('This function is only for accepting friend requests')
      }
    }

    // Find the friend request
    const { data: friendship, error: findError } = await supabase
      .from('friendships')
      .select('*')
      .eq('id', requestId)
      .eq('friend_id', userId) // Only recipient can accept
      .eq('status', 'pending')
      .single()

    if (findError || !friendship) {
      return {
        data: null,
        error: new Error('Friend request not found or already processed')
      }
    }

    // Update the friendship status
    const { data: updatedFriendship, error: updateError } = await supabase
      .from('friendships')
      .update({
        status: 'accepted'
      })
      .eq('id', requestId)
      .select()
      .single()

    if (updateError) {
      console.error('Error accepting friend request:', updateError)
      return { data: null, error: updateError }
    }

    // Create notification for sender (if notifications table exists)
    try {
      await supabase
        .from('notifications')
        .insert({
          user_id: friendship.user_id,
          sender_id: userId,
          type: 'friend_accepted',
          title: 'Friend Request Accepted',
          message: `Your friend request was accepted${message ? `: "${message}"` : ''}`,
          read: false
        })
    } catch (notificationError) {
      // Ignore notification errors for now
      console.warn('Could not create notification:', notificationError)
    }

    return { data: updatedFriendship, error: null }

  } catch (err) {
    console.error('Unexpected error accepting friend request:', err)
    return {
      data: null,
      error: new Error('An unexpected error occurred while accepting friend request')
    }
  }
}

/**
 * Decline a friend request with validation
 */
export async function declineFriendRequestWithValidation(
  userId: string,
  input: RespondToFriendRequestInput
): Promise<DatabaseResponse<any>> {
  try {
    // Validate input
    const validation = respondToFriendRequestSchema.safeParse(input)
    if (!validation.success) {
      return {
        data: null,
        error: new Error(`Validation error: ${validation.error.errors[0].message}`)
      }
    }

    const { requestId, action } = validation.data

    if (action !== 'decline') {
      return {
        data: null,
        error: new Error('This function is only for declining friend requests')
      }
    }

    // Find the friend request
    const { data: friendship, error: findError } = await supabase
      .from('friendships')
      .select('*')
      .eq('id', requestId)
      .eq('friend_id', userId) // Only recipient can decline
      .eq('status', 'pending')
      .single()

    if (findError || !friendship) {
      return {
        data: null,
        error: new Error('Friend request not found or already processed')
      }
    }

    // Update the friendship status
    const { data: updatedFriendship, error: updateError } = await supabase
      .from('friendships')
      .update({
        status: 'declined'
      })
      .eq('id', requestId)
      .select()
      .single()

    if (updateError) {
      console.error('Error declining friend request:', updateError)
      return { data: null, error: updateError }
    }

    return { data: updatedFriendship, error: null }

  } catch (err) {
    console.error('Unexpected error declining friend request:', err)
    return {
      data: null,
      error: new Error('An unexpected error occurred while declining friend request')
    }
  }
}

/**
 * Cancel a sent friend request
 */
export async function cancelFriendRequestWithValidation(
  userId: string,
  requestId: string
): Promise<DatabaseResponse<void>> {
  try {
    // Find and delete the friend request
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', requestId)
      .eq('user_id', userId) // Only sender can cancel
      .eq('status', 'pending')

    if (error) {
      console.error('Error canceling friend request:', error)
      return { data: null, error }
    }

    return { data: undefined, error: null }

  } catch (err) {
    console.error('Unexpected error canceling friend request:', err)
    return {
      data: null,
      error: new Error('An unexpected error occurred while canceling friend request')
    }
  }
}

/**
 * Remove/unfriend a user with validation
 */
export async function removeFriendWithValidation(
  userId: string,
  input: RemoveFriendInput
): Promise<DatabaseResponse<void>> {
  try {
    // Validate input
    const validation = removeFriendSchema.safeParse(input)
    if (!validation.success) {
      return {
        data: null,
        error: new Error(`Validation error: ${validation.error.errors[0].message}`)
      }
    }

    const { friendId } = validation.data

    // Delete the friendship
    const { error } = await supabase
      .from('friendships')
      .delete()
      .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`)
      .eq('status', 'accepted')

    if (error) {
      console.error('Error removing friend:', error)
      return { data: null, error }
    }

    return { data: undefined, error: null }

  } catch (err) {
    console.error('Unexpected error removing friend:', err)
    return {
      data: null,
      error: new Error('An unexpected error occurred while removing friend')
    }
  }
}

/**
 * Get pending friend requests (received)
 */
export async function getPendingFriendRequestsWithPagination(
  userId: string,
  limit = 20,
  offset = 0
): Promise<DatabaseListResponse<any>> {
  try {
    const { data, error } = await supabase
      .from('friendships')
      .select(`
        *,
        sender_profile:profiles!friendships_user_id_fkey(*)
      `)
      .eq('friend_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching pending friend requests:', error)
      return { data: null, error }
    }

    return { data: data || [], error: null }

  } catch (err) {
    console.error('Unexpected error fetching pending friend requests:', err)
    return {
      data: null,
      error: new Error('An unexpected error occurred while fetching friend requests')
    }
  }
}

/**
 * Get sent friend requests (pending)
 */
export async function getSentFriendRequestsWithPagination(
  userId: string,
  limit = 20,
  offset = 0
): Promise<DatabaseListResponse<any>> {
  try {
    const { data, error } = await supabase
      .from('friendships')
      .select(`
        *,
        recipient_profile:profiles!friendships_friend_id_fkey(*)
      `)
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching sent friend requests:', error)
      return { data: null, error }
    }

    return { data: data || [], error: null }

  } catch (err) {
    console.error('Unexpected error fetching sent friend requests:', err)
    return {
      data: null,
      error: new Error('An unexpected error occurred while fetching sent friend requests')
    }
  }
}

/**
 * Get friendship status between two users
 */
export async function getFriendshipStatusBetweenUsers(
  userId: string,
  otherUserId: string
): Promise<DatabaseResponse<{ status: FriendshipStatus | null; friendship?: any }>> {
  try {
    const { data, error } = await supabase
      .from('friendships')
      .select('*')
      .or(`and(user_id.eq.${userId},friend_id.eq.${otherUserId}),and(user_id.eq.${otherUserId},friend_id.eq.${userId})`)
      .maybeSingle()

    if (error) {
      console.error('Error getting friendship status:', error)
      return { data: null, error }
    }

    if (!data) {
      return { data: { status: null }, error: null }
    }

    return {
      data: {
        status: data.status as FriendshipStatus,
        friendship: data
      },
      error: null
    }

  } catch (err) {
    console.error('Unexpected error getting friendship status:', err)
    return {
      data: null,
      error: new Error('An unexpected error occurred while checking friendship status')
    }
  }
}

/**
 * Get user's friends list with profiles
 */
export async function getFriendsListWithProfiles(
  userId: string,
  limit = 20,
  offset = 0
): Promise<DatabaseListResponse<any>> {
  try {
    const { data, error } = await supabase
      .from('friendships')
      .select(`
        created_at,
        user_id,
        friend_id,
        user_profile:profiles!friendships_user_id_fkey(*),
        friend_profile:profiles!friendships_friend_id_fkey(*)
      `)
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching friends list:', error)
      return { data: null, error }
    }

    // Transform data to get the friend's profile (not the current user's)
    const friends = data?.map(friendship => {
      const isCurrentUserSender = friendship.user_id === userId
      const friendProfile = isCurrentUserSender ? friendship.friend_profile : friendship.user_profile
      
      return {
        ...friendProfile,
        friendship_date: friendship.created_at
      }
    }).filter(Boolean) || []

    return { data: friends, error: null }

  } catch (err) {
    console.error('Unexpected error fetching friends list:', err)
    return {
      data: null,
      error: new Error('An unexpected error occurred while fetching friends list')
    }
  }
}

/**
 * Check if two users are friends
 */
export async function areUsersFriends(
  userId: string,
  otherUserId: string
): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('friendships')
      .select('id')
      .or(`and(user_id.eq.${userId},friend_id.eq.${otherUserId}),and(user_id.eq.${otherUserId},friend_id.eq.${userId})`)
      .eq('status', 'accepted')
      .maybeSingle()

    return !!data
  } catch (err) {
    console.error('Error checking friendship status:', err)
    return false
  }
}

/**
 * Get friends count for a user
 */
export async function getFriendsCount(userId: string): Promise<number> {
  try {
    const { count } = await supabase
      .from('friendships')
      .select('id', { count: 'exact' })
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
      .eq('status', 'accepted')

    return count || 0
  } catch (err) {
    console.error('Error getting friends count:', err)
    return 0
  }
}
