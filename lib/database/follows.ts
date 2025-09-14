import { supabase } from '@/lib/supabase/client'
import type { 
  Profile, 
  Follow,
  DatabaseResponse,
  DatabaseListResponse
} from './types'
import { 
  followUserSchema,
  unfollowUserSchema,
  getFollowersSchema,
  getFollowingSchema,
  type FollowUserInput,
  type UnfollowUserInput,
  type GetFollowersInput,
  type GetFollowingInput
} from '@/lib/validations/social-schemas'

// ========================================
// FOLLOW/UNFOLLOW SYSTEM
// ========================================

/**
 * Follow a user with validation
 */
export async function followUserWithValidation(
  followerId: string,
  input: FollowUserInput
): Promise<DatabaseResponse<any>> {
  try {
    // Validate input
    const validation = followUserSchema.safeParse(input)
    if (!validation.success) {
      return {
        data: null,
        error: new Error(`Validation error: ${validation.error.errors[0].message}`)
      }
    }

    const { targetUserId } = validation.data

    // Check if user is trying to follow themselves
    if (followerId === targetUserId) {
      return {
        data: null,
        error: new Error('You cannot follow yourself')
      }
    }

    // Check if already following
    const { data: existingFollow } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', targetUserId)
      .maybeSingle()

    if (existingFollow) {
      return {
        data: null,
        error: new Error('You are already following this user')
      }
    }

    // Check if target user exists
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('id, username, display_name, privacy_level')
      .eq('id', targetUserId)
      .single()

    if (!targetProfile) {
      return {
        data: null,
        error: new Error('User not found')
      }
    }

    // Create the follow relationship
    const { data: follow, error: followError } = await supabase
      .from('follows')
      .insert({
        follower_id: followerId,
        following_id: targetUserId
      })
      .select()
      .single()

    if (followError) {
      console.error('Error creating follow relationship:', followError)
      return { data: null, error: followError }
    }

    // Create notification for the followed user (if notifications table exists)
    try {
      // Get follower profile for notification
      const { data: followerProfile } = await supabase
        .from('profiles')
        .select('display_name, username')
        .eq('id', followerId)
        .single()

      await supabase
        .from('notifications')
        .insert({
          user_id: targetUserId,
          sender_id: followerId,
          type: 'new_follower',
          title: 'New Follower',
          message: `${followerProfile?.display_name || followerProfile?.username || 'Someone'} started following you`,
          read: false
        })
    } catch (notificationError) {
      // Ignore notification errors for now
      console.warn('Could not create notification:', notificationError)
    }

    return { data: follow, error: null }

  } catch (err) {
    console.error('Unexpected error following user:', err)
    return {
      data: null,
      error: new Error('An unexpected error occurred while following user')
    }
  }
}

/**
 * Unfollow a user with validation
 */
export async function unfollowUserWithValidation(
  followerId: string,
  input: UnfollowUserInput
): Promise<DatabaseResponse<void>> {
  try {
    // Validate input
    const validation = unfollowUserSchema.safeParse(input)
    if (!validation.success) {
      return {
        data: null,
        error: new Error(`Validation error: ${validation.error.errors[0].message}`)
      }
    }

    const { targetUserId } = validation.data

    // Delete the follow relationship
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', targetUserId)

    if (error) {
      console.error('Error removing follow relationship:', error)
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
 * Get followers of a user with validation and pagination
 */
export async function getFollowersWithValidation(
  input: GetFollowersInput
): Promise<DatabaseListResponse<Profile & { followed_at: string }>> {
  try {
    // Validate input
    const validation = getFollowersSchema.safeParse(input)
    if (!validation.success) {
      return {
        data: null,
        error: new Error(`Validation error: ${validation.error.errors[0].message}`)
      }
    }

    const { userId, limit, offset } = validation.data

    // If no userId provided, this would need to be handled by the caller
    if (!userId) {
      return {
        data: null,
        error: new Error('User ID is required')
      }
    }

    const { data, error } = await supabase
      .from('follows')
      .select(`
        created_at,
        follower_profile:profiles!follows_follower_id_fkey(*)
      `)
      .eq('following_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching followers:', error)
      return { data: null, error }
    }

    // Transform data to include follow date
    const followers = data?.map(follow => ({
      ...follow.follower_profile,
      followed_at: follow.created_at
    })).filter(Boolean) || []

    return { data: followers as (Profile & { followed_at: string })[], error: null }

  } catch (err) {
    console.error('Unexpected error fetching followers:', err)
    return {
      data: null,
      error: new Error('An unexpected error occurred while fetching followers')
    }
  }
}

/**
 * Get users that a user is following with validation and pagination
 */
export async function getFollowingWithValidation(
  input: GetFollowingInput
): Promise<DatabaseListResponse<Profile & { followed_at: string }>> {
  try {
    // Validate input
    const validation = getFollowingSchema.safeParse(input)
    if (!validation.success) {
      return {
        data: null,
        error: new Error(`Validation error: ${validation.error.errors[0].message}`)
      }
    }

    const { userId, limit, offset } = validation.data

    // If no userId provided, this would need to be handled by the caller
    if (!userId) {
      return {
        data: null,
        error: new Error('User ID is required')
      }
    }

    const { data, error } = await supabase
      .from('follows')
      .select(`
        created_at,
        following_profile:profiles!follows_following_id_fkey(*)
      `)
      .eq('follower_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching following:', error)
      return { data: null, error }
    }

    // Transform data to include follow date
    const following = data?.map(follow => ({
      ...follow.following_profile,
      followed_at: follow.created_at
    })).filter(Boolean) || []

    return { data: following as (Profile & { followed_at: string })[], error: null }

  } catch (err) {
    console.error('Unexpected error fetching following:', err)
    return {
      data: null,
      error: new Error('An unexpected error occurred while fetching following')
    }
  }
}

/**
 * Check if a user is following another user
 */
export async function isUserFollowing(
  followerId: string,
  targetUserId: string
): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', targetUserId)
      .maybeSingle()

    return !!data
  } catch (err) {
    console.error('Error checking follow status:', err)
    return false
  }
}

/**
 * Check if a user is followed by another user
 */
export async function isUserFollowedBy(
  userId: string,
  potentialFollowerId: string
): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', potentialFollowerId)
      .eq('following_id', userId)
      .maybeSingle()

    return !!data
  } catch (err) {
    console.error('Error checking follower status:', err)
    return false
  }
}

/**
 * Get followers count for a user
 */
export async function getFollowersCount(userId: string): Promise<number> {
  try {
    const { count } = await supabase
      .from('follows')
      .select('id', { count: 'exact' })
      .eq('following_id', userId)

    return count || 0
  } catch (err) {
    console.error('Error getting followers count:', err)
    return 0
  }
}

/**
 * Get following count for a user
 */
export async function getFollowingCount(userId: string): Promise<number> {
  try {
    const { count } = await supabase
      .from('follows')
      .select('id', { count: 'exact' })
      .eq('follower_id', userId)

    return count || 0
  } catch (err) {
    console.error('Error getting following count:', err)
    return 0
  }
}

/**
 * Get mutual follows between two users (users they both follow)
 */
export async function getMutualFollowing(
  userId: string,
  otherUserId: string,
  limit = 10
): Promise<DatabaseListResponse<Profile>> {
  try {
    // Get users that both users follow
    const { data, error } = await supabase
      .from('follows')
      .select(`
        following_id,
        following_profile:profiles!follows_following_id_fkey(*)
      `)
      .eq('follower_id', userId)
      .in('following_id', 
        // Subquery to get users that otherUserId follows
        await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', otherUserId)
          .then(({ data }) => data?.map(f => f.following_id) || [])
      )
      .limit(limit)

    if (error) {
      console.error('Error fetching mutual following:', error)
      return { data: null, error }
    }

    const mutualFollowing = data?.map(follow => follow.following_profile).filter(Boolean) || []
    return { data: mutualFollowing as Profile[], error: null }

  } catch (err) {
    console.error('Unexpected error fetching mutual following:', err)
    return {
      data: null,
      error: new Error('An unexpected error occurred while fetching mutual following')
    }
  }
}

/**
 * Get follow relationship details between two users
 */
export async function getFollowRelationship(
  userId: string,
  otherUserId: string
): Promise<DatabaseResponse<{
  isFollowing: boolean
  isFollowedBy: boolean
  followingSince?: string
  followedBySince?: string
}>> {
  try {
    const [followingResult, followedByResult] = await Promise.all([
      // Check if userId follows otherUserId
      supabase
        .from('follows')
        .select('created_at')
        .eq('follower_id', userId)
        .eq('following_id', otherUserId)
        .maybeSingle(),
      
      // Check if otherUserId follows userId
      supabase
        .from('follows')
        .select('created_at')
        .eq('follower_id', otherUserId)
        .eq('following_id', userId)
        .maybeSingle()
    ])

    return {
      data: {
        isFollowing: !!followingResult.data,
        isFollowedBy: !!followedByResult.data,
        followingSince: followingResult.data?.created_at,
        followedBySince: followedByResult.data?.created_at
      },
      error: null
    }

  } catch (err) {
    console.error('Error getting follow relationship:', err)
    return {
      data: null,
      error: new Error('An unexpected error occurred while checking follow relationship')
    }
  }
}

/**
 * Get recent followers for a user (last N followers)
 */
export async function getRecentFollowers(
  userId: string,
  limit = 5
): Promise<DatabaseListResponse<Profile & { followed_at: string }>> {
  try {
    const { data, error } = await supabase
      .from('follows')
      .select(`
        created_at,
        follower_profile:profiles!follows_follower_id_fkey(*)
      `)
      .eq('following_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching recent followers:', error)
      return { data: null, error }
    }

    const recentFollowers = data?.map(follow => ({
      ...follow.follower_profile,
      followed_at: follow.created_at
    })).filter(Boolean) || []

    return { data: recentFollowers as (Profile & { followed_at: string })[], error: null }

  } catch (err) {
    console.error('Unexpected error fetching recent followers:', err)
    return {
      data: null,
      error: new Error('An unexpected error occurred while fetching recent followers')
    }
  }
}

/**
 * Bulk follow multiple users (with validation for each)
 */
export async function bulkFollowUsers(
  followerId: string,
  targetUserIds: string[]
): Promise<DatabaseResponse<{ successful: string[], failed: { userId: string, error: string }[] }>> {
  try {
    if (targetUserIds.length === 0) {
      return {
        data: { successful: [], failed: [] },
        error: null
      }
    }

    if (targetUserIds.length > 50) {
      return {
        data: null,
        error: new Error('Cannot follow more than 50 users at once')
      }
    }

    const successful: string[] = []
    const failed: { userId: string, error: string }[] = []

    // Process each follow request
    for (const targetUserId of targetUserIds) {
      try {
        const result = await followUserWithValidation(followerId, { targetUserId })
        if (result.error) {
          failed.push({ userId: targetUserId, error: result.error.message })
        } else {
          successful.push(targetUserId)
        }
      } catch (err) {
        failed.push({ 
          userId: targetUserId, 
          error: err instanceof Error ? err.message : 'Unknown error'
        })
      }
    }

    return {
      data: { successful, failed },
      error: null
    }

  } catch (err) {
    console.error('Unexpected error in bulk follow:', err)
    return {
      data: null,
      error: new Error('An unexpected error occurred during bulk follow operation')
    }
  }
}

/**
 * Bulk unfollow multiple users
 */
export async function bulkUnfollowUsers(
  followerId: string,
  targetUserIds: string[]
): Promise<DatabaseResponse<{ successful: string[], failed: { userId: string, error: string }[] }>> {
  try {
    if (targetUserIds.length === 0) {
      return {
        data: { successful: [], failed: [] },
        error: null
      }
    }

    if (targetUserIds.length > 50) {
      return {
        data: null,
        error: new Error('Cannot unfollow more than 50 users at once')
      }
    }

    const successful: string[] = []
    const failed: { userId: string, error: string }[] = []

    // Process each unfollow request
    for (const targetUserId of targetUserIds) {
      try {
        const result = await unfollowUserWithValidation(followerId, { targetUserId })
        if (result.error) {
          failed.push({ userId: targetUserId, error: result.error.message })
        } else {
          successful.push(targetUserId)
        }
      } catch (err) {
        failed.push({ 
          userId: targetUserId, 
          error: err instanceof Error ? err.message : 'Unknown error'
        })
      }
    }

    return {
      data: { successful, failed },
      error: null
    }

  } catch (err) {
    console.error('Unexpected error in bulk unfollow:', err)
    return {
      data: null,
      error: new Error('An unexpected error occurred during bulk unfollow operation')
    }
  }
}
