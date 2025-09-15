import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/social/friends - Get current user's friends
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

    // Get user's friends (accepted friend requests)
    const { data: friendRequests, error: friendsError } = await supabase
      .from('friend_requests')
      .select(`
        id,
        created_at,
        requester_id,
        recipient_id,
        requester_profile:profiles!friend_requests_requester_id_fkey(*),
        recipient_profile:profiles!friend_requests_recipient_id_fkey(*)
      `)
      .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false }) as any

    if (friendsError) {
      console.error('Friends fetch error:', friendsError)
      return NextResponse.json(
        { error: 'Failed to fetch friends' },
        { status: 500 }
      )
    }

    // Transform data to get friend profiles (not current user's profile)
    const friends = friendRequests?.map((request: any) => {
      const isCurrentUserRequester = request.requester_id === user.id
      const friendProfile = isCurrentUserRequester ? request.recipient_profile : request.requester_profile
      
      return {
        ...friendProfile,
        friendship_date: request.created_at,
        friendship_id: request.id
      }
    }).filter(Boolean) || []

    console.log('Friends fetched successfully for user:', user.id, 'count:', friends.length)

    return NextResponse.json({
      friends,
      count: friends.length
    })

  } catch (error) {
    console.error('Friends GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/social/friends - Send friend request
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { recipientId } = body
    const supabase = createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!recipientId) {
      return NextResponse.json(
        { error: 'Recipient ID is required' },
        { status: 400 }
      )
    }

    if (recipientId === user.id) {
      return NextResponse.json(
        { error: 'Cannot send friend request to yourself' },
        { status: 400 }
      )
    }

    // Check if recipient exists
    const { data: recipientProfile, error: recipientError } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('id', recipientId)
      .single()

    if (recipientError || !recipientProfile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if friend request already exists
    const { data: existingRequest, error: checkError } = await supabase
      .from('friend_requests')
      .select('id, status')
      .or(`and(requester_id.eq.${user.id},recipient_id.eq.${recipientId}),and(requester_id.eq.${recipientId},recipient_id.eq.${user.id})`)
      .maybeSingle() as any

    if (checkError) {
      console.error('Friend request check error:', checkError)
      return NextResponse.json(
        { error: 'Failed to check existing friend request' },
        { status: 500 }
      )
    }

    if (existingRequest) {
      if (existingRequest.status === 'accepted') {
        return NextResponse.json(
          { error: 'You are already friends with this user' },
          { status: 409 }
        )
      } else if (existingRequest.status === 'pending') {
        return NextResponse.json(
          { error: 'Friend request already sent' },
          { status: 409 }
        )
      }
    }

    // Create friend request
    const { data: friendRequest, error: createError } = await supabase
      .from('friend_requests')
      .insert({
        requester_id: user.id,
        recipient_id: recipientId,
        status: 'pending'
      } as any)
      .select()
      .single()

    if (createError) {
      console.error('Friend request creation error:', createError)
      return NextResponse.json(
        { error: 'Failed to send friend request' },
        { status: 500 }
      )
    }

    console.log('Friend request sent successfully:', { from: user.id, to: recipientId })

    return NextResponse.json({
      message: 'Friend request sent successfully',
      friendRequest,
      recipient: recipientProfile
    })

  } catch (error) {
    console.error('Friend request POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
