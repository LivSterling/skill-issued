"use client"

import { useState } from "react"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/hooks/use-auth"
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
  TrendingUp
} from "lucide-react"
import Link from "next/link"

export default function GamesPage() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const { 
    isAuthenticated, 
    user, 
    userProfile, 
    displayName, 
    username, 
    avatarUrl,
    gamingPreferences 
  } = useAuth()

  const games = [
    {
      id: 1,
      title: "Baldur's Gate 3",
      year: 2023,
      genre: "RPG",
      platform: "PC, PS5",
      rating: 4.8,
      difficulty: 3,
      hours: 100,
      image: "/baldurs-gate-3-inspired-cover.png",
      developer: "Larian Studios",
      description: "A masterful RPG that sets new standards for the genre.",
    },
    {
      id: 2,
      title: "Elden Ring",
      year: 2022,
      genre: "Action RPG",
      platform: "Multi-platform",
      rating: 4.7,
      difficulty: 5,
      hours: 80,
      image: "/generic-fantasy-game-cover.png",
      developer: "FromSoftware",
      description: "An epic dark fantasy adventure in an open world.",
    },
    {
      id: 3,
      title: "The Last of Us Part II",
      year: 2020,
      genre: "Action-Adventure",
      platform: "PS4, PS5",
      rating: 4.5,
      difficulty: 3,
      hours: 25,
      image: "/the-last-of-us-part-2-game-cover.jpg",
      developer: "Naughty Dog",
      description: "A gripping post-apocalyptic tale of survival and revenge.",
    },
    {
      id: 4,
      title: "Hades",
      year: 2020,
      genre: "Roguelike",
      platform: "Multi-platform",
      rating: 4.6,
      difficulty: 4,
      hours: 50,
      image: "/hades-game-cover.png",
      developer: "Supergiant Games",
      description: "A perfectly crafted roguelike with incredible storytelling.",
    },
    {
      id: 5,
      title: "Cyberpunk 2077",
      year: 2020,
      genre: "Action RPG",
      platform: "Multi-platform",
      rating: 3.8,
      difficulty: 3,
      hours: 60,
      image: "/cyberpunk-2077-inspired-cover.png",
      developer: "CD Projekt RED",
      description: "A futuristic RPG set in the dystopian Night City.",
    },
    {
      id: 6,
      title: "Ghost of Tsushima",
      year: 2020,
      genre: "Action-Adventure",
      platform: "PS4, PS5, PC",
      rating: 4.4,
      difficulty: 3,
      hours: 40,
      image: "/ghost-of-tsushima-game-cover.jpg",
      developer: "Sucker Punch Productions",
      description: "A beautiful samurai adventure in feudal Japan.",
    },
    {
      id: 7,
      title: "Spider-Man 2",
      year: 2023,
      genre: "Action-Adventure",
      platform: "PS5",
      rating: 4.2,
      difficulty: 2,
      hours: 20,
      image: "/spider-man-2-game-cover.jpg",
      developer: "Insomniac Games",
      description: "Swing through New York as both Peter Parker and Miles Morales.",
    },
    {
      id: 8,
      title: "Alan Wake 2",
      year: 2023,
      genre: "Survival Horror",
      platform: "PC, PS5, Xbox Series X/S",
      rating: 4.3,
      difficulty: 3,
      hours: 15,
      image: "/alan-wake-2-game-cover.jpg",
      developer: "Remedy Entertainment",
      description: "A psychological horror masterpiece with stunning visuals.",
    },
    {
      id: 9,
      title: "Super Mario Bros. Wonder",
      year: 2023,
      genre: "Platformer",
      platform: "Nintendo Switch",
      rating: 4.4,
      difficulty: 2,
      hours: 12,
      image: "/super-mario-bros-wonder-game-cover.jpg",
      developer: "Nintendo EPD",
      description: "A delightful return to form for 2D Mario platforming.",
    },
    {
      id: 10,
      title: "Starfield",
      year: 2023,
      genre: "Action RPG",
      platform: "PC, Xbox Series X/S",
      rating: 3.5,
      difficulty: 2,
      hours: 70,
      image: "/placeholder-liput.png",
      developer: "Bethesda Game Studios",
      description: "Explore the vast reaches of space in this ambitious RPG.",
    },
    {
      id: 11,
      title: "Tears of the Kingdom",
      year: 2023,
      genre: "Action-Adventure",
      platform: "Nintendo Switch",
      rating: 4.6,
      difficulty: 3,
      hours: 60,
      image: "/placeholder-e6eml.png",
      developer: "Nintendo EPD",
      description: "The epic sequel to Breath of the Wild with new mechanics.",
    },
    {
      id: 12,
      title: "Diablo IV",
      year: 2023,
      genre: "Action RPG",
      platform: "Multi-platform",
      rating: 3.9,
      difficulty: 3,
      hours: 45,
      image: "/placeholder-smaqn.png",
      developer: "Blizzard Entertainment",
      description: "Return to Sanctuary in this dark action RPG.",
    },
    {
      id: 13,
      title: "Resident Evil 4",
      year: 2023,
      genre: "Survival Horror",
      platform: "Multi-platform",
      rating: 4.5,
      difficulty: 4,
      hours: 16,
      image: "/placeholder-s6y1f.png",
      developer: "Capcom",
      description: "A masterful remake of the survival horror classic.",
    },
    {
      id: 14,
      title: "Street Fighter 6",
      year: 2023,
      genre: "Fighting",
      platform: "Multi-platform",
      rating: 4.1,
      difficulty: 4,
      hours: 30,
      image: "/placeholder-y8u8v.png",
      developer: "Capcom",
      description: "The fighting game franchise returns with new mechanics.",
    },
    {
      id: 15,
      title: "Hogwarts Legacy",
      year: 2023,
      genre: "Action RPG",
      platform: "Multi-platform",
      rating: 4.0,
      difficulty: 2,
      hours: 35,
      image: "/generic-wizarding-game-cover.png",
      developer: "Avalanche Software",
      description: "Experience the wizarding world in this immersive RPG.",
    },
    {
      id: 16,
      title: "Dead Space",
      year: 2023,
      genre: "Survival Horror",
      platform: "Multi-platform",
      rating: 4.3,
      difficulty: 4,
      hours: 12,
      image: "/dead-space-remake-horror-cover.jpg",
      developer: "Motive Studio",
      description: "A terrifying remake of the sci-fi horror classic.",
    },
    {
      id: 17,
      title: "Hi-Fi Rush",
      year: 2023,
      genre: "Action",
      platform: "PC, Xbox Series X/S",
      rating: 4.2,
      difficulty: 3,
      hours: 10,
      image: "/hi-fi-rush-colorful-game-cover.jpg",
      developer: "Tango Gameworks",
      description: "A rhythm-action game with incredible style and charm.",
    },
    {
      id: 18,
      title: "Armored Core VI",
      year: 2023,
      genre: "Mech Action",
      platform: "Multi-platform",
      rating: 4.1,
      difficulty: 5,
      hours: 25,
      image: "/armored-core-6-mech-game-cover.jpg",
      developer: "FromSoftware",
      description: "Pilot powerful mechs in this challenging action game.",
    },
  ]

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
                      {gamingPreferences.favorite_genres?.slice(0, 4).map((genre) => (
                        <Badge key={genre} variant="secondary" className="text-xs">
                          {genre}
                        </Badge>
                      ))}
                      {gamingPreferences.platforms?.slice(0, 3).map((platform) => (
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
            <Select defaultValue="all">
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

            <Select defaultValue="all">
              <SelectTrigger className="w-40 bg-card border-border">
                <SelectValue placeholder="Genre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genres</SelectItem>
                <SelectItem value="action">Action</SelectItem>
                <SelectItem value="rpg">RPG</SelectItem>
                <SelectItem value="adventure">Adventure</SelectItem>
                <SelectItem value="strategy">Strategy</SelectItem>
                <SelectItem value="indie">Indie</SelectItem>
                <SelectItem value="survival horror">Survival Horror</SelectItem>
                <SelectItem value="platformer">Platformer</SelectItem>
                <SelectItem value="mech action">Mech Action</SelectItem>
                <SelectItem value="fighting">Fighting</SelectItem>
              </SelectContent>
            </Select>

            <Select defaultValue="popular">
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

        {/* Games Grid/List */}
        {viewMode === "grid" ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {games.map((game) => (
              <Card
                key={game.id}
                className="group cursor-pointer bg-card border-border hover:border-primary transition-all duration-300"
              >
                <div className="aspect-[2/3] bg-muted rounded-t-lg overflow-hidden relative">
                  <img
                    src={game.image || "/placeholder.svg"}
                    alt={game.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 right-2">
                    <Badge variant="secondary" className="bg-secondary/90 text-secondary-foreground">
                      {game.year}
                    </Badge>
                  </div>
                  <div className="absolute bottom-2 left-2 flex gap-1">
                    <Badge variant="outline" className="bg-background/90 text-xs">
                      {game.genre}
                    </Badge>
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-sm mb-2 line-clamp-2">{game.title}</h3>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-primary text-primary" />
                      <span>{game.rating}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Trophy className="w-3 h-3 text-secondary" />
                      <span>{game.difficulty}/5</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>~{game.hours}h</span>
                    </div>
                    
                    {/* User-specific actions for authenticated users */}
                    {isAuthenticated && (
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <Heart className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {/* User status badge for authenticated users */}
                  {isAuthenticated && (
                    <div className="mt-2">
                      <Badge variant="outline" className="text-xs">
                        Want to Play
                      </Badge>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {games.map((game) => (
              <Card
                key={game.id}
                className="group cursor-pointer bg-card border-border hover:border-primary transition-colors"
              >
                <div className="flex gap-4 p-4">
                  <div className="w-20 h-28 bg-muted rounded overflow-hidden flex-shrink-0">
                    <img
                      src={game.image || "/placeholder.svg"}
                      alt={game.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-lg mb-1">{game.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {game.year} • {game.developer}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-primary text-primary" />
                          <span>{game.rating}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Trophy className="w-4 h-4 text-secondary" />
                          <span>{game.difficulty}/5</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>~{game.hours}h</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{game.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {game.genre}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {game.platform}
                        </Badge>
                        
                        {/* User status badge for authenticated users */}
                        {isAuthenticated && (
                          <Badge variant="secondary" className="text-xs">
                            Want to Play
                          </Badge>
                        )}
                      </div>
                      
                      {/* User actions for authenticated users */}
                      {isAuthenticated && (
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" className="h-8">
                            <Heart className="w-4 h-4 mr-1" />
                            Wishlist
                          </Button>
                          <Button variant="outline" size="sm" className="h-8">
                            <Plus className="w-4 h-4 mr-1" />
                            Add to List
                          </Button>
                          <Button size="sm" className="h-8">
                            <Check className="w-4 h-4 mr-1" />
                            Played
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Load More */}
        <div className="text-center mt-12">
          <Button variant="outline" size="lg" className="border-border hover:border-primary bg-transparent">
            Load More Games
          </Button>
        </div>
      </div>
    </div>
  )
}
