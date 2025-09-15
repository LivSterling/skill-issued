import { NextRequest, NextResponse } from 'next/server'
import { withValidation, ValidationContext, ValidatedRequest } from '@/lib/middleware/validation-middleware'
import { loginRequestSchema, createApiResponse } from '@/lib/validations/api-schemas'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Enhanced login schema with security features
const loginValidationSchema = loginRequestSchema.extend({
  // Anti-bot and security fields
  honeypot: z.string().max(0).optional(),
  timestamp: z.number().optional(),
  captchaToken: z.string().optional(),
  
  // Device information for security logging
  deviceInfo: z.object({
    userAgent: z.string().max(1000).optional(),
    platform: z.string().max(50).optional(),
    browser: z.string().max(50).optional(),
    fingerprint: z.string().max(128).optional()
  }).optional()
}).refine(
  (data) => {
    // Honeypot validation
    if (data.honeypot && data.honeypot.length > 0) {
      return false
    }
    return true
  },
  { message: "Invalid request", path: ["honeypot"] }
)

// Login attempt tracking (in production, use Redis or database)
const loginAttempts = new Map<string, { count: number; lastAttempt: number; lockedUntil?: number }>()

const MAX_LOGIN_ATTEMPTS = 5
const LOCKOUT_DURATION = 15 * 60 * 1000 // 15 minutes
const ATTEMPT_WINDOW = 15 * 60 * 1000 // 15 minutes

function checkLoginAttempts(identifier: string): { allowed: boolean; attemptsRemaining: number; lockedUntil?: number } {
  const now = Date.now()
  const attempts = loginAttempts.get(identifier)

  if (!attempts) {
    return { allowed: true, attemptsRemaining: MAX_LOGIN_ATTEMPTS - 1 }
  }

  // Check if lockout period has expired
  if (attempts.lockedUntil && now > attempts.lockedUntil) {
    loginAttempts.delete(identifier)
    return { allowed: true, attemptsRemaining: MAX_LOGIN_ATTEMPTS - 1 }
  }

  // Check if still locked out
  if (attempts.lockedUntil && now <= attempts.lockedUntil) {
    return { allowed: false, attemptsRemaining: 0, lockedUntil: attempts.lockedUntil }
  }

  // Check if attempt window has expired
  if (now - attempts.lastAttempt > ATTEMPT_WINDOW) {
    loginAttempts.delete(identifier)
    return { allowed: true, attemptsRemaining: MAX_LOGIN_ATTEMPTS - 1 }
  }

  // Check if max attempts reached
  if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
    const lockedUntil = now + LOCKOUT_DURATION
    loginAttempts.set(identifier, { ...attempts, lockedUntil })
    return { allowed: false, attemptsRemaining: 0, lockedUntil }
  }

  return { allowed: true, attemptsRemaining: MAX_LOGIN_ATTEMPTS - attempts.count - 1 }
}

function recordLoginAttempt(identifier: string, success: boolean) {
  const now = Date.now()
  const attempts = loginAttempts.get(identifier)

  if (success) {
    // Clear attempts on successful login
    loginAttempts.delete(identifier)
    return
  }

  if (!attempts) {
    loginAttempts.set(identifier, { count: 1, lastAttempt: now })
  } else {
    loginAttempts.set(identifier, { 
      count: attempts.count + 1, 
      lastAttempt: now,
      lockedUntil: attempts.lockedUntil
    })
  }
}

async function loginHandler(req: ValidatedRequest, context: ValidationContext): Promise<NextResponse> {
  const { body } = req.validatedData
  const { email, password, rememberMe, deviceInfo } = body

  // Create identifier for rate limiting (IP + email)
  const identifier = `${context.ipAddress}:${email}`

  try {
    // Check login attempts
    const attemptCheck = checkLoginAttempts(identifier)
    
    if (!attemptCheck.allowed) {
      const lockedUntilDate = attemptCheck.lockedUntil ? new Date(attemptCheck.lockedUntil) : null
      
      return NextResponse.json(
        createApiResponse(false, null, {
          code: 'ACCOUNT_LOCKED',
          message: `Too many failed login attempts. Account locked until ${lockedUntilDate?.toISOString()}`,
          details: {
            lockedUntil: lockedUntilDate?.toISOString(),
            attemptsRemaining: 0
          }
        }),
        { status: 429 }
      )
    }

    // Create Supabase client
    const supabase = createClient()

    // Attempt login
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (authError || !authData.user) {
      // Record failed attempt
      recordLoginAttempt(identifier, false)
      
      // Log security event
      console.warn('Failed login attempt:', {
        email,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        timestamp: new Date().toISOString(),
        error: authError?.message,
        attemptsRemaining: attemptCheck.attemptsRemaining - 1
      })

      return NextResponse.json(
        createApiResponse(false, null, {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
          details: {
            attemptsRemaining: attemptCheck.attemptsRemaining - 1
          }
        }),
        { status: 401 }
      )
    }

    // Record successful attempt
    recordLoginAttempt(identifier, true)

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    // Log successful login
    console.log('Successful login:', {
      userId: authData.user.id,
      email: authData.user.email,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      deviceInfo,
      timestamp: new Date().toISOString()
    })

    // Prepare response data
    const responseData = {
      user: {
        id: authData.user.id,
        email: authData.user.email,
        emailVerified: authData.user.email_confirmed_at !== null,
        lastSignIn: authData.user.last_sign_in_at
      },
      profile: profile || null,
      session: {
        accessToken: authData.session?.access_token,
        refreshToken: authData.session?.refresh_token,
        expiresAt: authData.session?.expires_at,
        expiresIn: authData.session?.expires_in
      }
    }

    // Set session cookies if remember me is enabled
    const response = NextResponse.json(
      createApiResponse(true, responseData, undefined, {
        requestId: context.requestId
      }),
      { status: 200 }
    )

    if (rememberMe && authData.session) {
      // Set secure session cookies
      response.cookies.set('sb-access-token', authData.session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: authData.session.expires_in || 3600
      })

      response.cookies.set('sb-refresh-token', authData.session.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 // 30 days
      })
    }

    return response

  } catch (error) {
    console.error('Login error:', error)
    
    // Record failed attempt for unexpected errors
    recordLoginAttempt(identifier, false)
    
    return NextResponse.json(
      createApiResponse(false, null, {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred during login'
      }),
      { status: 500 }
    )
  }
}

// Apply validation middleware with aggressive rate limiting for login
export const POST = withValidation({
  body: loginValidationSchema,
  allowedMethods: ['POST'],
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxAttempts: 10, // 10 login attempts per IP per 15 minutes
    identifier: (req) => req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
  }
})(loginHandler)

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
