import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const gameId = parseInt(id)

    if (isNaN(gameId)) {
      return NextResponse.json(
        { error: 'Invalid game ID' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user game data
    const { data: userGame, error: userGameError } = await supabase
      .from('user_games')
      .select(`
        *,
        game:games(*)
      `)
      .eq('user_id', user.id)
      .eq('game_id', gameId)
      .single()

    if (userGameError) {
      // If no user game data exists, return null (not an error)
      if (userGameError.code === 'PGRST116') {
        return NextResponse.json(null)
      }
      
      console.error('Error fetching user game data:', userGameError)
      return NextResponse.json(
        { error: 'Failed to fetch user game data' },
        { status: 500 }
      )
    }

    return NextResponse.json(userGame)

  } catch (error) {
    console.error('User game data API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const gameId = parseInt(id)

    if (isNaN(gameId)) {
      return NextResponse.json(
        { error: 'Invalid game ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const {
      status,
      user_rating,
      difficulty_rating,
      hours_played,
      review,
      completed,
      is_favorite
    } = body

    const supabase = createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Validate input data
    if (user_rating !== undefined && (user_rating < 0 || user_rating > 5)) {
      return NextResponse.json(
        { error: 'User rating must be between 0 and 5' },
        { status: 400 }
      )
    }

    if (difficulty_rating !== undefined && (difficulty_rating < 1 || difficulty_rating > 5)) {
      return NextResponse.json(
        { error: 'Difficulty rating must be between 1 and 5' },
        { status: 400 }
      )
    }

    if (hours_played !== undefined && hours_played < 0) {
      return NextResponse.json(
        { error: 'Hours played cannot be negative' },
        { status: 400 }
      )
    }

    const validStatuses = ['want_to_play', 'playing', 'completed', 'dropped', 'on_hold']
    if (status !== undefined && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Status must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    // Prepare upsert data (only include defined fields)
    const upsertData: any = {
      user_id: user.id,
      game_id: gameId,
      updated_at: new Date().toISOString()
    }

    if (status !== undefined) upsertData.status = status
    if (user_rating !== undefined) upsertData.user_rating = user_rating
    if (difficulty_rating !== undefined) upsertData.difficulty_rating = difficulty_rating
    if (hours_played !== undefined) upsertData.hours_played = hours_played
    if (review !== undefined) upsertData.review = review
    if (completed !== undefined) upsertData.completed = completed
    if (is_favorite !== undefined) upsertData.is_favorite = is_favorite

    // Upsert user game data
    const { data: userGame, error: upsertError } = await supabase
      .from('user_games')
      .upsert(upsertData, { onConflict: 'user_id,game_id' })
      .select(`
        *,
        game:games(*)
      `)
      .single()

    if (upsertError) {
      console.error('Error upserting user game data:', upsertError)
      return NextResponse.json(
        { error: 'Failed to update user game data' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: userGame })

  } catch (error) {
    console.error('User game data POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const gameId = parseInt(id)

    if (isNaN(gameId)) {
      return NextResponse.json(
        { error: 'Invalid game ID' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Delete user game data
    const { error: deleteError } = await supabase
      .from('user_games')
      .delete()
      .eq('user_id', user.id)
      .eq('game_id', gameId)

    if (deleteError) {
      console.error('Error deleting user game data:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete user game data' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('User game data DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
