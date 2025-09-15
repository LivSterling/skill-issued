import { NextRequest, NextResponse } from 'next/server'
import { withValidation, ValidationContext, ValidatedRequest } from '@/lib/middleware/validation-middleware'
import { passwordResetRequestSchema, passwordResetConfirmSchema } from '@/lib/validations/auth-schemas'
import { createApiResponse } from '@/lib/validations/api-schemas'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Enhanced password reset request schema
const resetRequestValidationSchema = passwordResetRequestSchema.extend({
  honeypot: z.string().max(0).optional(),
  captchaToken: z.string().optional()
}).refine(
  (data) => {
    if (data.honeypot && data.honeypot.length > 0) {
      return false
    }
    return true
  },
  { message: "Invalid request", path: ["honeypot"] }
)

// Enhanced password reset confirmation schema
const resetConfirmValidationSchema = passwordResetConfirmSchema.extend({
  token: z.string().min(1, 'Reset token is required'),
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

// Rate limiting for password reset requests
const resetAttempts = new Map<string, { count: number; lastAttempt: number }>()
const MAX_RESET_ATTEMPTS = 3
const RESET_WINDOW = 60 * 60 * 1000 // 1 hour

function checkResetAttempts(identifier: string): { allowed: boolean; attemptsRemaining: number } {
  const now = Date.now()
  const attempts = resetAttempts.get(identifier)

  if (!attempts) {
    return { allowed: true, attemptsRemaining: MAX_RESET_ATTEMPTS - 1 }
  }

  // Check if window has expired
  if (now - attempts.lastAttempt > RESET_WINDOW) {
    resetAttempts.delete(identifier)
    return { allowed: true, attemptsRemaining: MAX_RESET_ATTEMPTS - 1 }
  }

  // Check if max attempts reached
  if (attempts.count >= MAX_RESET_ATTEMPTS) {
    return { allowed: false, attemptsRemaining: 0 }
  }

  return { allowed: true, attemptsRemaining: MAX_RESET_ATTEMPTS - attempts.count - 1 }
}

function recordResetAttempt(identifier: string) {
  const now = Date.now()
  const attempts = resetAttempts.get(identifier)

  if (!attempts) {
    resetAttempts.set(identifier, { count: 1, lastAttempt: now })
  } else {
    resetAttempts.set(identifier, { count: attempts.count + 1, lastAttempt: now })
  }
}

async function resetRequestHandler(req: ValidatedRequest, context: ValidationContext): Promise<NextResponse> {
  const { body } = req.validatedData
  const { email } = body

  // Create identifier for rate limiting
  const identifier = `${context.ipAddress}:${email}`

  try {
    // Check reset attempts
    const attemptCheck = checkResetAttempts(identifier)
    
    if (!attemptCheck.allowed) {
      return NextResponse.json(
        createApiResponse(false, null, {
          code: 'TOO_MANY_REQUESTS',
          message: 'Too many password reset requests. Please try again later.',
          details: {
            attemptsRemaining: 0,
            retryAfter: '1 hour'
          }
        }),
        { status: 429 }
      )
    }

    // Record attempt
    recordResetAttempt(identifier)

    // Create Supabase client
    const supabase = createClient()

    // Check if user exists (but don't reveal this information)
    const { data: user } = await supabase
      .from('auth.users')
      .select('id, email')
      .eq('email', email)
      .single()

    // Always return success to prevent email enumeration
    // But only send email if user actually exists
    if (user) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password/confirm`
      })

      if (error) {
        console.error('Password reset email error:', error)
        // Still return success to prevent information disclosure
      } else {
        console.log('Password reset email sent:', {
          email,
          userId: user.id,
          ipAddress: context.ipAddress,
          timestamp: new Date().toISOString()
        })
      }
    }

    // Always return the same response regardless of whether user exists
    return NextResponse.json(
      createApiResponse(true, {
        message: 'If an account with this email exists, a password reset link has been sent.'
      }, undefined, {
        requestId: context.requestId
      }),
      { status: 200 }
    )

  } catch (error) {
    console.error('Password reset request error:', error)
    
    return NextResponse.json(
      createApiResponse(false, null, {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }),
      { status: 500 }
    )
  }
}

async function resetConfirmHandler(req: ValidatedRequest, context: ValidationContext): Promise<NextResponse> {
  const { body } = req.validatedData
  const { token, password } = body

  try {
    // Create Supabase client
    const supabase = createClient()

    // Verify and update password
    const { data, error } = await supabase.auth.updateUser({
      password
    })

    if (error) {
      console.error('Password reset confirmation error:', error)
      
      return NextResponse.json(
        createApiResponse(false, null, {
          code: 'RESET_FAILED',
          message: error.message || 'Failed to reset password'
        }),
        { status: 400 }
      )
    }

    if (!data.user) {
      return NextResponse.json(
        createApiResponse(false, null, {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired reset token'
        }),
        { status: 400 }
      )
    }

    // Log successful password reset
    console.log('Password reset successful:', {
      userId: data.user.id,
      email: data.user.email,
      ipAddress: context.ipAddress,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json(
      createApiResponse(true, {
        message: 'Password has been reset successfully. You can now sign in with your new password.'
      }, undefined, {
        requestId: context.requestId
      }),
      { status: 200 }
    )

  } catch (error) {
    console.error('Password reset confirmation error:', error)
    
    return NextResponse.json(
      createApiResponse(false, null, {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }),
      { status: 500 }
    )
  }
}

// POST handler for password reset requests
export const POST = withValidation({
  body: resetRequestValidationSchema,
  allowedMethods: ['POST'],
  rateLimit: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxAttempts: 5, // 5 reset requests per IP per hour
    identifier: (req) => req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
  }
})(resetRequestHandler)

// PUT handler for password reset confirmation
export const PUT = withValidation({
  body: resetConfirmValidationSchema,
  allowedMethods: ['PUT'],
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxAttempts: 10, // 10 confirmation attempts per IP per 15 minutes
    identifier: (req) => req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
  }
})(resetConfirmHandler)

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

export async function DELETE() {
  return GET()
}

export async function PATCH() {
  return GET()
}
