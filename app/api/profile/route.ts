import { NextRequest, NextResponse } from 'next/server'
import { withValidation, ValidationContext, ValidatedRequest, unauthorizedError } from '@/lib/middleware/validation-middleware'
import { updateProfileRequestSchema, createApiResponse } from '@/lib/validations/api-schemas'
import { updateProfileSchema } from '@/lib/validations/profile-schemas'
import { createClient } from '@/lib/supabase/server'
import { updateProfile, getProfile } from '@/lib/database/queries'
import { z } from 'zod'

// Enhanced profile update schema with additional validation
const profileUpdateValidationSchema = updateProfileRequestSchema.extend({
  // Server-side specific validations
  honeypot: z.string().max(0).optional(),
  lastModified: z.string().datetime().optional()
}).refine(
  (data) => {
    if (data.honeypot && data.honeypot.length > 0) {
      return false
    }
    return true
  },
  { message: "Invalid request", path: ["honeypot"] }
)

// Profile query schema
const profileQuerySchema = z.object({
  username: z.string().optional(),
  include: z.string().optional() // comma-separated list: gaming_preferences,social_stats
})

// Authentication helper
async function getAuthenticatedUser(req: NextRequest) {
  const supabase = createClient()
  
  // Get user from session
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return null
  }
  
  return user
}

// GET handler - Get user profile
async function getProfileHandler(req: ValidatedRequest, context: ValidationContext): Promise<NextResponse> {
  const { query } = req.validatedData
  const { username, include } = query

  try {
    const supabase = createClient()
    
    // If username is provided, get public profile
    if (username) {
      const profile = await getProfile(username)
      
      if (!profile) {
        return NextResponse.json(
          createApiResponse(false, null, {
            code: 'PROFILE_NOT_FOUND',
            message: 'Profile not found'
          }),
          { status: 404 }
        )
      }

      // Check privacy settings
      const user = await getAuthenticatedUser(req)
      const isOwnProfile = user?.id === profile.id
      
      if (profile.privacy_level === 'private' && !isOwnProfile) {
        return NextResponse.json(
          createApiResponse(false, null, {
            code: 'PROFILE_PRIVATE',
            message: 'This profile is private'
          }),
          { status: 403 }
        )
      }

      // Filter sensitive data for non-owners
      let responseProfile = { ...profile }
      if (!isOwnProfile) {
        delete responseProfile.email
        if (profile.privacy_level === 'friends') {
          // In a real app, check if users are friends
          // For now, show limited info
          responseProfile = {
            id: profile.id,
            username: profile.username,
            display_name: profile.display_name,
            avatar_url: profile.avatar_url,
            privacy_level: profile.privacy_level,
            created_at: profile.created_at
          }
        }
      }

      return NextResponse.json(
        createApiResponse(true, { profile: responseProfile }, undefined, {
          requestId: context.requestId
        }),
        { status: 200 }
      )
    }

    // Get current user's profile
    const user = await getAuthenticatedUser(req)
    if (!user) {
      return unauthorizedError('Authentication required')
    }

    const profile = await getProfile(user.id)
    
    if (!profile) {
      return NextResponse.json(
        createApiResponse(false, null, {
          code: 'PROFILE_NOT_FOUND',
          message: 'Profile not found'
        }),
        { status: 404 }
      )
    }

    return NextResponse.json(
      createApiResponse(true, { profile }, undefined, {
        requestId: context.requestId
      }),
      { status: 200 }
    )

  } catch (error) {
    console.error('Get profile error:', error)
    
    return NextResponse.json(
      createApiResponse(false, null, {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }),
      { status: 500 }
    )
  }
}

// PUT handler - Update user profile
async function updateProfileHandler(req: ValidatedRequest, context: ValidationContext): Promise<NextResponse> {
  const { body } = req.validatedData

  try {
    // Get authenticated user
    const user = await getAuthenticatedUser(req)
    if (!user) {
      return unauthorizedError('Authentication required')
    }

    // Get current profile
    const currentProfile = await getProfile(user.id)
    if (!currentProfile) {
      return NextResponse.json(
        createApiResponse(false, null, {
          code: 'PROFILE_NOT_FOUND',
          message: 'Profile not found'
        }),
        { status: 404 }
      )
    }

    // Check for username conflicts if username is being changed
    if (body.username && body.username !== currentProfile.username) {
      const supabase = createClient()
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', body.username)
        .neq('id', user.id)
        .single()

      if (existingProfile) {
        return NextResponse.json(
          createApiResponse(false, null, {
            code: 'USERNAME_TAKEN',
            message: 'This username is already taken'
          }),
          { status: 409 }
        )
      }
    }

    // Prepare update data
    const updateData: any = {}
    
    if (body.displayName !== undefined) updateData.display_name = body.displayName
    if (body.bio !== undefined) updateData.bio = body.bio
    if (body.avatarUrl !== undefined) updateData.avatar_url = body.avatarUrl
    if (body.privacyLevel !== undefined) updateData.privacy_level = body.privacyLevel
    if (body.gamingPreferences !== undefined) updateData.gaming_preferences = body.gamingPreferences

    // Update profile
    const updatedProfile = await updateProfile(user.id, updateData)

    if (!updatedProfile) {
      return NextResponse.json(
        createApiResponse(false, null, {
          code: 'UPDATE_FAILED',
          message: 'Failed to update profile'
        }),
        { status: 500 }
      )
    }

    // Log profile update
    console.log('Profile updated:', {
      userId: user.id,
      changes: Object.keys(updateData),
      ipAddress: context.ipAddress,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json(
      createApiResponse(true, { 
        profile: updatedProfile,
        message: 'Profile updated successfully'
      }, undefined, {
        requestId: context.requestId
      }),
      { status: 200 }
    )

  } catch (error) {
    console.error('Update profile error:', error)
    
    return NextResponse.json(
      createApiResponse(false, null, {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }),
      { status: 500 }
    )
  }
}

// DELETE handler - Delete user profile (soft delete)
async function deleteProfileHandler(req: ValidatedRequest, context: ValidationContext): Promise<NextResponse> {
  try {
    // Get authenticated user
    const user = await getAuthenticatedUser(req)
    if (!user) {
      return unauthorizedError('Authentication required')
    }

    const supabase = createClient()

    // Soft delete profile (mark as deleted)
    const { error } = await supabase
      .from('profiles')
      .update({ 
        deleted_at: new Date().toISOString(),
        username: `deleted_${user.id}`, // Prevent username conflicts
        display_name: 'Deleted User',
        bio: null,
        avatar_url: null,
        privacy_level: 'private'
      })
      .eq('id', user.id)

    if (error) {
      console.error('Profile deletion error:', error)
      return NextResponse.json(
        createApiResponse(false, null, {
          code: 'DELETE_FAILED',
          message: 'Failed to delete profile'
        }),
        { status: 500 }
      )
    }

    // Log profile deletion
    console.log('Profile deleted:', {
      userId: user.id,
      ipAddress: context.ipAddress,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json(
      createApiResponse(true, {
        message: 'Profile deleted successfully'
      }, undefined, {
        requestId: context.requestId
      }),
      { status: 200 }
    )

  } catch (error) {
    console.error('Delete profile error:', error)
    
    return NextResponse.json(
      createApiResponse(false, null, {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }),
      { status: 500 }
    )
  }
}

// Apply validation middleware
export const GET = withValidation({
  query: profileQuerySchema,
  allowedMethods: ['GET']
})(getProfileHandler)

export const PUT = withValidation({
  body: profileUpdateValidationSchema,
  allowedMethods: ['PUT'],
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxAttempts: 20, // 20 profile updates per 15 minutes
    identifier: (req) => req.headers.get('x-user-id') || req.headers.get('x-forwarded-for') || 'unknown'
  }
})(updateProfileHandler)

export const DELETE = withValidation({
  allowedMethods: ['DELETE'],
  rateLimit: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxAttempts: 1, // Only 1 deletion per hour (safety measure)
    identifier: (req) => req.headers.get('x-user-id') || req.headers.get('x-forwarded-for') || 'unknown'
  }
})(deleteProfileHandler)

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

export async function PATCH() {
  return POST()
}
