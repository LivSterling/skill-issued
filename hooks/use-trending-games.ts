import { useState, useEffect, useCallback } from 'react'
import type { UseTrendingGamesReturn } from '@/lib/types/game-types'
import type { Game } from '@/lib/database/types'

export function useTrendingGames(): UseTrendingGamesReturn {
  const [featuredGames, setFeaturedGames] = useState<Game[]>([])
  const [trendingGames, setTrendingGames] = useState<Game[]>([])
  const [popularGames, setPopularGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTrendingGames = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch different sets of games in parallel
      const [featuredResponse, trendingResponse, popularResponse] = await Promise.all([
        // Featured: Top rated games from this year
        fetch('/api/games?ordering=-rating&page_size=6&dates=2024-01-01,2024-12-31'),
        // Trending: Recently released popular games
        fetch('/api/games?ordering=-added&page_size=3&dates=2024-01-01,2024-12-31'),
        // Popular: Most popular games overall
        fetch('/api/games?ordering=-rating&page_size=4')
      ])

      // Check if all requests were successful
      if (!featuredResponse.ok || !trendingResponse.ok || !popularResponse.ok) {
        throw new Error('Failed to fetch trending games')
      }

      const [featuredData, trendingData, popularData] = await Promise.all([
        featuredResponse.json(),
        trendingResponse.json(),
        popularResponse.json()
      ])

      // Check for API errors
      if (featuredData.error) throw new Error(featuredData.error)
      if (trendingData.error) throw new Error(trendingData.error)
      if (popularData.error) throw new Error(popularData.error)

      setFeaturedGames(featuredData.results || [])
      setTrendingGames(trendingData.results || [])
      setPopularGames(popularData.results || [])

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch trending games'
      setError(errorMessage)
      console.error('Error fetching trending games:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const refetch = useCallback(async () => {
    await fetchTrendingGames()
  }, [fetchTrendingGames])

  // Initial fetch
  useEffect(() => {
    fetchTrendingGames()
  }, [fetchTrendingGames])

  return {
    featuredGames,
    trendingGames,
    popularGames,
    loading,
    error,
    refetch
  }
}
