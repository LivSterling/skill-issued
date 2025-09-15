import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import type { UseGameDetailReturn } from '@/lib/types/game-types'
import type { Game, UserGame } from '@/lib/database/types'

export function useGameDetail(gameId: string | number): UseGameDetailReturn {
  const [game, setGame] = useState<Game | null>(null)
  const [userGame, setUserGame] = useState<UserGame | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { isAuthenticated, user } = useAuth()

  const fetchGameDetail = useCallback(async () => {
    if (!gameId) return

    setLoading(true)
    setError(null)

    try {
      // Fetch game data from API
      const gameResponse = await fetch(`/api/games/${gameId}`)
      
      if (!gameResponse.ok) {
        throw new Error(`HTTP error! status: ${gameResponse.status}`)
      }
      
      const gameData = await gameResponse.json()
      
      if (gameData.error) {
        throw new Error(gameData.error)
      }

      setGame(gameData)

      // Fetch user game data if authenticated
      if (isAuthenticated && user) {
        try {
          const userGameResponse = await fetch(`/api/games/${gameId}/user-data`)
          
          if (userGameResponse.ok) {
            const userGameData = await userGameResponse.json()
            if (userGameData && !userGameData.error) {
              setUserGame(userGameData)
            }
          }
          // Don't throw error if user game data doesn't exist - it's optional
        } catch (userGameError) {
          console.warn('Failed to fetch user game data:', userGameError)
          // Continue without user game data
        }
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch game details'
      setError(errorMessage)
      console.error('Error fetching game details:', err)
    } finally {
      setLoading(false)
    }
  }, [gameId, isAuthenticated, user])

  const updateUserGame = useCallback(async (data: Partial<UserGame>) => {
    if (!isAuthenticated || !user || !gameId) {
      throw new Error('User must be authenticated to update game data')
    }

    try {
      const response = await fetch(`/api/games/${gameId}/user-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.error) {
        throw new Error(result.error)
      }

      setUserGame(result.data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update user game data'
      console.error('Error updating user game data:', err)
      throw new Error(errorMessage)
    }
  }, [gameId, isAuthenticated, user])

  const refetch = useCallback(async () => {
    await fetchGameDetail()
  }, [fetchGameDetail])

  // Initial fetch
  useEffect(() => {
    fetchGameDetail()
  }, [fetchGameDetail])

  return {
    game,
    userGame,
    loading,
    error,
    updateUserGame,
    refetch
  }
}
