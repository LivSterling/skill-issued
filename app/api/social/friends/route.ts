import { NextRequest, NextResponse } from 'next/server'
import { withValidation, ValidationContext, ValidatedRequest, unauthorizedError } from '@/lib/middleware/validation-middleware'
import { createApiResponse } from '@/lib/validations/api-schemas'
import { 
  sendFriendRequestSchema, 
  respondToFriendRequestSchema,
  removeFriendSchema,
  blockFriendSchema
} from '@/lib/validations/social-schemas'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Enhanced schemas with security checks
const friendRequestValidationSchema = sendFriendRequestSchema.extend({
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

const friendResponseValidationSchema = respondToFriendRequestSchema.extend({
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

// Query schema for getting friends
const friendsQuerySchema = z.object({
  status: z.enum(['pending', 'accepted', 'declined', 'blocked']).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  search: z.string().max(100).optional()
})

// Authentication helper
async function getAuthenticatedUser(req: NextRequest) {
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return null
  }
  
  return user
}

// GET handler - Get friends list
async function getFriendsHandler(req: ValidatedRequest, context: ValidationContext): Promise<NextResponse> {
  const { query } = req.validatedData
  const { status, limit, offset, search } = query

  try {
    const user = await getAuthenticatedUser(req)
    if (!user) {
      return unauthorizedError('Authentication required')
    }

    const supabase = createClient()
    
    let query_builder = supabase
      .from('friendships')
      .select(`
        id,
        status,
        created_at,
        updated_at,
        requester:requester_id(id, username, display_name, avatar_url),
        addressee:addressee_id(id, username, display_name, avatar_url)
      `)
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)

    // Filter by status if provided
    if (status) {
      query_builder = query_builder.eq('status', status)
    }

    // Add search functionality
    if (search) {
      query_builder = query_builder.or(
        `requester.username.ilike.%${search}%,requester.display_name.ilike.%${search}%,addressee.username.ilike.%${search}%,addressee.display_name.ilike.%${search}%`
      )
    }

    // Add pagination
    query_builder = query_builder
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })

    const { data: friendships, error } = await query_builder

    if (error) {
      console.error('Get friends error:', error)
      return NextResponse.json(
        createApiResponse(false, null, {
          code: 'DATABASE_ERROR',
          message: 'Failed to retrieve friends'
        }),
        { status: 500 }
      )
    }

    // Transform data to show the other user in the friendship
    const friends = friendships?.map(friendship => {
      const isRequester = friendship.requester?.id === user.id
      const friend = isRequester ? friendship.addressee : friendship.requester
      
      return {
        id: friendship.id,
        status: friendship.status,
        created_at: friendship.created_at,
        updated_at: friendship.updated_at,
        friend,
        is_requester: isRequester
      }
    }) || []

    return NextResponse.json(
      createApiResponse(true, {
        friends,
        pagination: {
          limit,
          offset,
          total: friends.length
        }
      }, undefined, {
        requestId: context.requestId
      }),
      { status: 200 }
    )

  } catch (error) {
    console.error('Get friends error:', error)
    
    return NextResponse.json(
      createApiResponse(false, null, {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }),
      { status: 500 }
    )
  }
}

// POST handler - Send friend request
async function sendFriendRequestHandler(req: ValidatedRequest, context: ValidationContext): Promise<NextResponse> {
  const { body } = req.validatedData
  const { recipientId, message } = body

  try {
    const user = await getAuthenticatedUser(req)
    if (!user) {
      return unauthorizedError('Authentication required')
    }

    // Can't send friend request to yourself
    if (user.id === recipientId) {
      return NextResponse.json(
        createApiResponse(false, null, {
          code: 'INVALID_REQUEST',
          message: 'Cannot send friend request to yourself'
        }),
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Check if recipient exists
    const { data: recipient } = await supabase
      .from('profiles')
      .select('id, username, privacy_level')
      .eq('id', recipientId)
      .is('deleted_at', null)
      .single()

    if (!recipient) {
      return NextResponse.json(
        createApiResponse(false, null, {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }),
        { status: 404 }
      )
    }

    // Check if friendship already exists
    const { data: existingFriendship } = await supabase
      .from('friendships')
      .select('id, status')
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${recipientId}),and(requester_id.eq.${recipientId},addressee_id.eq.${user.id})`)
      .single()

    if (existingFriendship) {
      let message = 'Friend request already exists'
      if (existingFriendship.status === 'accepted') {
        message = 'You are already friends with this user'
      } else if (existingFriendship.status === 'blocked') {
        message = 'Cannot send friend request to this user'
      }
      
      return NextResponse.json(
        createApiResponse(false, null, {
          code: 'FRIENDSHIP_EXISTS',
          message
        }),
        { status: 409 }
      )
    }

    // Create friend request
    const { data: friendship, error } = await supabase
      .from('friendships')
      .insert({
        requester_id: user.id,
        addressee_id: recipientId,
        status: 'pending',
        message: message || null
      })
      .select()
      .single()

    if (error) {
      console.error('Send friend request error:', error)
      return NextResponse.json(
        createApiResponse(false, null, {
          code: 'REQUEST_FAILED',
          message: 'Failed to send friend request'
        }),
        { status: 500 }
      )
    }

    // Log friend request
    console.log('Friend request sent:', {
      requesterId: user.id,
      recipientId,
      friendshipId: friendship.id,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json(
      createApiResponse(true, {
        friendship,
        message: 'Friend request sent successfully'
      }, undefined, {
        requestId: context.requestId
      }),
      { status: 201 }
    )

  } catch (error) {
    console.error('Send friend request error:', error)
    
    return NextResponse.json(
      createApiResponse(false, null, {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }),
      { status: 500 }
    )
  }
}

// PUT handler - Respond to friend request
async function respondFriendRequestHandler(req: ValidatedRequest, context: ValidationContext): Promise<NextResponse> {
  const { body } = req.validatedData
  const { requestId, action, message } = body

  try {
    const user = await getAuthenticatedUser(req)
    if (!user) {
      return unauthorizedError('Authentication required')
    }

    const supabase = createClient()

    // Get the friend request
    const { data: friendship, error: fetchError } = await supabase
      .from('friendships')
      .select('*')
      .eq('id', requestId)
      .eq('addressee_id', user.id) // Only addressee can respond
      .eq('status', 'pending')
      .single()

    if (fetchError || !friendship) {
      return NextResponse.json(
        createApiResponse(false, null, {
          code: 'REQUEST_NOT_FOUND',
          message: 'Friend request not found or already processed'
        }),
        { status: 404 }
      )
    }

    // Update friendship status
    const newStatus = action === 'accept' ? 'accepted' : 'declined'
    const { data: updatedFriendship, error: updateError } = await supabase
      .from('friendships')
      .update({
        status: newStatus,
        response_message: message || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .select()
      .single()

    if (updateError) {
      console.error('Respond to friend request error:', updateError)
      return NextResponse.json(
        createApiResponse(false, null, {
          code: 'UPDATE_FAILED',
          message: 'Failed to respond to friend request'
        }),
        { status: 500 }
      )
    }

    // Log response
    console.log('Friend request response:', {
      friendshipId: requestId,
      responderId: user.id,
      action,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json(
      createApiResponse(true, {
        friendship: updatedFriendship,
        message: `Friend request ${action}ed successfully`
      }, undefined, {
        requestId: context.requestId
      }),
      { status: 200 }
    )

  } catch (error) {
    console.error('Respond to friend request error:', error)
    
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
  query: friendsQuerySchema,
  allowedMethods: ['GET']
})(getFriendsHandler)

export const POST = withValidation({
  body: friendRequestValidationSchema,
  allowedMethods: ['POST'],
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxAttempts: 10, // 10 friend requests per 15 minutes
    identifier: (req) => req.headers.get('x-user-id') || req.headers.get('x-forwarded-for') || 'unknown'
  }
})(sendFriendRequestHandler)

export const PUT = withValidation({
  body: friendResponseValidationSchema,
  allowedMethods: ['PUT'],
  rateLimit: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxAttempts: 20, // 20 responses per 5 minutes
    identifier: (req) => req.headers.get('x-user-id') || req.headers.get('x-forwarded-for') || 'unknown'
  }
})(respondFriendRequestHandler)

// Handle unsupported methods
export async function DELETE() {
  return NextResponse.json(
    createApiResponse(false, null, {
      code: 'METHOD_NOT_ALLOWED',
      message: 'Method not allowed'
    }),
    { status: 405 }
  )
}

export async function PATCH() {
  return DELETE()
}
