import { supabase } from '@/lib/supabase/client'
import type { 
  Profile, 
  CreateProfileData, 
  UpdateProfileData,
  ExtendedProfile,
  ProfileSearchFilters,
  ProfileSearchOptions,
  DatabaseResponse,
  DatabaseListResponse,
  Friendship,
  FriendshipStatus,
  Follow,
  CreateFriendshipData,
  UpdateFriendshipData,
  CreateFollowData
} from './types'

// Profile CRUD operations

/**
 * Create a new user profile
 * This is typically called during user registration
 */
export async function createProfile(
  userId: string, 
  profileData: CreateProfileData
): Promise<DatabaseResponse<Profile>> {
  try {
    const client = supabase
    
    const profileToInsert = {
      id: userId,
      username: profileData.username,
      display_name: profileData.display_name || null,
      bio: profileData.bio || null,
      avatar_url: profileData.avatar_url || null,
      privacy_level: profileData.privacy_level || 'public',
      gaming_preferences: profileData.gaming_preferences || null,
    }

    const { data, error } = await client
      .from('profiles')
      .insert(profileToInsert)
      .select()
      .single()

    if (error) {
      console.error('Error creating profile:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (err) {
    console.error('Unexpected error creating profile:', err)
    return { 
      data: null, 
      error: new Error('An unexpected error occurred while creating profile')
    }
  }
}

/**
 * Get a user profile by ID
 */
export async function getProfile(userId: string): Promise<DatabaseResponse<Profile>> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      // Don't log "not found" errors as they're expected
      if (error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error)
      }
      return { data: null, error }
    }

    return { data, error: null }
  } catch (err) {
    console.error('Unexpected error fetching profile:', err)
    return { 
      data: null, 
      error: new Error('An unexpected error occurred while fetching profile')
    }
  }
}

/**
 * Get a user profile by username
 */
export async function getProfileByUsername(username: string): Promise<DatabaseResponse<Profile>> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single()

    if (error) {
      if (error.code !== 'PGRST116') {
        console.error('Error fetching profile by username:', error)
      }
      return { data: null, error }
    }

    return { data, error: null }
  } catch (err) {
    console.error('Unexpected error fetching profile by username:', err)
    return { 
      data: null, 
      error: new Error('An unexpected error occurred while fetching profile')
    }
  }
}

/**
 * Update a user profile
 */
export async function updateProfile(
  userId: string, 
  updates: UpdateProfileData
): Promise<DatabaseResponse<Profile>> {
  try {
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating profile:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (err) {
    console.error('Unexpected error updating profile:', err)
    return { 
      data: null, 
      error: new Error('An unexpected error occurred while updating profile')
    }
  }
}

/**
 * Delete a user profile
 */
export async function deleteProfile(userId: string): Promise<DatabaseResponse<void>> {
  try {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (error) {
      console.error('Error deleting profile:', error)
      return { data: null, error }
    }

    return { data: undefined, error: null }
  } catch (err) {
    console.error('Unexpected error deleting profile:', err)
    return { 
      data: null, 
      error: new Error('An unexpected error occurred while deleting profile')
    }
  }
}

/**
 * Check if a username is available
 */
export async function checkUsernameAvailability(
  username: string, 
  excludeUserId?: string
): Promise<DatabaseResponse<{ available: boolean }>> {
  try {
    let query = supabase
      .from('profiles')
      .select('id')
      .eq('username', username)

    if (excludeUserId) {
      query = query.neq('id', excludeUserId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error checking username availability:', error)
      return { data: null, error }
    }

    return { 
      data: { available: data.length === 0 }, 
      error: null 
    }
  } catch (err) {
    console.error('Unexpected error checking username availability:', err)
    return { 
      data: null, 
      error: new Error('An unexpected error occurred while checking username availability')
    }
  }
}

/**
 * Search profiles with filters and pagination
 */
export async function searchProfiles(
  filters: ProfileSearchFilters = {},
  options: ProfileSearchOptions = {}
): Promise<DatabaseListResponse<Profile>> {
  try {
    let query = supabase
      .from('profiles')
      .select('*')

    // Apply filters
    if (filters.username) {
      query = query.ilike('username', `%${filters.username}%`)
    }

    if (filters.display_name) {
      query = query.ilike('display_name', `%${filters.display_name}%`)
    }

    if (filters.privacy_level && filters.privacy_level.length > 0) {
      query = query.in('privacy_level', filters.privacy_level)
    }

    // Gaming preferences filters
    if (filters.genres && filters.genres.length > 0) {
      query = query.contains('gaming_preferences->favoriteGenres', filters.genres)
    }

    if (filters.platforms && filters.platforms.length > 0) {
      query = query.contains('gaming_preferences->favoritePlatforms', filters.platforms)
    }

    if (filters.play_style) {
      query = query.eq('gaming_preferences->playStyle', filters.play_style)
    }

    if (filters.looking_for && filters.looking_for.length > 0) {
      query = query.overlaps('gaming_preferences->lookingFor', filters.looking_for)
    }

    // Apply sorting
    const orderBy = options.order_by || 'username'
    const orderDirection = options.order_direction || 'asc'
    query = query.order(orderBy, { ascending: orderDirection === 'asc' })

    // Apply pagination
    const limit = options.limit || 20
    const offset = options.offset || 0
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('Error searching profiles:', error)
      return { data: null, error, count: 0 }
    }

    return { data: data || [], error: null, count: count || 0 }
  } catch (err) {
    console.error('Unexpected error searching profiles:', err)
    return { 
      data: null, 
      error: new Error('An unexpected error occurred while searching profiles'),
      count: 0
    }
  }
}

/**
 * Get extended profile with relationship information
 */
export async function getExtendedProfile(
  profileId: string, 
  currentUserId?: string
): Promise<DatabaseResponse<ExtendedProfile>> {
  try {
    // Get the basic profile
    const { data: profile, error: profileError } = await getProfile(profileId)
    
    if (profileError || !profile) {
      return { data: null, error: profileError }
    }

    // If no current user, return basic profile
    if (!currentUserId) {
      return { 
        data: { 
          ...profile,
          friendship_status: null,
          is_following: false,
          is_followed_by: false,
          followers_count: 0,
          following_count: 0,
          friends_count: 0,
          recent_games: [],
          total_games: 0
        }, 
        error: null 
      }
    }

    // Get relationship information in parallel
    const [friendshipResult, followingResult, followerResult] = await Promise.all([
      // Check friendship status
      supabase
        .from('friendships')
        .select('status')
        .or(`user_id.eq.${currentUserId},user_id.eq.${profileId}`)
        .or(`friend_id.eq.${currentUserId},friend_id.eq.${profileId}`)
        .single(),
      
      // Check if current user is following this profile
      supabase
        .from('follows')
        .select('id')
        .eq('follower_id', currentUserId)
        .eq('following_id', profileId)
        .single(),
      
      // Check if this profile is following current user
      supabase
        .from('follows')
        .select('id')
        .eq('follower_id', profileId)
        .eq('following_id', currentUserId)
        .single()
    ])

    // Get counts
    const [followersCount, followingCount, friendsCount] = await Promise.all([
      supabase
        .from('follows')
        .select('id', { count: 'exact' })
        .eq('following_id', profileId),
      
      supabase
        .from('follows')
        .select('id', { count: 'exact' })
        .eq('follower_id', profileId),
      
      supabase
        .from('friendships')
        .select('id', { count: 'exact' })
        .or(`user_id.eq.${profileId},friend_id.eq.${profileId}`)
        .eq('status', 'accepted')
    ])

    const extendedProfile: ExtendedProfile = {
      ...profile,
      friendship_status: friendshipResult.data?.status || null,
      is_following: !followingResult.error,
      is_followed_by: !followerResult.error,
      followers_count: followersCount.count || 0,
      following_count: followingCount.count || 0,
      friends_count: friendsCount.count || 0,
      recent_games: [], // TODO: Implement when game tracking is added
      total_games: 0    // TODO: Implement when game tracking is added
    }

    return { data: extendedProfile, error: null }
  } catch (err) {
    console.error('Unexpected error fetching extended profile:', err)
    return { 
      data: null, 
      error: new Error('An unexpected error occurred while fetching extended profile')
    }
  }
}

// Friendship management functions

/**
 * Send a friend request
 */
export async function sendFriendRequest(
  userId: string, 
  friendData: CreateFriendshipData
): Promise<DatabaseResponse<Friendship>> {
  try {
    const { data, error } = await supabase
      .from('friendships')
      .insert({
        user_id: userId,
        friend_id: friendData.friend_id,
        status: 'pending'
      })
      .select()
      .single()

    if (error) {
      console.error('Error sending friend request:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (err) {
    console.error('Unexpected error sending friend request:', err)
    return { 
      data: null, 
      error: new Error('An unexpected error occurred while sending friend request')
    }
  }
}

/**
 * Update friendship status (accept, decline, block)
 */
export async function updateFriendshipStatus(
  friendshipId: string,
  updates: UpdateFriendshipData
): Promise<DatabaseResponse<Friendship>> {
  try {
    const { data, error } = await supabase
      .from('friendships')
      .update(updates)
      .eq('id', friendshipId)
      .select()
      .single()

    if (error) {
      console.error('Error updating friendship status:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (err) {
    console.error('Unexpected error updating friendship status:', err)
    return { 
      data: null, 
      error: new Error('An unexpected error occurred while updating friendship status')
    }
  }
}

/**
 * Remove friendship
 */
export async function removeFriendship(
  userId: string, 
  friendId: string
): Promise<DatabaseResponse<void>> {
  try {
    const { error } = await supabase
      .from('friendships')
      .delete()
      .or(`user_id.eq.${userId},user_id.eq.${friendId}`)
      .or(`friend_id.eq.${userId},friend_id.eq.${friendId}`)

    if (error) {
      console.error('Error removing friendship:', error)
      return { data: null, error }
    }

    return { data: undefined, error: null }
  } catch (err) {
    console.error('Unexpected error removing friendship:', err)
    return { 
      data: null, 
      error: new Error('An unexpected error occurred while removing friendship')
    }
  }
}

// Follow management functions

/**
 * Follow a user
 */
export async function followUser(
  userId: string, 
  followData: CreateFollowData
): Promise<DatabaseResponse<Follow>> {
  try {
    const { data, error } = await supabase
      .from('follows')
      .insert({
        follower_id: userId,
        following_id: followData.following_id
      })
      .select()
      .single()

    if (error) {
      console.error('Error following user:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (err) {
    console.error('Unexpected error following user:', err)
    return { 
      data: null, 
      error: new Error('An unexpected error occurred while following user')
    }
  }
}

/**
 * Unfollow a user
 */
export async function unfollowUser(
  userId: string, 
  followingId: string
): Promise<DatabaseResponse<void>> {
  try {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', userId)
      .eq('following_id', followingId)

    if (error) {
      console.error('Error unfollowing user:', error)
      return { data: null, error }
    }

    return { data: undefined, error: null }
  } catch (err) {
    console.error('Unexpected error unfollowing user:', err)
    return { 
      data: null, 
      error: new Error('An unexpected error occurred while unfollowing user')
    }
  }
}

/**
 * Get user's friends
 */
export async function getUserFriends(userId: string): Promise<DatabaseListResponse<Profile>> {
  try {
    const { data, error } = await supabase
      .from('friendships')
      .select(`
        friend_id,
        profiles!friendships_friend_id_fkey(*)
      `)
      .eq('user_id', userId)
      .eq('status', 'accepted')

    if (error) {
      console.error('Error fetching user friends:', error)
      return { data: null, error }
    }

    const friends = data?.map(friendship => friendship.profiles).filter(Boolean) || []
    return { data: friends as Profile[], error: null }
  } catch (err) {
    console.error('Unexpected error fetching user friends:', err)
    return { 
      data: null, 
      error: new Error('An unexpected error occurred while fetching friends')
    }
  }
}

/**
 * Get user's followers
 */
export async function getUserFollowers(userId: string): Promise<DatabaseListResponse<Profile>> {
  try {
    const { data, error } = await supabase
      .from('follows')
      .select(`
        follower_id,
        profiles!follows_follower_id_fkey(*)
      `)
      .eq('following_id', userId)

    if (error) {
      console.error('Error fetching user followers:', error)
      return { data: null, error }
    }

    const followers = data?.map(follow => follow.profiles).filter(Boolean) || []
    return { data: followers as Profile[], error: null }
  } catch (err) {
    console.error('Unexpected error fetching user followers:', err)
    return { 
      data: null, 
      error: new Error('An unexpected error occurred while fetching followers')
    }
  }
}

/**
 * Get users that a user is following
 */
export async function getUserFollowing(userId: string): Promise<DatabaseListResponse<Profile>> {
  try {
    const { data, error } = await supabase
      .from('follows')
      .select(`
        following_id,
        profiles!follows_following_id_fkey(*)
      `)
      .eq('follower_id', userId)

    if (error) {
      console.error('Error fetching user following:', error)
      return { data: null, error }
    }

    const following = data?.map(follow => follow.profiles).filter(Boolean) || []
    return { data: following as Profile[], error: null }
  } catch (err) {
    console.error('Unexpected error fetching user following:', err)
    return { 
      data: null, 
      error: new Error('An unexpected error occurred while fetching following')
    }
  }
}

// ========================================
// ENHANCED FRIEND REQUEST SYSTEM
// ========================================

/**
 * Send a friend request with validation and message support
 */
export async function sendFriendRequestEnhanced(
  senderId: string,
  recipientId: string,
  message?: string
): Promise<DatabaseResponse<Friendship & { sender_profile?: Profile; recipient_profile?: Profile }>> {
  try {
    // Check if users are already friends or have pending request
    const existingFriendship = await supabase
      .from('friendships')
      .select('*')
      .or(`and(user_id.eq.${senderId},friend_id.eq.${recipientId}),and(user_id.eq.${recipientId},friend_id.eq.${senderId})`)
      .maybeSingle()

    if (existingFriendship.data) {
      const status = existingFriendship.data.status
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

    // Check if recipient exists and is not private
    const recipientProfile = await getProfile(recipientId)
    if (!recipientProfile.data) {
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
      .select(`
        *,
        sender_profile:profiles!friendships_user_id_fkey(*),
        recipient_profile:profiles!friendships_friend_id_fkey(*)
      `)
      .single()

    if (friendshipError) {
      console.error('Error creating friend request:', friendshipError)
      return { data: null, error: friendshipError }
    }

    // Create notification for recipient
    await supabase
      .from('notifications')
      .insert({
        user_id: recipientId,
        sender_id: senderId,
        type: 'friend_request',
        title: 'New Friend Request',
        message: `${friendship.sender_profile?.display_name || 'Someone'} sent you a friend request${message ? `: "${message}"` : ''}`,
        read: false
      })

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
 * Accept a friend request
 */
export async function acceptFriendRequest(
  userId: string,
  requestId: string,
  message?: string
): Promise<DatabaseResponse<Friendship>> {
  try {
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

    // Create notification for sender
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
 * Decline a friend request
 */
export async function declineFriendRequest(
  userId: string,
  requestId: string,
  message?: string
): Promise<DatabaseResponse<Friendship>> {
  try {
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
export async function cancelFriendRequest(
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
 * Get pending friend requests (received)
 */
export async function getPendingFriendRequests(
  userId: string,
  limit = 20,
  offset = 0
): Promise<DatabaseListResponse<Friendship & { sender_profile: Profile }>> {
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
export async function getSentFriendRequests(
  userId: string,
  limit = 20,
  offset = 0
): Promise<DatabaseListResponse<Friendship & { recipient_profile: Profile }>> {
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
export async function getFriendshipStatus(
  userId: string,
  otherUserId: string
): Promise<DatabaseResponse<{ status: FriendshipStatus | null; friendship?: Friendship }>> {
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
        status: data.status,
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
 * Remove/unfriend a user
 */
export async function removeFriendEnhanced(
  userId: string,
  friendId: string
): Promise<DatabaseResponse<void>> {
  try {
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
 * Get user's friends list with profiles
 */
export async function getFriendsListEnhanced(
  userId: string,
  limit = 20,
  offset = 0
): Promise<DatabaseListResponse<Profile & { friendship_date: string }>> {
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

    return { data: friends as (Profile & { friendship_date: string })[], error: null }

  } catch (err) {
    console.error('Unexpected error fetching friends list:', err)
    return {
      data: null,
      error: new Error('An unexpected error occurred while fetching friends list')
    }
  }
}
