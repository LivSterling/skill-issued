import { NextResponse } from 'next/server'
import { LogContext } from './api-logger'

// ============================================================================
// STANDARD API RESPONSE INTERFACES
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  meta?: ApiResponseMeta
  pagination?: PaginationMeta
  validation?: ValidationMeta
  timestamp: string
  requestId?: string
}

export interface ApiResponseMeta {
  version: string
  source: 'cache' | 'api' | 'database'
  cached?: boolean
  cacheKey?: string
  cacheAge?: number
  processingTime?: number
  rateLimitRemaining?: number
  rateLimitReset?: number
  warnings?: string[]
  debug?: Record<string, any>
}

export interface PaginationMeta {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
  nextPage?: number
  previousPage?: number
}

export interface ValidationMeta {
  errors: string[]
  warnings: string[]
  validatedFields: string[]
  skippedFields: string[]
}

export interface ErrorDetails {
  code: string
  field?: string
  message: string
  context?: Record<string, any>
}

// ============================================================================
// RESPONSE TRANSFORMATION UTILITIES
// ============================================================================

/**
 * Transform RAWG API game data to our standard format
 */
export function transformGameData(rawgGame: any): any {
  if (!rawgGame) return null

  return {
    id: rawgGame.id,
    slug: rawgGame.slug,
    name: rawgGame.name,
    description: rawgGame.description || null,
    released: rawgGame.released || null,
    
    // Image handling
    image: rawgGame.background_image || null,
    screenshots: rawgGame.short_screenshots?.map((s: any) => s.image) || [],
    
    // Ratings
    rating: rawgGame.rating || 0,
    ratingTop: rawgGame.rating_top || 5,
    ratingsCount: rawgGame.ratings_count || 0,
    metacritic: rawgGame.metacritic || null,
    
    // Game details
    playtime: rawgGame.playtime || 0,
    esrbRating: rawgGame.esrb_rating ? {
      id: rawgGame.esrb_rating.id,
      name: rawgGame.esrb_rating.name,
      slug: rawgGame.esrb_rating.slug
    } : null,
    
    // Categories
    genres: rawgGame.genres?.map((g: any) => ({
      id: g.id,
      name: g.name,
      slug: g.slug
    })) || [],
    
    platforms: rawgGame.platforms?.map((p: any) => ({
      id: p.platform?.id || p.id,
      name: p.platform?.name || p.name,
      slug: p.platform?.slug || p.slug
    })) || [],
    
    developers: rawgGame.developers?.map((d: any) => ({
      id: d.id,
      name: d.name,
      slug: d.slug
    })) || [],
    
    publishers: rawgGame.publishers?.map((p: any) => ({
      id: p.id,
      name: p.name,
      slug: p.slug
    })) || [],
    
    tags: rawgGame.tags?.slice(0, 10).map((t: any) => ({
      id: t.id,
      name: t.name,
      slug: t.slug
    })) || [],
    
    // Timestamps
    createdAt: rawgGame.created || null,
    updatedAt: rawgGame.updated || new Date().toISOString()
  }
}

/**
 * Transform RAWG games list response
 */
export function transformGamesListResponse(rawgResponse: any): {
  games: any[]
  pagination: PaginationMeta
} {
  const results = rawgResponse.results || []
  const count = rawgResponse.count || 0
  const next = rawgResponse.next
  const previous = rawgResponse.previous

  // Extract pagination info from URLs
  const pageSize = 20 // Default page size
  const currentPage = previous ? 
    (parseInt(new URL(previous).searchParams.get('page') || '1') + 1) : 
    (next ? 1 : Math.ceil(count / pageSize))

  const totalPages = Math.ceil(count / pageSize)

  return {
    games: results.map(transformGameData),
    pagination: {
      page: currentPage,
      pageSize,
      totalItems: count,
      totalPages,
      hasNext: !!next,
      hasPrevious: !!previous,
      nextPage: next ? currentPage + 1 : undefined,
      previousPage: previous ? currentPage - 1 : undefined
    }
  }
}

/**
 * Transform user game data
 */
export function transformUserGameData(userGame: any): any {
  if (!userGame) return null

  return {
    id: userGame.id,
    userId: userGame.user_id,
    gameId: userGame.game_id,
    
    // User data
    status: userGame.status || 'want_to_play',
    rating: userGame.user_rating || null,
    difficulty: userGame.difficulty_rating || null,
    hoursPlayed: userGame.hours_played || 0,
    completed: userGame.completed || false,
    favorite: userGame.is_favorite || false,
    review: userGame.review || null,
    
    // Timestamps
    addedAt: userGame.added_at || userGame.created_at,
    updatedAt: userGame.updated_at,
    
    // Related game data (if included)
    game: userGame.game ? transformGameData(userGame.game) : null
  }
}

// ============================================================================
// RESPONSE BUILDERS
// ============================================================================

/**
 * Create standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  options: {
    message?: string
    meta?: Partial<ApiResponseMeta>
    pagination?: PaginationMeta
    requestId?: string
    status?: number
  } = {}
): NextResponse {
  const {
    message,
    meta = {},
    pagination,
    requestId,
    status = 200
  } = options

  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
    meta: {
      version: '1.0',
      source: 'api',
      ...meta
    },
    pagination,
    timestamp: new Date().toISOString(),
    requestId
  }

  return NextResponse.json(response, { status })
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  error: string,
  options: {
    code?: string
    details?: ErrorDetails[]
    meta?: Partial<ApiResponseMeta>
    requestId?: string
    status?: number
    validation?: ValidationMeta
  } = {}
): NextResponse {
  const {
    code = 'UNKNOWN_ERROR',
    details = [],
    meta = {},
    requestId,
    status = 400,
    validation
  } = options

  const response: ApiResponse = {
    success: false,
    error,
    meta: {
      version: '1.0',
      source: 'api',
      ...meta
    },
    validation,
    timestamp: new Date().toISOString(),
    requestId
  }

  // Add error details if provided
  if (details.length > 0) {
    (response as any).details = details
  }

  return NextResponse.json(response, { status })
}

/**
 * Create validation error response
 */
export function createValidationErrorResponse(
  errors: string[],
  options: {
    warnings?: string[]
    validatedFields?: string[]
    skippedFields?: string[]
    requestId?: string
  } = {}
): NextResponse {
  const {
    warnings = [],
    validatedFields = [],
    skippedFields = [],
    requestId
  } = options

  return createErrorResponse('Validation failed', {
    code: 'VALIDATION_ERROR',
    status: 422,
    requestId,
    validation: {
      errors,
      warnings,
      validatedFields,
      skippedFields
    }
  })
}

/**
 * Create rate limit error response
 */
export function createRateLimitErrorResponse(
  retryAfter: number,
  options: {
    limit?: number
    remaining?: number
    resetTime?: number
    requestId?: string
  } = {}
): NextResponse {
  const { limit, remaining, resetTime, requestId } = options

  const response = createErrorResponse('Rate limit exceeded', {
    code: 'RATE_LIMIT_EXCEEDED',
    status: 429,
    requestId,
    meta: {
      version: '1.0',
      source: 'api',
      rateLimitRemaining: remaining,
      rateLimitReset: resetTime
    }
  })

  // Add rate limit headers
  if (limit) response.headers.set('X-RateLimit-Limit', limit.toString())
  if (remaining !== undefined) response.headers.set('X-RateLimit-Remaining', remaining.toString())
  if (resetTime) response.headers.set('X-RateLimit-Reset', resetTime.toString())
  if (retryAfter) response.headers.set('Retry-After', retryAfter.toString())

  return response
}

/**
 * Create not found error response
 */
export function createNotFoundResponse(
  resource: string,
  options: {
    resourceId?: string | number
    requestId?: string
  } = {}
): NextResponse {
  const { resourceId, requestId } = options
  const message = resourceId ? 
    `${resource} with ID ${resourceId} not found` : 
    `${resource} not found`

  return createErrorResponse(message, {
    code: 'NOT_FOUND',
    status: 404,
    requestId
  })
}

/**
 * Create unauthorized error response
 */
export function createUnauthorizedResponse(
  message: string = 'Authentication required',
  options: {
    requestId?: string
  } = {}
): NextResponse {
  return createErrorResponse(message, {
    code: 'UNAUTHORIZED',
    status: 401,
    requestId: options.requestId
  })
}

/**
 * Create forbidden error response
 */
export function createForbiddenResponse(
  message: string = 'Access denied',
  options: {
    requestId?: string
  } = {}
): NextResponse {
  return createErrorResponse(message, {
    code: 'FORBIDDEN',
    status: 403,
    requestId: options.requestId
  })
}

/**
 * Create internal server error response
 */
export function createInternalErrorResponse(
  message: string = 'Internal server error',
  options: {
    requestId?: string
    debug?: Record<string, any>
  } = {}
): NextResponse {
  const { requestId, debug } = options

  return createErrorResponse(message, {
    code: 'INTERNAL_ERROR',
    status: 500,
    requestId,
    meta: {
      version: '1.0',
      source: 'api',
      debug: process.env.NODE_ENV === 'development' ? debug : undefined
    }
  })
}

// ============================================================================
// RESPONSE MIDDLEWARE
// ============================================================================

/**
 * Transform response with consistent format
 */
export function transformResponse(
  data: any,
  logContext?: LogContext,
  transformOptions: {
    type?: 'game' | 'games-list' | 'user-game'
    meta?: Partial<ApiResponseMeta>
    pagination?: PaginationMeta
  } = {}
): NextResponse {
  const { type, meta = {}, pagination } = transformOptions

  let transformedData = data

  // Apply specific transformations based on type
  switch (type) {
    case 'game':
      transformedData = transformGameData(data)
      break
    case 'games-list':
      const { games, pagination: paginationMeta } = transformGamesListResponse(data)
      transformedData = games
      transformOptions.pagination = paginationMeta
      break
    case 'user-game':
      transformedData = transformUserGameData(data)
      break
  }

  return createSuccessResponse(transformedData, {
    meta: {
      processingTime: logContext?.duration,
      ...meta
    },
    pagination: transformOptions.pagination,
    requestId: logContext?.requestId
  })
}

/**
 * Add response transformation headers
 */
export function addTransformationHeaders(
  response: NextResponse,
  transformationType: string,
  version: string = '1.0'
): NextResponse {
  response.headers.set('X-API-Version', version)
  response.headers.set('X-Response-Format', 'standardized')
  response.headers.set('X-Transformation-Type', transformationType)
  response.headers.set('X-Content-Type', 'application/json')
  
  return response
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Extract pagination parameters from request
 */
export function extractPaginationParams(searchParams: URLSearchParams): {
  page: number
  pageSize: number
  offset: number
} {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('page_size') || '20')))
  const offset = (page - 1) * pageSize

  return { page, pageSize, offset }
}

/**
 * Create pagination metadata
 */
export function createPaginationMeta(
  page: number,
  pageSize: number,
  totalItems: number
): PaginationMeta {
  const totalPages = Math.ceil(totalItems / pageSize)

  return {
    page,
    pageSize,
    totalItems,
    totalPages,
    hasNext: page < totalPages,
    hasPrevious: page > 1,
    nextPage: page < totalPages ? page + 1 : undefined,
    previousPage: page > 1 ? page - 1 : undefined
  }
}

/**
 * Validate response data structure
 */
export function validateResponseData(data: any, expectedType: string): boolean {
  if (!data) return false

  switch (expectedType) {
    case 'game':
      return typeof data.id === 'number' && typeof data.name === 'string'
    case 'games-list':
      return Array.isArray(data) || (data.results && Array.isArray(data.results))
    case 'user-game':
      return typeof data.user_id === 'string' && typeof data.game_id === 'number'
    default:
      return true
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const apiResponse = {
  // Transformers
  transformGameData,
  transformGamesListResponse,
  transformUserGameData,
  transformResponse,
  
  // Response builders
  createSuccessResponse,
  createErrorResponse,
  createValidationErrorResponse,
  createRateLimitErrorResponse,
  createNotFoundResponse,
  createUnauthorizedResponse,
  createForbiddenResponse,
  createInternalErrorResponse,
  
  // Utilities
  extractPaginationParams,
  createPaginationMeta,
  validateResponseData,
  addTransformationHeaders
} as const

// Export types separately
export type {
  ApiResponse,
  ApiResponseMeta,
  PaginationMeta,
  ValidationMeta,
  ErrorDetails
}
