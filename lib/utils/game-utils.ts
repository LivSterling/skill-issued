import { Game, UserGame } from '@/lib/database/types'

/**
 * Transform raw RAWG game data into a consistent display format
 */
export interface GameDisplayData {
  id: number
  title: string
  year: number | null
  genres: string[]
  platforms: string[]
  rating: number
  image: string
  developers: string[]
  publishers: string[]
  playtime: number
  metacritic: number | null
  description: string
  released: string | null
  esrbRating: string | null
  tags: string[]
  slug: string
}

/**
 * Transform a Game object into consistent display data
 */
export function transformGameForDisplay(game: Game): GameDisplayData {
  return {
    id: game.id,
    title: game.name,
    year: game.released ? new Date(game.released).getFullYear() : null,
    genres: game.genres?.map(g => g.name) || [],
    platforms: game.platforms?.map(p => p.platform?.name || p.name) || [],
    rating: game.rating || 0,
    image: game.image || game.background_image || "/placeholder.svg",
    developers: game.developers?.map(d => d.name) || [],
    publishers: game.publishers?.map(p => p.name) || [],
    playtime: game.playtime || 0,
    metacritic: game.metacritic,
    description: game.description || '',
    released: game.released,
    esrbRating: game.esrb_rating?.name || null,
    tags: game.tags?.map(t => t.name) || [],
    slug: game.slug
  }
}

/**
 * User game status display mappings
 */
export const USER_GAME_STATUS_LABELS = {
  want_to_play: "Want to Play",
  playing: "Playing", 
  completed: "Completed",
  dropped: "Dropped",
  on_hold: "On Hold"
} as const

/**
 * Get user game status display label
 */
export function getUserGameStatusLabel(status: string | null): string | null {
  if (!status) return null
  return USER_GAME_STATUS_LABELS[status as keyof typeof USER_GAME_STATUS_LABELS] || status
}

/**
 * Format game rating for display
 */
export function formatGameRating(rating: number | null): string {
  if (!rating || rating === 0) return 'N/A'
  return rating.toFixed(1)
}

/**
 * Format game playtime for display
 */
export function formatGamePlaytime(playtime: number | null): string {
  if (!playtime || playtime === 0) return 'N/A'
  return `~${playtime}h`
}

/**
 * Format ratings count for display (e.g., 1500 -> "1.5K")
 */
export function formatRatingsCount(count: number | null): string {
  if (!count || count === 0) return '0'
  if (count < 1000) return count.toString()
  return `${(count / 1000).toFixed(1)}K`
}

/**
 * Get truncated list of items with "..." if there are more
 */
export function getTruncatedList<T>(items: T[], maxCount: number): T[] {
  return items.slice(0, maxCount)
}

/**
 * Check if a list was truncated and needs "..." indicator
 */
export function isListTruncated<T>(items: T[], maxCount: number): boolean {
  return items.length > maxCount
}

/**
 * Format a truncated list display (e.g., "Action, RPG, ..." for genres)
 */
export function formatTruncatedList(items: string[], maxCount: number): string {
  const truncated = getTruncatedList(items, maxCount)
  const display = truncated.join(', ')
  return isListTruncated(items, maxCount) ? `${display}...` : display
}

/**
 * Generate a mock game for development/testing purposes
 */
export function createMockGame(overrides: Partial<Game> = {}): Game {
  const defaultGame: Game = {
    id: Math.floor(Math.random() * 10000),
    slug: 'mock-game',
    name: 'Mock Game',
    description: 'A mock game for testing purposes',
    released: new Date().toISOString().split('T')[0],
    background_image: '/placeholder.svg',
    rating: 4.2,
    rating_top: 5,
    ratings_count: 1500,
    metacritic: 85,
    playtime: 25,
    genres: [{ id: 1, name: 'Action' }, { id: 2, name: 'RPG' }],
    platforms: [
      { platform: { id: 1, name: 'PC' } },
      { platform: { id: 2, name: 'PlayStation 5' } }
    ],
    developers: [{ id: 1, name: 'Mock Studios' }],
    publishers: [{ id: 1, name: 'Mock Publisher' }],
    esrb_rating: { id: 1, name: 'T' },
    tags: [
      { id: 1, name: 'Adventure' },
      { id: 2, name: 'Story Rich' }
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  return { ...defaultGame, ...overrides }
}

/**
 * Validate that a game object has the required RAWG structure
 */
export function validateGameStructure(game: any): game is Game {
  return (
    typeof game === 'object' &&
    game !== null &&
    typeof game.id === 'number' &&
    typeof game.name === 'string' &&
    typeof game.slug === 'string'
  )
}

/**
 * Get game image URL with fallback
 */
export function getGameImageUrl(game: Game, fallback: string = '/placeholder.svg'): string {
  return game.image || game.background_image || fallback
}

/**
 * Get primary genre for a game
 */
export function getPrimaryGenre(game: Game): string {
  return game.genres?.[0]?.name || 'Unknown'
}

/**
 * Get primary platform for a game
 */
export function getPrimaryPlatform(game: Game): string {
  return game.platforms?.[0]?.platform.name || 'Unknown'
}

/**
 * Check if game has user data
 */
export function hasUserGameData(userGame: UserGame | null | undefined): userGame is UserGame {
  return userGame !== null && userGame !== undefined
}

/**
 * Get user game progress percentage (for future use)
 */
export function getUserGameProgress(userGame: UserGame | null): number {
  if (!userGame) return 0
  if (userGame.completed) return 100
  if (userGame.status === 'playing' && userGame.hours_played) {
    // This is a rough estimate - in a real app you'd have more sophisticated logic
    const estimatedTotalHours = userGame.game?.playtime || 20
    return Math.min((userGame.hours_played / estimatedTotalHours) * 100, 99)
  }
  return 0
}
