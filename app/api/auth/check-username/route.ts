import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { usernameSchema } from '@/lib/validations/profile-schemas'

// GET /api/auth/check-username?username=example - Check username availability via query param
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const username = searchParams.get('username')

    if (!username) {
      return NextResponse.json(
        { 
          available: false,
          error: 'Username parameter is required'
        },
        { status: 400 }
      )
    }

    // Validate username format
    const validation = usernameSchema.safeParse(username)
    if (!validation.success) {
      return NextResponse.json(
        { 
          available: false,
          error: 'Invalid username format',
          details: validation.error.errors.map(e => e.message)
        },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Check if username exists
    const { data: existingProfiles, error: checkError } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)

    if (checkError) {
      console.error('Username check error:', checkError)
      
      // If table doesn't exist, consider username available for now
      if (checkError.code === '42P01') {
        console.log('Profiles table does not exist yet, considering username available')
        return NextResponse.json({
          available: true,
          username
        })
      }
      
      return NextResponse.json(
        { error: 'Failed to check username availability' },
        { status: 500 }
      )
    }

    const isAvailable = !existingProfiles || existingProfiles.length === 0

    console.log('Username availability check:', { username, available: isAvailable })

    return NextResponse.json({
      available: isAvailable,
      username
    })

  } catch (error) {
    console.error('Username check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/auth/check-username - Check username availability via request body
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { username } = body

    // Validate username format
    const validation = usernameSchema.safeParse(username)
    if (!validation.success) {
      return NextResponse.json(
        { 
          available: false,
          error: 'Invalid username format',
          details: validation.error.errors.map(e => e.message)
        },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Check if username exists
    const { data: existingProfiles, error: checkError } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)

    if (checkError) {
      console.error('Username check error:', checkError)
      
      // If table doesn't exist, consider username available for now
      if (checkError.code === '42P01') {
        console.log('Profiles table does not exist yet, considering username available')
        return NextResponse.json({
          available: true,
          username
        })
      }
      
      return NextResponse.json(
        { error: 'Failed to check username availability' },
        { status: 500 }
      )
    }

    const isAvailable = !existingProfiles || existingProfiles.length === 0

    console.log('Username availability check:', { username, available: isAvailable })

    return NextResponse.json({
      available: isAvailable,
      username
    })

  } catch (error) {
    console.error('Username check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
