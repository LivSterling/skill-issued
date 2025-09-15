import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import type { UseUserGameParams, UseUserGameReturn, UserGameStatus, UserGameUpdateData } from '@/lib/types/game-types'
import type { UserGame } from '@/lib/database/types'

// ============================================================================
// CONFIGURATION
// ============================================================================

const USER_GAME_CONFIG = {
  // Cache duration for user game data
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
  
  // Auto-save delay for temporary changes
  AUTO_SAVE_DELAY: 2000, // 2 seconds
  
  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  
  // Validation
  MAX_REVIEW_LENGTH: 2000,
  MIN_REVIEW_LENGTH: 10,
  MAX_HOURS_PLAYED: 10000
} as const

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

interface UserGameCacheEntry {
  data: UserGame | null
  timestamp: number
  gameId: number
  userId: string
}

// Global cache for user game data
const userGameCache = new Map<string, UserGameCacheEntry>()

function generateCacheKey(gameId: number, userId: string): string {
  return `user-game:${userId}:${gameId}`
}

function isCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < USER_GAME_CONFIG.CACHE_DURATION
}

// ============================================================================
// ENHANCED HOOK
// ============================================================================

export function useUserGame({ 
  gameId, 
  userId,
  enableAutoSave = false,
  enableCache = true,
  onStatusChange,
  onRatingChange,
  onReviewChange
}: UseUserGameParams): UseUserGameReturn {
  const { user, isAuthenticated } = useAuth()
  const { toast } = useToast()
  
  // State management
  const [userGame, setUserGame] = useState<UserGame | null>(null)
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Optimistic updates and local state
  const [localChanges, setLocalChanges] = useState<Partial<UserGameUpdateData>>({})
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  
  // Auto-save functionality
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>()
  const retryCountRef = useRef(0)
  const abortControllerRef = useRef<AbortController>()
  
  const targetUserId = userId || user?.id

  // ============================================================================
  // CORE FETCH FUNCTIONALITY
  // ============================================================================
  
  const fetchUserGame = useCallback(async (skipCache = false) => {
    if (!targetUserId || !gameId) return

    // Check cache first
    if (enableCache && !skipCache) {
      const cacheKey = generateCacheKey(gameId, targetUserId)
      const cached = userGameCache.get(cacheKey)
      
      if (cached && isCacheValid(cached.timestamp)) {
        setUserGame(cached.data)
        return cached.data
      }
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/games/${gameId}/user-data`, {
        signal,
        headers: {
          'Cache-Control': skipCache ? 'no-cache' : 'max-age=300'
        }
      })
      
      if (signal.aborted) return null
      
      if (!response.ok) {
        if (response.status === 404) {
          const result = null
          setUserGame(result)
          
          // Cache the null result
          if (enableCache) {
            const cacheKey = generateCacheKey(gameId, targetUserId)
            userGameCache.set(cacheKey, {
              data: result,
              timestamp: Date.now(),
              gameId,
              userId: targetUserId
            })
          }
          
          return result
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const responseData = await response.json()
      const result = responseData.success ? responseData.data : responseData
      
      setUserGame(result)
      
      // Cache the result
      if (enableCache) {
        const cacheKey = generateCacheKey(gameId, targetUserId)
        userGameCache.set(cacheKey, {
          data: result,
          timestamp: Date.now(),
          gameId,
          userId: targetUserId
        })
      }
      
      return result

    } catch (err: any) {
      if (signal.aborted) return null
      
      const errorMessage = err.message || 'Failed to fetch user game data'
      setError(errorMessage)
      console.error('Error fetching user game:', err)
      return null
    } finally {
      if (!signal.aborted) {
        setLoading(false)
      }
    }
  }, [gameId, targetUserId, enableCache])

  // ============================================================================
  // UPDATE FUNCTIONALITY WITH OPTIMISTIC UPDATES
  // ============================================================================
  
  const performUpdate = useCallback(async (data: UserGameUpdateData, showToast = true) => {
    if (!isAuthenticated || !user || !gameId) {
      throw new Error('User must be authenticated to update game data')
    }

    setUpdating(true)
    setError(null)
    
    // Store original data for rollback
    const originalUserGame = userGame
    const originalLocalChanges = { ...localChanges }
    
    try {
      // Optimistic update
      const optimisticUpdate = {
        ...userGame,
        ...data,
        updated_at: new Date().toISOString()
      } as UserGame
      
      setUserGame(optimisticUpdate)
      setLocalChanges({})
      setHasUnsavedChanges(false)
      
      // Update cache optimistically
      if (enableCache) {
        const cacheKey = generateCacheKey(gameId, user.id)
        userGameCache.set(cacheKey, {
          data: optimisticUpdate,
          timestamp: Date.now(),
          gameId,
          userId: user.id
        })
      }
      
      retryCountRef.current = 0
      
      const updateWithRetry = async (): Promise<UserGame> => {
        try {
          const response = await fetch(`/api/games/${gameId}/user-data`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache'
            },
            body: JSON.stringify(data)
          })

          if (!response.ok) {
            if (response.status === 429) {
              throw new Error('Too many requests. Please wait a moment.')
            }
            
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
          }

          const result = await response.json()
          
          if (!result.success) {
            throw new Error(result.error || 'Update failed')
          }

          return result.data
          
        } catch (error: any) {
          retryCountRef.current++
          
          if (retryCountRef.current <= USER_GAME_CONFIG.MAX_RETRIES) {
            console.warn(`Update attempt ${retryCountRef.current} failed, retrying...`, error)
            await new Promise(resolve => 
              setTimeout(resolve, USER_GAME_CONFIG.RETRY_DELAY * retryCountRef.current)
            )
            return updateWithRetry()
          }
          
          throw error
        }
      }
      
      const updatedUserGame = await updateWithRetry()
      
      // Update with server response
      setUserGame(updatedUserGame)
      
      // Update cache with server data
      if (enableCache) {
        const cacheKey = generateCacheKey(gameId, user.id)
        userGameCache.set(cacheKey, {
          data: updatedUserGame,
          timestamp: Date.now(),
          gameId,
          userId: user.id
        })
      }
      
      // Trigger callbacks
      if (data.status && onStatusChange) {
        onStatusChange(data.status, updatedUserGame)
      }
      if (data.user_rating !== undefined && onRatingChange) {
        onRatingChange(data.user_rating, updatedUserGame)
      }
      if (data.review && onReviewChange) {
        onReviewChange(data.review, updatedUserGame)
      }
      
      if (showToast) {
        toast({
          title: 'Game Updated',
          description: 'Your game data has been saved successfully.',
          variant: 'default'
        })
      }
      
      return updatedUserGame
      
    } catch (err: any) {
      // Rollback optimistic update
      setUserGame(originalUserGame)
      setLocalChanges(originalLocalChanges)
      setHasUnsavedChanges(Object.keys(originalLocalChanges).length > 0)
      
      // Rollback cache
      if (enableCache && originalUserGame) {
        const cacheKey = generateCacheKey(gameId, user.id)
        userGameCache.set(cacheKey, {
          data: originalUserGame,
          timestamp: Date.now(),
          gameId,
          userId: user.id
        })
      }
      
      const errorMessage = err.message || 'Failed to update user game data'
      setError(errorMessage)
      
      if (showToast) {
        toast({
          title: 'Update Failed',
          description: errorMessage,
          variant: 'destructive'
        })
      }
      
      throw new Error(errorMessage)
    } finally {
      setUpdating(false)
    }
  }, [gameId, user, userGame, localChanges, enableCache, onStatusChange, onRatingChange, onReviewChange, toast, isAuthenticated])

  const updateUserGame = useCallback(async (data: UserGameUpdateData) => {
    return performUpdate(data, true)
  }, [performUpdate])

  // ============================================================================
  // AUTO-SAVE FUNCTIONALITY
  // ============================================================================
  
  const scheduleAutoSave = useCallback(() => {
    if (!enableAutoSave || !hasUnsavedChanges) return
    
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }
    
    autoSaveTimeoutRef.current = setTimeout(async () => {
      if (hasUnsavedChanges && Object.keys(localChanges).length > 0) {
        try {
          await performUpdate(localChanges, false)
          console.log('Auto-saved user game data')
        } catch (error) {
          console.warn('Auto-save failed:', error)
        }
      }
    }, USER_GAME_CONFIG.AUTO_SAVE_DELAY)
  }, [enableAutoSave, hasUnsavedChanges, localChanges, performUpdate])
  
  // ============================================================================
  // CONVENIENT UPDATE METHODS
  // ============================================================================
  
  const updateStatus = useCallback(async (status: UserGameStatus) => {
    const data: UserGameUpdateData = { status }
    
    // Auto-complete when status is set to completed
    if (status === 'completed') {
      data.completed = true
    }
    
    return updateUserGame(data)
  }, [updateUserGame])
  
  const updateRating = useCallback(async (rating: number | null) => {
    if (rating !== null && (rating < 0 || rating > 5)) {
      throw new Error('Rating must be between 0 and 5')
    }
    
    return updateUserGame({ user_rating: rating })
  }, [updateUserGame])
  
  const updateDifficulty = useCallback(async (difficulty: number | null) => {
    if (difficulty !== null && (difficulty < 1 || difficulty > 5)) {
      throw new Error('Difficulty must be between 1 and 5')
    }
    
    return updateUserGame({ difficulty_rating: difficulty })
  }, [updateUserGame])
  
  const updateHoursPlayed = useCallback(async (hours: number) => {
    if (hours < 0 || hours > USER_GAME_CONFIG.MAX_HOURS_PLAYED) {
      throw new Error(`Hours played must be between 0 and ${USER_GAME_CONFIG.MAX_HOURS_PLAYED}`)
    }
    
    return updateUserGame({ hours_played: hours })
  }, [updateUserGame])
  
  const updateReview = useCallback(async (review: string | null) => {
    if (review && (review.length < USER_GAME_CONFIG.MIN_REVIEW_LENGTH || review.length > USER_GAME_CONFIG.MAX_REVIEW_LENGTH)) {
      throw new Error(`Review must be between ${USER_GAME_CONFIG.MIN_REVIEW_LENGTH} and ${USER_GAME_CONFIG.MAX_REVIEW_LENGTH} characters`)
    }
    
    return updateUserGame({ review })
  }, [updateUserGame])
  
  const toggleFavorite = useCallback(async () => {
    const newFavoriteStatus = !userGame?.is_favorite
    return updateUserGame({ is_favorite: newFavoriteStatus })
  }, [userGame?.is_favorite, updateUserGame])
  
  const toggleCompleted = useCallback(async () => {
    const newCompletedStatus = !userGame?.completed
    const data: UserGameUpdateData = { completed: newCompletedStatus }
    
    // Auto-update status when marking as completed
    if (newCompletedStatus && userGame?.status !== 'completed') {
      data.status = 'completed'
    }
    
    return updateUserGame(data)
  }, [userGame?.completed, userGame?.status, updateUserGame])
  
  // ============================================================================
  // LOCAL STATE MANAGEMENT
  // ============================================================================
  
  const updateLocalState = useCallback((changes: Partial<UserGameUpdateData>) => {
    setLocalChanges(prev => ({ ...prev, ...changes }))
    setHasUnsavedChanges(true)
    
    if (enableAutoSave) {
      scheduleAutoSave()
    }
  }, [enableAutoSave, scheduleAutoSave])
  
  const discardLocalChanges = useCallback(() => {
    setLocalChanges({})
    setHasUnsavedChanges(false)
    
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }
  }, [])
  
  const saveLocalChanges = useCallback(async () => {
    if (!hasUnsavedChanges || Object.keys(localChanges).length === 0) return
    
    return performUpdate(localChanges, true)
  }, [hasUnsavedChanges, localChanges, performUpdate])

  // ============================================================================
  // DELETE FUNCTIONALITY
  // ============================================================================
  
  const deleteUserGame = useCallback(async () => {
    if (!isAuthenticated || !user || !gameId) {
      throw new Error('User must be authenticated to delete game data')
    }

    setError(null)

    try {
      const response = await fetch(`/api/games/${gameId}/user-data`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      setUserGame(null)
      setLocalChanges({})
      setHasUnsavedChanges(false)
      
      // Clear cache
      if (enableCache) {
        const cacheKey = generateCacheKey(gameId, user.id)
        userGameCache.delete(cacheKey)
      }
      
      toast({
        title: 'Game Removed',
        description: 'Game has been removed from your library.',
        variant: 'default'
      })
      
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to delete user game data'
      setError(errorMessage)
      
      toast({
        title: 'Delete Failed',
        description: errorMessage,
        variant: 'destructive'
      })
      
      throw new Error(errorMessage)
    }
  }, [gameId, user, enableCache, toast, isAuthenticated])

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================
  
  const refetch = useCallback(async () => {
    return fetchUserGame(true) // Skip cache
  }, [fetchUserGame])
  
  const isInLibrary = useCallback(() => {
    return userGame !== null
  }, [userGame])
  
  const getEffectiveData = useCallback(() => {
    if (!userGame) return null
    return { ...userGame, ...localChanges }
  }, [userGame, localChanges])
  
  const getCompletionPercentage = useCallback(() => {
    if (!userGame?.hours_played) return 0
    
    // This is a rough estimate - could be enhanced with game-specific data
    const averageCompletionTime = 20 // hours
    return Math.min(100, (userGame.hours_played / averageCompletionTime) * 100)
  }, [userGame?.hours_played])

  // ============================================================================
  // EFFECTS
  // ============================================================================
  
  // Initial fetch
  useEffect(() => {
    fetchUserGame()
  }, [fetchUserGame])
  
  // Auto-save effect
  useEffect(() => {
    if (enableAutoSave && hasUnsavedChanges) {
      scheduleAutoSave()
    }
  }, [enableAutoSave, hasUnsavedChanges, scheduleAutoSave])
  
  // Cleanup
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // ============================================================================
  // RETURN INTERFACE
  // ============================================================================
  
  return {
    // Core data
    userGame: getEffectiveData(),
    loading,
    updating,
    error,
    
    // Local state
    localChanges,
    hasUnsavedChanges,
    
    // Core operations
    updateUserGame,
    deleteUserGame,
    refetch,
    
    // Convenient update methods
    updateStatus,
    updateRating,
    updateDifficulty,
    updateHoursPlayed,
    updateReview,
    toggleFavorite,
    toggleCompleted,
    
    // Local state management
    updateLocalState,
    discardLocalChanges,
    saveLocalChanges,
    
    // Utility methods
    isInLibrary,
    getEffectiveData,
    getCompletionPercentage
  }
}
