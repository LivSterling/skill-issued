import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/profile/[username] - Get user profile by username
export async function GET(
  req: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const { username } = params
    const supabase = createClient()

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      )
    }

    // Get current user (for privacy checks)
    const { data: { user: currentUser } } = await supabase.auth.getUser()

    // Get user profile by username
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single()

    if (profileError) {
      console.error('Profile fetch error:', profileError)
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Check privacy settings
    if (profile.privacy_level === 'private' && (!currentUser || currentUser.id !== profile.id)) {
      // For private profiles, only return basic info unless it's the owner
      return NextResponse.json({
        profile: {
          id: profile.id,
          username: profile.username,
          display_name: profile.display_name,
          privacy_level: profile.privacy_level,
          created_at: profile.created_at
        },
        isPrivate: true
      })
    }

    // Check if users are friends (for friends-only privacy)
    let areFriends = false
    if (profile.privacy_level === 'friends' && currentUser && currentUser.id !== profile.id) {
      const { data: friendRequest } = await supabase
        .from('friend_requests')
        .select('id')
        .or(`and(requester_id.eq.${currentUser.id},recipient_id.eq.${profile.id}),and(requester_id.eq.${profile.id},recipient_id.eq.${currentUser.id})`)
        .eq('status', 'accepted')
        .maybeSingle()

      areFriends = !!friendRequest
    }

    // Return filtered profile based on privacy settings
    if (profile.privacy_level === 'friends' && !areFriends && currentUser?.id !== profile.id) {
      return NextResponse.json({
        profile: {
          id: profile.id,
          username: profile.username,
          display_name: profile.display_name,
          privacy_level: profile.privacy_level,
          created_at: profile.created_at
        },
        isFriendsOnly: true
      })
    }

    console.log('Profile fetched successfully for username:', username)

    // Return full profile for public profiles or authorized users
    return NextResponse.json({
      profile: {
        ...profile,
        // Don't expose email to other users
        email: currentUser?.id === profile.id ? profile.email : undefined
      },
      isOwner: currentUser?.id === profile.id,
      areFriends
    })

  } catch (error) {
    console.error('Profile GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
