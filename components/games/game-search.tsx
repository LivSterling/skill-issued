'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Search, X, Filter, Clock, TrendingUp, ChevronDown, Loader2 } from 'lucide-react'
import { useGameSearch } from '@/hooks/use-game-search'
import { GameGrid } from '@/components/games/game-grid'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { GameFilters, SearchSuggestion, PopularSearch } from '@/lib/types/game-types'

// ============================================================================
// COMPONENT INTERFACES
// ============================================================================

export interface GameSearchProps {
  className?: string
  placeholder?: string
  showFilters?: boolean
  showSuggestions?: boolean
  showPopularSearches?: boolean
  enableInfiniteScroll?: boolean
  pageSize?: number
  onSearchStart?: (query: string) => void
  onSearchComplete?: (results: any[], totalResults: number) => void
  onError?: (error: Error) => void
}

// ============================================================================
// SEARCH CONFIGURATION
// ============================================================================

const SEARCH_CONFIG = {
  // UI configuration
  MAX_SUGGESTIONS: 6,
  MAX_POPULAR_SEARCHES: 8,
  SUGGESTION_DELAY: 200,
  
  // Filter options
  SORT_OPTIONS: [
    { value: '-relevance', label: 'Most Relevant' },
    { value: '-rating', label: 'Highest Rated' },
    { value: '-released', label: 'Newest' },
    { value: 'released', label: 'Oldest' },
    { value: '-added', label: 'Recently Added' },
    { value: 'name', label: 'A-Z' },
    { value: '-name', label: 'Z-A' }
  ],
  
  GENRE_OPTIONS: [
    'Action', 'Adventure', 'RPG', 'Strategy', 'Shooter', 'Puzzle',
    'Racing', 'Sports', 'Simulation', 'Platform', 'Fighting', 'Horror'
  ],
  
  PLATFORM_OPTIONS: [
    'PC', 'PlayStation 5', 'PlayStation 4', 'Xbox One', 'Xbox Series S/X',
    'Nintendo Switch', 'iOS', 'Android', 'Mac', 'Linux'
  ],
  
  YEAR_OPTIONS: Array.from({ length: 15 }, (_, i) => (new Date().getFullYear() - i).toString()),
  
  RATING_OPTIONS: [
    { value: '90', label: '90+ Exceptional' },
    { value: '80', label: '80+ Great' },
    { value: '70', label: '70+ Good' },
    { value: '60', label: '60+ Mixed' },
    { value: '50', label: '50+ Poor' }
  ]
} as const

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function GameSearch({
  className,
  placeholder = 'Search games...',
  showFilters = true,
  showSuggestions = true,
  showPopularSearches = true,
  enableInfiniteScroll = true,
  pageSize = 20,
  onSearchStart,
  onSearchComplete,
  onError
}: GameSearchProps) {
  // ============================================================================
  // HOOKS AND STATE
  // ============================================================================
  
  const {
    query,
    filters,
    results,
    suggestions,
    popularSearches,
    isSearching,
    isLoadingSuggestions,
    isLoadingMore,
    error,
    searchStats,
    isValidQuery,
    hasResults,
    canLoadMore,
    search,
    loadMore,
    retry,
    clearSearch,
    updateFilters,
    selectSuggestion,
    setQuery
  } = useGameSearch({
    pageSize,
    enableSuggestions: showSuggestions,
    enablePopularSearches: showPopularSearches,
    onSearchComplete,
    onError
  })
  
  // Local UI state
  const [showSuggestionDropdown, setShowSuggestionDropdown] = useState(false)
  const [showFiltersPanel, setShowFiltersPanel] = useState(false)
  const [activeFilters, setActiveFilters] = useState<GameFilters>({})
  
  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null)
  const suggestionTimeoutRef = useRef<NodeJS.Timeout>()
  
  // ============================================================================
  // EFFECT HANDLERS
  // ============================================================================
  
  // Handle search start callback
  useEffect(() => {
    if (query && isSearching) {
      onSearchStart?.(query)
    }
  }, [query, isSearching, onSearchStart])
  
  // Handle suggestion dropdown visibility
  useEffect(() => {
    if (suggestionTimeoutRef.current) {
      clearTimeout(suggestionTimeoutRef.current)
    }
    
    if (query.length >= 2 && showSuggestions) {
      suggestionTimeoutRef.current = setTimeout(() => {
        setShowSuggestionDropdown(true)
      }, SEARCH_CONFIG.SUGGESTION_DELAY)
    } else {
      setShowSuggestionDropdown(false)
    }
    
    return () => {
      if (suggestionTimeoutRef.current) {
        clearTimeout(suggestionTimeoutRef.current)
      }
    }
  }, [query, showSuggestions])
  
  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        setShowSuggestionDropdown(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  const handleQueryChange = (value: string) => {
    setQuery(value)
    if (!value.trim()) {
      setShowSuggestionDropdown(false)
    }
  }
  
  const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
    selectSuggestion(suggestion)
    setShowSuggestionDropdown(false)
    searchInputRef.current?.blur()
  }
  
  const handlePopularSearchSelect = (popularSearch: PopularSearch) => {
    setQuery(popularSearch.query)
    setShowSuggestionDropdown(false)
    searchInputRef.current?.focus()
  }
  
  const handleClearSearch = () => {
    clearSearch()
    setShowSuggestionDropdown(false)
    searchInputRef.current?.focus()
  }
  
  const handleFilterChange = (key: keyof GameFilters, value: string) => {
    const newFilters = { ...activeFilters, [key]: value || undefined }
    setActiveFilters(newFilters)
    updateFilters(newFilters)
  }
  
  const handleClearFilters = () => {
    setActiveFilters({})
    updateFilters({})
  }
  
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setShowSuggestionDropdown(false)
      searchInputRef.current?.blur()
    }
  }
  
  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================
  
  const activeFilterCount = Object.values(activeFilters).filter(Boolean).length
  const hasActiveFilters = activeFilterCount > 0
  
  const shouldShowSuggestions = showSuggestionDropdown && 
    (suggestions.length > 0 || popularSearches.length > 0 || isLoadingSuggestions)
  
  const shouldShowResults = query.trim().length >= 2
  const shouldShowEmptyState = shouldShowResults && !isSearching && !hasResults && !error
  
  // ============================================================================
  // RENDER HELPERS
  // ============================================================================
  
  const renderSearchInput = () => (
    <div className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={searchInputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && setShowSuggestionDropdown(true)}
          className={cn(
            'pl-10 pr-20 h-12 text-base',
            !isValidQuery && query.length > 0 && 'border-destructive focus:border-destructive'
          )}
        />
        
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isSearching && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          
          {query && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearSearch}
              className="h-8 w-8 p-0 hover:bg-muted"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          
          {showFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFiltersPanel(!showFiltersPanel)}
              className={cn(
                'h-8 px-2 gap-1',
                hasActiveFilters && 'bg-primary text-primary-foreground hover:bg-primary/90'
              )}
            >
              <Filter className="h-3 w-3" />
              {hasActiveFilters && (
                <Badge variant="secondary" className="h-4 px-1 text-xs">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          )}
        </div>
      </div>
      
      {/* Suggestions Dropdown */}
      {shouldShowSuggestions && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-1 max-h-96 overflow-hidden shadow-lg">
          <CardContent className="p-0">
            {isLoadingSuggestions ? (
              <div className="p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading suggestions...
                </div>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                {/* Search Suggestions */}
                {suggestions.length > 0 && (
                  <div className="border-b border-border">
                    <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Suggestions
                    </div>
                    {suggestions.slice(0, SEARCH_CONFIG.MAX_SUGGESTIONS).map((suggestion, index) => (
                      <button
                        key={`suggestion-${index}`}
                        onClick={() => handleSuggestionSelect(suggestion)}
                        className="w-full px-3 py-2 text-left hover:bg-muted transition-colors flex items-center gap-2"
                      >
                        <Search className="h-3 w-3 text-muted-foreground" />
                        <span className="flex-1 text-sm">{suggestion.query}</span>
                        {suggestion.popularity > 1 && (
                          <Badge variant="outline" className="text-xs">
                            {suggestion.popularity}
                          </Badge>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                
                {/* Popular Searches */}
                {popularSearches.length > 0 && !query.trim() && (
                  <div>
                    <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      Popular Searches
                    </div>
                    {popularSearches.slice(0, SEARCH_CONFIG.MAX_POPULAR_SEARCHES).map((popular, index) => (
                      <button
                        key={`popular-${index}`}
                        onClick={() => handlePopularSearchSelect(popular)}
                        className="w-full px-3 py-2 text-left hover:bg-muted transition-colors flex items-center gap-2"
                      >
                        <TrendingUp className="h-3 w-3 text-muted-foreground" />
                        <span className="flex-1 text-sm">{popular.query}</span>
                        <Badge variant="outline" className="text-xs">
                          {popular.popularity}
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}
                
                {/* No suggestions */}
                {suggestions.length === 0 && popularSearches.length === 0 && query.trim() && (
                  <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                    No suggestions found
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
  
  const renderFiltersPanel = () => (
    showFiltersPanel && (
      <Card className="mt-4">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium">Filters</h3>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="h-8 px-2 text-xs"
              >
                Clear All
              </Button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Sort By */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Sort By</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between h-9 text-sm">
                    {SEARCH_CONFIG.SORT_OPTIONS.find(option => option.value === activeFilters.ordering)?.label || 'Most Relevant'}
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandList>
                      <CommandGroup>
                        {SEARCH_CONFIG.SORT_OPTIONS.map((option) => (
                          <CommandItem
                            key={option.value}
                            value={option.value}
                            onSelect={() => handleFilterChange('ordering', option.value)}
                            className="text-sm"
                          >
                            {option.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            
            {/* Genre */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Genre</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between h-9 text-sm">
                    {activeFilters.genres || 'Any Genre'}
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Search genres..." />
                    <CommandList>
                      <CommandEmpty>No genres found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value=""
                          onSelect={() => handleFilterChange('genres', '')}
                          className="text-sm"
                        >
                          Any Genre
                        </CommandItem>
                        {SEARCH_CONFIG.GENRE_OPTIONS.map((genre) => (
                          <CommandItem
                            key={genre}
                            value={genre}
                            onSelect={() => handleFilterChange('genres', genre)}
                            className="text-sm"
                          >
                            {genre}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            
            {/* Platform */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Platform</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between h-9 text-sm">
                    {activeFilters.platforms || 'Any Platform'}
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Search platforms..." />
                    <CommandList>
                      <CommandEmpty>No platforms found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value=""
                          onSelect={() => handleFilterChange('platforms', '')}
                          className="text-sm"
                        >
                          Any Platform
                        </CommandItem>
                        {SEARCH_CONFIG.PLATFORM_OPTIONS.map((platform) => (
                          <CommandItem
                            key={platform}
                            value={platform}
                            onSelect={() => handleFilterChange('platforms', platform)}
                            className="text-sm"
                          >
                            {platform}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            
            {/* Year */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Year</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between h-9 text-sm">
                    {activeFilters.year || 'Any Year'}
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandList>
                      <CommandGroup>
                        <CommandItem
                          value=""
                          onSelect={() => handleFilterChange('year', '')}
                          className="text-sm"
                        >
                          Any Year
                        </CommandItem>
                        {SEARCH_CONFIG.YEAR_OPTIONS.map((year) => (
                          <CommandItem
                            key={year}
                            value={year}
                            onSelect={() => handleFilterChange('year', year)}
                            className="text-sm"
                          >
                            {year}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  )
  
  const renderSearchStats = () => (
    shouldShowResults && searchStats.totalResults > 0 && (
      <div className="flex items-center justify-between py-4 border-b border-border">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>
            {searchStats.totalResults.toLocaleString()} results
            {searchStats.lastQuery && ` for "${searchStats.lastQuery}"`}
          </span>
          {searchStats.searchTime > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {searchStats.searchTime}ms
            </span>
          )}
        </div>
        
        {hasActiveFilters && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="h-6 px-2 text-xs"
            >
              Clear
            </Button>
          </div>
        )}
      </div>
    )
  )
  
  const renderResults = () => {
    if (!shouldShowResults) {
      return null
    }
    
    if (error) {
      return (
        <Card className="mt-6">
          <CardContent className="p-8 text-center">
            <div className="text-destructive mb-2">Search Error</div>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={retry} size="sm">
              Try Again
            </Button>
          </CardContent>
        </Card>
      )
    }
    
    if (isSearching && results.length === 0) {
      return (
        <div className="mt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="space-y-3">
                <Skeleton className="aspect-[3/4] w-full rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    }
    
    if (shouldShowEmptyState) {
      return (
        <Card className="mt-6">
          <CardContent className="p-8 text-center">
            <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No games found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Try adjusting your search terms or filters
            </p>
            {hasActiveFilters && (
              <Button onClick={handleClearFilters} variant="outline" size="sm">
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      )
    }
    
    if (hasResults) {
      return (
        <div className="mt-6">
          <GameGrid games={results} />
          
          {canLoadMore && (
            <div className="mt-8 text-center">
              <Button
                onClick={loadMore}
                disabled={isLoadingMore}
                size="lg"
                className="min-w-32"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Loading...
                  </>
                ) : (
                  'Load More'
                )}
              </Button>
            </div>
          )}
        </div>
      )
    }
    
    return null
  }
  
  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  
  return (
    <div className={cn('w-full', className)}>
      {/* Search Input */}
      {renderSearchInput()}
      
      {/* Filters Panel */}
      {renderFiltersPanel()}
      
      {/* Search Stats */}
      {renderSearchStats()}
      
      {/* Results */}
      {renderResults()}
    </div>
  )
}
