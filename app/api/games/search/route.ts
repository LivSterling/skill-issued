import { NextRequest, NextResponse } from 'next/server'
import { RAWGService } from '@/lib/services/rawg-service'
import { createClient } from '@/lib/supabase/server'
import {
  validateSearchQuery,
  validateGameFilters,
  sanitizeSearchQuery
} from '@/lib/validations/game-schemas'
import {
  apiCache,
  generateGameListCacheKey,
  handleConditionalRequest
} from '@/lib/utils/api-cache'
import {
  createUserRateLimit,
  shouldRateLimit,
  addRateLimitHeaders
} from '@/lib/middleware/rate-limit'
import {
  createLoggingMiddleware,
  apiLogger
} from '@/lib/utils/api-logger'
import {
  transformResponse,
  createValidationErrorResponse,
  createErrorResponse,
  createInternalErrorResponse,
  extractPaginationParams
} from '@/lib/utils/api-response'

// ============================================================================
// SEARCH CONFIGURATION
// ============================================================================

const SEARCH_CONFIG = {
  // Minimum query length to trigger search
  MIN_QUERY_LENGTH: 2,
  
  // Maximum query length
  MAX_QUERY_LENGTH: 100,
  
  // Default page size for search results
  DEFAULT_PAGE_SIZE: 20,
  
  // Maximum page size
  MAX_PAGE_SIZE: 50,
  
  // Search cache duration (shorter than regular game lists)
  CACHE_DURATION: 5 * 60, // 5 minutes
  
  // Popular search queries cache duration
  POPULAR_CACHE_DURATION: 30 * 60, // 30 minutes
  
  // Rate limit for search API (per user per minute)
  SEARCH_RATE_LIMIT: 30,
  
  // Debounce delay simulation (server-side tracking)
  DEBOUNCE_WINDOW: 500 // 500ms
} as const

// ============================================================================
// SEARCH ANALYTICS STORAGE
// ============================================================================

interface SearchAnalytics {
  query: string
  timestamp: number
  results_count: number
  user_id?: string
  filters?: Record<string, any>
  response_time: number
}

// In-memory storage for search analytics (in production, use Redis/database)
const searchAnalytics: SearchAnalytics[] = []
const popularSearches = new Map<string, number>()

/**
 * Track search query for analytics
 */
function trackSearch(analytics: SearchAnalytics) {
  // Add to analytics log
  searchAnalytics.push(analytics)
  
  // Track popularity
  const normalizedQuery = analytics.query.toLowerCase().trim()
  popularSearches.set(normalizedQuery, (popularSearches.get(normalizedQuery) || 0) + 1)
  
  // Keep only recent analytics (last 1000 searches)
  if (searchAnalytics.length > 1000) {
    searchAnalytics.shift()
  }
  
  // Clean up old popular searches periodically
  if (searchAnalytics.length % 100 === 0) {
    cleanupPopularSearches()
  }
}

/**
 * Clean up old popular searches
 */
function cleanupPopularSearches() {
  const oneHourAgo = Date.now() - (60 * 60 * 1000)
  const recentSearches = searchAnalytics.filter(s => s.timestamp > oneHourAgo)
  
  // Rebuild popular searches from recent data
  popularSearches.clear()
  recentSearches.forEach(search => {
    const normalizedQuery = search.query.toLowerCase().trim()
    popularSearches.set(normalizedQuery, (popularSearches.get(normalizedQuery) || 0) + 1)
  })
}

/**
 * Get popular search suggestions
 */
function getPopularSearches(limit: number = 10): string[] {
  return Array.from(popularSearches.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([query]) => query)
}

// ============================================================================
// SEARCH API ENDPOINT
// ============================================================================

/**
 * GET /api/games/search - Advanced game search with debouncing and analytics
 */
export async function GET(request: NextRequest) {
  // Initialize logging
  const logging = createLoggingMiddleware()
  const logContext = logging(request)
  
  try {
    // Apply rate limiting for search
    if (shouldRateLimit(request)) {
      const searchRateLimit = createUserRateLimit('search', SEARCH_CONFIG.SEARCH_RATE_LIMIT, 60)
      const rateLimitResponse = await searchRateLimit(request)
      if (rateLimitResponse) {
        apiLogger.logRateLimit(logContext.context, 'EXCEEDED', {
          limit: SEARCH_CONFIG.SEARCH_RATE_LIMIT,
          remaining: 0,
          resetTime: Date.now() + 60000,
          key: 'search-api'
        })
        logContext.complete(rateLimitResponse, { rateLimitStatus: 'EXCEEDED' })
        return rateLimitResponse
      }
    }
    
    const { searchParams } = new URL(request.url)
    const startTime = Date.now()
    
    // Extract search parameters
    const query = searchParams.get('q')?.trim() || ''
    const { page, pageSize } = extractPaginationParams(searchParams)
    
    // Extract filter parameters
    const genres = searchParams.get('genres')
    const platforms = searchParams.get('platforms')
    const developers = searchParams.get('developers')
    const publishers = searchParams.get('publishers')
    const year = searchParams.get('year')
    const rating = searchParams.get('rating')
    const ordering = searchParams.get('ordering') || '-relevance'
    
    // Handle special endpoints
    const endpoint = searchParams.get('endpoint')
    if (endpoint === 'popular') {
      return handlePopularSearches(logContext)
    }
    if (endpoint === 'suggestions') {
      return handleSearchSuggestions(query, logContext)
    }
    
    // Validate search query
    if (!query) {
      const response = createValidationErrorResponse(['Search query is required'], {
        requestId: logContext.context.requestId
      })
      logContext.complete(response, { errors: ['Missing search query'] })
      return response
    }
    
    if (query.length < SEARCH_CONFIG.MIN_QUERY_LENGTH) {
      const response = createValidationErrorResponse([
        `Search query must be at least ${SEARCH_CONFIG.MIN_QUERY_LENGTH} characters long`
      ], {
        requestId: logContext.context.requestId
      })
      logContext.complete(response, { errors: ['Query too short'] })
      return response
    }
    
    if (query.length > SEARCH_CONFIG.MAX_QUERY_LENGTH) {
      const response = createValidationErrorResponse([
        `Search query must be no longer than ${SEARCH_CONFIG.MAX_QUERY_LENGTH} characters`
      ], {
        requestId: logContext.context.requestId
      })
      logContext.complete(response, { errors: ['Query too long'] })
      return response
    }
    
    // Validate and sanitize search query
    const queryValidation = validateSearchQuery(query)
    if (!queryValidation.isValid) {
      const response = createValidationErrorResponse(queryValidation.errors, {
        warnings: queryValidation.warnings,
        requestId: logContext.context.requestId
      })
      logContext.complete(response, { errors: queryValidation.errors })
      return response
    }
    
    const sanitizedQuery = sanitizeSearchQuery(query)
    
    // Validate filters
    const filters = { genres, platforms, developers, publishers, year, rating }
    const filterValidation = validateGameFilters(filters)
    if (!filterValidation.isValid) {
      const response = createValidationErrorResponse(filterValidation.errors, {
        warnings: filterValidation.warnings,
        requestId: logContext.context.requestId
      })
      logContext.complete(response, { errors: filterValidation.errors })
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
    
    // Build search parameters for RAWG API
    const searchParams_rawg: any = {
      search: sanitizedQuery,
      page,
      page_size: Math.min(pageSize, SEARCH_CONFIG.MAX_PAGE_SIZE),
      ordering
    }
    
    // Add filters if provided
    if (genres) searchParams_rawg.genres = genres
    if (platforms) searchParams_rawg.platforms = platforms
    if (developers) searchParams_rawg.developers = developers
    if (publishers) searchParams_rawg.publishers = publishers
    if (year) searchParams_rawg.dates = `${year}-01-01,${year}-12-31`
    if (rating) searchParams_rawg.metacritic = `${rating},100`
    
    // Generate cache key for search
    const cacheKey = generateSearchCacheKey(sanitizedQuery, searchParams_rawg)
    
    // Check for conditional request (304 Not Modified)
    const conditionalResponse = handleConditionalRequest(
      request.headers,
      { query: sanitizedQuery, filters },
      {
        cacheType: 'GAME_SEARCH',
        etag: apiCache.generateETag({ query: sanitizedQuery, filters }),
        lastModified: new Date(Date.now() - SEARCH_CONFIG.CACHE_DURATION * 1000)
      }
    )
    
    if (conditionalResponse) {
      apiLogger.logCacheOperation(logContext.context, 'HIT', cacheKey)
      logContext.complete(conditionalResponse, { cacheStatus: 'HIT' })
      return conditionalResponse
    }
    
    // Initialize RAWG service and perform search
    const rawg = new RAWGService(apiKey)
    let searchResults
    
    const rawgStartTime = Date.now()
    try {
      searchResults = await rawg.searchGames(sanitizedQuery, searchParams_rawg)
      const rawgDuration = Date.now() - rawgStartTime
      apiLogger.logRAWGApiCall(logContext.context, '/games/search', rawgDuration, true)
    } catch (rawgError) {
      const rawgDuration = Date.now() - rawgStartTime
      apiLogger.logRAWGApiCall(logContext.context, '/games/search', rawgDuration, false, rawgError)
      
      const response = createErrorResponse('Search service temporarily unavailable', {
        code: 'EXTERNAL_SERVICE_ERROR',
        status: 502,
        requestId: logContext.context.requestId,
        meta: {
          version: '1.0',
          source: 'api',
          debug: process.env.NODE_ENV === 'development' ? { rawgError } : undefined
        }
      })
      logContext.complete(response, { rawgApiCalls: 1, errors: ['RAWG search failure'] })
      return response
    }
    
    // Validate search results
    if (!searchResults || !searchResults.results) {
      const response = createErrorResponse('No search results received', {
        code: 'EXTERNAL_SERVICE_ERROR',
        status: 502,
        requestId: logContext.context.requestId
      })
      logContext.complete(response, { errors: ['Invalid search response'] })
      return response
    }
    
    const totalResponseTime = Date.now() - startTime
    
    // Track search analytics
    const analytics: SearchAnalytics = {
      query: sanitizedQuery,
      timestamp: Date.now(),
      results_count: searchResults.count || 0,
      user_id: logContext.context.userId,
      filters: Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value !== null && value !== undefined)
      ),
      response_time: totalResponseTime
    }
    trackSearch(analytics)
    
    // Cache popular searches in database (background operation)
    if (searchResults.count && searchResults.count > 0) {
      cacheSearchResults(sanitizedQuery, searchResults).catch(error => {
        console.warn('Failed to cache search results:', error)
      })
    }
    
    // Transform response using our standardized format
    apiLogger.logCacheOperation(logContext.context, 'SET', cacheKey)
    
    const response = transformResponse(searchResults, logContext.context, {
      type: 'games-list',
      meta: {
        version: '1.0',
        source: 'search',
        cached: true,
        cacheKey,
        warnings: [...queryValidation.warnings, ...filterValidation.warnings],
        searchAnalytics: {
          query: sanitizedQuery,
          resultsCount: searchResults.count || 0,
          responseTime: totalResponseTime,
          popularityRank: getSearchPopularityRank(sanitizedQuery)
        }
      }
    })
    
    // Add search-specific headers
    response.headers.set('Cache-Control', `public, max-age=${SEARCH_CONFIG.CACHE_DURATION}, stale-while-revalidate=60`)
    response.headers.set('X-Search-Query', sanitizedQuery)
    response.headers.set('X-Search-Results', (searchResults.count || 0).toString())
    response.headers.set('X-Search-Time', totalResponseTime.toString())
    response.headers.set('X-Cache-Key', cacheKey)
    
    logContext.complete(response, {
      cacheStatus: 'MISS',
      rawgApiCalls: 1,
      searchQuery: sanitizedQuery,
      resultsCount: searchResults.count || 0,
      responseTime: totalResponseTime
    })
    
    return response
    
  } catch (error) {
    apiLogger.logError('Search API error', {
      ...logContext.context,
      errors: [(error as Error)?.message || 'Unknown error'],
      metadata: { error }
    })
    
    const response = createInternalErrorResponse('Search service error', {
      requestId: logContext.context.requestId,
      debug: process.env.NODE_ENV === 'development' ? {
        error: (error as Error)?.message,
        stack: (error as Error)?.stack
      } : undefined
    })
    
    logContext.complete(response, {
      errors: ['Internal search error']
    })
    
    return response
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate cache key for search results
 */
function generateSearchCacheKey(query: string, params: any): string {
  const normalizedQuery = query.toLowerCase().trim()
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((result, key) => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        result[key] = params[key]
      }
      return result
    }, {} as any)
  
  const paramString = JSON.stringify(sortedParams)
  return `search:${normalizedQuery}:${Buffer.from(paramString).toString('base64').substring(0, 16)}`
}

/**
 * Get search popularity rank
 */
function getSearchPopularityRank(query: string): number {
  const normalizedQuery = query.toLowerCase().trim()
  const popularList = getPopularSearches(100)
  const rank = popularList.indexOf(normalizedQuery)
  return rank === -1 ? 999 : rank + 1
}

/**
 * Handle popular searches endpoint
 */
async function handlePopularSearches(logContext: any): Promise<NextResponse> {
  try {
    const popularQueries = getPopularSearches(10)
    const response = transformResponse({
      popular_searches: popularQueries.map(query => ({
        query,
        popularity: popularSearches.get(query) || 0
      }))
    }, logContext.context, {
      meta: {
        version: '1.0',
        source: 'analytics',
        cached: true,
        cacheAge: SEARCH_CONFIG.POPULAR_CACHE_DURATION
      }
    })
    
    response.headers.set('Cache-Control', `public, max-age=${SEARCH_CONFIG.POPULAR_CACHE_DURATION}`)
    logContext.complete(response, { endpoint: 'popular-searches' })
    return response
    
  } catch (error) {
    const response = createInternalErrorResponse('Failed to fetch popular searches', {
      requestId: logContext.context.requestId
    })
    logContext.complete(response, { errors: ['Popular searches error'] })
    return response
  }
}

/**
 * Handle search suggestions endpoint
 */
async function handleSearchSuggestions(query: string, logContext: any): Promise<NextResponse> {
  try {
    if (!query || query.length < 2) {
      const response = transformResponse({ suggestions: [] }, logContext.context, {
        meta: { version: '1.0', source: 'suggestions' }
      })
      logContext.complete(response, { endpoint: 'suggestions', query })
      return response
    }
    
    const normalizedQuery = query.toLowerCase().trim()
    const suggestions = Array.from(popularSearches.keys())
      .filter(popularQuery => popularQuery.includes(normalizedQuery))
      .sort((a, b) => (popularSearches.get(b) || 0) - (popularSearches.get(a) || 0))
      .slice(0, 8)
    
    const response = transformResponse({
      suggestions: suggestions.map(suggestion => ({
        query: suggestion,
        popularity: popularSearches.get(suggestion) || 0
      }))
    }, logContext.context, {
      meta: {
        version: '1.0',
        source: 'suggestions',
        cached: true
      }
    })
    
    response.headers.set('Cache-Control', 'public, max-age=300') // 5 minutes
    logContext.complete(response, { endpoint: 'suggestions', query, suggestionsCount: suggestions.length })
    return response
    
  } catch (error) {
    const response = createInternalErrorResponse('Failed to fetch search suggestions', {
      requestId: logContext.context.requestId
    })
    logContext.complete(response, { errors: ['Suggestions error'] })
    return response
  }
}

/**
 * Background function to cache search results in database
 */
async function cacheSearchResults(query: string, results: any): Promise<void> {
  try {
    const supabase = createClient()
    
    // Cache the most relevant results (first page) for faster future searches
    const gamesToCache = results.results?.slice(0, 10) || []
    
    for (const game of gamesToCache) {
      try {
        await supabase
          .from('games')
          .upsert({
            id: game.id,
            slug: game.slug,
            name: game.name,
            description: game.description,
            released: game.released,
            background_image: game.background_image,
            rating: game.rating,
            rating_top: game.rating_top,
            ratings_count: game.ratings_count,
            metacritic: game.metacritic,
            playtime: game.playtime,
            genres: game.genres || [],
            platforms: game.platforms?.map((p: any) => p.platform || p) || [],
            developers: game.developers || [],
            publishers: game.publishers || [],
            esrb_rating: game.esrb_rating,
            tags: game.tags?.slice(0, 10) || [],
            updated_at: new Date().toISOString()
          } as any)
          .select()
          .single()
      } catch (gameError) {
        console.warn(`Failed to cache game ${game.id}:`, gameError)
        // Continue with other games
      }
    }
    
    console.log(`Cached ${gamesToCache.length} games from search: "${query}"`)
    
  } catch (error) {
    console.warn('Failed to cache search results:', error)
  }
}

/**
 * GET search analytics (admin endpoint)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body
    
    if (action === 'analytics') {
      return NextResponse.json({
        success: true,
        data: {
          recent_searches: searchAnalytics.slice(-50),
          popular_searches: getPopularSearches(20),
          total_searches: searchAnalytics.length,
          search_volume_last_hour: searchAnalytics.filter(
            s => s.timestamp > Date.now() - 60 * 60 * 1000
          ).length
        }
      })
    }
    
    if (action === 'clear_analytics') {
      searchAnalytics.length = 0
      popularSearches.clear()
      return NextResponse.json({
        success: true,
        message: 'Search analytics cleared'
      })
    }
    
    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process analytics request' },
      { status: 500 }
    )
  }
}
