import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateProfileSchema, createProfileSchema } from '@/lib/validations/profile-schemas'

// GET /api/profile - Get current user's profile
export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Profile fetch error:', profileError)
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    console.log('Profile fetched successfully for user:', user.id)

    return NextResponse.json({
      profile,
      user: {
        id: user.id,
        email: user.email
      }
    })

  } catch (error) {
    console.error('Profile GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/profile - Create user profile
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const supabase = createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user already has a profile
    const { data: existingProfile, error: existingError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (existingError) {
      console.error('Profile check error:', existingError)
      return NextResponse.json(
        { error: 'Failed to check existing profile' },
        { status: 500 }
      )
    }

    if (existingProfile) {
      return NextResponse.json(
        { error: 'Profile already exists' },
        { status: 409 }
      )
    }

    // Validate profile data
    const validation = createProfileSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid profile data',
          details: validation.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        },
        { status: 400 }
      )
    }

    const profileData = validation.data

    // Check if username is available
    const { data: existingProfiles, error: checkError } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('username', profileData.username)

    if (checkError) {
      console.error('Username check error:', checkError)
      return NextResponse.json(
        { error: 'Failed to check username availability' },
        { status: 500 }
      )
    }

    if (existingProfiles && existingProfiles.length > 0) {
      return NextResponse.json(
        { error: 'Username is already taken' },
        { status: 409 }
      )
    }

    // Create profile
    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        username: profileData.username,
        display_name: profileData.display_name || profileData.username,
        email: user.email,
        bio: profileData.bio || null,
        privacy_level: profileData.privacy_level || 'public',
        gaming_preferences: profileData.gaming_preferences || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as any)
      .select()
      .single()

    if (createError) {
      console.error('Profile creation error:', createError)
      return NextResponse.json(
        { error: 'Failed to create profile' },
        { status: 500 }
      )
    }

    console.log('Profile created successfully for user:', user.id)

    return NextResponse.json({
      message: 'Profile created successfully',
      profile: newProfile
    }, { status: 201 })

  } catch (error) {
    console.error('Profile POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/profile - Update current user's profile
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const supabase = createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Validate update data
    const validation = updateProfileSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid profile data',
          details: validation.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        },
        { status: 400 }
      )
    }

    const updateData = validation.data

    // Check if username is being changed and if it's available
    if (updateData.username) {
      const { data: existingProfiles, error: checkError } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('username', updateData.username)
        .neq('id', user.id) // Exclude current user

      if (checkError) {
        console.error('Username check error:', checkError)
        return NextResponse.json(
          { error: 'Failed to check username availability' },
          { status: 500 }
        )
      }

      if (existingProfiles && existingProfiles.length > 0) {
        return NextResponse.json(
          { error: 'Username is already taken' },
          { status: 409 }
        )
      }
    }

    // Update profile
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Profile update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      )
    }

    console.log('Profile updated successfully for user:', user.id)

    return NextResponse.json({
      message: 'Profile updated successfully',
      profile: updatedProfile
    })

  } catch (error) {
    console.error('Profile PUT error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/profile - Delete current user's profile (and account)
export async function DELETE(req: NextRequest) {
  try {
    const supabase = createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Delete profile (this will cascade due to foreign key constraints)
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', user.id)

    if (profileError) {
      console.error('Profile deletion error:', profileError)
      return NextResponse.json(
        { error: 'Failed to delete profile' },
        { status: 500 }
      )
    }

    // Delete user account
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)
    
    if (deleteError) {
      console.error('User deletion error:', deleteError)
      // Profile is already deleted, but user account deletion failed
      return NextResponse.json(
        { error: 'Profile deleted but failed to delete user account' },
        { status: 500 }
      )
    }

    console.log('User and profile deleted successfully:', user.id)

    return NextResponse.json({
      message: 'Account deleted successfully'
    })

  } catch (error) {
    console.error('Profile DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
