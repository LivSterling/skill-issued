import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { passwordSchema } from '@/lib/validations/auth-schemas'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { password, access_token, refresh_token } = body

    // Validate password
    const passwordValidation = passwordSchema.safeParse(password)
    if (!passwordValidation.success) {
      return NextResponse.json(
        { 
          error: 'Password does not meet requirements',
          details: passwordValidation.error.errors.map(e => e.message)
        },
        { status: 400 }
      )
    }

    if (!access_token || !refresh_token) {
      return NextResponse.json(
        { error: 'Missing authentication tokens' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Set the session with the tokens from the reset link
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token,
      refresh_token
    })

    if (sessionError) {
      console.error('Session error:', sessionError)
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      )
    }

    // Update the user's password
    const { error: updateError } = await supabase.auth.updateUser({
      password: password
    })

    if (updateError) {
      console.error('Password update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update password' },
        { status: 400 }
      )
    }

    console.log('Password updated successfully for user:', sessionData.user?.id)

    return NextResponse.json({
      message: 'Password updated successfully',
      user: {
        id: sessionData.user?.id,
        email: sessionData.user?.email
      }
    })

  } catch (error) {
    console.error('Password reset confirmation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
