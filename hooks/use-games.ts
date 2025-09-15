import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import type { UseGamesParams, UseGamesReturn } from '@/lib/types/game-types'
import type { Game } from '@/lib/database/types'

export function useGames(initialParams: UseGamesParams = {}): UseGamesReturn {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [currentParams, setCurrentParams] = useState<UseGamesParams>(initialParams)
  const [currentPage, setCurrentPage] = useState(1)

  const fetchGames = useCallback(async (params: UseGamesParams = {}) => {
    setLoading(true)
    setError(null)
    
    try {
      const searchParams = new URLSearchParams()
      
      // Add parameters
      if (params.search) searchParams.set('search', params.search)
      if (params.page) searchParams.set('page', params.page.toString())
      if (params.pageSize) searchParams.set('page_size', params.pageSize.toString())
      if (params.genres) searchParams.set('genres', params.genres)
      if (params.platforms) searchParams.set('platforms', params.platforms)
      if (params.ordering) searchParams.set('ordering', params.ordering)

      const response = await fetch(`/api/games?${searchParams}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }

      // Handle pagination - if it's a new search or page 1, replace games
      if (!params.page || params.page === 1) {
        setGames(data.results || [])
        setCurrentPage(1)
      } else {
        // Append for pagination
        setGames(prev => [...prev, ...(data.results || [])])
      }
      
      setTotalCount(data.count || 0)
      setHasMore(!!data.next)
      setCurrentParams(params)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch games'
      setError(errorMessage)
      console.error('Error fetching games:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return
    
    const nextPage = currentPage + 1
    await fetchGames({ ...currentParams, page: nextPage })
    setCurrentPage(nextPage)
  }, [hasMore, loading, currentPage, currentParams, fetchGames])

  const refetch = useCallback(async () => {
    await fetchGames({ ...currentParams, page: 1 })
  }, [currentParams, fetchGames])

  // Initial fetch
  useEffect(() => {
    fetchGames(initialParams)
  }, []) // Only run on mount

  const reset = useCallback(() => {
    setGames([])
    setError(null)
    setHasMore(true)
    setTotalCount(0)
    setCurrentPage(1)
  }, [])

  return { 
    games, 
    loading, 
    error, 
    hasMore, 
    totalCount, 
    currentPage,
    fetchGames, 
    loadMore, 
    refetch,
    reset
  }
}