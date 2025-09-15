import type { 
  GameFilters, 
  UserGameUpdateData, 
  UserGameStatus,
  GameApiParams,
  GameValidationResult,
  UserGameValidation
} from '@/lib/types/game-types'
import type { Game, UserGame } from '@/lib/database/types'

// ============================================================================
// VALIDATION CONSTANTS
// ============================================================================

export const VALID_USER_GAME_STATUSES: UserGameStatus[] = [
  'want_to_play',
  'playing', 
  'completed',
  'dropped',
  'on_hold'
]

export const RATING_CONSTRAINTS = {
  USER_RATING: { min: 0, max: 5 },
  DIFFICULTY_RATING: { min: 1, max: 5 },
  HOURS_PLAYED: { min: 0, max: 99999 }
} as const

export const TEXT_CONSTRAINTS = {
  REVIEW_MAX_LENGTH: 5000,
  GAME_NAME_MAX_LENGTH: 200,
  SEARCH_QUERY_MAX_LENGTH: 100
} as const

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate user game status
 */
export function validateUserGameStatus(status: string): boolean {
  return VALID_USER_GAME_STATUSES.includes(status as UserGameStatus)
}

/**
 * Validate user rating (0-5)
 */
export function validateUserRating(rating: number): boolean {
  return rating >= RATING_CONSTRAINTS.USER_RATING.min && 
         rating <= RATING_CONSTRAINTS.USER_RATING.max
}

/**
 * Validate difficulty rating (1-5)
 */
export function validateDifficultyRating(rating: number): boolean {
  return rating >= RATING_CONSTRAINTS.DIFFICULTY_RATING.min && 
         rating <= RATING_CONSTRAINTS.DIFFICULTY_RATING.max
}

/**
 * Validate hours played (>= 0)
 */
export function validateHoursPlayed(hours: number): boolean {
  return hours >= RATING_CONSTRAINTS.HOURS_PLAYED.min && 
         hours <= RATING_CONSTRAINTS.HOURS_PLAYED.max
}

/**
 * Validate review text length
 */
export function validateReviewText(review: string): boolean {
  return review.length <= TEXT_CONSTRAINTS.REVIEW_MAX_LENGTH
}

/**
 * Validate search query
 */
export function validateSearchQuery(query: string): boolean {
  return query.trim().length > 0 && 
         query.length <= TEXT_CONSTRAINTS.SEARCH_QUERY_MAX_LENGTH
}

// ============================================================================
// COMPREHENSIVE VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate complete user game data for updates
 */
export function validateUserGameUpdate(data: UserGameUpdateData): GameValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Validate status
  if (data.status && !validateUserGameStatus(data.status)) {
    errors.push(`Invalid status: ${data.status}. Must be one of: ${VALID_USER_GAME_STATUSES.join(', ')}`)
  }

  // Validate user rating
  if (data.user_rating !== undefined && data.user_rating !== null) {
    if (!validateUserRating(data.user_rating)) {
      errors.push(`Invalid user rating: ${data.user_rating}. Must be between ${RATING_CONSTRAINTS.USER_RATING.min} and ${RATING_CONSTRAINTS.USER_RATING.max}`)
    }
  }

  // Validate difficulty rating
  if (data.difficulty_rating !== undefined && data.difficulty_rating !== null) {
    if (!validateDifficultyRating(data.difficulty_rating)) {
      errors.push(`Invalid difficulty rating: ${data.difficulty_rating}. Must be between ${RATING_CONSTRAINTS.DIFFICULTY_RATING.min} and ${RATING_CONSTRAINTS.DIFFICULTY_RATING.max}`)
    }
  }

  // Validate hours played
  if (data.hours_played !== undefined) {
    if (!validateHoursPlayed(data.hours_played)) {
      errors.push(`Invalid hours played: ${data.hours_played}. Must be between ${RATING_CONSTRAINTS.HOURS_PLAYED.min} and ${RATING_CONSTRAINTS.HOURS_PLAYED.max}`)
    }
  }

  // Validate review
  if (data.review !== undefined && data.review !== null) {
    if (!validateReviewText(data.review)) {
      errors.push(`Review text too long. Maximum ${TEXT_CONSTRAINTS.REVIEW_MAX_LENGTH} characters allowed`)
    }
  }

  // Logical validations
  if (data.completed && data.status && data.status !== 'completed') {
    warnings.push('Game marked as completed but status is not "completed"')
  }

  if (data.hours_played && data.hours_played > 0 && data.status === 'want_to_play') {
    warnings.push('Game has hours played but status is "want_to_play"')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Validate game filters
 */
export function validateGameFilters(filters: GameFilters): GameValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Validate search query
  if (filters.search && !validateSearchQuery(filters.search)) {
    errors.push(`Invalid search query: "${filters.search}". Must be 1-${TEXT_CONSTRAINTS.SEARCH_QUERY_MAX_LENGTH} characters`)
  }

  // Validate rating range
  if (filters.rating) {
    if (filters.rating.min !== undefined && filters.rating.min < 0) {
      errors.push('Minimum rating cannot be negative')
    }
    if (filters.rating.max !== undefined && filters.rating.max > 5) {
      errors.push('Maximum rating cannot exceed 5')
    }
    if (filters.rating.min !== undefined && filters.rating.max !== undefined && 
        filters.rating.min > filters.rating.max) {
      errors.push('Minimum rating cannot be greater than maximum rating')
    }
  }

  // Validate metacritic range
  if (filters.metacritic) {
    if (filters.metacritic.min !== undefined && filters.metacritic.min < 0) {
      errors.push('Minimum Metacritic score cannot be negative')
    }
    if (filters.metacritic.max !== undefined && filters.metacritic.max > 100) {
      errors.push('Maximum Metacritic score cannot exceed 100')
    }
    if (filters.metacritic.min !== undefined && filters.metacritic.max !== undefined && 
        filters.metacritic.min > filters.metacritic.max) {
      errors.push('Minimum Metacritic score cannot be greater than maximum')
    }
  }

  // Validate playtime range
  if (filters.playtime) {
    if (filters.playtime.min !== undefined && filters.playtime.min < 0) {
      errors.push('Minimum playtime cannot be negative')
    }
    if (filters.playtime.min !== undefined && filters.playtime.max !== undefined && 
        filters.playtime.min > filters.playtime.max) {
      errors.push('Minimum playtime cannot be greater than maximum playtime')
    }
  }

  // Validate year
  if (filters.year) {
    const currentYear = new Date().getFullYear()
    const year = typeof filters.year === 'string' ? parseInt(filters.year) : filters.year
    if (year < 1970 || year > currentYear + 5) {
      warnings.push(`Year ${year} seems unusual. Expected range: 1970-${currentYear + 5}`)
    }
  }

  // Validate status array
  if (filters.status) {
    const invalidStatuses = filters.status.filter(status => !validateUserGameStatus(status))
    if (invalidStatuses.length > 0) {
      errors.push(`Invalid statuses: ${invalidStatuses.join(', ')}`)
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Validate API parameters for game requests
 */
export function validateGameApiParams(params: GameApiParams): GameValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Validate page
  if (params.page !== undefined && params.page < 1) {
    errors.push('Page number must be 1 or greater')
  }

  // Validate page size
  if (params.page_size !== undefined) {
    if (params.page_size < 1 || params.page_size > 100) {
      errors.push('Page size must be between 1 and 100')
    }
  }

  // Validate search
  if (params.search && !validateSearchQuery(params.search)) {
    errors.push(`Invalid search query: "${params.search}"`)
  }

  // Validate dates format (YYYY-MM-DD,YYYY-MM-DD)
  if (params.dates) {
    const dateRegex = /^\d{4}-\d{2}-\d{2},\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(params.dates)) {
      errors.push('Dates must be in format YYYY-MM-DD,YYYY-MM-DD')
    } else {
      const [startDate, endDate] = params.dates.split(',')
      if (new Date(startDate) > new Date(endDate)) {
        errors.push('Start date cannot be after end date')
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Validate basic game structure from API
 */
export function validateGameStructure(game: any): game is Game {
  if (!game || typeof game !== 'object') {
    return false
  }

  // Required fields
  const requiredFields = ['id', 'name', 'slug']
  for (const field of requiredFields) {
    if (!(field in game)) {
      return false
    }
  }

  // Type validation
  if (typeof game.id !== 'number' || 
      typeof game.name !== 'string' || 
      typeof game.slug !== 'string') {
    return false
  }

  // Optional field type validation
  if (game.rating !== null && game.rating !== undefined && typeof game.rating !== 'number') {
    return false
  }

  if (game.released !== null && game.released !== undefined && typeof game.released !== 'string') {
    return false
  }

  return true
}

// ============================================================================
// SANITIZATION FUNCTIONS
// ============================================================================

/**
 * Sanitize user input for search queries
 */
export function sanitizeSearchQuery(query: string): string {
  return query
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, TEXT_CONSTRAINTS.SEARCH_QUERY_MAX_LENGTH)
}

/**
 * Sanitize review text
 */
export function sanitizeReviewText(review: string): string {
  return review
    .trim()
    .replace(/[<>]/g, '') // Basic XSS protection
    .substring(0, TEXT_CONSTRAINTS.REVIEW_MAX_LENGTH)
}

/**
 * Sanitize user game update data
 */
export function sanitizeUserGameUpdate(data: UserGameUpdateData): UserGameUpdateData {
  const sanitized: UserGameUpdateData = {}

  if (data.status && validateUserGameStatus(data.status)) {
    sanitized.status = data.status
  }

  if (data.user_rating !== undefined && data.user_rating !== null) {
    const rating = Math.round(data.user_rating * 2) / 2 // Round to nearest 0.5
    if (validateUserRating(rating)) {
      sanitized.user_rating = rating
    }
  }

  if (data.difficulty_rating !== undefined && data.difficulty_rating !== null) {
    const rating = Math.round(data.difficulty_rating)
    if (validateDifficultyRating(rating)) {
      sanitized.difficulty_rating = rating
    }
  }

  if (data.hours_played !== undefined) {
    const hours = Math.max(0, Math.floor(data.hours_played))
    if (validateHoursPlayed(hours)) {
      sanitized.hours_played = hours
    }
  }

  if (data.completed !== undefined) {
    sanitized.completed = Boolean(data.completed)
  }

  if (data.review !== undefined && data.review !== null) {
    const review = sanitizeReviewText(data.review)
    if (review.length > 0) {
      sanitized.review = review
    } else {
      sanitized.review = null
    }
  }

  if (data.is_favorite !== undefined) {
    sanitized.is_favorite = Boolean(data.is_favorite)
  }

  return sanitized
}

// ============================================================================
// EXPORT VALIDATION HELPERS
// ============================================================================

export const gameValidation = {
  validateUserGameStatus,
  validateUserRating,
  validateDifficultyRating,
  validateHoursPlayed,
  validateReviewText,
  validateSearchQuery,
  validateUserGameUpdate,
  validateGameFilters,
  validateGameApiParams,
  validateGameStructure,
  sanitizeSearchQuery,
  sanitizeReviewText,
  sanitizeUserGameUpdate
} as const
