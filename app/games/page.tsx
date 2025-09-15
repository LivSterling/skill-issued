"use client"

import { useState, useCallback } from "react"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/hooks/use-auth"
import { useGames } from "@/hooks/use-games"
import { GameGrid, GameList } from "@/components/games"
import { 
  Star, 
  Clock, 
  Trophy, 
  Filter, 
  Grid, 
  List, 
  ChevronRight, 
  Plus, 
  Heart, 
  Check, 
  Eye, 
  User,
  Gamepad2,
  TrendingUp,
  AlertCircle,
  Loader2
} from "lucide-react"
import Link from "next/link"

export default function GamesPage() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [sortBy, setSortBy] = useState("popular")
  const [filterGenre, setFilterGenre] = useState("all")
  const [filterYear, setFilterYear] = useState("all")
  
  const { 
    isAuthenticated, 
    user, 
    userProfile, 
    displayName, 
    username, 
    avatarUrl,
    gamingPreferences 
  } = useAuth()

  // Use the enhanced useGames hook
  const { 
    games, 
    loading, 
    error, 
    hasMore, 
    totalCount, 
    fetchGames, 
    loadMore, 
    refetch 
  } = useGames({
    pageSize: 20,
    ordering: sortBy === "popular" ? "-rating" : 
              sortBy === "rating" ? "-rating" :
              sortBy === "recent" ? "-released" : 
              "name"
  })

  // Handle filter changes
  const handleFilterChange = useCallback(async (filters: {
    genre?: string
    year?: string
    sortBy?: string
  }) => {
    const params: Record<string, string | number> = { page: 1, pageSize: 20 }
    
    if (filters.genre && filters.genre !== "all") {
      params.genres = filters.genre
    }
    
    if (filters.sortBy) {
      params.ordering = filters.sortBy === "popular" ? "-rating" : 
                       filters.sortBy === "rating" ? "-rating" :
                       filters.sortBy === "recent" ? "-released" : 
                       "name"
    }
    
    await fetchGames(params)
  }, [fetchGames])

  // Handle user game actions
  const handleUserGameAction = useCallback(async (action: string, gameId: number) => {
    if (!isAuthenticated) return
    
    try {
      const response = await fetch(`/api/games/${gameId}/user-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: action === 'library' ? 'want_to_play' : undefined,
          is_favorite: action === 'wishlist' ? true : undefined,
          completed: action === 'played' ? true : undefined
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to update game status')
      }
      
      // Optionally show success message or update UI
    } catch (error) {
      console.error('Error updating game status:', error)
    }
  }, [isAuthenticated])

  // Handle sort change
  const handleSortChange = useCallback(async (value: string) => {
    setSortBy(value)
    await handleFilterChange({ sortBy: value })
  }, [handleFilterChange])

  // Handle genre filter change
  const handleGenreChange = useCallback(async (value: string) => {
    setFilterGenre(value)
    await handleFilterChange({ genre: value })
  }, [handleFilterChange])

  // Handle year filter change
  const handleYearChange = useCallback(async (value: string) => {
    setFilterYear(value)
    await handleFilterChange({ year: value })
  }, [handleFilterChange])


  // Browse categories for filtering

  const browseCategories = [
    { name: "Release date", icon: Clock },
    { name: "Genre, country or language", icon: Filter },
    { name: "Platform", icon: Grid },
    { name: "Most popular", icon: Trophy },
    { name: "Highest rated", icon: Star },
    { name: "Most anticipated", icon: ChevronRight },
  ]

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          {isAuthenticated ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={avatarUrl || undefined} alt={displayName || username || 'User'} />
                  <AvatarFallback>
                    {displayName ? displayName.charAt(0).toUpperCase() : 
                     username ? username.charAt(0).toUpperCase() : 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-3xl font-playfair font-bold">
                    {displayName || username}'s Game Library
                  </h1>
                  <p className="text-muted-foreground">
                    Discover games tailored to your preferences
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button size="sm" asChild>
                  <Link href="/profile">
                    <User className="h-4 w-4 mr-2" />
                    My Profile
                  </Link>
                </Button>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Game
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <h1 className="text-3xl font-playfair font-bold mb-4">Browse Games</h1>
              <p className="text-muted-foreground">Discover your next favorite game from our extensive library</p>
            </div>
          )}
        </div>

        {/* Personalized Dashboard for Authenticated Users */}
        {isAuthenticated && (
          <div className="grid lg:grid-cols-4 gap-6 mb-8">
            {/* Main Content */}
            <div className="lg:col-span-3">
              {/* Gaming Preferences */}
              {gamingPreferences && (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Gamepad2 className="h-5 w-5" />
                      Recommended Based on Your Preferences
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {gamingPreferences.favorite_genres?.slice(0, 4).map((genre: string) => (
                        <Badge key={genre} variant="secondary" className="text-xs">
                          {genre}
                        </Badge>
                      ))}
                      {gamingPreferences.platforms?.slice(0, 3).map((platform: string) => (
                        <Badge key={platform} variant="outline" className="text-xs">
                          {platform}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Games filtered by your favorite genres and platforms
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Browse Categories */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Browse by</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {browseCategories.map((category, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="h-auto p-4 flex flex-col items-center gap-2 bg-card border-border hover:border-primary transition-colors"
                    >
                      <category.icon className="w-6 h-6 text-primary" />
                      <span className="text-sm text-center">{category.name}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* My Game Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">My Game Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Games Played</span>
                    <Badge variant="outline">0</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Want to Play</span>
                    <Badge variant="outline">0</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Completed</span>
                    <Badge variant="outline">0</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Reviews Written</span>
                    <Badge variant="outline">0</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Game
                  </Button>
                  <Button variant="outline" className="w-full justify-start" size="sm">
                    <Heart className="h-4 w-4 mr-2" />
                    My Wishlist
                  </Button>
                  <Button variant="outline" className="w-full justify-start" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    Recently Viewed
                  </Button>
                </CardContent>
              </Card>

              {/* Trending in Your Genres */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Trending in Your Genres
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { title: "Baldur's Gate 3", genre: "RPG", rating: 4.8 },
                      { title: "Elden Ring", genre: "Action RPG", rating: 4.7 },
                      { title: "Hades", genre: "Roguelike", rating: 4.6 },
                    ].map((game, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <div>
                          <div className="font-medium">{game.title}</div>
                          <div className="text-xs text-muted-foreground">{game.genre}</div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-primary text-primary" />
                          <span className="text-muted-foreground">{game.rating}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Browse Categories for Non-Authenticated Users */}
        {!isAuthenticated && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Browse by</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {browseCategories.map((category, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center gap-2 bg-card border-border hover:border-primary transition-colors"
                >
                  <category.icon className="w-6 h-6 text-primary" />
                  <span className="text-sm text-center">{category.name}</span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Filters and View Toggle */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex gap-4 flex-1">
            <Select value={filterYear} onValueChange={handleYearChange}>
              <SelectTrigger className="w-40 bg-card border-border">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2023">2023</SelectItem>
                <SelectItem value="2022">2022</SelectItem>
                <SelectItem value="2021">2021</SelectItem>
                <SelectItem value="2020">2020</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterGenre} onValueChange={handleGenreChange}>
              <SelectTrigger className="w-40 bg-card border-border">
                <SelectValue placeholder="Genre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genres</SelectItem>
                <SelectItem value="action">Action</SelectItem>
                <SelectItem value="role-playing-games-rpg">RPG</SelectItem>
                <SelectItem value="adventure">Adventure</SelectItem>
                <SelectItem value="strategy">Strategy</SelectItem>
                <SelectItem value="indie">Indie</SelectItem>
                <SelectItem value="shooter">Shooter</SelectItem>
                <SelectItem value="platformer">Platformer</SelectItem>
                <SelectItem value="fighting">Fighting</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={handleSortChange}>
              <SelectTrigger className="w-40 bg-card border-border">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popular">Most Popular</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="title">Title A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button variant={viewMode === "list" ? "default" : "outline"} size="sm" onClick={() => setViewMode("list")}>
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
              <Button 
                variant="outline" 
                size="sm" 
                className="ml-2"
                onClick={refetch}
              >
                Try Again
              </Button>
            </AlertDescription>
          </Alert>
        )}


        {/* Games Display */}
        {!loading && games.length === 0 && !error && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No games found matching your criteria.</p>
            <Button variant="outline" onClick={refetch}>
              Refresh
            </Button>
          </div>
        )}

        {/* Games Display */}
        {viewMode === "grid" ? (
          <GameGrid
            games={games}
            loading={loading && games.length === 0}
            error={error}
            onUserAction={handleUserGameAction}
            onRetry={refetch}
            onLoadMore={hasMore ? loadMore : undefined}
            hasMore={hasMore}
            loadingMore={loading && games.length > 0}
            columns={{
              default: 2,
              md: 3,
              lg: 4,
              xl: 5,
              "2xl": 6
            }}
            emptyMessage="No games found. Try adjusting your filters."
          />
        ) : (
          <GameList
            games={games}
            loading={loading && games.length === 0}
            error={error}
            onUserAction={handleUserGameAction}
            onRetry={refetch}
            onLoadMore={hasMore ? loadMore : undefined}
            hasMore={hasMore}
            loadingMore={loading && games.length > 0}
            emptyMessage="No games found. Try adjusting your filters."
          />
        )}

        {/* Results Summary */}
        {games.length > 0 && (
          <div className="text-center mt-4 text-sm text-muted-foreground">
            Showing {games.length} of {totalCount} games
          </div>
        )}

      </div>
    </div>
  )
}
