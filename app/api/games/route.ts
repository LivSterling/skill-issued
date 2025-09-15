import { NextRequest, NextResponse } from 'next/server'
import { RAWGService } from '@/lib/services/rawg-service'
import { createClient } from '@/lib/supabase/server'
import { 
  validateGameApiParams, 
  sanitizeSearchQuery,
  validateGameStructure 
} from '@/lib/validations/game-schemas'
import { 
  apiCache,
  generateGameListCacheKey,
  handleConditionalRequest,
  createCachedResponse 
} from '@/lib/utils/api-cache'
import { 
  rawgRateLimit,
  shouldRateLimit,
  addRateLimitHeaders 
} from '@/lib/middleware/rate-limit'
import { 
  createLoggingMiddleware,
  apiLogger 
} from '@/lib/utils/api-logger'
import { 
  apiResponse,
  transformResponse,
  createValidationErrorResponse,
  createInternalErrorResponse,
  createErrorResponse
} from '@/lib/utils/api-response'
import type { GameApiParams } from '@/lib/types/game-types'

/**
 * GET /api/games - Fetch games from RAWG API with comprehensive validation and caching
 */
export async function GET(request: NextRequest) {
  // Initialize logging
  const logging = createLoggingMiddleware()
  const logContext = logging(request)
  
  try {
    // Apply rate limiting
    if (shouldRateLimit(request)) {
      const rateLimitResponse = await rawgRateLimit(request)
      if (rateLimitResponse) {
        apiLogger.logRateLimit(logContext.context, 'EXCEEDED', {
          limit: 30,
          remaining: 0,
          resetTime: Date.now() + 60000,
          key: 'games-api'
        })
        logContext.complete(rateLimitResponse, { rateLimitStatus: 'EXCEEDED' })
        return rateLimitResponse
      }
    }

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
      apiLogger.logValidationError(logContext.context, validation.errors, rawParams)
      const response = createValidationErrorResponse(validation.errors, {
        warnings: validation.warnings,
        requestId: logContext.context.requestId
      })
      logContext.complete(response, { errors: validation.errors })
      return response
    }
    
    // Check for required API key
    const apiKey = process.env.RAWG_API_KEY
    if (!apiKey) {
      console.error('RAWG_API_KEY environment variable is not set')
      const response = createErrorResponse('Service configuration error', {
        code: 'SERVICE_UNAVAILABLE',
        status: 503,
        requestId: logContext.context.requestId
      })
      logContext.complete(response, { errors: ['Missing API key'] })
      return response
    }
    
    // Initialize RAWG service and fetch data
    const rawg = new RAWGService(apiKey)
    let rawgData
    
    const rawgStartTime = Date.now()
    try {
      rawgData = await rawg.getGames(rawParams)
      const rawgDuration = Date.now() - rawgStartTime
      apiLogger.logRAWGApiCall(logContext.context, '/games', rawgDuration, true)
    } catch (rawgError) {
      const rawgDuration = Date.now() - rawgStartTime
      apiLogger.logRAWGApiCall(logContext.context, '/games', rawgDuration, false, rawgError)
      
      const response = createErrorResponse('Failed to fetch games from RAWG API', {
        code: 'EXTERNAL_SERVICE_ERROR',
        status: 502,
        requestId: logContext.context.requestId,
        meta: {
          version: '1.0',
          source: 'api',
          debug: process.env.NODE_ENV === 'development' ? { rawgError } : undefined
        }
      })
      logContext.complete(response, { rawgApiCalls: 1, errors: ['RAWG API failure'] })
      return response
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
    
    // Prepare response data with metadata
    const responseData = {
      ...rawgData,
      meta: {
        ...(rawgData as any).meta,
        cached_at: new Date().toISOString(),
        warnings: validation.warnings,
        cache_key: generateGameListCacheKey(rawParams)
      }
    }

    // Generate ETag based on response data and current timestamp
    const lastModified = new Date()
    const etag = apiCache.generateTimestampedETag(responseData, lastModified)

    // Check for conditional request (304 Not Modified)
    const conditionalResponse = handleConditionalRequest(
      request.headers,
      responseData,
      {
        cacheType: 'GAME_LIST',
        etag,
        lastModified
      }
    )

    if (conditionalResponse) {
      apiLogger.logCacheOperation(logContext.context, 'HIT', generateGameListCacheKey(rawParams))
      logContext.complete(conditionalResponse, { 
        cacheStatus: 'HIT',
        rawgApiCalls: 1
      })
      return conditionalResponse
    }

    // Determine cache type based on request parameters
    let cacheType: keyof typeof apiCache.CACHE_DURATIONS = 'GAME_LIST'
    if (rawParams.ordering?.includes('rating') && !rawParams.search) {
      cacheType = 'POPULAR_GAMES'
    } else if (rawParams.ordering?.includes('added') && rawParams.dates) {
      cacheType = 'TRENDING_GAMES'
    }

    // Transform response using our standardized format
    apiLogger.logCacheOperation(logContext.context, 'SET', generateGameListCacheKey(rawParams))
    
    const response = transformResponse(rawgData, logContext.context, {
      type: 'games-list',
      meta: {
        version: '1.0',
        source: 'api',
        cached: true,
        cacheKey: generateGameListCacheKey(rawParams),
        warnings: validation.warnings
      }
    })

    // Add cache headers to the transformed response
    response.headers.set('Cache-Control', apiCache.getGameCacheHeaders(cacheType)['Cache-Control'])
    response.headers.set('ETag', etag)
    response.headers.set('Last-Modified', lastModified.toUTCString())
    response.headers.set('X-Cache-Key', generateGameListCacheKey(rawParams))
    response.headers.set('X-Total-Count', (rawgData as any).count?.toString() || '0')
    response.headers.set('X-Page', rawParams.page?.toString() || '1')
    response.headers.set('X-Page-Size', rawParams.page_size?.toString() || '20')

    logContext.complete(response, {
      cacheStatus: 'MISS',
      rawgApiCalls: 1,
      warnings: validation.warnings
    })
    
    return response
    
  } catch (error) {
    apiLogger.logError('Games API error', { 
      ...logContext.context, 
      errors: [(error as Error)?.message || 'Unknown error'],
      metadata: { error }
    })
    
    const response = createInternalErrorResponse('Internal server error', {
      requestId: logContext.context.requestId,
      debug: process.env.NODE_ENV === 'development' ? { 
        error: (error as Error)?.message,
        stack: (error as Error)?.stack
      } : undefined
    })
    
    logContext.complete(response, { 
      errors: ['Internal server error']
    })
    
    return response
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