import { NextRequest, NextResponse } from 'next/server'
import { RAWGService } from '@/lib/services/rawg-service'
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

    // First, try to get the game from our database
    const { data: existingGame, error: dbError } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single()

    // If game exists in database and is recent (less than 24 hours old), return it
    if (existingGame && !dbError) {
      const gameAge = Date.now() - new Date(existingGame.updated_at).getTime()
      const twentyFourHours = 24 * 60 * 60 * 1000

      if (gameAge < twentyFourHours) {
        return NextResponse.json(existingGame)
      }
    }

    // If game doesn't exist or is stale, fetch from RAWG API
    const rawg = new RAWGService(process.env.RAWG_API_KEY!)
    
    try {
      const rawgGame = await rawg.getGame(gameId)
      
      if (!rawgGame || rawgGame.detail === "Not found.") {
        return NextResponse.json(
          { error: 'Game not found' },
          { status: 404 }
        )
      }

      // Transform and store/update the game in our database
      const gameData = {
        id: rawgGame.id,
        slug: rawgGame.slug,
        name: rawgGame.name,
        description: rawgGame.description,
        released: rawgGame.released,
        background_image: rawgGame.background_image,
        rating: rawgGame.rating,
        rating_top: rawgGame.rating_top,
        ratings_count: rawgGame.ratings_count,
        metacritic: rawgGame.metacritic,
        playtime: rawgGame.playtime,
        genres: rawgGame.genres,
        platforms: rawgGame.platforms,
        developers: rawgGame.developers,
        publishers: rawgGame.publishers,
        esrb_rating: rawgGame.esrb_rating,
        tags: rawgGame.tags,
        updated_at: new Date().toISOString()
      }

      // Upsert the game data
      const { data: upsertedGame, error: upsertError } = await supabase
        .from('games')
        .upsert(gameData, { onConflict: 'id' })
        .select()
        .single()

      if (upsertError) {
        console.error('Error upserting game:', upsertError)
        // Return RAWG data even if database upsert fails
        return NextResponse.json(gameData)
      }

      return NextResponse.json(upsertedGame)

    } catch (rawgError) {
      console.error('RAWG API error:', rawgError)
      
      // If RAWG fails but we have stale data, return it
      if (existingGame) {
        return NextResponse.json(existingGame)
      }
      
      // If no fallback data, return error
      return NextResponse.json(
        { error: 'Failed to fetch game data from RAWG API' },
        { status: 502 }
      )
    }

  } catch (error) {
    console.error('Game detail API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
