import { NextRequest, NextResponse } from 'next/server'
import { withValidation, ValidationContext, ValidatedRequest } from '@/lib/middleware/validation-middleware'
import { registerRequestSchema, createApiResponse } from '@/lib/validations/api-schemas'
import { signUpSchema } from '@/lib/validations/auth-schemas'
import { createClient } from '@/lib/supabase/server'
import { createProfile } from '@/lib/database/queries'
import { z } from 'zod'

// Enhanced registration schema with additional security checks
const registrationValidationSchema = registerRequestSchema.extend({
  // Additional server-side only validations
  honeypot: z.string().max(0).optional(), // Anti-bot field
  timestamp: z.number().optional(), // Request timing validation
  fingerprint: z.string().optional() // Device fingerprinting
}).refine(
  (data) => {
    // Honeypot check - if filled, it's likely a bot
    if (data.honeypot && data.honeypot.length > 0) {
      return false
    }
    return true
  },
  { message: "Invalid request", path: ["honeypot"] }
).refine(
  (data) => {
    // Timing check - request should not be too fast (anti-bot)
    if (data.timestamp) {
      const now = Date.now()
      const timeDiff = now - data.timestamp
      // Request should take at least 2 seconds (human interaction time)
      return timeDiff >= 2000
    }
    return true
  },
  { message: "Request submitted too quickly", path: ["timestamp"] }
)

async function registerHandler(req: ValidatedRequest, context: ValidationContext): Promise<NextResponse> {
  const { body } = req.validatedData
  const { email, password, username, profile } = body

  try {
    // Create Supabase client
    const supabase = createClient()

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('auth.users')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json(
        createApiResponse(false, null, {
          code: 'USER_EXISTS',
          message: 'An account with this email already exists'
        }),
        { status: 409 }
      )
    }

    // Check username availability
    const { data: existingUsername } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single()

    if (existingUsername) {
      return NextResponse.json(
        createApiResponse(false, null, {
          code: 'USERNAME_TAKEN',
          message: 'This username is already taken'
        }),
        { status: 409 }
      )
    }

    // Create user account
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          display_name: profile?.displayName || username
        }
      }
    })

    if (authError) {
      console.error('Auth signup error:', authError)
      return NextResponse.json(
        createApiResponse(false, null, {
          code: 'SIGNUP_FAILED',
          message: authError.message
        }),
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        createApiResponse(false, null, {
          code: 'SIGNUP_FAILED',
          message: 'Failed to create user account'
        }),
        { status: 500 }
      )
    }

    // Create user profile
    try {
      const profileData = {
        id: authData.user.id,
        username,
        display_name: profile?.displayName || username,
        bio: profile?.bio || null,
        avatar_url: null,
        privacy_level: 'public' as const,
        gaming_preferences: profile?.gamingPreferences || null
      }

      await createProfile(profileData)
    } catch (profileError) {
      console.error('Profile creation error:', profileError)
      // Note: User account was created but profile failed
      // In production, you might want to implement cleanup or retry logic
    }

    // Log successful registration
    console.log('User registered successfully:', {
      userId: authData.user.id,
      email: authData.user.email,
      username,
      timestamp: new Date().toISOString(),
      context
    })

    return NextResponse.json(
      createApiResponse(true, {
        user: {
          id: authData.user.id,
          email: authData.user.email,
          username,
          emailConfirmed: false
        },
        message: 'Account created successfully. Please check your email for verification.'
      }),
      { status: 201 }
    )

  } catch (error) {
    console.error('Registration error:', error)
    
    return NextResponse.json(
      createApiResponse(false, null, {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred during registration'
      }),
      { status: 500 }
    )
  }
}

// Apply validation middleware with rate limiting and security checks
export const POST = withValidation({
  body: registrationValidationSchema,
  allowedMethods: ['POST'],
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxAttempts: 5, // 5 registration attempts per IP per 15 minutes
    identifier: (req) => req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
  }
})(registerHandler)

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    createApiResponse(false, null, {
      code: 'METHOD_NOT_ALLOWED',
      message: 'Method not allowed'
    }),
    { status: 405 }
  )
}

export async function PUT() {
  return GET()
}

export async function DELETE() {
  return GET()
}

export async function PATCH() {
  return GET()
}
