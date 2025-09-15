import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/social/follows - Get current user's follows (following list)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'following' // 'following' or 'followers'
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const supabase = createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    let followsData, followsError

    if (type === 'following') {
      // Get users that current user is following
      const { data, error } = await supabase
        .from('follows')
        .select(`
          id,
          created_at,
          following_id,
          following_profile:profiles!follows_following_id_fkey(*)
        `)
        .eq('follower_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      followsData = data
      followsError = error
    } else {
      // Get users that are following current user
      const { data, error } = await supabase
        .from('follows')
        .select(`
          id,
          created_at,
          follower_id,
          follower_profile:profiles!follows_follower_id_fkey(*)
        `)
        .eq('following_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      followsData = data
      followsError = error
    }

    if (followsError) {
      console.error('Follows fetch error:', followsError)
      return NextResponse.json(
        { error: 'Failed to fetch follows' },
        { status: 500 }
      )
    }

    // Transform data to get user profiles
    const users = followsData?.map(follow => {
      const profile = type === 'following' ? follow.following_profile : follow.follower_profile
      return {
        ...profile,
        follow_date: follow.created_at,
        follow_id: follow.id
      }
    }).filter(Boolean) || []

    console.log(`${type} fetched successfully for user:`, user.id, 'count:', users.length)

    return NextResponse.json({
      users,
      type,
      count: users.length,
      hasMore: users.length === limit
    })

  } catch (error) {
    console.error('Follows GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/social/follows - Follow a user
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { followingId } = body
    const supabase = createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!followingId) {
      return NextResponse.json(
        { error: 'Following ID is required' },
        { status: 400 }
      )
    }

    if (followingId === user.id) {
      return NextResponse.json(
        { error: 'Cannot follow yourself' },
        { status: 400 }
      )
    }

    // Check if user to follow exists
    const { data: targetUser, error: targetError } = await supabase
      .from('profiles')
      .select('id, username, privacy_level')
      .eq('id', followingId)
      .single()

    if (targetError || !targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if already following
    const { data: existingFollow, error: checkError } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', followingId)
      .maybeSingle()

    if (checkError) {
      console.error('Follow check error:', checkError)
      return NextResponse.json(
        { error: 'Failed to check follow status' },
        { status: 500 }
      )
    }

    if (existingFollow) {
      return NextResponse.json(
        { error: 'Already following this user' },
        { status: 409 }
      )
    }

    // Create follow relationship
    const { data: followData, error: followError } = await supabase
      .from('follows')
      .insert({
        follower_id: user.id,
        following_id: followingId
      } as any)
      .select()
      .single()

    if (followError) {
      console.error('Follow creation error:', followError)
      return NextResponse.json(
        { error: 'Failed to follow user' },
        { status: 500 }
      )
    }

    console.log('User followed successfully:', { follower: user.id, following: followingId })

    return NextResponse.json({
      message: 'User followed successfully',
      follow: followData,
      targetUser: {
        id: targetUser.id,
        username: targetUser.username
      }
    })

  } catch (error) {
    console.error('Follow POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/social/follows - Unfollow a user
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const followingId = searchParams.get('followingId')
    
    const supabase = createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!followingId) {
      return NextResponse.json(
        { error: 'Following ID is required' },
        { status: 400 }
      )
    }

    // Check if currently following
    const { data: existingFollow, error: checkError } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', followingId)
      .maybeSingle()

    if (checkError) {
      console.error('Follow check error:', checkError)
      return NextResponse.json(
        { error: 'Failed to check follow status' },
        { status: 500 }
      )
    }

    if (!existingFollow) {
      return NextResponse.json(
        { error: 'Not following this user' },
        { status: 404 }
      )
    }

    // Remove follow relationship
    const { error: unfollowError } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', followingId)

    if (unfollowError) {
      console.error('Unfollow error:', unfollowError)
      return NextResponse.json(
        { error: 'Failed to unfollow user' },
        { status: 500 }
      )
    }

    console.log('User unfollowed successfully:', { follower: user.id, following: followingId })

    return NextResponse.json({
      message: 'User unfollowed successfully'
    })

  } catch (error) {
    console.error('Unfollow DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/social/follows/status - Check follow status between users
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { targetUserId } = body
    const supabase = createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'Target user ID is required' },
        { status: 400 }
      )
    }

    // Check if current user follows target user
    const { data: isFollowing, error: followingError } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', targetUserId)
      .maybeSingle()

    // Check if target user follows current user
    const { data: isFollowedBy, error: followerError } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', targetUserId)
      .eq('following_id', user.id)
      .maybeSingle()

    if (followingError || followerError) {
      console.error('Follow status check error:', { followingError, followerError })
      return NextResponse.json(
        { error: 'Failed to check follow status' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      isFollowing: !!isFollowing,
      isFollowedBy: !!isFollowedBy,
      isMutual: !!isFollowing && !!isFollowedBy
    })

  } catch (error) {
    console.error('Follow status check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
