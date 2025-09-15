"use client"

import { GameCard } from "./game-card"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertCircle, Loader2 } from "lucide-react"
import type { GameGridProps } from "@/lib/types/game-types"

export function GameGrid({
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
  columns = {
    default: 2,
    md: 3,
    lg: 4,
    xl: 5,
    "2xl": 6
  }
}: GameGridProps) {
  // Create a map of user games for quick lookup
  const userGameMap = new Map(
    userGames.map(ug => [ug.game_id, ug])
  )

  // Generate grid classes based on columns prop
  const gridClasses = [
    `grid-cols-${columns.default}`,
    columns.sm && `sm:grid-cols-${columns.sm}`,
    columns.md && `md:grid-cols-${columns.md}`,
    columns.lg && `lg:grid-cols-${columns.lg}`,
    columns.xl && `xl:grid-cols-${columns.xl}`,
    columns["2xl"] && `2xl:grid-cols-${columns["2xl"]}`
  ].filter(Boolean).join(" ")

  // Loading skeleton
  const LoadingSkeleton = ({ count }: { count: number }) => (
    <div className={`grid gap-6 ${gridClasses} ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="group">
          <Skeleton className="aspect-[2/3] w-full rounded-lg mb-3" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-12" />
            </div>
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
    return <LoadingSkeleton count={columns.lg || columns.default || 4} />
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
    <div className="space-y-8">
      {/* Games Grid */}
      <div className={`grid gap-6 ${gridClasses} ${className}`}>
        {games.map((game) => {
          const userGame = userGameMap.get(game.id)
          return (
            <GameCard
              key={game.id}
              game={game}
              userGame={userGame}
              viewMode="grid"
              onUserAction={onUserAction}
            />
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
