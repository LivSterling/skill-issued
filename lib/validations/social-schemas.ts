import { z } from 'zod'

// Base validation schemas for social features
export const userIdSchema = z.string().uuid('Invalid user ID format')

export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be no more than 30 characters')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens')

// Friend Request Schemas
export const sendFriendRequestSchema = z.object({
  recipientId: userIdSchema,
  message: z
    .string()
    .max(500, 'Friend request message must be no more than 500 characters')
    .optional()
})

export const respondToFriendRequestSchema = z.object({
  requestId: userIdSchema,
  action: z.enum(['accept', 'decline'], {
    required_error: 'Action is required',
    invalid_type_error: 'Action must be either accept or decline'
  }),
  message: z
    .string()
    .max(500, 'Response message must be no more than 500 characters')
    .optional()
})

export const removeFriendSchema = z.object({
  friendId: userIdSchema
})

export const blockFriendSchema = z.object({
  friendId: userIdSchema,
  reason: z
    .string()
    .max(1000, 'Block reason must be no more than 1000 characters')
    .optional()
})

// Follow Schemas
export const followUserSchema = z.object({
  targetUserId: userIdSchema
})

export const unfollowUserSchema = z.object({
  targetUserId: userIdSchema
})

export const getFollowersSchema = z.object({
  userId: userIdSchema.optional(), // If not provided, gets current user's followers
  limit: z
    .number()
    .int()
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit must be no more than 100')
    .default(20),
  offset: z
    .number()
    .int()
    .min(0, 'Offset must be non-negative')
    .default(0)
})

export const getFollowingSchema = z.object({
  userId: userIdSchema.optional(), // If not provided, gets current user's following
  limit: z
    .number()
    .int()
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit must be no more than 100')
    .default(20),
  offset: z
    .number()
    .int()
    .min(0, 'Offset must be non-negative')
    .default(0)
})

// Block/Unblock Schemas
export const blockUserSchema = z.object({
  targetUserId: userIdSchema,
  reason: z
    .enum(['harassment', 'spam', 'inappropriate_content', 'impersonation', 'other'], {
      required_error: 'Block reason is required',
      invalid_type_error: 'Invalid block reason'
    }),
  details: z
    .string()
    .max(1000, 'Block details must be no more than 1000 characters')
    .optional()
})

export const unblockUserSchema = z.object({
  targetUserId: userIdSchema
})

export const getBlockedUsersSchema = z.object({
  limit: z
    .number()
    .int()
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit must be no more than 100')
    .default(20),
  offset: z
    .number()
    .int()
    .min(0, 'Offset must be non-negative')
    .default(0)
})

// Report Schemas
export const reportUserSchema = z.object({
  targetUserId: userIdSchema,
  reason: z
    .enum(['harassment', 'spam', 'inappropriate_content', 'impersonation', 'hate_speech', 'threats', 'other'], {
      required_error: 'Report reason is required',
      invalid_type_error: 'Invalid report reason'
    }),
  details: z
    .string()
    .min(10, 'Report details must be at least 10 characters')
    .max(2000, 'Report details must be no more than 2000 characters'),
  context: z
    .object({
      location: z.string().optional(), // Where the incident occurred (profile, chat, etc.)
      timestamp: z.string().datetime().optional(), // When the incident occurred
      evidence: z.array(z.string().url()).max(5, 'Maximum 5 evidence URLs allowed').optional()
    })
    .optional()
})

export const getReportsSchema = z.object({
  status: z
    .enum(['pending', 'investigating', 'resolved', 'dismissed'])
    .optional(),
  limit: z
    .number()
    .int()
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit must be no more than 100')
    .default(20),
  offset: z
    .number()
    .int()
    .min(0, 'Offset must be non-negative')
    .default(0)
})

// Social Search Schemas
export const searchUsersSchema = z.object({
  query: z
    .string()
    .min(1, 'Search query is required')
    .max(100, 'Search query must be no more than 100 characters'),
  filters: z
    .object({
      username: z.boolean().default(true),
      displayName: z.boolean().default(true),
      bio: z.boolean().default(false),
      gamingPreferences: z.boolean().default(false)
    })
    .optional(),
  limit: z
    .number()
    .int()
    .min(1, 'Limit must be at least 1')
    .max(50, 'Limit must be no more than 50')
    .default(20),
  offset: z
    .number()
    .int()
    .min(0, 'Offset must be non-negative')
    .default(0),
  excludeBlocked: z.boolean().default(true),
  excludePrivate: z.boolean().default(false)
})

// Mutual Friends/Connections Schemas
export const getMutualFriendsSchema = z.object({
  targetUserId: userIdSchema,
  limit: z
    .number()
    .int()
    .min(1, 'Limit must be at least 1')
    .max(50, 'Limit must be no more than 50')
    .default(10)
})

export const getSuggestedFriendsSchema = z.object({
  algorithm: z
    .enum(['mutual_friends', 'gaming_preferences', 'activity_based', 'location_based'])
    .default('mutual_friends'),
  limit: z
    .number()
    .int()
    .min(1, 'Limit must be at least 1')
    .max(20, 'Limit must be no more than 20')
    .default(10),
  excludeRecent: z.boolean().default(true) // Exclude recently declined friend requests
})

// Social Activity Schemas
export const getSocialActivitySchema = z.object({
  userId: userIdSchema.optional(), // If not provided, gets current user's activity
  types: z
    .array(z.enum(['friend_request_sent', 'friend_request_received', 'friend_added', 'follow', 'unfollow']))
    .optional(),
  limit: z
    .number()
    .int()
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit must be no more than 100')
    .default(20),
  offset: z
    .number()
    .int()
    .min(0, 'Offset must be non-negative')
    .default(0),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
})

// Social Stats Schemas
export const getSocialStatsSchema = z.object({
  userId: userIdSchema.optional(), // If not provided, gets current user's stats
  includeDetails: z.boolean().default(false) // Include breakdown by categories
})

// Privacy Settings for Social Features
export const updateSocialPrivacySchema = z.object({
  friendRequestsFrom: z
    .enum(['everyone', 'friends_of_friends', 'nobody'])
    .default('everyone'),
  showFriendsList: z
    .enum(['everyone', 'friends', 'nobody'])
    .default('friends'),
  showFollowersList: z
    .enum(['everyone', 'friends', 'nobody'])
    .default('everyone'),
  showFollowingList: z
    .enum(['everyone', 'friends', 'nobody'])
    .default('everyone'),
  showMutualFriends: z
    .enum(['everyone', 'friends', 'nobody'])
    .default('friends'),
  allowTagging: z
    .enum(['everyone', 'friends', 'nobody'])
    .default('friends'),
  showOnlineStatus: z
    .enum(['everyone', 'friends', 'nobody'])
    .default('friends'),
  showGameActivity: z
    .enum(['everyone', 'friends', 'nobody'])
    .default('friends')
})

// Notification Preferences for Social Features
export const updateSocialNotificationsSchema = z.object({
  friendRequests: z.boolean().default(true),
  friendRequestAccepted: z.boolean().default(true),
  newFollower: z.boolean().default(true),
  friendOnline: z.boolean().default(false),
  friendStartedGame: z.boolean().default(false),
  friendAchievement: z.boolean().default(false),
  mentionInPost: z.boolean().default(true),
  commentOnPost: z.boolean().default(true)
})

// Bulk Operations Schemas
export const bulkFriendActionSchema = z.object({
  userIds: z
    .array(userIdSchema)
    .min(1, 'At least one user ID is required')
    .max(50, 'Maximum 50 users allowed in bulk operation'),
  action: z.enum(['remove', 'block'], {
    required_error: 'Action is required',
    invalid_type_error: 'Invalid bulk action'
  }),
  reason: z
    .string()
    .max(500, 'Reason must be no more than 500 characters')
    .optional()
})

export const bulkFollowActionSchema = z.object({
  userIds: z
    .array(userIdSchema)
    .min(1, 'At least one user ID is required')
    .max(50, 'Maximum 50 users allowed in bulk operation'),
  action: z.enum(['follow', 'unfollow'], {
    required_error: 'Action is required',
    invalid_type_error: 'Invalid bulk action'
  })
})

// Export types for TypeScript
export type SendFriendRequestInput = z.infer<typeof sendFriendRequestSchema>
export type RespondToFriendRequestInput = z.infer<typeof respondToFriendRequestSchema>
export type RemoveFriendInput = z.infer<typeof removeFriendSchema>
export type BlockFriendInput = z.infer<typeof blockFriendSchema>
export type FollowUserInput = z.infer<typeof followUserSchema>
export type UnfollowUserInput = z.infer<typeof unfollowUserSchema>
export type GetFollowersInput = z.infer<typeof getFollowersSchema>
export type GetFollowingInput = z.infer<typeof getFollowingSchema>
export type BlockUserInput = z.infer<typeof blockUserSchema>
export type UnblockUserInput = z.infer<typeof unblockUserSchema>
export type GetBlockedUsersInput = z.infer<typeof getBlockedUsersSchema>
export type ReportUserInput = z.infer<typeof reportUserSchema>
export type GetReportsInput = z.infer<typeof getReportsSchema>
export type SearchUsersInput = z.infer<typeof searchUsersSchema>
export type GetMutualFriendsInput = z.infer<typeof getMutualFriendsSchema>
export type GetSuggestedFriendsInput = z.infer<typeof getSuggestedFriendsSchema>
export type GetSocialActivityInput = z.infer<typeof getSocialActivitySchema>
export type GetSocialStatsInput = z.infer<typeof getSocialStatsSchema>
export type UpdateSocialPrivacyInput = z.infer<typeof updateSocialPrivacySchema>
export type UpdateSocialNotificationsInput = z.infer<typeof updateSocialNotificationsSchema>
export type BulkFriendActionInput = z.infer<typeof bulkFriendActionSchema>
export type BulkFollowActionInput = z.infer<typeof bulkFollowActionSchema>

// Validation helper functions
export function validateSendFriendRequest(data: unknown) {
  return sendFriendRequestSchema.safeParse(data)
}

export function validateRespondToFriendRequest(data: unknown) {
  return respondToFriendRequestSchema.safeParse(data)
}

export function validateFollowUser(data: unknown) {
  return followUserSchema.safeParse(data)
}

export function validateUnfollowUser(data: unknown) {
  return unfollowUserSchema.safeParse(data)
}

export function validateBlockUser(data: unknown) {
  return blockUserSchema.safeParse(data)
}

export function validateUnblockUser(data: unknown) {
  return unblockUserSchema.safeParse(data)
}

export function validateReportUser(data: unknown) {
  return reportUserSchema.safeParse(data)
}

export function validateSearchUsers(data: unknown) {
  return searchUsersSchema.safeParse(data)
}

export function validateUpdateSocialPrivacy(data: unknown) {
  return updateSocialPrivacySchema.safeParse(data)
}

export function validateUpdateSocialNotifications(data: unknown) {
  return updateSocialNotificationsSchema.safeParse(data)
}

// Social feature constants
export const SOCIAL_LIMITS = {
  MAX_FRIENDS: 5000,
  MAX_FOLLOWING: 10000,
  MAX_FRIEND_REQUEST_MESSAGE_LENGTH: 500,
  MAX_REPORT_DETAILS_LENGTH: 2000,
  MAX_BLOCK_REASON_LENGTH: 1000,
  BULK_OPERATION_LIMIT: 50,
  SEARCH_RESULTS_LIMIT: 50,
  SUGGESTED_FRIENDS_LIMIT: 20,
  MUTUAL_FRIENDS_LIMIT: 50
} as const

export const FRIEND_REQUEST_STATUSES = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  CANCELLED: 'cancelled'
} as const

export const REPORT_REASONS = {
  HARASSMENT: 'harassment',
  SPAM: 'spam',
  INAPPROPRIATE_CONTENT: 'inappropriate_content',
  IMPERSONATION: 'impersonation',
  HATE_SPEECH: 'hate_speech',
  THREATS: 'threats',
  OTHER: 'other'
} as const

export const BLOCK_REASONS = {
  HARASSMENT: 'harassment',
  SPAM: 'spam',
  INAPPROPRIATE_CONTENT: 'inappropriate_content',
  IMPERSONATION: 'impersonation',
  OTHER: 'other'
} as const

export const SOCIAL_ACTIVITY_TYPES = {
  FRIEND_REQUEST_SENT: 'friend_request_sent',
  FRIEND_REQUEST_RECEIVED: 'friend_request_received',
  FRIEND_ADDED: 'friend_added',
  FOLLOW: 'follow',
  UNFOLLOW: 'unfollow'
} as const
