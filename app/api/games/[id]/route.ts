import { NextRequest, NextResponse } from 'next/server'
import { RAWGService } from '@/lib/services/rawg-service'
import { createClient } from '@/lib/supabase/server'
import { validateGameStructure } from '@/lib/validations/game-schemas'
import { 
  apiCache,
  generateGameCacheKey,
  handleConditionalRequest,
  createCachedResponse 
} from '@/lib/utils/api-cache'

/**
 * GET /api/games/[id] - Fetch individual game data with intelligent caching
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

    // Check for required API key
    const apiKey = process.env.RAWG_API_KEY
    if (!apiKey) {
      console.error('RAWG_API_KEY environment variable is not set')
      return NextResponse.json(
        { error: 'Service configuration error' },
        { status: 503 }
      )
    }

    const supabase = createClient()

    // First, try to get the game from our database
    const { data: existingGame, error: dbError } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single()

    // Check if cached data is fresh (less than 24 hours old)
    let isCacheFresh = false
    if (existingGame && !dbError && (existingGame as any).updated_at) {
      try {
        const gameAge = Date.now() - new Date((existingGame as any).updated_at).getTime()
        const twentyFourHours = 24 * 60 * 60 * 1000
        isCacheFresh = gameAge < twentyFourHours
      } catch (dateError) {
        console.warn('Error parsing game updated_at timestamp:', dateError)
      }
    }

    // Return fresh cached data with proper cache headers
    if (existingGame && !dbError && isCacheFresh) {
      const cachedData = {
        ...(existingGame as any),
        meta: {
          source: 'cache',
          cached_at: (existingGame as any).updated_at,
          fresh: true,
          cache_key: generateGameCacheKey(gameId)
        }
      }

      const lastModified = new Date((existingGame as any).updated_at)
      const etag = apiCache.generateTimestampedETag(cachedData, lastModified)

      // Check for conditional request
      const conditionalResponse = handleConditionalRequest(
        request.headers,
        cachedData,
        {
          cacheType: 'GAME_DETAIL',
          etag,
          lastModified
        }
      )

      if (conditionalResponse) {
        return conditionalResponse
      }

      return createCachedResponse(cachedData, {
        cacheType: 'GAME_DETAIL',
        etag,
        lastModified,
        headers: {
          'X-Cache-Key': generateGameCacheKey(gameId),
          'X-Cache-Status': 'HIT',
          'X-Cache-Age': Math.floor((Date.now() - lastModified.getTime()) / 1000).toString()
        }
      })
    }

    // If game doesn't exist or is stale, fetch from RAWG API
    const rawg = new RAWGService(apiKey)
    let rawgGame
    
    try {
      rawgGame = await rawg.getGame(gameId)
    } catch (rawgError) {
      console.error('RAWG API request failed:', rawgError)
      
      // If RAWG fails but we have stale data, return it with warning
      if (existingGame && !dbError) {
        return NextResponse.json({
          ...(existingGame as any),
          meta: {
            source: 'cache',
            cached_at: (existingGame as any).updated_at,
            fresh: false,
            warning: 'Data may be outdated due to API unavailability'
          }
        })
      }
      
      // No fallback data available
      return NextResponse.json(
        { 
          error: 'Failed to fetch game data from RAWG API',
          details: 'External service unavailable and no cached data found'
        },
        { status: 502 }
      )
    }
    
    // Validate RAWG response
    if (!rawgGame) {
      // If RAWG returns null but we have cached data, use it
      if (existingGame && !dbError) {
        return NextResponse.json({
          ...(existingGame as any),
          meta: {
            source: 'cache',
            cached_at: (existingGame as any).updated_at,
            fresh: false,
            warning: 'API returned no data, using cached version'
          }
        })
      }
      
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      )
    }
    
    // Check for RAWG API error responses
    if (rawgGame.detail === "Not found." || rawgGame.error) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      )
    }

    // Validate game structure
    if (!validateGameStructure(rawgGame)) {
      console.warn('Invalid game structure received from RAWG:', gameId)
      
      // Use cached data if available
      if (existingGame && !dbError) {
        return NextResponse.json({
          ...(existingGame as any),
          meta: {
            source: 'cache',
            cached_at: (existingGame as any).updated_at,
            fresh: false,
            warning: 'Invalid data structure from API, using cached version'
          }
        })
      }
      
      return NextResponse.json(
        { error: 'Invalid game data received from API' },
        { status: 502 }
      )
    }

    // Transform and sanitize game data
    const gameData = {
      id: rawgGame.id,
      slug: rawgGame.slug,
      name: rawgGame.name,
      description: rawgGame.description || null,
      released: rawgGame.released || null,
      background_image: rawgGame.background_image || null,
      rating: rawgGame.rating || null,
      rating_top: rawgGame.rating_top || null,
      ratings_count: rawgGame.ratings_count || null,
      metacritic: rawgGame.metacritic || null,
      playtime: rawgGame.playtime || null,
      genres: rawgGame.genres || null,
      platforms: rawgGame.platforms || null,
      developers: rawgGame.developers || null,
      publishers: rawgGame.publishers || null,
      esrb_rating: rawgGame.esrb_rating || null,
      tags: rawgGame.tags || null,
      updated_at: new Date().toISOString()
    }

    // Upsert the game data with error handling
    try {
      const { data: upsertedGame, error: upsertError } = await supabase
        .from('games')
        .upsert(gameData as any, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        })
        .select()
        .single()

      if (upsertError) {
        console.error('Error upserting game:', upsertError)
        // Return RAWG data even if database upsert fails
        return NextResponse.json({
          ...gameData,
          meta: {
            source: 'api',
            fetched_at: gameData.updated_at,
            cached: false,
            warning: 'Failed to cache data in database'
          }
        })
      }

      // Successfully cached and returning fresh data
      const responseData = {
        ...(upsertedGame as any),
        meta: {
          source: 'api',
          fetched_at: (upsertedGame as any).updated_at,
          cached: true,
          cache_key: generateGameCacheKey(gameId)
        }
      }

      const lastModified = new Date((upsertedGame as any).updated_at)
      const etag = apiCache.generateTimestampedETag(responseData, lastModified)

      return createCachedResponse(responseData, {
        cacheType: 'GAME_DETAIL',
        etag,
        lastModified,
        headers: {
          'X-Cache-Key': generateGameCacheKey(gameId),
          'X-Cache-Status': 'MISS',
          'X-Data-Source': 'RAWG-API'
        }
      })

    } catch (dbError) {
      console.error('Database error during game upsert:', dbError)
      
      // Return RAWG data even if database operations fail
      return NextResponse.json({
        ...gameData,
        meta: {
          source: 'api',
          fetched_at: gameData.updated_at,
          cached: false,
          warning: 'Database unavailable, data not cached'
        }
      })
    }

  } catch (error) {
    console.error('Game detail API error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? (error as Error)?.message : undefined
      },
      { status: 500 }
    )
  }
}
