import { NextResponse } from 'next/server'
import { createHash } from 'crypto'

// ============================================================================
// CACHE CONFIGURATION
// ============================================================================

export const CACHE_DURATIONS = {
  // Game data from RAWG (relatively static)
  GAME_DETAIL: 24 * 60 * 60, // 24 hours
  GAME_LIST: 30 * 60, // 30 minutes
  TRENDING_GAMES: 60 * 60, // 1 hour
  POPULAR_GAMES: 2 * 60 * 60, // 2 hours
  
  // User-specific data (more dynamic)
  USER_GAME_DATA: 5 * 60, // 5 minutes
  USER_LIBRARY: 10 * 60, // 10 minutes
  
  // Search results (short-lived)
  SEARCH_RESULTS: 15 * 60, // 15 minutes
  
  // Static/rarely changing
  GAME_GENRES: 7 * 24 * 60 * 60, // 7 days
  GAME_PLATFORMS: 7 * 24 * 60 * 60, // 7 days
} as const

export const CACHE_CONTROL_HEADERS = {
  // Public caching for game data
  PUBLIC_LONG: 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800', // 1 day, 1 week SWR
  PUBLIC_MEDIUM: 'public, max-age=1800, s-maxage=3600, stale-while-revalidate=86400', // 30min/1hr, 1 day SWR
  PUBLIC_SHORT: 'public, max-age=300, s-maxage=900, stale-while-revalidate=3600', // 5min/15min, 1hr SWR
  
  // Private caching for user-specific data
  PRIVATE_SHORT: 'private, max-age=300, must-revalidate', // 5 minutes
  PRIVATE_MEDIUM: 'private, max-age=600, must-revalidate', // 10 minutes
  
  // No caching for dynamic/sensitive data
  NO_CACHE: 'no-cache, no-store, must-revalidate, private',
  
  // Revalidation required
  MUST_REVALIDATE: 'public, max-age=0, must-revalidate',
} as const

// ============================================================================
// ETAG GENERATION
// ============================================================================

/**
 * Generate ETag from response data
 */
export function generateETag(data: any): string {
  const content = typeof data === 'string' ? data : JSON.stringify(data)
  const hash = createHash('md5').update(content).digest('hex')
  return `"${hash}"`
}

/**
 * Generate ETag from multiple factors (data + timestamp)
 */
export function generateTimestampedETag(data: any, timestamp?: string | Date): string {
  const content = typeof data === 'string' ? data : JSON.stringify(data)
  const ts = timestamp ? new Date(timestamp).getTime() : Date.now()
  const combined = `${content}:${ts}`
  const hash = createHash('md5').update(combined).digest('hex')
  return `"${hash}"`
}

/**
 * Generate weak ETag (for frequently changing data)
 */
export function generateWeakETag(data: any): string {
  const etag = generateETag(data)
  return `W/${etag}`
}

// ============================================================================
// CACHE HEADER UTILITIES
// ============================================================================

/**
 * Get appropriate cache headers for game data
 */
export function getGameCacheHeaders(cacheType: keyof typeof CACHE_DURATIONS): {
  'Cache-Control': string
  'Vary': string
} {
  let cacheControl: string
  
  switch (cacheType) {
    case 'GAME_DETAIL':
    case 'POPULAR_GAMES':
    case 'GAME_GENRES':
    case 'GAME_PLATFORMS':
      cacheControl = CACHE_CONTROL_HEADERS.PUBLIC_LONG
      break
    case 'TRENDING_GAMES':
      cacheControl = CACHE_CONTROL_HEADERS.PUBLIC_MEDIUM
      break
    case 'GAME_LIST':
    case 'SEARCH_RESULTS':
      cacheControl = CACHE_CONTROL_HEADERS.PUBLIC_SHORT
      break
    case 'USER_GAME_DATA':
      cacheControl = CACHE_CONTROL_HEADERS.PRIVATE_SHORT
      break
    case 'USER_LIBRARY':
      cacheControl = CACHE_CONTROL_HEADERS.PRIVATE_MEDIUM
      break
    default:
      cacheControl = CACHE_CONTROL_HEADERS.PUBLIC_SHORT
  }

  return {
    'Cache-Control': cacheControl,
    'Vary': 'Accept, Accept-Encoding, Authorization'
  }
}

/**
 * Check if request has matching ETag
 */
export function checkETagMatch(requestHeaders: Headers, etag: string): boolean {
  const ifNoneMatch = requestHeaders.get('if-none-match')
  if (!ifNoneMatch) return false
  
  // Handle multiple ETags
  const requestETags = ifNoneMatch.split(',').map(tag => tag.trim())
  return requestETags.includes(etag) || requestETags.includes('*')
}

/**
 * Check if request is newer than last modified
 */
export function checkLastModified(requestHeaders: Headers, lastModified: Date): boolean {
  const ifModifiedSince = requestHeaders.get('if-modified-since')
  if (!ifModifiedSince) return false
  
  try {
    const requestDate = new Date(ifModifiedSince)
    return lastModified <= requestDate
  } catch {
    return false
  }
}

// ============================================================================
// RESPONSE BUILDERS
// ============================================================================

/**
 * Create cached response with proper headers
 */
export function createCachedResponse(
  data: any,
  options: {
    cacheType: keyof typeof CACHE_DURATIONS
    etag?: string
    lastModified?: Date
    status?: number
    headers?: Record<string, string>
  }
): NextResponse {
  const { cacheType, etag, lastModified, status = 200, headers = {} } = options
  
  // Generate ETag if not provided
  const responseETag = etag || generateETag(data)
  
  // Get cache headers
  const cacheHeaders = getGameCacheHeaders(cacheType)
  
  // Build response headers
  const responseHeaders: Record<string, string> = {
    ...cacheHeaders,
    'ETag': responseETag,
    'Content-Type': 'application/json',
    ...headers
  }
  
  // Add Last-Modified if provided
  if (lastModified) {
    responseHeaders['Last-Modified'] = lastModified.toUTCString()
  }
  
  return NextResponse.json(data, {
    status,
    headers: responseHeaders
  })
}

/**
 * Create 304 Not Modified response
 */
export function createNotModifiedResponse(etag?: string): NextResponse {
  const headers: Record<string, string> = {
    'Cache-Control': CACHE_CONTROL_HEADERS.MUST_REVALIDATE,
  }
  
  if (etag) {
    headers['ETag'] = etag
  }
  
  return new NextResponse(null, {
    status: 304,
    headers
  })
}

/**
 * Handle conditional request (ETag/Last-Modified)
 */
export function handleConditionalRequest(
  requestHeaders: Headers,
  data: any,
  options: {
    cacheType: keyof typeof CACHE_DURATIONS
    etag?: string
    lastModified?: Date
    headers?: Record<string, string>
  }
): NextResponse | null {
  const { etag, lastModified } = options
  
  // Generate ETag if not provided
  const responseETag = etag || generateETag(data)
  
  // Check ETag match
  if (checkETagMatch(requestHeaders, responseETag)) {
    return createNotModifiedResponse(responseETag)
  }
  
  // Check Last-Modified
  if (lastModified && checkLastModified(requestHeaders, lastModified)) {
    return createNotModifiedResponse(responseETag)
  }
  
  // No match, return null to continue with full response
  return null
}

// ============================================================================
// CACHE KEY UTILITIES
// ============================================================================

/**
 * Generate cache key for game list requests
 */
export function generateGameListCacheKey(params: Record<string, any>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      if (params[key] !== undefined && params[key] !== null) {
        acc[key] = params[key]
      }
      return acc
    }, {} as Record<string, any>)
  
  return `games:list:${createHash('md5').update(JSON.stringify(sortedParams)).digest('hex')}`
}

/**
 * Generate cache key for individual game
 */
export function generateGameCacheKey(gameId: number): string {
  return `games:detail:${gameId}`
}

/**
 * Generate cache key for user game data
 */
export function generateUserGameCacheKey(userId: string, gameId: number): string {
  return `user_games:${userId}:${gameId}`
}

/**
 * Generate cache key for search results
 */
export function generateSearchCacheKey(query: string, filters: Record<string, any> = {}): string {
  const searchKey = {
    query: query.toLowerCase().trim(),
    ...filters
  }
  return `search:${createHash('md5').update(JSON.stringify(searchKey)).digest('hex')}`
}

// ============================================================================
// CACHE INVALIDATION
// ============================================================================

/**
 * Get cache tags for game data (for cache invalidation)
 */
export function getGameCacheTags(gameId?: number): string[] {
  const tags = ['games']
  
  if (gameId) {
    tags.push(`game:${gameId}`)
  }
  
  return tags
}

/**
 * Get cache tags for user game data
 */
export function getUserGameCacheTags(userId: string, gameId?: number): string[] {
  const tags = [`user:${userId}`, 'user_games']
  
  if (gameId) {
    tags.push(`user_game:${userId}:${gameId}`)
  }
  
  return tags
}

// ============================================================================
// EXPORTS
// ============================================================================

export const apiCache = {
  // Core functions
  generateETag,
  generateTimestampedETag,
  generateWeakETag,
  
  // Response builders
  createCachedResponse,
  createNotModifiedResponse,
  handleConditionalRequest,
  
  // Cache utilities
  getGameCacheHeaders,
  checkETagMatch,
  checkLastModified,
  
  // Cache keys
  generateGameListCacheKey,
  generateGameCacheKey,
  generateUserGameCacheKey,
  generateSearchCacheKey,
  
  // Cache tags
  getGameCacheTags,
  getUserGameCacheTags,
  
  // Constants
  CACHE_DURATIONS,
  CACHE_CONTROL_HEADERS
} as const
