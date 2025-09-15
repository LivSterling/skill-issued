"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Game, UserGame } from "@/lib/database/types"
import { useAuth } from "@/hooks/use-auth"
import { 
  Star, 
  Clock, 
  Trophy, 
  Heart, 
  Plus, 
  Check 
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { 
  transformGameForDisplay, 
  getUserGameStatusLabel, 
  formatGameRating, 
  formatGamePlaytime, 
  getTruncatedList,
  hasUserGameData 
} from "@/lib/utils/game-utils"
import type { GameCardProps, UserGameAction } from "@/lib/types/game-types"

export function GameCard({ 
  game, 
  userGame, 
  viewMode = "grid", 
  onUserAction,
  className = "",
  compact = false
}: GameCardProps) {
  const { isAuthenticated } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  // Handle user actions (wishlist, played, etc.)
  const handleUserAction = async (action: UserGameAction) => {
    if (!isAuthenticated || !onUserAction) return
    
    setIsLoading(true)
    try {
      await onUserAction(action, game.id)
    } finally {
      setIsLoading(false)
    }
  }

  // Format game data for display using utility function
  const baseDisplayData = transformGameForDisplay(game)
  const displayData = {
    ...baseDisplayData,
    genres: getTruncatedList(baseDisplayData.genres, 2),
    platforms: getTruncatedList(baseDisplayData.platforms, 3),
    developers: getTruncatedList(baseDisplayData.developers, 2)
  }

  // Get user-specific data
  const userStatus = userGame?.status || null
  const userRating = userGame?.user_rating || null
  const isInLibrary = hasUserGameData(userGame)
  const isFavorite = userGame?.is_favorite || false
  const userStatusLabel = getUserGameStatusLabel(userStatus)

  if (viewMode === "list") {
    return (
      <Card className={`group cursor-pointer bg-card border-border hover:border-primary transition-colors ${className}`}>
        <Link href={`/games/${game.id}`}>
          <div className="flex gap-4 p-4">
            <div className="w-20 h-28 bg-muted rounded overflow-hidden flex-shrink-0">
              <img
                src={displayData.image}
                alt={displayData.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-lg mb-1 line-clamp-1">{displayData.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {displayData.year && `${displayData.year} • `}
                    {displayData.developers.join(", ")}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  {displayData.rating > 0 && (
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-primary text-primary" />
                      <span>{formatGameRating(displayData.rating)}</span>
                    </div>
                  )}
                  {displayData.metacritic && (
                    <div className="flex items-center gap-1">
                      <Trophy className="w-4 h-4 text-secondary" />
                      <span>{displayData.metacritic}</span>
                    </div>
                  )}
                  {displayData.playtime > 0 && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{formatGamePlaytime(displayData.playtime)}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {displayData.genres.map((genre, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {genre}
                    </Badge>
                  ))}
                  
                  {/* User status badge for authenticated users */}
                  {isAuthenticated && userStatusLabel && (
                    <Badge variant="secondary" className="text-xs">
                      {userStatusLabel}
                    </Badge>
                  )}
                </div>
                
                {/* User actions for authenticated users - hidden in compact mode */}
                {isAuthenticated && !compact && (
                  <div className="flex items-center gap-2" onClick={(e) => e.preventDefault()}>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8"
                      onClick={() => handleUserAction('wishlist')}
                      disabled={isLoading}
                    >
                      <Heart className={`w-4 h-4 mr-1 ${isFavorite ? 'fill-current' : ''}`} />
                      Wishlist
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8"
                      onClick={() => handleUserAction('library')}
                      disabled={isLoading}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add to List
                    </Button>
                    {isInLibrary && (
                      <Button 
                        size="sm" 
                        className="h-8"
                        onClick={() => handleUserAction('played')}
                        disabled={isLoading}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Played
                      </Button>
                    )}
                  </div>
                )}
                
                {/* Compact mode - show only quick action buttons */}
                {isAuthenticated && compact && (
                  <div className="flex items-center gap-1" onClick={(e) => e.preventDefault()}>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0"
                      onClick={() => handleUserAction('wishlist')}
                      disabled={isLoading}
                      title={isFavorite ? "Remove from Wishlist" : "Add to Wishlist"}
                    >
                      <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0"
                      onClick={() => handleUserAction('library')}
                      disabled={isLoading}
                      title="Add to Library"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Link>
      </Card>
    )
  }

  // Grid view (default)
  return (
    <Card className={`group cursor-pointer bg-card border-border hover:border-primary transition-all duration-300 ${className}`}>
      <Link href={`/games/${game.id}`}>
        <div className="aspect-[2/3] bg-muted rounded-t-lg overflow-hidden relative">
          <img
            src={displayData.image}
            alt={displayData.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          {displayData.year && (
            <div className="absolute top-2 right-2">
              <Badge variant="secondary" className="bg-secondary/90 text-secondary-foreground">
                {displayData.year}
              </Badge>
            </div>
          )}
          <div className="absolute bottom-2 left-2 flex gap-1">
            {displayData.genres.slice(0, 1).map((genre, index) => (
              <Badge key={index} variant="outline" className="bg-background/90 text-xs">
                {genre}
              </Badge>
            ))}
          </div>
        </div>
        <div className="p-3">
          <h3 className="font-semibold text-sm mb-2 line-clamp-2">{displayData.title}</h3>
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            {displayData.rating > 0 && (
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-primary text-primary" />
                <span>{formatGameRating(displayData.rating)}</span>
              </div>
            )}
            {displayData.metacritic && (
              <div className="flex items-center gap-1">
                <Trophy className="w-3 h-3 text-secondary" />
                <span>{displayData.metacritic}</span>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            {displayData.playtime > 0 && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{formatGamePlaytime(displayData.playtime)}</span>
              </div>
            )}
            
            {/* User-specific actions for authenticated users */}
            {isAuthenticated && (
              <div className="flex items-center gap-1" onClick={(e) => e.preventDefault()}>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0"
                  onClick={() => handleUserAction('wishlist')}
                  disabled={isLoading}
                >
                  <Heart className={`w-3 h-3 ${isFavorite ? 'fill-current' : ''}`} />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0"
                  onClick={() => handleUserAction('library')}
                  disabled={isLoading}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
          
          {/* User status badge for authenticated users */}
          {isAuthenticated && userStatus && (
            <div className="mt-2">
              <Badge variant="outline" className="text-xs">
                {userStatusLabel}
              </Badge>
            </div>
          )}
          
          {/* User rating display */}
          {isAuthenticated && userRating && (
            <div className="mt-2 flex items-center gap-1">
              <Star className="w-3 h-3 fill-primary text-primary" />
              <span className="text-xs text-muted-foreground">Your rating: {userRating}/5</span>
            </div>
          )}
        </div>
      </Link>
    </Card>
  )
}
