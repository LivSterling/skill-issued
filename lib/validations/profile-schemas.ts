import { z } from 'zod'

// Constants for validation
const USERNAME_MIN_LENGTH = 3
const USERNAME_MAX_LENGTH = 30
const DISPLAY_NAME_MAX_LENGTH = 50
const BIO_MAX_LENGTH = 500
const MAX_GENRES = 10
const MAX_PLATFORMS = 8
const MAX_LANGUAGES = 5
const MAX_LOOKING_FOR = 4

// Regex patterns
const USERNAME_REGEX = /^[a-zA-Z0-9_-]+$/
const URL_REGEX = /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&=]*)$/

// Privacy level schema
export const privacyLevelSchema = z.enum(['public', 'friends', 'private'], {
  errorMap: () => ({ message: 'Privacy level must be public, friends, or private' })
})

// Friendship status schema
export const friendshipStatusSchema = z.enum(['pending', 'accepted', 'declined', 'blocked'], {
  errorMap: () => ({ message: 'Invalid friendship status' })
})

// Gaming preferences schema
export const gamingPreferencesSchema = z.object({
  favoriteGenres: z
    .array(z.string().min(1, 'Genre cannot be empty'))
    .max(MAX_GENRES, `Cannot select more than ${MAX_GENRES} genres`)
    .optional()
    .refine(
      (genres) => !genres || new Set(genres).size === genres.length,
      'Duplicate genres are not allowed'
    ),
  
  favoritePlatforms: z
    .array(z.string().min(1, 'Platform cannot be empty'))
    .max(MAX_PLATFORMS, `Cannot select more than ${MAX_PLATFORMS} platforms`)
    .optional()
    .refine(
      (platforms) => !platforms || new Set(platforms).size === platforms.length,
      'Duplicate platforms are not allowed'
    ),
  
  playStyle: z
    .enum(['casual', 'competitive', 'hardcore', 'mixed'])
    .optional(),
  
  preferredGameModes: z
    .array(z.string().min(1, 'Game mode cannot be empty'))
    .optional()
    .refine(
      (modes) => !modes || new Set(modes).size === modes.length,
      'Duplicate game modes are not allowed'
    ),
  
  availableHours: z
    .object({
      weekdays: z
        .number()
        .min(0, 'Hours cannot be negative')
        .max(24, 'Hours cannot exceed 24 per day')
        .optional(),
      weekends: z
        .number()
        .min(0, 'Hours cannot be negative')
        .max(24, 'Hours cannot exceed 24 per day')
        .optional()
    })
    .optional(),
  
  timeZone: z
    .string()
    .optional()
    .refine(
      (tz) => !tz || Intl.supportedValuesOf('timeZone').includes(tz),
      'Invalid timezone'
    ),
  
  languages: z
    .array(z.string().min(1, 'Language cannot be empty'))
    .max(MAX_LANGUAGES, `Cannot select more than ${MAX_LANGUAGES} languages`)
    .optional()
    .refine(
      (languages) => !languages || new Set(languages).size === languages.length,
      'Duplicate languages are not allowed'
    ),
  
  lookingFor: z
    .array(z.enum(['friends', 'teammates', 'mentorship', 'casual_play']))
    .max(MAX_LOOKING_FOR, `Cannot select more than ${MAX_LOOKING_FOR} options`)
    .optional()
    .refine(
      (lookingFor) => !lookingFor || new Set(lookingFor).size === lookingFor.length,
      'Duplicate selections are not allowed'
    )
}).optional()

// Username validation schema
export const usernameSchema = z
  .string()
  .min(USERNAME_MIN_LENGTH, `Username must be at least ${USERNAME_MIN_LENGTH} characters`)
  .max(USERNAME_MAX_LENGTH, `Username cannot exceed ${USERNAME_MAX_LENGTH} characters`)
  .regex(USERNAME_REGEX, 'Username can only contain letters, numbers, underscores, and hyphens')
  .refine(
    (username) => !username.startsWith('_') && !username.startsWith('-'),
    'Username cannot start with underscore or hyphen'
  )
  .refine(
    (username) => !username.endsWith('_') && !username.endsWith('-'),
    'Username cannot end with underscore or hyphen'
  )
  .refine(
    (username) => !username.includes('__') && !username.includes('--'),
    'Username cannot contain consecutive underscores or hyphens'
  )

// Display name validation schema
export const displayNameSchema = z
  .string()
  .max(DISPLAY_NAME_MAX_LENGTH, `Display name cannot exceed ${DISPLAY_NAME_MAX_LENGTH} characters`)
  .optional()
  .refine(
    (name) => !name || name.trim().length > 0,
    'Display name cannot be only whitespace'
  )

// Bio validation schema
export const bioSchema = z
  .string()
  .max(BIO_MAX_LENGTH, `Bio cannot exceed ${BIO_MAX_LENGTH} characters`)
  .optional()

// Avatar URL validation schema
export const avatarUrlSchema = z
  .string()
  .url('Invalid avatar URL')
  .regex(URL_REGEX, 'Avatar URL must be a valid HTTP/HTTPS URL')
  .optional()
  .or(z.literal(''))

// Create profile schema
export const createProfileSchema = z.object({
  username: usernameSchema,
  display_name: displayNameSchema,
  bio: bioSchema,
  avatar_url: avatarUrlSchema,
  privacy_level: privacyLevelSchema.default('public'),
  gaming_preferences: gamingPreferencesSchema
})

// Update profile schema (all fields optional except constraints)
export const updateProfileSchema = z.object({
  display_name: displayNameSchema,
  bio: bioSchema,
  avatar_url: avatarUrlSchema,
  privacy_level: privacyLevelSchema,
  gaming_preferences: gamingPreferencesSchema
}).partial()

// Profile search filters schema
export const profileSearchFiltersSchema = z.object({
  username: z.string().optional(),
  display_name: z.string().optional(),
  genres: z.array(z.string()).optional(),
  platforms: z.array(z.string()).optional(),
  play_style: z.enum(['casual', 'competitive', 'hardcore', 'mixed']).optional(),
  looking_for: z.array(z.enum(['friends', 'teammates', 'mentorship', 'casual_play'])).optional(),
  privacy_level: z.array(privacyLevelSchema).optional()
})

// Profile search options schema
export const profileSearchOptionsSchema = z.object({
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  order_by: z.enum(['username', 'display_name', 'created_at', 'updated_at']).default('username'),
  order_direction: z.enum(['asc', 'desc']).default('asc')
})

// Friendship management schemas
export const createFriendshipSchema = z.object({
  friend_id: z.string().uuid('Invalid user ID')
})

export const updateFriendshipSchema = z.object({
  status: friendshipStatusSchema
})

// Follow management schemas
export const createFollowSchema = z.object({
  following_id: z.string().uuid('Invalid user ID')
})

// Avatar upload validation schema
export const avatarUploadSchema = z.object({
  maxSize: z.number().min(1).max(10 * 1024 * 1024).default(2 * 1024 * 1024), // Default 2MB
  allowedTypes: z.array(z.string()).default(['image/jpeg', 'image/png', 'image/webp']),
  quality: z.number().min(0.1).max(1).default(0.8)
})

// File validation for avatar upload
export const avatarFileSchema = z.object({
  name: z.string().min(1, 'File name is required'),
  size: z.number().min(1, 'File size must be greater than 0'),
  type: z.string().refine(
    (type) => ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(type),
    'File must be a valid image (JPEG, PNG, WebP, or GIF)'
  )
}).refine(
  (file) => file.size <= 5 * 1024 * 1024, // 5MB limit
  'File size cannot exceed 5MB'
)

// Bulk validation schemas
export const bulkProfileUpdateSchema = z.object({
  profiles: z.array(z.object({
    id: z.string().uuid(),
    data: updateProfileSchema
  })).min(1, 'At least one profile must be provided').max(50, 'Cannot update more than 50 profiles at once')
})

// Profile export/import schemas
export const profileExportSchema = z.object({
  include_gaming_preferences: z.boolean().default(true),
  include_social_data: z.boolean().default(false),
  format: z.enum(['json', 'csv']).default('json')
})

export const profileImportSchema = z.object({
  profiles: z.array(createProfileSchema),
  overwrite_existing: z.boolean().default(false),
  skip_validation: z.boolean().default(false)
})

// Advanced validation functions
export const validateUniqueUsername = (username: string, existingUsernames: string[]) => {
  const result = usernameSchema.safeParse(username)
  if (!result.success) return result

  if (existingUsernames.includes(username.toLowerCase())) {
    return {
      success: false,
      error: {
        issues: [{
          code: 'custom',
          message: 'Username is already taken',
          path: ['username']
        }]
      }
    }
  }

  return result
}

export const validateGamingPreferencesConsistency = (preferences: any) => {
  const result = gamingPreferencesSchema.safeParse(preferences)
  if (!result.success) return result

  // Additional consistency checks
  const data = result.data
  if (data?.playStyle === 'casual' && data?.lookingFor?.includes('teammates')) {
    return {
      success: false,
      error: {
        issues: [{
          code: 'custom',
          message: 'Casual play style might conflict with looking for competitive teammates',
          path: ['gaming_preferences', 'lookingFor']
        }]
      }
    }
  }

  return result
}

// Profile completeness validation
export const validateProfileCompleteness = (profile: any) => {
  const completenessScore = {
    username: profile.username ? 20 : 0,
    display_name: profile.display_name ? 15 : 0,
    bio: profile.bio ? 20 : 0,
    avatar_url: profile.avatar_url ? 15 : 0,
    gaming_preferences: profile.gaming_preferences ? 30 : 0
  }

  const totalScore = Object.values(completenessScore).reduce((sum, score) => sum + score, 0)
  const isComplete = totalScore >= 70 // 70% threshold for "complete" profile

  return {
    score: totalScore,
    isComplete,
    breakdown: completenessScore,
    suggestions: [
      !profile.username && 'Add a username',
      !profile.display_name && 'Add a display name',
      !profile.bio && 'Write a bio',
      !profile.avatar_url && 'Upload a profile picture',
      !profile.gaming_preferences && 'Set gaming preferences'
    ].filter(Boolean)
  }
}

// Type inference helpers
export type CreateProfileInput = z.infer<typeof createProfileSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type ProfileSearchFilters = z.infer<typeof profileSearchFiltersSchema>
export type ProfileSearchOptions = z.infer<typeof profileSearchOptionsSchema>
export type CreateFriendshipInput = z.infer<typeof createFriendshipSchema>
export type UpdateFriendshipInput = z.infer<typeof updateFriendshipSchema>
export type CreateFollowInput = z.infer<typeof createFollowSchema>
export type AvatarUploadOptions = z.infer<typeof avatarUploadSchema>
export type AvatarFileInput = z.infer<typeof avatarFileSchema>
export type GamingPreferencesInput = z.infer<typeof gamingPreferencesSchema>

// Validation error formatter
export const formatValidationErrors = (error: z.ZodError) => {
  return error.issues.map(issue => ({
    field: issue.path.join('.'),
    message: issue.message,
    code: issue.code
  }))
}

// Quick validation functions
export const isValidUsername = (username: string) => usernameSchema.safeParse(username).success
export const isValidDisplayName = (displayName: string) => displayNameSchema.safeParse(displayName).success
export const isValidBio = (bio: string) => bioSchema.safeParse(bio).success
export const isValidAvatarUrl = (url: string) => avatarUrlSchema.safeParse(url).success
export const isValidPrivacyLevel = (level: string) => privacyLevelSchema.safeParse(level).success

// Schema validation with custom error messages
export const validateCreateProfile = (data: unknown) => {
  try {
    const result = createProfileSchema.parse(data)
    return { success: true, data: result, errors: [] }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        data: null, 
        errors: formatValidationErrors(error) 
      }
    }
    throw error
  }
}

export const validateUpdateProfile = (data: unknown) => {
  try {
    const result = updateProfileSchema.parse(data)
    return { success: true, data: result, errors: [] }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        data: null, 
        errors: formatValidationErrors(error) 
      }
    }
    throw error
  }
}

export const validateGamingPreferences = (data: unknown) => {
  try {
    const result = gamingPreferencesSchema.parse(data)
    return { success: true, data: result, errors: [] }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        data: null, 
        errors: formatValidationErrors(error) 
      }
    }
    throw error
  }
}
