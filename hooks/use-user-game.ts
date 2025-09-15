import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import type { UseUserGameParams, UseUserGameReturn } from '@/lib/types/game-types'
import type { UserGame } from '@/lib/database/types'

export function useUserGame({ gameId, userId }: UseUserGameParams): UseUserGameReturn {
  const { user } = useAuth()
  const [userGame, setUserGame] = useState<UserGame | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const targetUserId = userId || user?.id

  const fetchUserGame = useCallback(async () => {
    if (!targetUserId || !gameId) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/games/${gameId}/user-data`)
      
      if (!response.ok) {
        if (response.status === 404) {
          setUserGame(null)
          return
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      setUserGame(data)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch user game data'
      setError(errorMessage)
      console.error('Error fetching user game:', err)
    } finally {
      setLoading(false)
    }
  }, [gameId, targetUserId])

  const updateUserGame = useCallback(async (data: Partial<UserGame>) => {
    if (!user || !gameId) {
      throw new Error('User must be authenticated to update game data')
    }

    setError(null)

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
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [gameId, user])

  const deleteUserGame = useCallback(async () => {
    if (!user || !gameId) {
      throw new Error('User must be authenticated to delete game data')
    }

    setError(null)

    try {
      const response = await fetch(`/api/games/${gameId}/user-data`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      setUserGame(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete user game data'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [gameId, user])

  const refetch = useCallback(async () => {
    await fetchUserGame()
  }, [fetchUserGame])

  // Initial fetch
  useEffect(() => {
    fetchUserGame()
  }, [fetchUserGame])

  return {
    userGame,
    loading,
    error,
    updateUserGame,
    deleteUserGame,
    refetch
  }
}
