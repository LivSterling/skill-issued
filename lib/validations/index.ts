// Main validation exports
// This file provides a centralized export for all validation schemas

// All validation schema exports
export * from './auth-schemas'
export * from './profile-schemas'
export * from './social-schemas'
export * from './privacy-schemas'
export * from './security-schemas'
export * from './api-schemas'

// Profile validation exports
export {
  createProfileSchema,
  updateProfileSchema,
  usernameSchema,
  displayNameSchema,
  bioSchema,
  avatarUrlSchema,
  privacyLevelSchema,
  gamingPreferencesSchema,
  profileSearchFiltersSchema,
  profileSearchOptionsSchema,
  createFriendshipSchema,
  updateFriendshipSchema,
  createFollowSchema,
  avatarUploadSchema,
  avatarFileSchema,
  validateCreateProfile,
  validateUpdateProfile,
  validateUniqueUsername,
  validateGamingPreferencesConsistency,
  validateProfileCompleteness,
  formatValidationErrors as formatProfileValidationErrors,
  isValidUsername,
  isValidDisplayName,
  isValidBio,
  isValidAvatarUrl,
  isValidPrivacyLevel
} from './profile-schemas'

// Authentication validation exports
export {
  emailSchema,
  passwordSchema,
  strongPasswordSchema,
  signUpSchema,
  signInSchema,
  passwordResetRequestSchema,
  passwordResetConfirmSchema,
  changePasswordSchema,
  emailVerificationSchema,
  oauthProviderSchema,
  authPreferencesSchema,
  validateSignUp,
  validateSignIn,
  validatePasswordReset,
  validateChangePassword,
  checkPasswordStrength,
  formatValidationErrors as formatAuthValidationErrors,
  isValidEmail,
  isValidPassword,
  isStrongPassword
} from './auth-schemas'

// Type exports
export type {
  CreateProfileInput,
  UpdateProfileInput,
  ProfileSearchFilters,
  ProfileSearchOptions,
  CreateFriendshipInput,
  UpdateFriendshipInput,
  CreateFollowInput,
  AvatarUploadOptions,
  AvatarFileInput,
  GamingPreferencesInput
} from './profile-schemas'

export type {
  SignUpInput,
  SignInInput,
  PasswordResetRequestInput,
  PasswordResetConfirmInput,
  ChangePasswordInput,
  EmailVerificationInput,
  OAuthProvider,
  AuthPreferencesInput
} from './auth-schemas'

// Common validation utilities
export const ValidationUtils = {
  // Profile utilities
  profile: {
    validateCreate: validateCreateProfile,
    validateUpdate: validateUpdateProfile,
    validateUsername: validateUniqueUsername,
    validateCompleteness: validateProfileCompleteness,
    isValidUsername,
    isValidDisplayName,
    isValidBio,
    isValidAvatarUrl,
    isValidPrivacyLevel
  },
  
  // Auth utilities
  auth: {
    validateSignUp,
    validateSignIn,
    validatePasswordReset,
    validateChangePassword,
    checkPasswordStrength,
    isValidEmail,
    isValidPassword,
    isStrongPassword
  },
  
  // Security utilities
  security: {
    validateSecureFile,
    validateAvatarSecurity,
    validateRateLimit,
    validateSecurityEvent,
    validateCsrfToken,
    validateSessionSecurity,
    validatePasswordSecurity,
    sanitizeInput,
    checkSqlInjection,
    checkXssAttempt,
    checkSuspiciousContent
  },
  
  // API utilities
  api: {
    validateApiRequest,
    createApiResponse,
    createPaginatedResponse
  }
}

// Validation constants
export const ValidationConstants = {
  // Profile constants
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 30,
  DISPLAY_NAME_MAX_LENGTH: 50,
  BIO_MAX_LENGTH: 500,
  MAX_GENRES: 10,
  MAX_PLATFORMS: 8,
  MAX_LANGUAGES: 5,
  MAX_LOOKING_FOR: 4,
  
  // Auth constants
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  EMAIL_MAX_LENGTH: 254,
  
  // Security constants
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_AVATAR_SIZE: 5 * 1024 * 1024, // 5MB
  
  // API constants
  MAX_PAGE_SIZE: 100,
  MAX_BULK_OPERATIONS: 100,
  MAX_SEARCH_RESULTS: 1000,
  REQUEST_TIMEOUT: 30000, // 30 seconds
  DEFAULT_RATE_LIMIT: 100
}

// Error codes for consistent error handling
export const ValidationErrorCodes = {
  // Basic validation errors
  REQUIRED: 'required',
  INVALID_FORMAT: 'invalid_format',
  TOO_SHORT: 'too_short',
  TOO_LONG: 'too_long',
  DUPLICATE: 'duplicate',
  NOT_UNIQUE: 'not_unique',
  
  // Auth-specific errors
  WEAK_PASSWORD: 'weak_password',
  PASSWORDS_DONT_MATCH: 'passwords_dont_match',
  INVALID_EMAIL: 'invalid_email',
  INVALID_CREDENTIALS: 'invalid_credentials',
  ACCOUNT_LOCKED: 'account_locked',
  
  // Security errors
  SUSPICIOUS_CONTENT: 'suspicious_content',
  SQL_INJECTION_DETECTED: 'sql_injection_detected',
  XSS_ATTEMPT_DETECTED: 'xss_attempt_detected',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  INVALID_CSRF_TOKEN: 'invalid_csrf_token',
  SESSION_EXPIRED: 'session_expired',
  PERMISSION_DENIED: 'permission_denied',
  
  // File validation errors
  FILE_TOO_LARGE: 'file_too_large',
  INVALID_FILE_TYPE: 'invalid_file_type',
  INVALID_FILE_CONTENT: 'invalid_file_content',
  MALICIOUS_FILE_DETECTED: 'malicious_file_detected',
  
  // API errors
  INVALID_URL: 'invalid_url',
  INVALID_API_KEY: 'invalid_api_key',
  QUOTA_EXCEEDED: 'quota_exceeded',
  RESOURCE_NOT_FOUND: 'resource_not_found'
}

// Helper function to create consistent validation responses
export const createValidationResponse = <T>(
  success: boolean,
  data?: T,
  errors: Array<{ field: string; message: string; code: string }> = []
) => ({
  success,
  data: data || null,
  errors,
  hasErrors: errors.length > 0,
  errorCount: errors.length,
  errorsByField: errors.reduce((acc, error) => {
    acc[error.field] = acc[error.field] || []
    acc[error.field].push(error)
    return acc
  }, {} as Record<string, Array<{ message: string; code: string }>>)
})

// Batch validation helper
export const validateBatch = <T>(
  items: unknown[],
  validator: (item: unknown) => { success: boolean; data: T | null; errors: any[] }
) => {
  const results = items.map((item, index) => ({
    index,
    ...validator(item)
  }))

  const successful = results.filter(r => r.success)
  const failed = results.filter(r => !r.success)

  return {
    total: items.length,
    successful: successful.length,
    failed: failed.length,
    successRate: (successful.length / items.length) * 100,
    results,
    validData: successful.map(r => r.data),
    errors: failed.map(r => ({ index: r.index, errors: r.errors }))
  }
}
