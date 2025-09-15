import { NextRequest, NextResponse } from 'next/server'
import { RAWGService } from '@/lib/services/rawg-service'
import { createClient } from '@/lib/supabase/server'
import { 
  validateGameApiParams, 
  sanitizeSearchQuery,
  validateGameStructure 
} from '@/lib/validations/game-schemas'
import type { GameApiParams } from '@/lib/types/game-types'

/**
 * GET /api/games - Fetch games from RAWG API with comprehensive validation and caching
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Extract and validate API parameters
    const rawParams: GameApiParams = {}
    
    // Extract search parameter with sanitization
    const searchQuery = searchParams.get('search')
    if (searchQuery) {
      rawParams.search = sanitizeSearchQuery(searchQuery)
    }
    
    // Extract numeric parameters with validation
    const pageParam = searchParams.get('page')
    if (pageParam) {
      const page = parseInt(pageParam)
      if (isNaN(page) || page < 1) {
        return NextResponse.json(
          { error: 'Invalid page parameter. Must be a positive integer.' },
          { status: 400 }
        )
      }
      rawParams.page = page
    }
    
    const pageSizeParam = searchParams.get('page_size')
    if (pageSizeParam) {
      const pageSize = parseInt(pageSizeParam)
      if (isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
        return NextResponse.json(
          { error: 'Invalid page_size parameter. Must be between 1 and 100.' },
          { status: 400 }
        )
      }
      rawParams.page_size = pageSize
    } else {
      rawParams.page_size = 20 // Default page size
    }
    
    // Extract string parameters
    const allowedOrderings = [
      'name', '-name', 'released', '-released', 'added', '-added',
      'created', '-created', 'updated', '-updated', 'rating', '-rating',
      'metacritic', '-metacritic', 'playtime', '-playtime'
    ]
    
    const ordering = searchParams.get('ordering')
    if (ordering) {
      if (!allowedOrderings.includes(ordering)) {
        return NextResponse.json(
          { 
            error: `Invalid ordering parameter. Allowed values: ${allowedOrderings.join(', ')}`,
            allowedOrderings
          },
          { status: 400 }
        )
      }
      rawParams.ordering = ordering
    }
    
    // Extract filter parameters
    const genres = searchParams.get('genres')
    if (genres) rawParams.genres = genres
    
    const platforms = searchParams.get('platforms')
    if (platforms) rawParams.platforms = platforms
    
    const dates = searchParams.get('dates')
    if (dates) rawParams.dates = dates
    
    const developers = searchParams.get('developers')
    if (developers) rawParams.developers = developers
    
    const publishers = searchParams.get('publishers')
    if (publishers) rawParams.publishers = publishers
    
    // Comprehensive parameter validation
    const validation = validateGameApiParams(rawParams)
    if (!validation.isValid) {
      return NextResponse.json(
        { 
          error: 'Invalid request parameters',
          details: validation.errors,
          warnings: validation.warnings
        },
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
    
    // Initialize RAWG service and fetch data
    const rawg = new RAWGService(apiKey)
    let rawgData
    
    try {
      rawgData = await rawg.getGames(rawParams)
    } catch (rawgError) {
      console.error('RAWG API request failed:', rawgError)
      return NextResponse.json(
        { error: 'Failed to fetch games from RAWG API', details: 'External service unavailable' },
        { status: 502 }
      )
    }
    
    // Validate RAWG response
    if (!rawgData) {
      return NextResponse.json(
        { error: 'No data received from RAWG API' },
        { status: 502 }
      )
    }
    
    if (rawgData.error) {
      console.error('RAWG API returned error:', rawgData.error)
      return NextResponse.json(
        { error: 'RAWG API error', details: rawgData.error },
        { status: 502 }
      )
    }
    
    // Validate and sanitize game data
    if (rawgData.results && Array.isArray(rawgData.results)) {
      rawgData.results = rawgData.results.filter((game: any) => {
        const isValid = validateGameStructure(game)
        if (!isValid) {
          console.warn('Invalid game structure received from RAWG:', game?.id || 'unknown')
        }
        return isValid
      })
    }
    
    // Cache games in database (non-blocking)
    if (rawgData.results && rawgData.results.length > 0) {
      // Don't await this - let it run in the background
      cacheGamesInDatabase(rawgData.results).catch(error => {
        console.warn('Failed to cache games in database:', error)
      })
    }
    
    // Log warnings if any
    if (validation.warnings && validation.warnings.length > 0) {
      console.warn('API request warnings:', validation.warnings)
    }
    
    return NextResponse.json({
      ...rawgData,
      meta: {
        ...rawgData.meta,
        cached_at: new Date().toISOString(),
        warnings: validation.warnings
      }
    })
    
  } catch (error) {
    console.error('Games API error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? (error as Error)?.message : undefined
      },
      { status: 500 }
    )
  }
}

/**
 * Background function to cache games in database
 */
async function cacheGamesInDatabase(games: any[]) {
  try {
    const supabase = createClient()
    const timestamp = new Date().toISOString()
    
    // Process games in batches to avoid overwhelming the database
    const batchSize = 10
    for (let i = 0; i < games.length; i += batchSize) {
      const batch = games.slice(i, i + batchSize)
      
      // Prepare batch data
      const gameData = batch.map(game => ({
        id: game.id,
        slug: game.slug,
        name: game.name,
        description: game.description || null,
        released: game.released || null,
        background_image: game.background_image || null,
        rating: game.rating || null,
        rating_top: game.rating_top || null,
        ratings_count: game.ratings_count || null,
        metacritic: game.metacritic || null,
        playtime: game.playtime || null,
        genres: game.genres || null,
        platforms: game.platforms || null,
        developers: game.developers || null,
        publishers: game.publishers || null,
        esrb_rating: game.esrb_rating || null,
        tags: game.tags || null,
        updated_at: timestamp
      }))
      
      // Batch upsert with error handling
      const { error } = await supabase
        .from('games')
        .upsert(gameData as any, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        })
      
      if (error) {
        console.warn(`Failed to cache batch ${i / batchSize + 1}:`, error)
        // Continue with other batches even if one fails
      }
    }
    
  } catch (error) {
    console.warn('Database caching error:', error)
    throw error
  }
}