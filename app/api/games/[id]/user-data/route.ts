import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/games/[id]/user-data - Fetch user-specific game data
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    
    // Validate game ID parameter
    if (!id || id.trim() === '') {
      return NextResponse.json(
        { error: 'Game ID is required' },
        { status: 400 }
      )
    }
    
    const gameId = parseInt(id)
    if (isNaN(gameId) || gameId <= 0) {
      return NextResponse.json(
        { error: 'Invalid game ID. Must be a positive integer.' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Get current user with comprehensive error handling
    let user
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      
      if (authError) {
        console.error('Authentication error:', authError)
        return NextResponse.json(
          { error: 'Authentication failed' },
          { status: 401 }
        )
      }
      
      if (!authUser) {
        return NextResponse.json(
          { error: 'User not authenticated' },
          { status: 401 }
        )
      }
      
      user = authUser
    } catch (authError) {
      console.error('User authentication error:', authError)
      return NextResponse.json(
        { error: 'Authentication service unavailable' },
        { status: 503 }
      )
    }

    // Get user game data with proper error handling
    try {
      const { data: userGame, error: userGameError } = await supabase
        .from('user_games')
        .select(`
          *,
          game:games(
            id,
            name,
            slug,
            background_image,
            rating,
            released
          )
        `)
        .eq('user_id', user.id)
        .eq('game_id', gameId)
        .single()

      if (userGameError) {
        // If no user game data exists, return null (not an error)
        if (userGameError.code === 'PGRST116' || userGameError.message?.includes('No rows found')) {
          return NextResponse.json({
            data: null,
            meta: {
              game_id: gameId,
              user_id: user.id,
              exists: false
            }
          })
        }
        
        console.error('Error fetching user game data:', userGameError)
        return NextResponse.json(
          { 
            error: 'Failed to fetch user game data',
            details: process.env.NODE_ENV === 'development' ? userGameError.message : undefined
          },
          { status: 500 }
        )
      }

      return NextResponse.json({
        data: userGame,
        meta: {
          game_id: gameId,
          user_id: user.id,
          exists: true,
          last_updated: userGame.updated_at
        }
      })

    } catch (dbError) {
      console.error('Database error fetching user game data:', dbError)
      return NextResponse.json(
        { error: 'Database service unavailable' },
        { status: 503 }
      )
    }

  } catch (error) {
    console.error('User game data GET error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/games/[id]/user-data - Update user-specific game data with comprehensive validation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    
    // Validate game ID parameter
    if (!id || id.trim() === '') {
      return NextResponse.json(
        { error: 'Game ID is required' },
        { status: 400 }
      )
    }
    
    const gameId = parseInt(id)
    if (isNaN(gameId) || gameId <= 0) {
      return NextResponse.json(
        { error: 'Invalid game ID. Must be a positive integer.' },
        { status: 400 }
      )
    }

    // Parse and validate request body
    let body
    try {
      body = await request.json()
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Request body must be a valid JSON object' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Get current user with comprehensive error handling
    let user
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      
      if (authError) {
        console.error('Authentication error:', authError)
        return NextResponse.json(
          { error: 'Authentication failed' },
          { status: 401 }
        )
      }
      
      if (!authUser) {
        return NextResponse.json(
          { error: 'User not authenticated' },
          { status: 401 }
        )
      }
      
      user = authUser
    } catch (authError) {
      console.error('User authentication error:', authError)
      return NextResponse.json(
        { error: 'Authentication service unavailable' },
        { status: 503 }
      )
    }

    // Extract and validate user game data using our validation system
    const {
      status,
      user_rating,
      difficulty_rating,
      hours_played,
      review,
      completed,
      is_favorite
    } = body

    // Import validation functions
    const { 
      validateUserGameUpdate, 
      sanitizeUserGameUpdate 
    } = await import('@/lib/validations/game-schemas')

    // Prepare user game update data
    const updateData = {
      status,
      user_rating,
      difficulty_rating,
      hours_played,
      review,
      completed,
      is_favorite
    }

    // Comprehensive validation
    const validation = validateUserGameUpdate(updateData)
    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: 'Invalid user game data',
          details: validation.errors,
          warnings: validation.warnings
        },
        { status: 400 }
      )
    }

    // Sanitize the data
    const sanitizedData = sanitizeUserGameUpdate(updateData)

    // Prepare upsert data (only include defined fields)
    const upsertData: any = {
      user_id: user.id,
      game_id: gameId,
      updated_at: new Date().toISOString()
    }

    // Only include fields that were provided and passed validation
    Object.keys(sanitizedData).forEach(key => {
      if (sanitizedData[key] !== undefined) {
        upsertData[key] = sanitizedData[key]
      }
    })

    // Verify the game exists before creating user game data
    try {
      const { data: gameExists, error: gameError } = await supabase
        .from('games')
        .select('id')
        .eq('id', gameId)
        .single()

      if (gameError || !gameExists) {
        // Game doesn't exist in our database, we might need to fetch it from RAWG first
        return NextResponse.json(
          { 
            error: 'Game not found in database',
            details: 'Please fetch the game details first before adding user data',
            game_id: gameId
          },
          { status: 404 }
        )
      }
    } catch (gameCheckError) {
      console.warn('Could not verify game existence:', gameCheckError)
      // Continue anyway - the foreign key constraint will catch invalid game IDs
    }

    // Upsert user game data with comprehensive error handling
    try {
      const { data: userGame, error: upsertError } = await supabase
        .from('user_games')
        .upsert(upsertData, { 
          onConflict: 'user_id,game_id',
          ignoreDuplicates: false
        })
        .select(`
          *,
          game:games(
            id,
            name,
            slug,
            background_image,
            rating,
            released,
            genres,
            platforms
          )
        `)
        .single()

      if (upsertError) {
        console.error('Error upserting user game data:', upsertError)
        
        // Handle specific database errors
        if (upsertError.code === '23503') {
          return NextResponse.json(
            { 
              error: 'Game not found',
              details: 'The specified game does not exist in the database'
            },
            { status: 404 }
          )
        }
        
        if (upsertError.code === '23505') {
          return NextResponse.json(
            { 
              error: 'Duplicate entry',
              details: 'User game data already exists and could not be updated'
            },
            { status: 409 }
          )
        }
        
        return NextResponse.json(
          { 
            error: 'Failed to update user game data',
            details: process.env.NODE_ENV === 'development' ? upsertError.message : undefined
          },
          { status: 500 }
        )
      }

      // Log warnings if any
      if (validation.warnings && validation.warnings.length > 0) {
        console.warn('User game update warnings:', validation.warnings)
      }

      return NextResponse.json({
        data: userGame,
        meta: {
          game_id: gameId,
          user_id: user.id,
          updated_at: upsertData.updated_at,
          warnings: validation.warnings
        }
      })

    } catch (dbError) {
      console.error('Database error during user game upsert:', dbError)
      return NextResponse.json(
        { error: 'Database service unavailable' },
        { status: 503 }
      )
    }

  } catch (error) {
    console.error('User game data POST error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/games/[id]/user-data - Delete user-specific game data
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    
    // Validate game ID parameter
    if (!id || id.trim() === '') {
      return NextResponse.json(
        { error: 'Game ID is required' },
        { status: 400 }
      )
    }
    
    const gameId = parseInt(id)
    if (isNaN(gameId) || gameId <= 0) {
      return NextResponse.json(
        { error: 'Invalid game ID. Must be a positive integer.' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Get current user with comprehensive error handling
    let user
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      
      if (authError) {
        console.error('Authentication error:', authError)
        return NextResponse.json(
          { error: 'Authentication failed' },
          { status: 401 }
        )
      }
      
      if (!authUser) {
        return NextResponse.json(
          { error: 'User not authenticated' },
          { status: 401 }
        )
      }
      
      user = authUser
    } catch (authError) {
      console.error('User authentication error:', authError)
      return NextResponse.json(
        { error: 'Authentication service unavailable' },
        { status: 503 }
      )
    }

    // Check if user game data exists before attempting deletion
    try {
      const { data: existingData, error: checkError } = await supabase
        .from('user_games')
        .select('id')
        .eq('user_id', user.id)
        .eq('game_id', gameId)
        .single()

      if (checkError) {
        if (checkError.code === 'PGRST116' || checkError.message?.includes('No rows found')) {
          return NextResponse.json(
            { 
              error: 'User game data not found',
              details: 'No user data exists for this game to delete'
            },
            { status: 404 }
          )
        }
        
        console.error('Error checking user game data:', checkError)
        return NextResponse.json(
          { 
            error: 'Failed to verify user game data',
            details: process.env.NODE_ENV === 'development' ? checkError.message : undefined
          },
          { status: 500 }
        )
      }

      if (!existingData) {
        return NextResponse.json(
          { 
            error: 'User game data not found',
            details: 'No user data exists for this game to delete'
          },
          { status: 404 }
        )
      }
    } catch (checkError) {
      console.error('Database error during user game data check:', checkError)
      return NextResponse.json(
        { error: 'Database service unavailable' },
        { status: 503 }
      )
    }

    // Delete user game data with comprehensive error handling
    try {
      const { data: deletedData, error: deleteError } = await supabase
        .from('user_games')
        .delete()
        .eq('user_id', user.id)
        .eq('game_id', gameId)
        .select()

      if (deleteError) {
        console.error('Error deleting user game data:', deleteError)
        return NextResponse.json(
          { 
            error: 'Failed to delete user game data',
            details: process.env.NODE_ENV === 'development' ? deleteError.message : undefined
          },
          { status: 500 }
        )
      }

      // Verify deletion was successful
      if (!deletedData || deletedData.length === 0) {
        return NextResponse.json(
          { 
            error: 'User game data not found',
            details: 'No user data was deleted - may have already been removed'
          },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        meta: {
          game_id: gameId,
          user_id: user.id,
          deleted_at: new Date().toISOString(),
          deleted_count: deletedData.length
        }
      })

    } catch (dbError) {
      console.error('Database error during user game data deletion:', dbError)
      return NextResponse.json(
        { error: 'Database service unavailable' },
        { status: 503 }
      )
    }

  } catch (error) {
    console.error('User game data DELETE error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    )
  }
}
