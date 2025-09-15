import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useToast } from '@/hooks/use-toast'
import type { 
  GameDisplayData, 
  GameFilters,
  UseGameSearchParams,
  UseGameSearchReturn,
  SearchSuggestion,
  PopularSearch
} from '@/lib/types/game-types'

// ============================================================================
// SEARCH CONFIGURATION
// ============================================================================

const SEARCH_CONFIG = {
  // Debounce delay for search queries
  DEBOUNCE_DELAY: 300,
  
  // Minimum query length to trigger search
  MIN_QUERY_LENGTH: 2,
  
  // Maximum query length
  MAX_QUERY_LENGTH: 100,
  
  // Cache duration for search results (in milliseconds)
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
  
  // Maximum number of cached search results
  MAX_CACHE_SIZE: 50,
  
  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  
  // Suggestion configuration
  MIN_SUGGESTION_LENGTH: 2,
  MAX_SUGGESTIONS: 8,
  SUGGESTION_DEBOUNCE: 200
} as const

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

interface SearchCacheEntry {
  query: string
  filters: GameFilters
  results: GameDisplayData[]
  pagination: any
  timestamp: number
  totalResults: number
}

interface SuggestionCacheEntry {
  query: string
  suggestions: SearchSuggestion[]
  timestamp: number
}

// Global cache to persist across component re-renders
const searchCache = new Map<string, SearchCacheEntry>()
const suggestionCache = new Map<string, SuggestionCacheEntry>()
const popularSearchesCache = { data: null as PopularSearch[] | null, timestamp: 0 }

/**
 * Generate cache key for search results
 */
function generateCacheKey(query: string, filters: GameFilters, page: number = 1): string {
  const normalizedQuery = query.toLowerCase().trim()
  const filterString = JSON.stringify(
    Object.fromEntries(
      Object.entries(filters).filter(([, value]) => 
        value !== null && value !== undefined && value !== ''
      )
    )
  )
  return `${normalizedQuery}:${filterString}:${page}`
}

/**
 * Check if cache entry is valid
 */
function isCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < SEARCH_CONFIG.CACHE_DURATION
}

/**
 * Clean expired cache entries
 */
function cleanCache() {
  const now = Date.now()
  
  // Clean search cache
  for (const [key, entry] of searchCache.entries()) {
    if (!isCacheValid(entry.timestamp)) {
      searchCache.delete(key)
    }
  }
  
  // Clean suggestion cache
  for (const [key, entry] of suggestionCache.entries()) {
    if (!isCacheValid(entry.timestamp)) {
      suggestionCache.delete(key)
    }
  }
  
  // Limit cache size
  if (searchCache.size > SEARCH_CONFIG.MAX_CACHE_SIZE) {
    const entries = Array.from(searchCache.entries())
    entries.sort(([, a], [, b]) => a.timestamp - b.timestamp)
    const toRemove = entries.slice(0, entries.length - SEARCH_CONFIG.MAX_CACHE_SIZE)
    toRemove.forEach(([key]) => searchCache.delete(key))
  }
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useGameSearch(params: UseGameSearchParams = {}): UseGameSearchReturn {
  const {
    initialQuery = '',
    initialFilters = {},
    pageSize = 20,
    enableSuggestions = true,
    enablePopularSearches = true,
    autoSearch = true,
    onSearchComplete,
    onError
  } = params
  
  const { toast } = useToast()
  
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  const [query, setQuery] = useState(initialQuery)
  const [filters, setFilters] = useState<GameFilters>(initialFilters)
  const [results, setResults] = useState<GameDisplayData[]>([])
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [popularSearches, setPopularSearches] = useState<PopularSearch[]>([])
  
  // Loading states
  const [isSearching, setIsSearching] = useState(false)
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalResults, setTotalResults] = useState(0)
  const [hasNextPage, setHasNextPage] = useState(false)
  
  // Error state
  const [error, setError] = useState<string | null>(null)
  
  // Search metadata
  const [searchTime, setSearchTime] = useState<number>(0)
  const [lastSearchQuery, setLastSearchQuery] = useState('')
  
  // Refs for cleanup and debouncing
  const searchTimeoutRef = useRef<NodeJS.Timeout>()
  const suggestionTimeoutRef = useRef<NodeJS.Timeout>()
  const abortControllerRef = useRef<AbortController>()
  const retryCountRef = useRef(0)
  
  // ============================================================================
  // API FUNCTIONS
  // ============================================================================
  
  /**
   * Perform search API call with retry logic
   */
  const performSearch = useCallback(async (
    searchQuery: string,
    searchFilters: GameFilters,
    page: number = 1,
    signal?: AbortSignal
  ): Promise<{
    results: GameDisplayData[]
    totalResults: number
    hasNextPage: boolean
    searchTime: number
  }> => {
    const startTime = Date.now()
    
    // Build search parameters
    const params = new URLSearchParams({
      q: searchQuery,
      page: page.toString(),
      page_size: pageSize.toString()
    })
    
    // Add filters
    Object.entries(searchFilters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params.append(key, String(value))
      }
    })
    
    const response = await fetch(`/api/games/search?${params}`, {
      signal,
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      }
    })
    
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Too many search requests. Please wait a moment.')
      }
      
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `Search failed: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error || 'Search request failed')
    }
    
    const searchTime = Date.now() - startTime
    
    return {
      results: data.data || [],
      totalResults: data.pagination?.totalItems || 0,
      hasNextPage: data.pagination?.hasNext || false,
      searchTime
    }
  }, [pageSize])
  
  /**
   * Fetch search suggestions
   */
  const fetchSuggestions = useCallback(async (
    suggestionQuery: string,
    signal?: AbortSignal
  ): Promise<SearchSuggestion[]> => {
    if (suggestionQuery.length < SEARCH_CONFIG.MIN_SUGGESTION_LENGTH) {
      return []
    }
    
    const response = await fetch(
      `/api/games/search?endpoint=suggestions&q=${encodeURIComponent(suggestionQuery)}`,
      { signal }
    )
    
    if (!response.ok) {
      console.warn('Failed to fetch suggestions:', response.statusText)
      return []
    }
    
    const data = await response.json()
    return data.success ? (data.data?.suggestions || []) : []
  }, [])
  
  /**
   * Fetch popular searches
   */
  const fetchPopularSearches = useCallback(async (
    signal?: AbortSignal
  ): Promise<PopularSearch[]> => {
    // Check cache first
    if (popularSearchesCache.data && isCacheValid(popularSearchesCache.timestamp)) {
      return popularSearchesCache.data
    }
    
    const response = await fetch('/api/games/search?endpoint=popular', { signal })
    
    if (!response.ok) {
      console.warn('Failed to fetch popular searches:', response.statusText)
      return []
    }
    
    const data = await response.json()
    const searches = data.success ? (data.data?.popular_searches || []) : []
    
    // Update cache
    popularSearchesCache.data = searches
    popularSearchesCache.timestamp = Date.now()
    
    return searches
  }, [])
  
  // ============================================================================
  // SEARCH LOGIC WITH CACHING AND RETRY
  // ============================================================================
  
  /**
   * Execute search with caching and retry logic
   */
  const executeSearch = useCallback(async (
    searchQuery: string,
    searchFilters: GameFilters,
    page: number = 1,
    isLoadMore: boolean = false
  ) => {
    if (!searchQuery.trim() || searchQuery.length < SEARCH_CONFIG.MIN_QUERY_LENGTH) {
      setResults([])
      setTotalResults(0)
      setHasNextPage(false)
      return
    }
    
    // Check cache first
    const cacheKey = generateCacheKey(searchQuery, searchFilters, page)
    const cachedEntry = searchCache.get(cacheKey)
    
    if (cachedEntry && isCacheValid(cachedEntry.timestamp)) {
      if (isLoadMore) {
        setResults(prev => [...prev, ...cachedEntry.results])
      } else {
        setResults(cachedEntry.results)
      }
      setTotalResults(cachedEntry.totalResults)
      setHasNextPage(cachedEntry.pagination?.hasNext || false)
      setSearchTime(Date.now() - cachedEntry.timestamp)
      setLastSearchQuery(searchQuery)
      onSearchComplete?.(cachedEntry.results, cachedEntry.totalResults)
      return
    }
    
    // Cancel previous search
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal
    
    if (isLoadMore) {
      setIsLoadingMore(true)
    } else {
      setIsSearching(true)
      setError(null)
    }
    
    try {
      retryCountRef.current = 0
      
      const searchWithRetry = async (): Promise<any> => {
        try {
          return await performSearch(searchQuery, searchFilters, page, signal)
        } catch (error: any) {
          if (signal.aborted) {
            throw error
          }
          
          retryCountRef.current++
          
          if (retryCountRef.current <= SEARCH_CONFIG.MAX_RETRIES) {
            console.warn(`Search attempt ${retryCountRef.current} failed, retrying...`, error)
            await new Promise(resolve => 
              setTimeout(resolve, SEARCH_CONFIG.RETRY_DELAY * retryCountRef.current)
            )
            return searchWithRetry()
          }
          
          throw error
        }
      }
      
      const searchResult = await searchWithRetry()
      
      if (signal.aborted) return
      
      // Cache results
      const cacheEntry: SearchCacheEntry = {
        query: searchQuery,
        filters: searchFilters,
        results: searchResult.results,
        pagination: { hasNext: searchResult.hasNextPage },
        timestamp: Date.now(),
        totalResults: searchResult.totalResults
      }
      
      searchCache.set(cacheKey, cacheEntry)
      cleanCache()
      
      // Update state
      if (isLoadMore) {
        setResults(prev => [...prev, ...searchResult.results])
      } else {
        setResults(searchResult.results)
      }
      
      setTotalResults(searchResult.totalResults)
      setHasNextPage(searchResult.hasNextPage)
      setSearchTime(searchResult.searchTime)
      setLastSearchQuery(searchQuery)
      setCurrentPage(page)
      
      onSearchComplete?.(searchResult.results, searchResult.totalResults)
      
    } catch (error: any) {
      if (signal.aborted) return
      
      const errorMessage = error.message || 'Search failed'
      setError(errorMessage)
      
      console.error('Search error:', error)
      
      toast({
        title: 'Search Error',
        description: errorMessage,
        variant: 'destructive'
      })
      
      onError?.(error)
      
    } finally {
      if (!signal.aborted) {
        setIsSearching(false)
        setIsLoadingMore(false)
      }
    }
  }, [performSearch, onSearchComplete, onError, toast])
  
  /**
   * Execute suggestion search
   */
  const executeSuggestionSearch = useCallback(async (suggestionQuery: string) => {
    if (!enableSuggestions || suggestionQuery.length < SEARCH_CONFIG.MIN_SUGGESTION_LENGTH) {
      setSuggestions([])
      return
    }
    
    // Check cache first
    const cachedSuggestions = suggestionCache.get(suggestionQuery.toLowerCase())
    if (cachedSuggestions && isCacheValid(cachedSuggestions.timestamp)) {
      setSuggestions(cachedSuggestions.suggestions)
      return
    }
    
    setIsLoadingSuggestions(true)
    
    try {
      const suggestionResults = await fetchSuggestions(suggestionQuery)
      
      // Cache suggestions
      suggestionCache.set(suggestionQuery.toLowerCase(), {
        query: suggestionQuery,
        suggestions: suggestionResults,
        timestamp: Date.now()
      })
      
      setSuggestions(suggestionResults)
      
    } catch (error) {
      console.warn('Failed to fetch suggestions:', error)
      setSuggestions([])
    } finally {
      setIsLoadingSuggestions(false)
    }
  }, [enableSuggestions, fetchSuggestions])
  
  // ============================================================================
  // DEBOUNCED SEARCH EFFECTS
  // ============================================================================
  
  // Debounced search effect
  useEffect(() => {
    if (!autoSearch) return
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      executeSearch(query, filters, 1, false)
    }, SEARCH_CONFIG.DEBOUNCE_DELAY)
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [query, filters, autoSearch, executeSearch])
  
  // Debounced suggestions effect
  useEffect(() => {
    if (!enableSuggestions) return
    
    if (suggestionTimeoutRef.current) {
      clearTimeout(suggestionTimeoutRef.current)
    }
    
    suggestionTimeoutRef.current = setTimeout(() => {
      executeSuggestionSearch(query)
    }, SEARCH_CONFIG.SUGGESTION_DEBOUNCE)
    
    return () => {
      if (suggestionTimeoutRef.current) {
        clearTimeout(suggestionTimeoutRef.current)
      }
    }
  }, [query, enableSuggestions, executeSuggestionSearch])
  
  // Load popular searches on mount
  useEffect(() => {
    if (enablePopularSearches) {
      fetchPopularSearches()
        .then(setPopularSearches)
        .catch(error => console.warn('Failed to load popular searches:', error))
    }
  }, [enablePopularSearches, fetchPopularSearches])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
      if (suggestionTimeoutRef.current) {
        clearTimeout(suggestionTimeoutRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])
  
  // ============================================================================
  // PUBLIC INTERFACE FUNCTIONS
  // ============================================================================
  
  const search = useCallback((newQuery: string, newFilters: GameFilters = {}) => {
    setQuery(newQuery)
    setFilters(newFilters)
    setCurrentPage(1)
    if (!autoSearch) {
      executeSearch(newQuery, newFilters, 1, false)
    }
  }, [autoSearch, executeSearch])
  
  const loadMore = useCallback(() => {
    if (!hasNextPage || isLoadingMore) return
    
    const nextPage = currentPage + 1
    executeSearch(query, filters, nextPage, true)
  }, [query, filters, currentPage, hasNextPage, isLoadingMore, executeSearch])
  
  const retry = useCallback(() => {
    executeSearch(query, filters, currentPage, false)
  }, [query, filters, currentPage, executeSearch])
  
  const clearSearch = useCallback(() => {
    setQuery('')
    setResults([])
    setSuggestions([])
    setError(null)
    setCurrentPage(1)
    setTotalResults(0)
    setHasNextPage(false)
    setLastSearchQuery('')
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }, [])
  
  const updateFilters = useCallback((newFilters: Partial<GameFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
    setCurrentPage(1)
  }, [])
  
  const selectSuggestion = useCallback((suggestion: SearchSuggestion) => {
    setQuery(suggestion.query)
    setSuggestions([])
    if (!autoSearch) {
      executeSearch(suggestion.query, filters, 1, false)
    }
  }, [autoSearch, filters, executeSearch])
  
  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================
  
  const isValidQuery = useMemo(() => {
    return query.trim().length >= SEARCH_CONFIG.MIN_QUERY_LENGTH && 
           query.length <= SEARCH_CONFIG.MAX_QUERY_LENGTH
  }, [query])
  
  const hasResults = useMemo(() => results.length > 0, [results])
  
  const canLoadMore = useMemo(() => 
    hasNextPage && !isLoadingMore && !isSearching, 
    [hasNextPage, isLoadingMore, isSearching]
  )
  
  const searchStats = useMemo(() => ({
    totalResults,
    currentPage,
    resultsCount: results.length,
    searchTime,
    lastQuery: lastSearchQuery,
    hasMore: hasNextPage
  }), [totalResults, currentPage, results.length, searchTime, lastSearchQuery, hasNextPage])
  
  // ============================================================================
  // RETURN INTERFACE
  // ============================================================================
  
  return {
    // Search state
    query,
    filters,
    results,
    suggestions,
    popularSearches,
    
    // Loading states
    isSearching,
    isLoadingSuggestions,
    isLoadingMore,
    
    // Pagination
    currentPage,
    totalResults,
    hasNextPage,
    canLoadMore,
    
    // Error handling
    error,
    
    // Search metadata
    searchStats,
    isValidQuery,
    hasResults,
    
    // Actions
    search,
    loadMore,
    retry,
    clearSearch,
    updateFilters,
    selectSuggestion,
    
    // Direct setters for controlled usage
    setQuery,
    setFilters
  }
}
