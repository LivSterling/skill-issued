import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Maximum file size (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024
// Allowed file types
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
// Maximum dimensions
const MAX_WIDTH = 1024
const MAX_HEIGHT = 1024

// POST /api/profile/avatar - Upload avatar
export async function POST(req: NextRequest) {
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

    // Get form data
    const formData = await req.formData()
    const file = formData.get('avatar') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { 
          error: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.',
          allowedTypes: ALLOWED_TYPES
        },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { 
          error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`,
          maxSize: MAX_FILE_SIZE
        },
        { status: 400 }
      )
    }

    // Convert file to buffer for processing
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Basic image validation (check if it's actually an image)
    const isValidImage = buffer.length > 0 && (
      // JPEG magic number
      (buffer[0] === 0xFF && buffer[1] === 0xD8) ||
      // PNG magic number
      (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) ||
      // WebP magic number
      (buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50)
    )

    if (!isValidImage) {
      return NextResponse.json(
        { error: 'Invalid image file' },
        { status: 400 }
      )
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const fileExtension = file.name.split('.').pop() || 'jpg'
    const fileName = `avatar-${user.id}-${timestamp}-${randomString}.${fileExtension}`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Avatar upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload avatar' },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName)

    const avatarUrl = urlData.publicUrl

    // Update user profile with new avatar URL
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString()
      } as any)
      .eq('id', user.id)

    if (updateError) {
      console.error('Profile update error:', updateError)
      
      // Try to clean up uploaded file
      await supabase.storage.from('avatars').remove([fileName])
      
      return NextResponse.json(
        { error: 'Failed to update profile with new avatar' },
        { status: 500 }
      )
    }

    console.log('Avatar uploaded successfully for user:', user.id)

    return NextResponse.json({
      message: 'Avatar uploaded successfully',
      avatarUrl,
      fileName,
      fileSize: file.size,
      fileType: file.type
    })

  } catch (error) {
    console.error('Avatar upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/profile/avatar - Remove avatar
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

    // Get current profile to find existing avatar
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', user.id)
      .single() as any

    if (profileError) {
      console.error('Profile fetch error:', profileError)
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500 }
      )
    }

    // Extract filename from avatar URL if it exists
    let fileName = null
    if (profile.avatar_url) {
      try {
        const url = new URL(profile.avatar_url)
        const pathParts = url.pathname.split('/')
        fileName = pathParts[pathParts.length - 1]
      } catch (urlError) {
        console.warn('Could not parse avatar URL:', urlError)
      }
    }

    // Update profile to remove avatar URL
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        avatar_url: null,
        updated_at: new Date().toISOString()
      } as any)
      .eq('id', user.id)

    if (updateError) {
      console.error('Profile update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to remove avatar from profile' },
        { status: 500 }
      )
    }

    // Try to delete the file from storage (if we have a filename)
    if (fileName) {
      const { error: deleteError } = await supabase.storage
        .from('avatars')
        .remove([fileName])

      if (deleteError) {
        console.warn('Failed to delete avatar file from storage:', deleteError)
        // Don't fail the request if file deletion fails
      }
    }

    console.log('Avatar removed successfully for user:', user.id)

    return NextResponse.json({
      message: 'Avatar removed successfully'
    })

  } catch (error) {
    console.error('Avatar removal error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
