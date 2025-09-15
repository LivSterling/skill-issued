"use client"

import { GameCard } from "./game-card"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertCircle, Loader2 } from "lucide-react"
import type { GameListProps } from "@/lib/types/game-types"

export function GameList({
  games,
  userGames = [],
  loading = false,
  error = null,
  onUserAction,
  onRetry,
  onLoadMore,
  hasMore = false,
  loadingMore = false,
  className = "",
  emptyMessage = "No games found",
  showIndex = false,
  compact = false
}: GameListProps) {
  // Create a map of user games for quick lookup
  const userGameMap = new Map(
    userGames.map(ug => [ug.game_id, ug])
  )

  // Loading skeleton
  const LoadingSkeleton = ({ count }: { count: number }) => (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-4 p-4 bg-card rounded-lg border">
          <Skeleton className="w-20 h-28 flex-shrink-0 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex items-center gap-4">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
            </div>
            {!compact && <Skeleton className="h-4 w-full" />}
          </div>
        </div>
      ))}
    </div>
  )

  // Error state
  if (error && games.length === 0) {
    return (
      <div className="text-center py-12">
        <Alert className="max-w-md mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
            {onRetry && (
              <div className="mt-4">
                <Button variant="outline" onClick={onRetry}>
                  Try Again
                </Button>
              </div>
            )}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Loading state
  if (loading && games.length === 0) {
    return <LoadingSkeleton count={5} />
  }

  // Empty state
  if (!loading && games.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-lg mb-4">{emptyMessage}</p>
        {onRetry && (
          <Button variant="outline" onClick={onRetry}>
            Refresh
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Games List */}
      <div className={`space-y-4 ${className}`}>
        {games.map((game, index) => {
          const userGame = userGameMap.get(game.id)
          return (
            <div key={game.id} className="relative">
              {showIndex && (
                <div className="absolute left-0 top-4 -ml-8 text-sm text-muted-foreground font-medium">
                  {index + 1}
                </div>
              )}
              <GameCard
                game={game}
                userGame={userGame}
                viewMode="list"
                onUserAction={onUserAction}
                compact={compact}
              />
            </div>
          )
        })}
      </div>

      {/* Load More Button */}
      {hasMore && onLoadMore && (
        <div className="text-center">
          <Button 
            variant="outline" 
            size="lg" 
            className="border-border hover:border-primary bg-transparent"
            onClick={onLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              'Load More Games'
            )}
          </Button>
        </div>
      )}

      {/* Error message for additional loads */}
      {error && games.length > 0 && (
        <div className="text-center">
          <Alert className="max-w-md mx-auto">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
              {onRetry && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="ml-2"
                  onClick={onRetry}
                >
                  Try Again
                </Button>
              )}
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  )
}
