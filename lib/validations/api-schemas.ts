import { z } from 'zod'
import { sanitizedStringSchema, sanitizedTextSchema } from './security-schemas'

// Common API patterns
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/

// Base API schemas
export const apiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional()
  }).optional(),
  meta: z.object({
    timestamp: z.string().datetime(),
    requestId: z.string().uuid(),
    version: z.string().default('1.0.0')
  }).optional()
})

export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).optional(),
  sort: z.string().max(50).optional(),
  order: z.enum(['asc', 'desc']).default('asc')
})

export const paginatedResponseSchema = apiResponseSchema.extend({
  data: z.object({
    items: z.array(z.any()),
    pagination: z.object({
      page: z.number().int(),
      limit: z.number().int(),
      total: z.number().int(),
      totalPages: z.number().int(),
      hasNext: z.boolean(),
      hasPrev: z.boolean()
    })
  }).optional()
})

// Request validation schemas
export const apiRequestSchema = z.object({
  headers: z.object({
    'content-type': z.string().optional(),
    'authorization': z.string().optional(),
    'x-csrf-token': z.string().optional(),
    'x-api-key': z.string().optional(),
    'user-agent': z.string().max(1000).optional(),
    'x-forwarded-for': z.string().optional(),
    'x-real-ip': z.string().ip().optional()
  }).catchall(z.string()).optional(),
  
  query: z.record(z.string()).optional(),
  params: z.record(z.string()).optional(),
  body: z.any().optional(),
  
  // Security context
  security: z.object({
    userId: z.string().uuid().optional(),
    sessionId: z.string().optional(),
    ipAddress: z.string().ip().optional(),
    userAgent: z.string().optional(),
    csrfToken: z.string().optional()
  }).optional()
})

// Authentication API schemas
export const loginRequestSchema = z.object({
  email: z.string().email('Invalid email format').max(254),
  password: z.string().min(1, 'Password is required').max(128),
  rememberMe: z.boolean().default(false),
  captcha: z.string().optional(),
  
  // Security context
  deviceInfo: z.object({
    userAgent: z.string().max(1000).optional(),
    platform: z.string().max(50).optional(),
    browser: z.string().max(50).optional(),
    fingerprint: z.string().max(128).optional()
  }).optional()
})

export const registerRequestSchema = z.object({
  email: z.string().email('Invalid email format').max(254),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  username: sanitizedStringSchema.min(3).max(30),
  displayName: sanitizedStringSchema.max(50).optional(),
  acceptTerms: z.boolean().refine(val => val === true, 'Must accept terms of service'),
  captcha: z.string().optional(),
  
  // Optional profile data
  profile: z.object({
    bio: sanitizedTextSchema.max(500).optional(),
    gamingPreferences: z.any().optional()
  }).optional()
})

export const passwordResetRequestSchema = z.object({
  email: z.string().email('Invalid email format').max(254),
  captcha: z.string().optional()
})

export const passwordResetConfirmSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  confirmPassword: z.string()
}).refine(
  data => data.password === data.confirmPassword,
  {
    message: "Passwords don't match",
    path: ["confirmPassword"]
  }
)

export const changePasswordRequestSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters').max(128),
  confirmPassword: z.string()
}).refine(
  data => data.newPassword === data.confirmPassword,
  {
    message: "New passwords don't match",
    path: ["confirmPassword"]
  }
).refine(
  data => data.currentPassword !== data.newPassword,
  {
    message: "New password must be different from current password",
    path: ["newPassword"]
  }
)

// Profile API schemas
export const updateProfileRequestSchema = z.object({
  displayName: sanitizedStringSchema.max(50).optional(),
  bio: sanitizedTextSchema.max(500).optional(),
  avatarUrl: z.string().url().optional().or(z.literal('')),
  privacyLevel: z.enum(['public', 'friends', 'private']).optional(),
  
  gamingPreferences: z.object({
    favoriteGenres: z.array(z.string().min(1).max(50)).max(10).optional(),
    favoritePlatforms: z.array(z.string().min(1).max(50)).max(8).optional(),
    playStyle: z.enum(['casual', 'competitive', 'hardcore', 'mixed']).optional(),
    preferredGameModes: z.array(z.string().min(1).max(50)).max(5).optional(),
    availableHours: z.object({
      weekdays: z.number().min(0).max(24).optional(),
      weekends: z.number().min(0).max(24).optional()
    }).optional(),
    timeZone: z.string().max(50).optional(),
    languages: z.array(z.string().min(1).max(20)).max(5).optional(),
    lookingFor: z.array(z.enum(['friends', 'teammates', 'mentorship', 'casual_play'])).max(4).optional()
  }).optional()
})

export const uploadAvatarRequestSchema = z.object({
  file: z.object({
    name: z.string().min(1).max(255),
    size: z.number().min(1).max(5 * 1024 * 1024), // 5MB
    type: z.string().refine(
      type => ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(type),
      'Invalid file type'
    )
  }),
  
  options: z.object({
    quality: z.number().min(0.1).max(1).default(0.8),
    maxWidth: z.number().min(32).max(2048).default(512),
    maxHeight: z.number().min(32).max(2048).default(512)
  }).optional()
})

// Social API schemas
export const sendFriendRequestSchema = z.object({
  recipientId: z.string().uuid('Invalid recipient ID'),
  message: sanitizedTextSchema.max(500).optional()
})

export const respondFriendRequestSchema = z.object({
  requestId: z.string().uuid('Invalid request ID'),
  action: z.enum(['accept', 'decline']),
  message: sanitizedTextSchema.max(500).optional()
})

export const followUserRequestSchema = z.object({
  targetUserId: z.string().uuid('Invalid user ID')
})

export const blockUserRequestSchema = z.object({
  targetUserId: z.string().uuid('Invalid user ID'),
  reason: z.enum(['harassment', 'spam', 'inappropriate_content', 'impersonation', 'other']),
  details: sanitizedTextSchema.max(1000).optional()
})

export const reportUserRequestSchema = z.object({
  targetUserId: z.string().uuid('Invalid user ID'),
  reason: z.enum(['harassment', 'spam', 'inappropriate_content', 'impersonation', 'hate_speech', 'threats', 'other']),
  details: sanitizedTextSchema.min(10).max(2000),
  
  context: z.object({
    location: z.string().max(100).optional(),
    timestamp: z.string().datetime().optional(),
    evidence: z.array(z.string().url()).max(5).optional()
  }).optional()
})

// Search API schemas
export const searchUsersRequestSchema = z.object({
  query: sanitizedStringSchema.min(1).max(100),
  
  filters: z.object({
    username: z.boolean().default(true),
    displayName: z.boolean().default(true),
    bio: z.boolean().default(false),
    gamingPreferences: z.boolean().default(false)
  }).optional(),
  
  ...paginationSchema.shape,
  
  excludeBlocked: z.boolean().default(true),
  excludePrivate: z.boolean().default(false)
})

export const searchGamesRequestSchema = z.object({
  query: sanitizedStringSchema.min(1).max(100),
  
  filters: z.object({
    genres: z.array(z.string().min(1).max(50)).max(10).optional(),
    platforms: z.array(z.string().min(1).max(50)).max(8).optional(),
    releaseYear: z.object({
      min: z.number().int().min(1970).max(new Date().getFullYear() + 5).optional(),
      max: z.number().int().min(1970).max(new Date().getFullYear() + 5).optional()
    }).optional(),
    rating: z.object({
      min: z.number().min(0).max(10).optional(),
      max: z.number().min(0).max(10).optional()
    }).optional()
  }).optional(),
  
  ...paginationSchema.shape
})

// Admin API schemas
export const adminUserActionSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  action: z.enum(['suspend', 'unsuspend', 'ban', 'unban', 'verify', 'unverify', 'delete']),
  reason: sanitizedTextSchema.min(10).max(1000),
  duration: z.number().int().min(1).optional(), // Duration in hours for temporary actions
  
  moderatorNotes: sanitizedTextSchema.max(2000).optional()
})

export const adminContentModerationSchema = z.object({
  contentId: z.string().uuid('Invalid content ID'),
  contentType: z.enum(['profile', 'bio', 'username', 'avatar', 'post', 'comment']),
  action: z.enum(['approve', 'reject', 'flag', 'remove']),
  reason: sanitizedTextSchema.max(1000).optional(),
  
  replacement: sanitizedTextSchema.max(5000).optional() // For content replacement
})

// Bulk operation schemas
export const bulkUserActionSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1).max(50),
  action: z.enum(['suspend', 'unsuspend', 'verify', 'delete']),
  reason: sanitizedTextSchema.min(10).max(1000)
})

export const bulkContentModerationSchema = z.object({
  contentIds: z.array(z.string().uuid()).min(1).max(100),
  action: z.enum(['approve', 'reject', 'remove']),
  reason: sanitizedTextSchema.max(1000).optional()
})

// Analytics API schemas
export const analyticsRequestSchema = z.object({
  metrics: z.array(z.enum([
    'user_registrations',
    'user_logins', 
    'profile_updates',
    'friend_requests',
    'follows',
    'reports',
    'content_uploads'
  ])).min(1).max(10),
  
  dateRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  }).refine(
    data => new Date(data.start) < new Date(data.end),
    'Start date must be before end date'
  ),
  
  groupBy: z.enum(['hour', 'day', 'week', 'month']).default('day'),
  
  filters: z.object({
    userIds: z.array(z.string().uuid()).max(1000).optional(),
    countries: z.array(z.string().length(2)).max(50).optional(),
    platforms: z.array(z.string().max(50)).max(20).optional()
  }).optional()
})

// Webhook schemas
export const webhookConfigSchema = z.object({
  url: z.string().url('Invalid webhook URL'),
  events: z.array(z.enum([
    'user.created',
    'user.updated', 
    'user.deleted',
    'profile.updated',
    'friend_request.sent',
    'friend_request.accepted',
    'user.reported',
    'content.flagged'
  ])).min(1),
  
  secret: z.string().min(16).max(128).optional(),
  active: z.boolean().default(true),
  
  retryPolicy: z.object({
    maxRetries: z.number().int().min(0).max(10).default(3),
    backoffMultiplier: z.number().min(1).max(10).default(2)
  }).optional()
})

export const webhookDeliverySchema = z.object({
  id: z.string().uuid(),
  webhookId: z.string().uuid(),
  event: z.string(),
  payload: z.any(),
  
  delivery: z.object({
    timestamp: z.string().datetime(),
    statusCode: z.number().int().min(100).max(599),
    responseTime: z.number().min(0),
    attempt: z.number().int().min(1),
    success: z.boolean()
  })
})

// File management schemas
export const fileUploadRequestSchema = z.object({
  purpose: z.enum(['avatar', 'profile_banner', 'game_screenshot', 'document']),
  
  metadata: z.object({
    originalName: z.string().min(1).max(255),
    mimeType: z.string().max(100),
    size: z.number().int().min(1).max(50 * 1024 * 1024), // 50MB max
    checksum: z.string().optional()
  }),
  
  options: z.object({
    public: z.boolean().default(false),
    expiresAt: z.string().datetime().optional(),
    tags: z.array(z.string().max(50)).max(10).optional()
  }).optional()
})

export const fileDeleteRequestSchema = z.object({
  fileId: z.string().uuid('Invalid file ID'),
  reason: z.string().max(500).optional()
})

// Validation helper functions with enhanced error handling
export const validateApiRequest = (schema: z.ZodSchema, data: unknown) => {
  try {
    const result = schema.parse(data)
    return { 
      success: true as const, 
      data: result, 
      errors: [] 
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false as const,
        data: null,
        errors: error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
          received: issue.received
        }))
      }
    }
    
    return {
      success: false as const,
      data: null,
      errors: [{
        field: 'unknown',
        message: 'Validation failed',
        code: 'unknown_error'
      }]
    }
  }
}

export const createApiResponse = <T>(
  success: boolean,
  data?: T,
  error?: { code: string; message: string; details?: any },
  meta?: { requestId?: string; version?: string }
) => {
  return {
    success,
    data,
    error,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: meta?.requestId || crypto.randomUUID(),
      version: meta?.version || '1.0.0'
    }
  }
}

export const createPaginatedResponse = <T>(
  items: T[],
  pagination: {
    page: number
    limit: number
    total: number
  },
  meta?: { requestId?: string }
) => {
  const totalPages = Math.ceil(pagination.total / pagination.limit)
  
  return createApiResponse(
    true,
    {
      items,
      pagination: {
        ...pagination,
        totalPages,
        hasNext: pagination.page < totalPages,
        hasPrev: pagination.page > 1
      }
    },
    undefined,
    meta
  )
}

// Type exports
export type ApiResponse<T = any> = z.infer<typeof apiResponseSchema> & { data?: T }
export type PaginatedResponse<T = any> = z.infer<typeof paginatedResponseSchema> & { 
  data?: { 
    items: T[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
      hasNext: boolean
      hasPrev: boolean
    }
  }
}
export type ApiRequest = z.infer<typeof apiRequestSchema>
export type LoginRequest = z.infer<typeof loginRequestSchema>
export type RegisterRequest = z.infer<typeof registerRequestSchema>
export type UpdateProfileRequest = z.infer<typeof updateProfileRequestSchema>
export type SearchUsersRequest = z.infer<typeof searchUsersRequestSchema>
export type SearchGamesRequest = z.infer<typeof searchGamesRequestSchema>
export type AdminUserAction = z.infer<typeof adminUserActionSchema>
export type WebhookConfig = z.infer<typeof webhookConfigSchema>
export type FileUploadRequest = z.infer<typeof fileUploadRequestSchema>

// API validation constants
export const API_LIMITS = {
  MAX_PAGE_SIZE: 100,
  MAX_BULK_OPERATIONS: 100,
  MAX_SEARCH_RESULTS: 1000,
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_AVATAR_SIZE: 5 * 1024 * 1024, // 5MB
  REQUEST_TIMEOUT: 30000, // 30 seconds
  RATE_LIMIT_WINDOW: 60 * 1000, // 1 minute
  DEFAULT_RATE_LIMIT: 100 // requests per window
} as const
