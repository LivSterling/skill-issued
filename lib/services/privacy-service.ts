import { createClient } from '@/lib/supabase/client'
import {
  ProfilePrivacySettingsType,
  UpdateProfilePrivacySettingsType,
  PrivacyCheckRequestType,
  PrivacyCheckResultType,
  PrivacyContextType,
  RelationshipTypeType,
  BlockUserRequestType,
  UnblockUserRequestType,
  ReportUserRequestType,
  PrivacyPresetType,
  PRIVACY_PRESETS,
  ApplyPrivacyPresetRequestType,
  validatePrivacySettings,
  validatePrivacyUpdate,
  validatePrivacyCheck,
  validateBlockRequest,
  validateReportRequest,
  validatePresetRequest
} from '@/lib/validations/privacy-schemas'

export class PrivacyService {
  private supabase = createClient()

  // Get user's privacy settings
  async getPrivacySettings(userId: string): Promise<ProfilePrivacySettingsType | null> {
    try {
      const { data, error } = await this.supabase
        .from('profile_privacy_settings')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (!data) {
        // Return default settings if none exist
        return this.getDefaultPrivacySettings()
      }

      const validation = validatePrivacySettings(data)
      if (!validation.success) {
        console.warn('Invalid privacy settings:', validation.error)
        return this.getDefaultPrivacySettings()
      }

      return validation.data
    } catch (error) {
      console.error('Error fetching privacy settings:', error)
      throw error
    }
  }

  // Update user's privacy settings
  async updatePrivacySettings(
    userId: string,
    updates: UpdateProfilePrivacySettingsType
  ): Promise<ProfilePrivacySettingsType> {
    try {
      const validation = validatePrivacyUpdate(updates)
      if (!validation.success) {
        throw new Error('Invalid privacy settings update')
      }

      const updateData = {
        ...validation.data,
        updated_at: new Date().toISOString()
      }

      const { data, error } = await this.supabase
        .from('profile_privacy_settings')
        .upsert({
          user_id: userId,
          ...updateData
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      return data as ProfilePrivacySettingsType
    } catch (error) {
      console.error('Error updating privacy settings:', error)
      throw error
    }
  }

  // Apply privacy preset
  async applyPrivacyPreset(
    userId: string,
    request: ApplyPrivacyPresetRequestType
  ): Promise<ProfilePrivacySettingsType> {
    try {
      const validation = validatePresetRequest(request)
      if (!validation.success) {
        throw new Error('Invalid preset request')
      }

      const presetSettings = PRIVACY_PRESETS[request.preset]
      const finalSettings = {
        ...presetSettings,
        ...request.override_settings
      }

      return await this.updatePrivacySettings(userId, finalSettings)
    } catch (error) {
      console.error('Error applying privacy preset:', error)
      throw error
    }
  }

  // Check if action is allowed based on privacy settings
  async checkPrivacy(request: PrivacyCheckRequestType): Promise<PrivacyCheckResultType> {
    try {
      const validation = validatePrivacyCheck(request)
      if (!validation.success) {
        throw new Error('Invalid privacy check request')
      }

      // If checking own profile, always allow
      if (request.user_id === request.viewer_id) {
        return {
          allowed: true,
          reason: 'Own profile access'
        }
      }

      // Get user's privacy settings
      const privacySettings = await this.getPrivacySettings(request.user_id)
      if (!privacySettings) {
        return {
          allowed: false,
          reason: 'Privacy settings not found'
        }
      }

      // Check if user is blocked
      if (request.viewer_id) {
        const isBlocked = await this.isUserBlocked(request.user_id, request.viewer_id)
        if (isBlocked) {
          return {
            allowed: false,
            reason: 'User is blocked'
          }
        }
      }

      // Determine relationship if not provided
      let relationship = request.relationship
      if (!relationship && request.viewer_id) {
        relationship = await this.getRelationship(request.user_id, request.viewer_id)
      } else if (!relationship) {
        relationship = 'stranger'
      }

      // Check privacy based on context
      return this.evaluatePrivacyRule(
        privacySettings,
        request.context,
        relationship,
        !!request.viewer_id
      )
    } catch (error) {
      console.error('Error checking privacy:', error)
      return {
        allowed: false,
        reason: 'Privacy check failed'
      }
    }
  }

  // Block a user
  async blockUser(userId: string, request: BlockUserRequestType): Promise<void> {
    try {
      const validation = validateBlockRequest(request)
      if (!validation.success) {
        throw new Error('Invalid block request')
      }

      // Check if already blocked
      const existingBlock = await this.supabase
        .from('blocked_users')
        .select('id')
        .eq('user_id', userId)
        .eq('blocked_user_id', request.blocked_user_id)
        .single()

      if (existingBlock.data) {
        throw new Error('User is already blocked')
      }

      // Calculate expiration if not permanent
      let expiresAt: string | null = null
      if (request.duration !== 'permanent') {
        const now = new Date()
        switch (request.duration) {
          case '24h':
            expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
            break
          case '7d':
            expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
            break
          case '30d':
            expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
            break
        }
      }

      // Insert block record
      const { error } = await this.supabase
        .from('blocked_users')
        .insert({
          user_id: userId,
          blocked_user_id: request.blocked_user_id,
          reason: request.reason,
          blocked_at: new Date().toISOString(),
          expires_at: expiresAt
        })

      if (error) {
        throw error
      }

      // Remove any existing friendship or follow relationships
      await this.cleanupRelationships(userId, request.blocked_user_id)
    } catch (error) {
      console.error('Error blocking user:', error)
      throw error
    }
  }

  // Unblock a user
  async unblockUser(userId: string, request: UnblockUserRequestType): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('blocked_users')
        .delete()
        .eq('user_id', userId)
        .eq('blocked_user_id', request.blocked_user_id)

      if (error) {
        throw error
      }
    } catch (error) {
      console.error('Error unblocking user:', error)
      throw error
    }
  }

  // Report a user
  async reportUser(reporterId: string, request: ReportUserRequestType): Promise<void> {
    try {
      const validation = validateReportRequest(request)
      if (!validation.success) {
        throw new Error('Invalid report request')
      }

      const { error } = await this.supabase
        .from('user_reports')
        .insert({
          reporter_id: reporterId,
          reported_user_id: request.reported_user_id,
          category: request.category,
          description: request.description,
          evidence_urls: request.evidence_urls,
          created_at: new Date().toISOString()
        })

      if (error) {
        throw error
      }
    } catch (error) {
      console.error('Error reporting user:', error)
      throw error
    }
  }

  // Get blocked users list
  async getBlockedUsers(userId: string): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('blocked_users')
        .select(`
          *,
          blocked_user:profiles!blocked_users_blocked_user_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('user_id', userId)
        .order('blocked_at', { ascending: false })

      if (error) {
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Error fetching blocked users:', error)
      throw error
    }
  }

  // Check if user is blocked
  async isUserBlocked(userId: string, potentiallyBlockedUserId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('blocked_users')
        .select('id, expires_at')
        .eq('user_id', userId)
        .eq('blocked_user_id', potentiallyBlockedUserId)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (!data) {
        return false
      }

      // Check if block has expired
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        // Remove expired block
        await this.supabase
          .from('blocked_users')
          .delete()
          .eq('id', data.id)
        
        return false
      }

      return true
    } catch (error) {
      console.error('Error checking if user is blocked:', error)
      return false
    }
  }

  // Private helper methods

  private getDefaultPrivacySettings(): ProfilePrivacySettingsType {
    return {
      profile_visibility: 'public',
      allow_friend_requests: 'everyone',
      allow_follow: 'public',
      allow_messages: 'friends',
      activity_visibility: 'friends',
      show_online_status: 'friends',
      show_recently_played: 'friends',
      show_game_library: 'public',
      show_achievements: 'public',
      show_reviews: 'public',
      show_lists: 'public',
      show_friends_list: 'friends',
      show_followers_list: 'public',
      show_following_list: 'public',
      searchable_by_username: true,
      searchable_by_email: false,
      show_in_suggestions: true,
      allow_indexing: true,
      email_notifications: true,
      push_notifications: true,
      activity_notifications: true,
      friend_request_notifications: true,
      follow_notifications: true,
      review_notifications: true,
      share_analytics: true,
      share_with_developers: false,
      auto_approve_friend_requests: false,
      require_approval_for_tags: true,
      block_explicit_content: false
    }
  }

  private async getRelationship(userId: string, viewerId: string): Promise<RelationshipTypeType> {
    try {
      // Check friendship
      const { data: friendship } = await this.supabase
        .from('friend_requests')
        .select('status')
        .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
        .or(`requester_id.eq.${viewerId},receiver_id.eq.${viewerId}`)
        .eq('status', 'accepted')
        .single()

      if (friendship) {
        return 'friend'
      }

      // Check follow relationships
      const { data: viewerFollowsUser } = await this.supabase
        .from('follows')
        .select('id')
        .eq('follower_id', viewerId)
        .eq('following_id', userId)
        .single()

      const { data: userFollowsViewer } = await this.supabase
        .from('follows')
        .select('id')
        .eq('follower_id', userId)
        .eq('following_id', viewerId)
        .single()

      if (viewerFollowsUser && userFollowsViewer) {
        return 'mutual_follow'
      } else if (viewerFollowsUser) {
        return 'following'
      } else if (userFollowsViewer) {
        return 'follower'
      }

      return 'stranger'
    } catch (error) {
      console.error('Error determining relationship:', error)
      return 'stranger'
    }
  }

  private evaluatePrivacyRule(
    settings: ProfilePrivacySettingsType,
    context: PrivacyContextType,
    relationship: RelationshipTypeType,
    isAuthenticated: boolean
  ): PrivacyCheckResultType {
    // Helper function to check privacy level
    const checkPrivacyLevel = (level: string): boolean => {
      switch (level) {
        case 'public':
          return true
        case 'friends':
          return relationship === 'friend' || relationship === 'self'
        case 'private':
          return relationship === 'self'
        default:
          return false
      }
    }

    // Helper function for friend request settings
    const checkFriendRequestLevel = (level: string): boolean => {
      switch (level) {
        case 'everyone':
          return true
        case 'friends_of_friends':
          return relationship === 'friend' || relationship === 'friend_of_friend'
        case 'nobody':
          return false
        default:
          return false
      }
    }

    // Helper function for message settings
    const checkMessageLevel = (level: string): boolean => {
      switch (level) {
        case 'everyone':
          return true
        case 'friends':
          return relationship === 'friend'
        case 'nobody':
          return false
        default:
          return false
      }
    }

    // Context-specific privacy checks
    switch (context) {
      case 'profile_view':
        return {
          allowed: checkPrivacyLevel(settings.profile_visibility),
          reason: `Profile visibility is set to ${settings.profile_visibility}`
        }

      case 'activity_view':
        return {
          allowed: checkPrivacyLevel(settings.activity_visibility),
          reason: `Activity visibility is set to ${settings.activity_visibility}`
        }

      case 'friends_list':
        return {
          allowed: checkPrivacyLevel(settings.show_friends_list),
          reason: `Friends list visibility is set to ${settings.show_friends_list}`
        }

      case 'followers_list':
        return {
          allowed: checkPrivacyLevel(settings.show_followers_list),
          reason: `Followers list visibility is set to ${settings.show_followers_list}`
        }

      case 'following_list':
        return {
          allowed: checkPrivacyLevel(settings.show_following_list),
          reason: `Following list visibility is set to ${settings.show_following_list}`
        }

      case 'game_library':
        return {
          allowed: checkPrivacyLevel(settings.show_game_library),
          reason: `Game library visibility is set to ${settings.show_game_library}`
        }

      case 'achievements':
        return {
          allowed: checkPrivacyLevel(settings.show_achievements),
          reason: `Achievements visibility is set to ${settings.show_achievements}`
        }

      case 'reviews':
        return {
          allowed: checkPrivacyLevel(settings.show_reviews),
          reason: `Reviews visibility is set to ${settings.show_reviews}`
        }

      case 'lists':
        return {
          allowed: checkPrivacyLevel(settings.show_lists),
          reason: `Lists visibility is set to ${settings.show_lists}`
        }

      case 'online_status':
        return {
          allowed: checkPrivacyLevel(settings.show_online_status),
          reason: `Online status visibility is set to ${settings.show_online_status}`
        }

      case 'recently_played':
        return {
          allowed: checkPrivacyLevel(settings.show_recently_played),
          reason: `Recently played visibility is set to ${settings.show_recently_played}`
        }

      case 'friend_request':
        return {
          allowed: checkFriendRequestLevel(settings.allow_friend_requests),
          reason: `Friend requests are set to ${settings.allow_friend_requests}`
        }

      case 'follow_request':
        return {
          allowed: checkPrivacyLevel(settings.allow_follow),
          reason: `Follow requests are set to ${settings.allow_follow}`
        }

      case 'message_request':
        return {
          allowed: checkMessageLevel(settings.allow_messages),
          reason: `Messages are set to ${settings.allow_messages}`
        }

      case 'search_result':
        if (!settings.searchable_by_username) {
          return {
            allowed: false,
            reason: 'User has disabled username search'
          }
        }
        return {
          allowed: checkPrivacyLevel(settings.profile_visibility),
          reason: 'Based on profile visibility settings'
        }

      case 'suggestion':
        return {
          allowed: settings.show_in_suggestions,
          reason: settings.show_in_suggestions ? 'User allows suggestions' : 'User has disabled suggestions'
        }

      default:
        return {
          allowed: false,
          reason: 'Unknown privacy context'
        }
    }
  }

  private async cleanupRelationships(userId: string, blockedUserId: string): Promise<void> {
    try {
      // Remove friendship
      await this.supabase
        .from('friend_requests')
        .delete()
        .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
        .or(`requester_id.eq.${blockedUserId},receiver_id.eq.${blockedUserId}`)

      // Remove follow relationships
      await this.supabase
        .from('follows')
        .delete()
        .or(
          `and(follower_id.eq.${userId},following_id.eq.${blockedUserId}),and(follower_id.eq.${blockedUserId},following_id.eq.${userId})`
        )
    } catch (error) {
      console.error('Error cleaning up relationships:', error)
      // Don't throw here as blocking should still succeed
    }
  }
}

// Export singleton instance
export const privacyService = new PrivacyService()
