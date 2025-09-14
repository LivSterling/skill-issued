import { z } from 'zod'

// Constants for validation
const PASSWORD_MIN_LENGTH = 8
const PASSWORD_MAX_LENGTH = 128
const EMAIL_MAX_LENGTH = 254

// Regex patterns
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/

// Email validation schema
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .max(EMAIL_MAX_LENGTH, `Email cannot exceed ${EMAIL_MAX_LENGTH} characters`)
  .email('Please enter a valid email address')
  .refine(
    (email) => !email.includes('+') || email.indexOf('+') < email.indexOf('@'),
    'Invalid email format'
  )

// Password validation schema
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(PASSWORD_MAX_LENGTH, `Password cannot exceed ${PASSWORD_MAX_LENGTH} characters`)
  .regex(
    PASSWORD_REGEX,
    'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  )

// Strong password schema (for additional security)
export const strongPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(PASSWORD_MAX_LENGTH, `Password cannot exceed ${PASSWORD_MAX_LENGTH} characters`)
  .regex(
    STRONG_PASSWORD_REGEX,
    'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  )
  .refine(
    (password) => !/(.)\1{2,}/.test(password),
    'Password cannot contain more than 2 consecutive identical characters'
  )
  .refine(
    (password) => !/^(?:password|123456|qwerty|abc123|admin|user|guest)$/i.test(password),
    'Password is too common and not secure'
  )

// Sign up validation schema
export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username cannot exceed 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  displayName: z
    .string()
    .max(50, 'Display name cannot exceed 50 characters')
    .optional()
})

// Sign in validation schema
export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required')
})

// Password reset request schema
export const passwordResetRequestSchema = z.object({
  email: emailSchema
})

// Password reset confirmation schema
export const passwordResetConfirmSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string()
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "Passwords don't match",
    path: ["confirmPassword"]
  }
)

// Change password schema
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string()
}).refine(
  (data) => data.newPassword === data.confirmPassword,
  {
    message: "New passwords don't match",
    path: ["confirmPassword"]
  }
).refine(
  (data) => data.currentPassword !== data.newPassword,
  {
    message: "New password must be different from current password",
    path: ["newPassword"]
  }
)

// Email verification schema
export const emailVerificationSchema = z.object({
  token: z.string().min(1, 'Verification token is required')
})

// OAuth provider schema
export const oauthProviderSchema = z.enum(['google', 'discord'], {
  errorMap: () => ({ message: 'Invalid OAuth provider' })
})

// Authentication preferences schema
export const authPreferencesSchema = z.object({
  rememberMe: z.boolean().default(true),
  autoRefresh: z.boolean().default(true),
  sessionTimeout: z.number().min(1000 * 60 * 5).max(1000 * 60 * 60 * 24 * 30).default(1000 * 60 * 60 * 24 * 7) // 5 minutes to 30 days, default 7 days
})

// Type inference helpers
export type SignUpInput = z.infer<typeof signUpSchema>
export type SignInInput = z.infer<typeof signInSchema>
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>
export type PasswordResetConfirmInput = z.infer<typeof passwordResetConfirmSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
export type EmailVerificationInput = z.infer<typeof emailVerificationSchema>
export type OAuthProvider = z.infer<typeof oauthProviderSchema>
export type AuthPreferencesInput = z.infer<typeof authPreferencesSchema>

// Validation helper functions
export const isValidEmail = (email: string) => emailSchema.safeParse(email).success
export const isValidPassword = (password: string) => passwordSchema.safeParse(password).success
export const isStrongPassword = (password: string) => strongPasswordSchema.safeParse(password).success

// Password strength checker
export const checkPasswordStrength = (password: string) => {
  const checks = {
    length: password.length >= PASSWORD_MIN_LENGTH,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[@$!%*?&]/.test(password),
    noRepeating: !/(.)\1{2,}/.test(password),
    notCommon: !/^(?:password|123456|qwerty|abc123|admin|user|guest)$/i.test(password)
  }

  const score = Object.values(checks).filter(Boolean).length
  const strength = score < 4 ? 'weak' : score < 6 ? 'medium' : 'strong'

  return {
    score,
    strength,
    checks,
    suggestions: [
      !checks.length && `Use at least ${PASSWORD_MIN_LENGTH} characters`,
      !checks.lowercase && 'Include lowercase letters',
      !checks.uppercase && 'Include uppercase letters',
      !checks.number && 'Include numbers',
      !checks.special && 'Include special characters (@$!%*?&)',
      !checks.noRepeating && 'Avoid repeating characters',
      !checks.notCommon && 'Avoid common passwords'
    ].filter(Boolean)
  }
}

// Validation error formatter
export const formatValidationErrors = (error: z.ZodError) => {
  return error.issues.map(issue => ({
    field: issue.path.join('.'),
    message: issue.message,
    code: issue.code
  }))
}

// Quick validation functions with detailed responses
export const validateSignUp = (data: unknown) => {
  try {
    const result = signUpSchema.parse(data)
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

export const validateSignIn = (data: unknown) => {
  try {
    const result = signInSchema.parse(data)
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

export const validatePasswordReset = (data: unknown) => {
  try {
    const result = passwordResetConfirmSchema.parse(data)
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

export const validateChangePassword = (data: unknown) => {
  try {
    const result = changePasswordSchema.parse(data)
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
