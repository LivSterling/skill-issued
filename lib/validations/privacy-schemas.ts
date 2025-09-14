import { z } from 'zod'

// Privacy levels for different features
export const PrivacyLevel = z.enum([
  'public',     // Everyone can see/interact
  'friends',    // Only friends can see/interact
  'private'     // Only the user can see/control
])

export type PrivacyLevelType = z.infer<typeof PrivacyLevel>

// Individual privacy settings
export const ProfilePrivacySettings = z.object({
  // Profile visibility
  profile_visibility: PrivacyLevel.default('public'),
  
  // Contact preferences
  allow_friend_requests: z.enum(['everyone', 'friends_of_friends', 'nobody']).default('everyone'),
  allow_follow: PrivacyLevel.default('public'),
  allow_messages: z.enum(['everyone', 'friends', 'nobody']).default('friends'),
  
  // Activity privacy
  activity_visibility: PrivacyLevel.default('friends'),
  show_online_status: PrivacyLevel.default('friends'),
  show_recently_played: PrivacyLevel.default('friends'),
  show_game_library: PrivacyLevel.default('public'),
  show_achievements: PrivacyLevel.default('public'),
  show_reviews: PrivacyLevel.default('public'),
  show_lists: PrivacyLevel.default('public'),
  
  // Social visibility
  show_friends_list: PrivacyLevel.default('friends'),
  show_followers_list: PrivacyLevel.default('public'),
  show_following_list: PrivacyLevel.default('public'),
  
  // Search and discovery
  searchable_by_username: z.boolean().default(true),
  searchable_by_email: z.boolean().default(false),
  show_in_suggestions: z.boolean().default(true),
  allow_indexing: z.boolean().default(true),
  
  // Notifications
  email_notifications: z.boolean().default(true),
  push_notifications: z.boolean().default(true),
  activity_notifications: z.boolean().default(true),
  friend_request_notifications: z.boolean().default(true),
  follow_notifications: z.boolean().default(true),
  review_notifications: z.boolean().default(true),
  
  // Data sharing
  share_analytics: z.boolean().default(true),
  share_with_developers: z.boolean().default(false),
  
  // Content moderation
  auto_approve_friend_requests: z.boolean().default(false),
  require_approval_for_tags: z.boolean().default(true),
  block_explicit_content: z.boolean().default(false),
  
  updated_at: z.string().datetime().optional()
})

export type ProfilePrivacySettingsType = z.infer<typeof ProfilePrivacySettings>

// Partial update schema
export const UpdateProfilePrivacySettings = ProfilePrivacySettings.partial().omit({
  updated_at: true
})

export type UpdateProfilePrivacySettingsType = z.infer<typeof UpdateProfilePrivacySettings>

// Privacy check contexts
export const PrivacyContext = z.enum([
  'profile_view',
  'activity_view',
  'friends_list',
  'followers_list',
  'following_list',
  'game_library',
  'achievements',
  'reviews',
  'lists',
  'online_status',
  'recently_played',
  'friend_request',
  'follow_request',
  'message_request',
  'search_result',
  'suggestion'
])

export type PrivacyContextType = z.infer<typeof PrivacyContext>

// Relationship types for privacy checks
export const RelationshipType = z.enum([
  'self',           // The user themselves
  'friend',         // Mutual friends
  'follower',       // User follows the viewer
  'following',      // Viewer follows the user
  'mutual_follow',  // Mutual follows
  'friend_of_friend', // Friend of a friend
  'blocked',        // User is blocked
  'stranger'        // No relationship
])

export type RelationshipTypeType = z.infer<typeof RelationshipType>

// Privacy check request
export const PrivacyCheckRequest = z.object({
  user_id: z.string().uuid(),
  viewer_id: z.string().uuid().optional(),
  context: PrivacyContext,
  relationship: RelationshipType.optional()
})

export type PrivacyCheckRequestType = z.infer<typeof PrivacyCheckRequest>

// Privacy check result
export const PrivacyCheckResult = z.object({
  allowed: z.boolean(),
  reason: z.string().optional(),
  requires_permission: z.boolean().default(false),
  suggested_action: z.string().optional()
})

export type PrivacyCheckResultType = z.infer<typeof PrivacyCheckResult>

// Blocked user schema
export const BlockedUser = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  blocked_user_id: z.string().uuid(),
  reason: z.string().optional(),
  blocked_at: z.string().datetime(),
  expires_at: z.string().datetime().optional()
})

export type BlockedUserType = z.infer<typeof BlockedUser>

// Block user request
export const BlockUserRequest = z.object({
  blocked_user_id: z.string().uuid(),
  reason: z.string().min(1).max(500).optional(),
  duration: z.enum(['permanent', '24h', '7d', '30d']).default('permanent')
})

export type BlockUserRequestType = z.infer<typeof BlockUserRequest>

// Unblock user request
export const UnblockUserRequest = z.object({
  blocked_user_id: z.string().uuid()
})

export type UnblockUserRequestType = z.infer<typeof UnblockUserRequest>

// Report user schema
export const UserReport = z.object({
  id: z.string().uuid(),
  reporter_id: z.string().uuid(),
  reported_user_id: z.string().uuid(),
  category: z.enum([
    'spam',
    'harassment',
    'inappropriate_content',
    'impersonation',
    'cheating',
    'hate_speech',
    'violence',
    'other'
  ]),
  description: z.string().min(10).max(1000),
  evidence_urls: z.array(z.string().url()).optional(),
  status: z.enum(['pending', 'investigating', 'resolved', 'dismissed']).default('pending'),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().optional()
})

export type UserReportType = z.infer<typeof UserReport>

// Report user request
export const ReportUserRequest = z.object({
  reported_user_id: z.string().uuid(),
  category: UserReport.shape.category,
  description: z.string().min(10).max(1000),
  evidence_urls: z.array(z.string().url()).optional()
})

export type ReportUserRequestType = z.infer<typeof ReportUserRequest>

// Privacy settings presets
export const PrivacyPreset = z.enum([
  'public',     // Maximum visibility and interaction
  'social',     // Balanced social interaction
  'friends',    // Friends-only interaction
  'private'     // Minimal visibility and interaction
])

export type PrivacyPresetType = z.infer<typeof PrivacyPreset>

// Preset configurations
export const PRIVACY_PRESETS: Record<PrivacyPresetType, Partial<ProfilePrivacySettingsType>> = {
  public: {
    profile_visibility: 'public',
    allow_friend_requests: 'everyone',
    allow_follow: 'public',
    allow_messages: 'everyone',
    activity_visibility: 'public',
    show_online_status: 'public',
    show_recently_played: 'public',
    show_game_library: 'public',
    show_achievements: 'public',
    show_reviews: 'public',
    show_lists: 'public',
    show_friends_list: 'public',
    show_followers_list: 'public',
    show_following_list: 'public',
    searchable_by_username: true,
    show_in_suggestions: true,
    allow_indexing: true,
    auto_approve_friend_requests: false
  },
  social: {
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
    show_in_suggestions: true,
    allow_indexing: true,
    auto_approve_friend_requests: false
  },
  friends: {
    profile_visibility: 'friends',
    allow_friend_requests: 'friends_of_friends',
    allow_follow: 'friends',
    allow_messages: 'friends',
    activity_visibility: 'friends',
    show_online_status: 'friends',
    show_recently_played: 'friends',
    show_game_library: 'friends',
    show_achievements: 'friends',
    show_reviews: 'friends',
    show_lists: 'friends',
    show_friends_list: 'friends',
    show_followers_list: 'friends',
    show_following_list: 'friends',
    searchable_by_username: true,
    show_in_suggestions: false,
    allow_indexing: false,
    auto_approve_friend_requests: false
  },
  private: {
    profile_visibility: 'private',
    allow_friend_requests: 'nobody',
    allow_follow: 'private',
    allow_messages: 'nobody',
    activity_visibility: 'private',
    show_online_status: 'private',
    show_recently_played: 'private',
    show_game_library: 'private',
    show_achievements: 'private',
    show_reviews: 'private',
    show_lists: 'private',
    show_friends_list: 'private',
    show_followers_list: 'private',
    show_following_list: 'private',
    searchable_by_username: false,
    show_in_suggestions: false,
    allow_indexing: false,
    auto_approve_friend_requests: false
  }
}

// Apply preset request
export const ApplyPrivacyPresetRequest = z.object({
  preset: PrivacyPreset,
  override_settings: UpdateProfilePrivacySettings.optional()
})

export type ApplyPrivacyPresetRequestType = z.infer<typeof ApplyPrivacyPresetRequest>

// Validation helpers
export const validatePrivacySettings = (settings: unknown) => {
  return ProfilePrivacySettings.safeParse(settings)
}

export const validatePrivacyUpdate = (update: unknown) => {
  return UpdateProfilePrivacySettings.safeParse(update)
}

export const validatePrivacyCheck = (request: unknown) => {
  return PrivacyCheckRequest.safeParse(request)
}

export const validateBlockRequest = (request: unknown) => {
  return BlockUserRequest.safeParse(request)
}

export const validateReportRequest = (request: unknown) => {
  return ReportUserRequest.safeParse(request)
}

export const validatePresetRequest = (request: unknown) => {
  return ApplyPrivacyPresetRequest.safeParse(request)
}
