import { NextRequest, NextResponse } from 'next/server'
import { withValidation, ValidationContext, ValidatedRequest } from '@/lib/middleware/validation-middleware'
import { createApiResponse } from '@/lib/validations/api-schemas'
import { usernameSchema } from '@/lib/validations/auth-schemas'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Username check query schema
const usernameCheckSchema = z.object({
  username: usernameSchema,
  honeypot: z.string().max(0).optional()
}).refine(
  (data) => {
    if (data.honeypot && data.honeypot.length > 0) {
      return false
    }
    return true
  },
  { message: "Invalid request", path: ["honeypot"] }
)

// Reserved usernames that cannot be used
const RESERVED_USERNAMES = [
  'admin', 'administrator', 'root', 'system', 'api', 'www', 'mail', 'ftp',
  'support', 'help', 'info', 'contact', 'about', 'terms', 'privacy',
  'security', 'login', 'signup', 'register', 'auth', 'oauth', 'callback',
  'profile', 'user', 'users', 'account', 'settings', 'dashboard',
  'moderator', 'mod', 'staff', 'team', 'official', 'verified',
  'test', 'demo', 'example', 'sample', 'null', 'undefined',
  'anonymous', 'guest', 'public', 'private', 'deleted', 'banned',
  'skillissued', 'skill-issued', 'skill_issued'
]

// Profanity filter (basic implementation - in production use a comprehensive service)
const PROFANITY_PATTERNS = [
  /\b(fuck|shit|damn|hell|ass|bitch|bastard)\b/i,
  // Add more patterns as needed
]

function generateUsernameSuggestions(baseUsername: string): string[] {
  const suggestions: string[] = []
  
  // Add numbers
  for (let i = 1; i <= 5; i++) {
    suggestions.push(`${baseUsername}${i}`)
    suggestions.push(`${baseUsername}${Math.floor(Math.random() * 1000)}`)
  }
  
  // Add common suffixes
  const suffixes = ['_gamer', '_player', '_pro', '_2024', '_gaming']
  suffixes.forEach(suffix => {
    if (baseUsername.length + suffix.length <= 30) {
      suggestions.push(`${baseUsername}${suffix}`)
    }
  })
  
  // Add prefixes
  const prefixes = ['the_', 'pro_', 'epic_']
  prefixes.forEach(prefix => {
    if (prefix.length + baseUsername.length <= 30) {
      suggestions.push(`${prefix}${baseUsername}`)
    }
  })
  
  return suggestions.slice(0, 5) // Return max 5 suggestions
}

async function checkUsernameHandler(req: ValidatedRequest, context: ValidationContext): Promise<NextResponse> {
  const { query } = req.validatedData
  const { username } = query

  try {
    // Check if username is reserved
    if (RESERVED_USERNAMES.includes(username.toLowerCase())) {
      return NextResponse.json(
        createApiResponse(true, {
          available: false,
          reason: 'reserved',
          message: 'This username is reserved and cannot be used',
          suggestions: generateUsernameSuggestions(username)
        }, undefined, {
          requestId: context.requestId
        }),
        { status: 200 }
      )
    }

    // Check for profanity
    const hasProfanity = PROFANITY_PATTERNS.some(pattern => pattern.test(username))
    if (hasProfanity) {
      return NextResponse.json(
        createApiResponse(true, {
          available: false,
          reason: 'inappropriate',
          message: 'This username contains inappropriate content',
          suggestions: generateUsernameSuggestions(username.replace(/[^a-zA-Z0-9]/g, ''))
        }, undefined, {
          requestId: context.requestId
        }),
        { status: 200 }
      )
    }

    // Check database for existing username
    const supabase = createClient()
    const { data: existingUser, error } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('username', username)
      .is('deleted_at', null) // Exclude soft-deleted profiles
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Username check database error:', error)
      return NextResponse.json(
        createApiResponse(false, null, {
          code: 'DATABASE_ERROR',
          message: 'Unable to check username availability'
        }),
        { status: 500 }
      )
    }

    const isAvailable = !existingUser

    // Log username check for analytics
    console.log('Username availability check:', {
      username,
      available: isAvailable,
      ipAddress: context.ipAddress,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json(
      createApiResponse(true, {
        available: isAvailable,
        username,
        message: isAvailable 
          ? 'Username is available' 
          : 'Username is already taken',
        suggestions: isAvailable ? [] : generateUsernameSuggestions(username)
      }, undefined, {
        requestId: context.requestId
      }),
      { status: 200 }
    )

  } catch (error) {
    console.error('Username check error:', error)
    
    return NextResponse.json(
      createApiResponse(false, null, {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }),
      { status: 500 }
    )
  }
}

// Apply validation middleware with rate limiting
export const GET = withValidation({
  query: usernameCheckSchema,
  allowedMethods: ['GET'],
  rateLimit: {
    windowMs: 1 * 60 * 1000, // 1 minute
    maxAttempts: 30, // 30 username checks per minute per IP
    identifier: (req) => req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
  }
})(checkUsernameHandler)

// Handle unsupported methods
export async function POST() {
  return NextResponse.json(
    createApiResponse(false, null, {
      code: 'METHOD_NOT_ALLOWED',
      message: 'Method not allowed'
    }),
    { status: 405 }
  )
}

export async function PUT() {
  return POST()
}

export async function DELETE() {
  return POST()
}

export async function PATCH() {
  return POST()
}
