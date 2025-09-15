import { z } from 'zod'

// Security constants
const MAX_LOGIN_ATTEMPTS = 5
const LOCKOUT_DURATION = 15 * 60 * 1000 // 15 minutes
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const ALLOWED_MIME_TYPES = [...ALLOWED_IMAGE_TYPES, 'application/pdf', 'text/plain']

// Security patterns
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
  /(--|\/\*|\*\/|;|'|"|`)/,
  /(\bOR\b|\bAND\b).*?[=<>]/i
]

const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
  /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi
]

const SUSPICIOUS_PATTERNS = [
  /\b(admin|root|administrator|system|test|demo)\b/i,
  /\b(password|passwd|pwd|secret|key|token)\b/i,
  /\b(eval|exec|system|shell|cmd)\b/i
]

// Input sanitization schemas
export const sanitizedStringSchema = z
  .string()
  .transform((str) => str.trim())
  .refine(
    (str) => !SQL_INJECTION_PATTERNS.some(pattern => pattern.test(str)),
    'Input contains potentially dangerous SQL patterns'
  )
  .refine(
    (str) => !XSS_PATTERNS.some(pattern => pattern.test(str)),
    'Input contains potentially dangerous script content'
  )

export const sanitizedTextSchema = z
  .string()
  .transform((str) => {
    // Remove null bytes and control characters except newlines and tabs
    return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
  })
  .refine(
    (str) => !XSS_PATTERNS.some(pattern => pattern.test(str)),
    'Text contains potentially dangerous content'
  )

export const sanitizedHtmlSchema = z
  .string()
  .transform((str) => {
    // Basic HTML sanitization - remove dangerous tags and attributes
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
  })

// File upload security schemas
export const secureFileSchema = z.object({
  name: z
    .string()
    .min(1, 'File name is required')
    .max(255, 'File name too long')
    .refine(
      (name) => !/[<>:"/\\|?*\x00-\x1f]/.test(name),
      'File name contains invalid characters'
    )
    .refine(
      (name) => !name.startsWith('.'),
      'File name cannot start with a dot'
    )
    .refine(
      (name) => !/\.(exe|bat|cmd|com|pif|scr|vbs|js|jar|app|deb|pkg|dmg)$/i.test(name),
      'File type not allowed for security reasons'
    ),
  
  size: z
    .number()
    .min(1, 'File cannot be empty')
    .max(MAX_FILE_SIZE, `File size cannot exceed ${MAX_FILE_SIZE / (1024 * 1024)}MB`),
  
  type: z
    .string()
    .refine(
      (type) => ALLOWED_MIME_TYPES.includes(type),
      `File type must be one of: ${ALLOWED_MIME_TYPES.join(', ')}`
    ),
  
  lastModified: z.number().optional(),
  
  // File content validation (for images)
  content: z
    .string()
    .optional()
    .refine(
      (content) => {
        if (!content) return true
        // Check for embedded scripts in image files
        return !XSS_PATTERNS.some(pattern => pattern.test(content))
      },
      'File content contains suspicious data'
    )
})

export const avatarFileSecuritySchema = secureFileSchema.extend({
  type: z
    .string()
    .refine(
      (type) => ALLOWED_IMAGE_TYPES.includes(type),
      `Avatar must be one of: ${ALLOWED_IMAGE_TYPES.join(', ')}`
    ),
  
  size: z
    .number()
    .min(1, 'Avatar file cannot be empty')
    .max(5 * 1024 * 1024, 'Avatar file cannot exceed 5MB'), // Stricter limit for avatars
  
  dimensions: z
    .object({
      width: z.number().min(32).max(2048),
      height: z.number().min(32).max(2048)
    })
    .optional()
    .refine(
      (dims) => !dims || (dims.width <= 2048 && dims.height <= 2048),
      'Image dimensions too large'
    )
})

// Rate limiting schemas
export const rateLimitSchema = z.object({
  identifier: z.string().min(1, 'Rate limit identifier required'),
  action: z.enum([
    'login_attempt',
    'signup_attempt', 
    'password_reset',
    'email_verification',
    'profile_update',
    'friend_request',
    'message_send',
    'file_upload',
    'api_request'
  ]),
  windowMs: z.number().min(1000).max(24 * 60 * 60 * 1000), // 1 second to 24 hours
  maxAttempts: z.number().min(1).max(1000),
  timestamp: z.number().default(() => Date.now())
})

// Security audit schemas
export const securityEventSchema = z.object({
  userId: z.string().uuid().optional(),
  sessionId: z.string().optional(),
  ipAddress: z.string().ip().optional(),
  userAgent: z.string().max(1000).optional(),
  action: z.enum([
    'login_success',
    'login_failure',
    'logout',
    'password_change',
    'email_change',
    'profile_update',
    'suspicious_activity',
    'rate_limit_exceeded',
    'invalid_token',
    'permission_denied'
  ]),
  details: z.record(z.any()).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('low'),
  timestamp: z.number().default(() => Date.now())
})

// CSRF protection schema
export const csrfTokenSchema = z.object({
  token: z
    .string()
    .min(32, 'CSRF token too short')
    .max(128, 'CSRF token too long')
    .regex(/^[a-zA-Z0-9+/=]+$/, 'Invalid CSRF token format'),
  
  timestamp: z.number(),
  
  sessionId: z.string().min(1, 'Session ID required')
}).refine(
  (data) => {
    const now = Date.now()
    const tokenAge = now - data.timestamp
    return tokenAge <= 60 * 60 * 1000 // Token valid for 1 hour
  },
  'CSRF token has expired'
)

// Session security schema
export const sessionSecuritySchema = z.object({
  sessionId: z.string().min(1, 'Session ID required'),
  userId: z.string().uuid('Invalid user ID'),
  ipAddress: z.string().ip('Invalid IP address'),
  userAgent: z.string().max(1000, 'User agent too long'),
  createdAt: z.number(),
  lastActivity: z.number(),
  expiresAt: z.number(),
  isActive: z.boolean().default(true),
  
  // Security flags
  flags: z.object({
    suspicious: z.boolean().default(false),
    multipleDevices: z.boolean().default(false),
    locationChange: z.boolean().default(false),
    userAgentChange: z.boolean().default(false)
  }).optional()
}).refine(
  (session) => session.expiresAt > Date.now(),
  'Session has expired'
).refine(
  (session) => session.lastActivity > session.createdAt,
  'Invalid session timestamps'
)

// Password security validation
export const passwordSecuritySchema = z.object({
  password: z.string(),
  userId: z.string().uuid().optional(),
  
  // Password history check
  previousPasswords: z.array(z.string()).optional(),
  
  // Context for additional validation
  context: z.object({
    username: z.string().optional(),
    email: z.string().email().optional(),
    displayName: z.string().optional()
  }).optional()
}).refine(
  (data) => {
    const { password, previousPasswords } = data
    
    // Check against previous passwords
    if (previousPasswords && previousPasswords.length > 0) {
      // This would typically use proper password hashing comparison
      return !previousPasswords.includes(password)
    }
    
    return true
  },
  'Password has been used recently'
).refine(
  (data) => {
    const { password, context } = data
    
    if (!context) return true
    
    // Check if password contains user information
    const userInfo = [
      context.username,
      context.email?.split('@')[0],
      context.displayName
    ].filter(Boolean).map(info => info?.toLowerCase())
    
    const lowerPassword = password.toLowerCase()
    
    return !userInfo.some(info => 
      info && (lowerPassword.includes(info) || info.includes(lowerPassword))
    )
  },
  'Password cannot contain personal information'
)

// API security schemas
export const apiKeySchema = z.object({
  key: z
    .string()
    .min(32, 'API key too short')
    .max(128, 'API key too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid API key format'),
  
  permissions: z.array(z.enum([
    'read_profile',
    'write_profile', 
    'read_social',
    'write_social',
    'upload_files',
    'admin'
  ])).default(['read_profile']),
  
  rateLimit: z.object({
    requestsPerHour: z.number().min(1).max(10000).default(1000),
    requestsPerDay: z.number().min(1).max(100000).default(10000)
  }).optional(),
  
  expiresAt: z.number().optional(),
  isActive: z.boolean().default(true)
})

// Content moderation schemas
export const contentModerationSchema = z.object({
  content: z.string().max(10000, 'Content too long for moderation'),
  contentType: z.enum(['text', 'html', 'markdown', 'username', 'display_name', 'bio']),
  
  checks: z.object({
    profanity: z.boolean().default(true),
    spam: z.boolean().default(true),
    toxicity: z.boolean().default(true),
    personalInfo: z.boolean().default(true),
    links: z.boolean().default(true)
  }).optional(),
  
  strictMode: z.boolean().default(false)
})

export const moderationResultSchema = z.object({
  approved: z.boolean(),
  confidence: z.number().min(0).max(1),
  
  flags: z.object({
    profanity: z.boolean().default(false),
    spam: z.boolean().default(false),
    toxicity: z.boolean().default(false),
    personalInfo: z.boolean().default(false),
    suspiciousLinks: z.boolean().default(false)
  }),
  
  suggestions: z.array(z.string()).optional(),
  sanitizedContent: z.string().optional()
})

// Input validation with security checks
export const secureInputSchema = z.object({
  value: sanitizedStringSchema,
  maxLength: z.number().min(1).max(10000).default(1000),
  allowHtml: z.boolean().default(false),
  allowUrls: z.boolean().default(true),
  
  // Additional security checks
  checkSuspiciousPatterns: z.boolean().default(true),
  checkPersonalInfo: z.boolean().default(false)
}).refine(
  (data) => {
    if (!data.checkSuspiciousPatterns) return true
    
    return !SUSPICIOUS_PATTERNS.some(pattern => pattern.test(data.value))
  },
  'Input contains suspicious patterns'
)

// Validation helper functions
export const validateSecureFile = (file: unknown) => {
  return secureFileSchema.safeParse(file)
}

export const validateAvatarSecurity = (file: unknown) => {
  return avatarFileSecuritySchema.safeParse(file)
}

export const validateRateLimit = (data: unknown) => {
  return rateLimitSchema.safeParse(data)
}

export const validateSecurityEvent = (event: unknown) => {
  return securityEventSchema.safeParse(event)
}

export const validateCsrfToken = (token: unknown) => {
  return csrfTokenSchema.safeParse(token)
}

export const validateSessionSecurity = (session: unknown) => {
  return sessionSecuritySchema.safeParse(session)
}

export const validatePasswordSecurity = (data: unknown) => {
  return passwordSecuritySchema.safeParse(data)
}

export const validateApiKey = (key: unknown) => {
  return apiKeySchema.safeParse(key)
}

export const validateContentModeration = (content: unknown) => {
  return contentModerationSchema.safeParse(content)
}

export const validateSecureInput = (input: unknown) => {
  return secureInputSchema.safeParse(input)
}

// Security utility functions
export const sanitizeInput = (input: string, options: {
  maxLength?: number
  allowHtml?: boolean
  removeControlChars?: boolean
} = {}) => {
  const { maxLength = 1000, allowHtml = false, removeControlChars = true } = options
  
  let sanitized = input.trim()
  
  // Remove control characters
  if (removeControlChars) {
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
  }
  
  // Remove XSS patterns if HTML not allowed
  if (!allowHtml) {
    XSS_PATTERNS.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '')
    })
  }
  
  // Truncate to max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength)
  }
  
  return sanitized
}

export const checkSqlInjection = (input: string): boolean => {
  return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(input))
}

export const checkXssAttempt = (input: string): boolean => {
  return XSS_PATTERNS.some(pattern => pattern.test(input))
}

export const checkSuspiciousContent = (input: string): boolean => {
  return SUSPICIOUS_PATTERNS.some(pattern => pattern.test(input))
}

// Type exports
export type SecureFileInput = z.infer<typeof secureFileSchema>
export type AvatarFileSecurityInput = z.infer<typeof avatarFileSecuritySchema>
export type RateLimitInput = z.infer<typeof rateLimitSchema>
export type SecurityEventInput = z.infer<typeof securityEventSchema>
export type CsrfTokenInput = z.infer<typeof csrfTokenSchema>
export type SessionSecurityInput = z.infer<typeof sessionSecuritySchema>
export type PasswordSecurityInput = z.infer<typeof passwordSecuritySchema>
export type ApiKeyInput = z.infer<typeof apiKeySchema>
export type ContentModerationInput = z.infer<typeof contentModerationSchema>
export type ModerationResultInput = z.infer<typeof moderationResultSchema>
export type SecureInputInput = z.infer<typeof secureInputSchema>

// Security constants export
export const SECURITY_CONSTANTS = {
  MAX_LOGIN_ATTEMPTS,
  LOCKOUT_DURATION,
  MAX_FILE_SIZE,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_MIME_TYPES
} as const
