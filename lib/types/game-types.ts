import { Game, UserGame } from '@/lib/database/types'

// ============================================================================
// CORE GAME INTERFACES
// ============================================================================

/**
 * Transformed game data optimized for display components
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
 * User game status types with strict typing
 */
export type UserGameStatus = 'want_to_play' | 'playing' | 'completed' | 'dropped' | 'on_hold'

/**
 * User game action types for component interactions
 */
export type UserGameAction = 'wishlist' | 'library' | 'played' | 'remove'

/**
 * View modes for game display components
 */
export type GameViewMode = 'grid' | 'list'

/**
 * Game sorting options
 */
export type GameSortOption = 'popular' | 'rating' | 'recent' | 'title' | 'release_date' | 'metacritic'

/**
 * Game filter options
 */
export interface GameFilters {
  search?: string
  genres?: string[]
  platforms?: string[]
  year?: number | string
  rating?: {
    min?: number
    max?: number
  }
  metacritic?: {
    min?: number
    max?: number
  }
  playtime?: {
    min?: number
    max?: number
  }
  status?: UserGameStatus[]
}

// ============================================================================
// COMPONENT PROP INTERFACES
// ============================================================================

/**
 * Props for GameCard component
 */
export interface GameCardProps {
  game: Game
  userGame?: UserGame | null
  viewMode?: GameViewMode
  onUserAction?: (action: UserGameAction, gameId: number) => void | Promise<void>
  className?: string
  compact?: boolean
  showUserActions?: boolean
  showMetadata?: boolean
  priority?: boolean // for image loading priority
}

/**
 * Props for GameGrid component
 */
export interface GameGridProps {
  games: Game[]
  userGames?: UserGame[]
  loading?: boolean
  error?: string | null
  onUserAction?: (action: UserGameAction, gameId: number) => void | Promise<void>
  onRetry?: () => void | Promise<void>
  onLoadMore?: () => void | Promise<void>
  hasMore?: boolean
  loadingMore?: boolean
  className?: string
  emptyMessage?: string
  columns?: {
    default: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
    "2xl"?: number
  }
}

/**
 * Props for GameList component
 */
export interface GameListProps {
  games: Game[]
  userGames?: UserGame[]
  loading?: boolean
  error?: string | null
  onUserAction?: (action: UserGameAction, gameId: number) => void | Promise<void>
  onRetry?: () => void | Promise<void>
  onLoadMore?: () => void | Promise<void>
  hasMore?: boolean
  loadingMore?: boolean
  className?: string
  emptyMessage?: string
  showIndex?: boolean
  compact?: boolean
  showUserActions?: boolean
}

/**
 * Props for game search components
 */
export interface GameSearchProps {
  onSearch?: (query: string) => void | Promise<void>
  onFilter?: (filters: GameFilters) => void | Promise<void>
  placeholder?: string
  className?: string
  showFilters?: boolean
  initialQuery?: string
  initialFilters?: GameFilters
}

/**
 * Props for game filter components
 */
export interface GameFiltersProps {
  filters: GameFilters
  onFiltersChange: (filters: GameFilters) => void | Promise<void>
  availableGenres?: string[]
  availablePlatforms?: string[]
  className?: string
  compact?: boolean
}

// ============================================================================
// HOOK INTERFACES
// ============================================================================

/**
 * Parameters for useGames hook
 */
export interface UseGamesParams {
  search?: string
  page?: number
  pageSize?: number
  ordering?: string
  genres?: string
  platforms?: string
  dates?: string
  developers?: string
  publishers?: string
  initialLoad?: boolean
}

/**
 * Return type for useGames hook
 */
export interface UseGamesReturn {
  games: Game[]
  loading: boolean
  error: string | null
  hasMore: boolean
  totalCount: number
  currentPage: number
  fetchGames: (params?: UseGamesParams) => Promise<void>
  loadMore: () => Promise<void>
  refetch: () => Promise<void>
  reset: () => void
}

/**
 * Return type for useGameDetail hook
 */
export interface UseGameDetailReturn {
  game: Game | null
  userGame: UserGame | null
  loading: boolean
  error: string | null
  updateUserGame: (data: Partial<UserGame>) => Promise<void>
  refetch: () => Promise<void>
}

/**
 * Return type for useTrendingGames hook
 */
export interface UseTrendingGamesReturn {
  featuredGames: Game[]
  trendingGames: Game[]
  popularGames: Game[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Parameters for useUserGame hook
 */
export interface UseUserGameParams {
  gameId: number
  userId?: string
  enableAutoSave?: boolean
  enableCache?: boolean
  onStatusChange?: (status: UserGameStatus, userGame: UserGame) => void
  onRatingChange?: (rating: number | null, userGame: UserGame) => void
  onReviewChange?: (review: string | null, userGame: UserGame) => void
}

/**
 * Return type for useUserGame hook
 */
export interface UseUserGameReturn {
  // Core data
  userGame: UserGame | null
  loading: boolean
  updating: boolean
  error: string | null
  
  // Local state
  localChanges: Partial<UserGameUpdateData>
  hasUnsavedChanges: boolean
  
  // Core operations
  updateUserGame: (data: UserGameUpdateData) => Promise<UserGame>
  deleteUserGame: () => Promise<void>
  refetch: () => Promise<UserGame | null>
  
  // Convenient update methods
  updateStatus: (status: UserGameStatus) => Promise<UserGame>
  updateRating: (rating: number | null) => Promise<UserGame>
  updateDifficulty: (difficulty: number | null) => Promise<UserGame>
  updateHoursPlayed: (hours: number) => Promise<UserGame>
  updateReview: (review: string | null) => Promise<UserGame>
  toggleFavorite: () => Promise<UserGame>
  toggleCompleted: () => Promise<UserGame>
  
  // Local state management
  updateLocalState: (changes: Partial<UserGameUpdateData>) => void
  discardLocalChanges: () => void
  saveLocalChanges: () => Promise<void>
  
  // Utility methods
  isInLibrary: () => boolean
  getEffectiveData: () => UserGame | null
  getCompletionPercentage: () => number
}

// ============================================================================
// API INTERFACES
// ============================================================================

/**
 * RAWG API response structure
 */
export interface RAWGApiResponse<T = Game> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

/**
 * RAWG API error response
 */
export interface RAWGApiError {
  detail?: string
  error?: string
  message?: string
}

/**
 * Game API query parameters
 */
export interface GameApiParams {
  search?: string
  page?: number
  page_size?: number
  ordering?: string
  genres?: string
  platforms?: string
  dates?: string
  developers?: string
  publishers?: string
  parent_platforms?: string
  stores?: string
  tags?: string
}

/**
 * User game API data for updates
 */
export interface UserGameUpdateData {
  status?: UserGameStatus
  user_rating?: number | null
  difficulty_rating?: number | null
  hours_played?: number
  completed?: boolean
  review?: string | null
  is_favorite?: boolean
}

// ============================================================================
// UTILITY INTERFACES
// ============================================================================

/**
 * Game statistics for display
 */
export interface GameStats {
  totalGames: number
  completedGames: number
  hoursPlayed: number
  averageRating: number
  favoriteGenres: string[]
  recentActivity: number
}

/**
 * Game recommendation data
 */
export interface GameRecommendation {
  game: Game
  score: number
  reasons: string[]
  similarGames: Game[]
}

/**
 * Game search suggestion
 */
export interface GameSearchSuggestion {
  id: number
  title: string
  year: number | null
  image: string
  type: 'game' | 'genre' | 'developer' | 'platform'
}

/**
 * Game collection/list data
 */
export interface GameCollection {
  id: string
  name: string
  description?: string
  games: Game[]
  userGames?: UserGame[]
  isPublic: boolean
  createdAt: string
  updatedAt: string
}

// ============================================================================
// VALIDATION INTERFACES
// ============================================================================

/**
 * Game data validation result
 */
export interface GameValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * User game data validation schema
 */
export interface UserGameValidation {
  status?: UserGameStatus
  user_rating?: number // 0-5
  difficulty_rating?: number // 1-5
  hours_played?: number // >= 0
  review?: string // max length validation
}

// ============================================================================
// EVENT INTERFACES
// ============================================================================

/**
 * Game interaction events
 */
export interface GameInteractionEvent {
  type: 'view' | 'click' | 'add_to_library' | 'rate' | 'review' | 'share'
  gameId: number
  userId?: string
  metadata?: Record<string, any>
  timestamp: string
}

/**
 * Game loading states
 */
export interface GameLoadingState {
  games: boolean
  userGames: boolean
  recommendations: boolean
  stats: boolean
}

// ============================================================================
// CONFIGURATION INTERFACES
// ============================================================================

/**
 * Game display configuration
 */
export interface GameDisplayConfig {
  defaultViewMode: GameViewMode
  defaultSortBy: GameSortOption
  itemsPerPage: number
  enableInfiniteScroll: boolean
  showUserActions: boolean
  showMetadata: boolean
  enableFilters: boolean
}

/**
 * Game cache configuration
 */
export interface GameCacheConfig {
  ttl: number // Time to live in milliseconds
  maxItems: number
  enablePersistence: boolean
  compressionEnabled: boolean
}

// ============================================================================
// SEARCH INTERFACES
// ============================================================================

export interface SearchSuggestion {
  query: string
  popularity: number
}

export interface PopularSearch {
  query: string
  popularity: number
}

export interface UseGameSearchParams {
  initialQuery?: string
  initialFilters?: GameFilters
  pageSize?: number
  enableSuggestions?: boolean
  enablePopularSearches?: boolean
  autoSearch?: boolean
  onSearchComplete?: (results: GameDisplayData[], totalResults: number) => void
  onError?: (error: Error) => void
}

export interface SearchStats {
  totalResults: number
  currentPage: number
  resultsCount: number
  searchTime: number
  lastQuery: string
  hasMore: boolean
}

export interface UseGameSearchReturn {
  // Search state
  query: string
  filters: GameFilters
  results: GameDisplayData[]
  suggestions: SearchSuggestion[]
  popularSearches: PopularSearch[]
  
  // Loading states
  isSearching: boolean
  isLoadingSuggestions: boolean
  isLoadingMore: boolean
  
  // Pagination
  currentPage: number
  totalResults: number
  hasNextPage: boolean
  canLoadMore: boolean
  
  // Error handling
  error: string | null
  
  // Search metadata
  searchStats: SearchStats
  isValidQuery: boolean
  hasResults: boolean
  
  // Actions
  search: (query: string, filters?: GameFilters) => void
  loadMore: () => void
  retry: () => void
  clearSearch: () => void
  updateFilters: (filters: Partial<GameFilters>) => void
  selectSuggestion: (suggestion: SearchSuggestion) => void
  
  // Direct setters for controlled usage
  setQuery: (query: string) => void
  setFilters: (filters: GameFilters) => void
}

// ============================================================================
// EXPORT ALL TYPES
// ============================================================================

export type {
  // Re-export database types for convenience
  Game,
  UserGame
} from '@/lib/database/types'

// Export utility type helpers
export type GameId = number
export type UserId = string
export type GameSlug = string

// Export union types for stricter typing
export type GameGenre = string // Could be made more specific with RAWG genre list
export type GamePlatform = string // Could be made more specific with RAWG platform list
export type GameDeveloper = string
export type GamePublisher = string
