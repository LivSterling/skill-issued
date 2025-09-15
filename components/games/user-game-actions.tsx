'use client'

import React, { useState, useRef, useEffect } from 'react'
import { 
  Heart, 
  Star, 
  Clock, 
  Check, 
  Play, 
  Pause, 
  X, 
  Eye, 
  Bookmark,
  MoreHorizontal,
  Edit,
  Trash2,
  Save,
  Loader2,
  AlertCircle,
  Trophy,
  Target,
  MessageSquare
} from 'lucide-react'
import { useUserGame } from '@/hooks/use-user-game'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { UserGameStatus, GameDisplayData } from '@/lib/types/game-types'
import type { UserGame } from '@/lib/database/types'

// ============================================================================
// COMPONENT INTERFACES
// ============================================================================

export interface UserGameActionsProps {
  game: GameDisplayData
  className?: string
  variant?: 'compact' | 'full' | 'inline'
  showLabels?: boolean
  enableAutoSave?: boolean
  onStatusChange?: (status: UserGameStatus, userGame: UserGame) => void
  onRatingChange?: (rating: number | null, userGame: UserGame) => void
  onReviewChange?: (review: string | null, userGame: UserGame) => void
  onGameRemoved?: () => void
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const STATUS_CONFIG = {
  want_to_play: {
    label: 'Want to Play',
    icon: Bookmark,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 hover:bg-blue-100',
    description: 'Add to your wishlist'
  },
  playing: {
    label: 'Playing',
    icon: Play,
    color: 'text-green-500',
    bgColor: 'bg-green-50 hover:bg-green-100',
    description: 'Currently playing'
  },
  completed: {
    label: 'Completed',
    icon: Check,
    color: 'text-purple-500',
    bgColor: 'bg-purple-50 hover:bg-purple-100',
    description: 'Finished the game'
  },
  dropped: {
    label: 'Dropped',
    icon: X,
    color: 'text-red-500',
    bgColor: 'bg-red-50 hover:bg-red-100',
    description: 'Stopped playing'
  },
  on_hold: {
    label: 'On Hold',
    icon: Pause,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-50 hover:bg-yellow-100',
    description: 'Paused for now'
  }
} as const

const DIFFICULTY_LABELS = {
  1: 'Very Easy',
  2: 'Easy', 
  3: 'Normal',
  4: 'Hard',
  5: 'Very Hard'
} as const

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function UserGameActions({
  game,
  className,
  variant = 'full',
  showLabels = true,
  enableAutoSave = false,
  onStatusChange,
  onRatingChange,
  onReviewChange,
  onGameRemoved
}: UserGameActionsProps) {
  // ============================================================================
  // HOOKS AND STATE
  // ============================================================================
  
  const {
    userGame,
    loading,
    updating,
    error,
    hasUnsavedChanges,
    updateStatus,
    updateRating,
    updateDifficulty,
    updateHoursPlayed,
    updateReview,
    toggleFavorite,
    toggleCompleted,
    deleteUserGame,
    updateLocalState,
    discardLocalChanges,
    saveLocalChanges,
    isInLibrary,
    getEffectiveData,
    getCompletionPercentage
  } = useUserGame({
    gameId: game.id,
    enableAutoSave,
    onStatusChange,
    onRatingChange,
    onReviewChange
  })
  
  // Local UI state
  const [isEditing, setIsEditing] = useState(false)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [localReview, setLocalReview] = useState('')
  const [localHours, setLocalHours] = useState('')
  const [showMoreActions, setShowMoreActions] = useState(false)
  
  // Refs for form handling
  const reviewTextareaRef = useRef<HTMLTextAreaElement>(null)
  const hoursInputRef = useRef<HTMLInputElement>(null)
  
  // Get effective user game data (including local changes)
  const effectiveUserGame = getEffectiveData()
  const completionPercentage = getCompletionPercentage()
  
  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  const handleStatusChange = async (status: UserGameStatus) => {
    try {
      await updateStatus(status)
      setShowMoreActions(false)
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }
  
  const handleRatingChange = async (rating: number) => {
    try {
      const newRating = effectiveUserGame?.user_rating === rating ? null : rating
      await updateRating(newRating)
    } catch (error) {
      console.error('Failed to update rating:', error)
    }
  }
  
  const handleDifficultyChange = async (difficulty: number) => {
    try {
      const newDifficulty = effectiveUserGame?.difficulty_rating === difficulty ? null : difficulty
      await updateDifficulty(newDifficulty)
    } catch (error) {
      console.error('Failed to update difficulty:', error)
    }
  }
  
  const handleHoursChange = async () => {
    const hours = parseFloat(localHours)
    if (isNaN(hours) || hours < 0) return
    
    try {
      await updateHoursPlayed(hours)
      setLocalHours('')
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to update hours:', error)
    }
  }
  
  const handleReviewSubmit = async () => {
    try {
      await updateReview(localReview.trim() || null)
      setLocalReview('')
      setShowReviewForm(false)
    } catch (error) {
      console.error('Failed to update review:', error)
    }
  }
  
  const handleToggleFavorite = async () => {
    try {
      await toggleFavorite()
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
    }
  }
  
  const handleRemoveGame = async () => {
    try {
      await deleteUserGame()
      onGameRemoved?.()
    } catch (error) {
      console.error('Failed to remove game:', error)
    }
  }
  
  const handleSaveLocalChanges = async () => {
    try {
      await saveLocalChanges()
    } catch (error) {
      console.error('Failed to save changes:', error)
    }
  }
  
  // ============================================================================
  // EFFECTS
  // ============================================================================
  
  // Initialize local state when user game data changes
  useEffect(() => {
    if (effectiveUserGame) {
      setLocalReview(effectiveUserGame.review || '')
      setLocalHours(effectiveUserGame.hours_played?.toString() || '')
    }
  }, [effectiveUserGame])
  
  // Auto-focus review textarea when opened
  useEffect(() => {
    if (showReviewForm && reviewTextareaRef.current) {
      reviewTextareaRef.current.focus()
    }
  }, [showReviewForm])
  
  // ============================================================================
  // RENDER HELPERS
  // ============================================================================
  
  const renderStatusButtons = () => {
    const currentStatus = effectiveUserGame?.status
    
    if (variant === 'compact') {
      return (
        <Popover open={showMoreActions} onOpenChange={setShowMoreActions}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              {currentStatus ? (
                <>
                  {React.createElement(STATUS_CONFIG[currentStatus].icon, { className: "h-4 w-4" })}
                  {showLabels && STATUS_CONFIG[currentStatus].label}
                </>
              ) : (
                <>
                  <Bookmark className="h-4 w-4" />
                  {showLabels && 'Add to Library'}
                </>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2">
            <div className="space-y-1">
              {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                <Button
                  key={status}
                  variant={currentStatus === status ? "default" : "ghost"}
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={() => handleStatusChange(status as UserGameStatus)}
                  disabled={updating}
                >
                  <config.icon className="h-4 w-4" />
                  {config.label}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )
    }
    
    return (
      <div className="flex flex-wrap gap-2">
        {Object.entries(STATUS_CONFIG).map(([status, config]) => (
          <TooltipProvider key={status}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={currentStatus === status ? "default" : "outline"}
                  size={variant === 'inline' ? "sm" : "default"}
                  className={cn(
                    "gap-2 transition-colors",
                    currentStatus === status ? "" : config.bgColor
                  )}
                  onClick={() => handleStatusChange(status as UserGameStatus)}
                  disabled={updating}
                >
                  <config.icon className="h-4 w-4" />
                  {showLabels && config.label}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{config.description}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
    )
  }
  
  const renderRatingStars = () => (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((rating) => (
        <button
          key={rating}
          onClick={() => handleRatingChange(rating)}
          disabled={updating}
          className={cn(
            "p-1 rounded transition-colors hover:bg-muted",
            updating && "opacity-50 cursor-not-allowed"
          )}
        >
          <Star
            className={cn(
              "h-5 w-5 transition-colors",
              effectiveUserGame?.user_rating && rating <= effectiveUserGame.user_rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground hover:text-yellow-400"
            )}
          />
        </button>
      ))}
      {effectiveUserGame?.user_rating && (
        <span className="ml-2 text-sm text-muted-foreground">
          {effectiveUserGame.user_rating}/5
        </span>
      )}
    </div>
  )
  
  const renderDifficultyRating = () => (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Difficulty</Label>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((difficulty) => (
          <button
            key={difficulty}
            onClick={() => handleDifficultyChange(difficulty)}
            disabled={updating}
            className={cn(
              "p-1 rounded transition-colors hover:bg-muted",
              updating && "opacity-50 cursor-not-allowed"
            )}
          >
            <Target
              className={cn(
                "h-4 w-4 transition-colors",
                effectiveUserGame?.difficulty_rating && difficulty <= effectiveUserGame.difficulty_rating
                  ? "fill-red-400 text-red-400"
                  : "text-muted-foreground hover:text-red-400"
              )}
            />
          </button>
        ))}
        {effectiveUserGame?.difficulty_rating && (
          <span className="ml-2 text-sm text-muted-foreground">
            {DIFFICULTY_LABELS[effectiveUserGame.difficulty_rating as keyof typeof DIFFICULTY_LABELS]}
          </span>
        )}
      </div>
    </div>
  )
  
  const renderHoursPlayed = () => (
    <div className="space-y-2">
      <Label className="text-sm font-medium flex items-center gap-2">
        <Clock className="h-4 w-4" />
        Hours Played
      </Label>
      <div className="flex items-center gap-2">
        {isEditing ? (
          <>
            <Input
              ref={hoursInputRef}
              type="number"
              min="0"
              max="10000"
              step="0.5"
              value={localHours}
              onChange={(e) => setLocalHours(e.target.value)}
              className="w-24"
              placeholder="0"
            />
            <Button size="sm" onClick={handleHoursChange} disabled={updating}>
              <Save className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
              <X className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <>
            <span className="text-lg font-semibold">
              {effectiveUserGame?.hours_played || 0}h
            </span>
            <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
      {completionPercentage > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Progress</span>
            <span>{Math.round(completionPercentage)}%</span>
          </div>
          <Progress value={completionPercentage} className="h-2" />
        </div>
      )}
    </div>
  )
  
  const renderReviewSection = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Review
        </Label>
        {!showReviewForm && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowReviewForm(true)}
          >
            {effectiveUserGame?.review ? <Edit className="h-4 w-4" /> : 'Add Review'}
          </Button>
        )}
      </div>
      
      {showReviewForm ? (
        <div className="space-y-3">
          <Textarea
            ref={reviewTextareaRef}
            value={localReview}
            onChange={(e) => setLocalReview(e.target.value)}
            placeholder="Share your thoughts about this game..."
            className="min-h-24"
            maxLength={2000}
          />
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              {localReview.length}/2000 characters
            </span>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleReviewSubmit} disabled={updating}>
                {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowReviewForm(false)
                  setLocalReview(effectiveUserGame?.review || '')
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : effectiveUserGame?.review ? (
        <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
          {effectiveUserGame.review}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground italic">
          No review yet
        </div>
      )}
    </div>
  )
  
  const renderQuickActions = () => (
    <div className="flex items-center gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleFavorite}
              disabled={updating}
              className={cn(
                "gap-2",
                effectiveUserGame?.is_favorite && "text-red-500 border-red-200 bg-red-50"
              )}
            >
              <Heart
                className={cn(
                  "h-4 w-4",
                  effectiveUserGame?.is_favorite && "fill-current"
                )}
              />
              {showLabels && (effectiveUserGame?.is_favorite ? 'Favorited' : 'Favorite')}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{effectiveUserGame?.is_favorite ? 'Remove from favorites' : 'Add to favorites'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      {effectiveUserGame?.status !== 'completed' && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleCompleted}
                disabled={updating}
                className="gap-2"
              >
                <Trophy className="h-4 w-4" />
                {showLabels && 'Mark Complete'}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Mark as completed</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  )
  
  const renderUnsavedChanges = () => {
    if (!hasUnsavedChanges) return null
    
    return (
      <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-center gap-2 text-sm text-yellow-800">
          <AlertCircle className="h-4 w-4" />
          You have unsaved changes
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSaveLocalChanges} disabled={updating}>
            {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
          </Button>
          <Button size="sm" variant="outline" onClick={discardLocalChanges}>
            Discard
          </Button>
        </div>
      </div>
    )
  }
  
  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  
  if (loading && !userGame) {
    return (
      <div className={cn("flex items-center justify-center p-4", className)}>
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }
  
  if (error) {
    return (
      <div className={cn("p-4 text-center text-red-500 text-sm", className)}>
        <AlertCircle className="h-5 w-5 mx-auto mb-2" />
        Failed to load game data
      </div>
    )
  }
  
  if (variant === 'inline') {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {renderStatusButtons()}
        <Button
          variant="outline"
          size="sm"
          onClick={handleToggleFavorite}
          disabled={updating}
        >
          <Heart
            className={cn(
              "h-4 w-4",
              effectiveUserGame?.is_favorite && "fill-red-500 text-red-500"
            )}
          />
        </Button>
      </div>
    )
  }
  
  if (variant === 'compact') {
    return (
      <div className={cn("space-y-3", className)}>
        {renderUnsavedChanges()}
        
        <div className="flex items-center justify-between">
          {renderStatusButtons()}
          {isInLibrary() && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleFavorite}
                disabled={updating}
              >
                <Heart
                  className={cn(
                    "h-4 w-4",
                    effectiveUserGame?.is_favorite && "fill-red-500 text-red-500"
                  )}
                />
              </Button>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2">
                  <div className="space-y-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start gap-2"
                      onClick={() => setShowReviewForm(true)}
                    >
                      <MessageSquare className="h-4 w-4" />
                      {effectiveUserGame?.review ? 'Edit Review' : 'Add Review'}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start gap-2 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                          Remove Game
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove Game</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will remove "{game.name}" from your library. All your data for this game will be deleted.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleRemoveGame}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>
        
        {isInLibrary() && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Rating</span>
              {renderRatingStars()}
            </div>
            
            {effectiveUserGame?.hours_played !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Hours Played</span>
                <span className="text-sm">{effectiveUserGame.hours_played}h</span>
              </div>
            )}
          </div>
        )}
        
        {showReviewForm && (
          <div className="mt-4">
            {renderReviewSection()}
          </div>
        )}
      </div>
    )
  }
  
  // Full variant
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Game Library</span>
          {isInLibrary() && (
            <Badge variant={effectiveUserGame?.is_favorite ? "default" : "outline"}>
              {effectiveUserGame?.is_favorite ? 'Favorite' : 'In Library'}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {renderUnsavedChanges()}
        
        {/* Status Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Status</Label>
          {renderStatusButtons()}
        </div>
        
        {isInLibrary() && (
          <>
            <Separator />
            
            {/* Rating */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Your Rating</Label>
              {renderRatingStars()}
            </div>
            
            <Separator />
            
            {/* Difficulty */}
            {renderDifficultyRating()}
            
            <Separator />
            
            {/* Hours Played */}
            {renderHoursPlayed()}
            
            <Separator />
            
            {/* Review */}
            {renderReviewSection()}
            
            <Separator />
            
            {/* Quick Actions */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Quick Actions</Label>
              {renderQuickActions()}
            </div>
            
            <Separator />
            
            {/* Remove Game */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full text-red-600 hover:text-red-700">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove from Library
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove Game</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove "{game.name}" from your library. All your data for this game (rating, review, hours played, etc.) will be permanently deleted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleRemoveGame}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Remove Game
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </CardContent>
    </Card>
  )
}
