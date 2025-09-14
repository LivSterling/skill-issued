import { supabase } from '@/lib/supabase/client'
import { createProfile, checkUsernameAvailability as checkUsernameInDB } from '@/lib/database/queries'
import { validateCreateProfile } from '@/lib/validations/profile-schemas'
import type { AuthError, User } from '@supabase/supabase-js'

export interface AuthResult {
  user: User | null
  error: AuthError | null
}

export interface SignUpData {
  email: string
  password: string
  username: string
  displayName?: string
}

export interface SignInData {
  email: string
  password: string
}

export interface ResetPasswordData {
  email: string
}

// Sign up with email and password
export async function signUpWithEmail({ 
  email, 
  password, 
  username, 
  displayName 
}: SignUpData): Promise<AuthResult> {
  try {
    // First, validate the profile data
    const profileData = {
      username,
      display_name: displayName || username,
      privacy_level: 'public' as const
    }

    const profileValidation = validateCreateProfile(profileData)
    if (!profileValidation.success) {
      return { 
        user: null, 
        error: { 
          message: `Profile validation failed: ${profileValidation.errors.map(e => e.message).join(', ')}`,
          name: 'ValidationError'
        } as AuthError 
      }
    }

    // Check if username is available
    const { data: availabilityData, error: availabilityError } = await checkUsernameInDB(username)
    if (availabilityError) {
      return { 
        user: null, 
        error: { 
          message: 'Unable to check username availability',
          name: 'DatabaseError'
        } as AuthError 
      }
    }

    if (!availabilityData?.available) {
      return { 
        user: null, 
        error: { 
          message: 'Username is already taken',
          name: 'UsernameUnavailable'
        } as AuthError 
      }
    }

    // Create the authentication user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          display_name: displayName || username,
        }
      }
    })

    if (authError) {
      return { user: null, error: authError }
    }

    // If user was created successfully, create the profile
    if (authData.user) {
      const { data: profile, error: profileError } = await createProfile(
        authData.user.id,
        {
          username,
          display_name: displayName,
          privacy_level: 'public'
        }
      )

      if (profileError) {
        console.error('Profile creation failed during registration:', profileError)
        // Note: We don't return an error here because the user was created successfully
        // The profile can be created later, but we should log this for monitoring
      }
    }

    return { user: authData.user, error: null }
  } catch (err) {
    return { 
      user: null, 
      error: { 
        message: 'An unexpected error occurred during sign up',
        name: 'UnknownError'
      } as AuthError 
    }
  }
}

// Sign in with email and password
export async function signInWithEmail({ email, password }: SignInData): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      return { user: null, error }
    }

    return { user: data.user, error: null }
  } catch (err) {
    return { 
      user: null, 
      error: { 
        message: 'An unexpected error occurred during sign in',
        name: 'UnknownError'
      } as AuthError 
    }
  }
}

// Sign out
export async function signOut(): Promise<{ error: AuthError | null }> {
  try {
    const { error } = await supabase.auth.signOut()
    return { error }
  } catch (err) {
    return { 
      error: { 
        message: 'An unexpected error occurred during sign out',
        name: 'UnknownError'
      } as AuthError 
    }
  }
}

// Reset password
export async function resetPassword({ email }: ResetPasswordData): Promise<{ error: AuthError | null }> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })
    return { error }
  } catch (err) {
    return { 
      error: { 
        message: 'An unexpected error occurred during password reset',
        name: 'UnknownError'
      } as AuthError 
    }
  }
}

// Sign in with Google OAuth
export async function signInWithGoogle(): Promise<{ error: AuthError | null }> {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
    return { error }
  } catch (err) {
    return { 
      error: { 
        message: 'An unexpected error occurred during Google sign in',
        name: 'UnknownError'
      } as AuthError 
    }
  }
}

// Sign in with Discord OAuth
export async function signInWithDiscord(): Promise<{ error: AuthError | null }> {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
    return { error }
  } catch (err) {
    return { 
      error: { 
        message: 'An unexpected error occurred during Discord sign in',
        name: 'UnknownError'
      } as AuthError 
    }
  }
}

// Get current user
export async function getCurrentUser(): Promise<AuthResult> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    return { user, error }
  } catch (err) {
    return { 
      user: null, 
      error: { 
        message: 'An unexpected error occurred while getting current user',
        name: 'UnknownError'
      } as AuthError 
    }
  }
}

// Get current session
export async function getCurrentSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    return { session, error }
  } catch (err) {
    return { 
      session: null, 
      error: { 
        message: 'An unexpected error occurred while getting current session',
        name: 'UnknownError'
      } as AuthError 
    }
  }
}

// Refresh session
export async function refreshSession() {
  try {
    const { data, error } = await supabase.auth.refreshSession()
    return { session: data.session, user: data.user, error }
  } catch (err) {
    return { 
      session: null, 
      user: null,
      error: { 
        message: 'An unexpected error occurred while refreshing session',
        name: 'UnknownError'
      } as AuthError 
    }
  }
}

// Check if username is available
export async function checkUsernameAvailability(username: string): Promise<{ available: boolean; error: AuthError | null }> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .maybeSingle()

    if (error) {
      return { 
        available: false, 
        error: { 
          message: error.message || 'Database error while checking username',
          name: 'DatabaseError'
        } as AuthError 
      }
    }

    // If data is null, username is available
    return { available: !data, error: null }
  } catch (err) {
    return { 
      available: false, 
      error: { 
        message: 'An unexpected error occurred while checking username availability',
        name: 'UnknownError'
      } as AuthError 
    }
  }
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Validate password strength
export function validatePassword(password: string): { 
  valid: boolean; 
  errors: string[] 
} {
  const errors: string[] = []
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

// Validate username format
export function validateUsername(username: string): { 
  valid: boolean; 
  errors: string[] 
} {
  const errors: string[] = []
  
  if (username.length < 3) {
    errors.push('Username must be at least 3 characters long')
  }
  
  if (username.length > 20) {
    errors.push('Username must be no more than 20 characters long')
  }
  
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    errors.push('Username can only contain letters, numbers, and underscores')
  }
  
  if (/^_/.test(username) || /_$/.test(username)) {
    errors.push('Username cannot start or end with an underscore')
  }
  
  if (/__/.test(username)) {
    errors.push('Username cannot contain consecutive underscores')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}
