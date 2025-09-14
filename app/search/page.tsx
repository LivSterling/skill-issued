"use client"

import { useState, useEffect } from "react"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search, Star, ChevronRight, User, ListIcon, Clock, Trophy, Heart, MessageSquare } from "lucide-react"

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any>({
    games: [],
    people: [],
    reviews: [],
    lists: [],
  })
  const [isSearching, setIsSearching] = useState(false)

  const browseCategories = [
    { name: "Release date", href: "/games?sort=date" },
    { name: "Genre, country or language", href: "/games?filter=genre" },
    { name: "Platform", href: "/games?filter=platform" },
    { name: "Most popular", href: "/games?sort=popular" },
    { name: "Highest rated", href: "/games?sort=rating" },
    { name: "Most anticipated", href: "/games?sort=anticipated" },
    { name: "Top 250 narrative features", href: "/lists/top-250" },
    { name: "Featured lists", href: "/lists/featured" },
  ]

  const helpSections = [
    { name: "New here?", href: "/help/getting-started" },
    { name: "Frequent questions", href: "/help/faq" },
    { name: "About subscriptions", href: "/help/pro" },
    { name: "Journal / Editorial", href: "/journal" },
  ]

  const recentSearches = ["Baldur's Gate 3", "Elden Ring", "The Last of Us", "Hades"]

  const trendingGames = [
    {
      title: "Spider-Man 2",
      year: 2023,
      rating: 4.2,
      image: "/spider-man-2-game-cover.jpg",
    },
    {
      title: "Alan Wake 2",
      year: 2023,
      rating: 4.3,
      image: "/alan-wake-2-game-cover.jpg",
    },
    {
      title: "Super Mario Bros. Wonder",
      year: 2023,
      rating: 4.4,
      image: "/super-mario-bros-wonder-game-cover.jpg",
    },
  ]

  // Mock search function
  const performSearch = (query: string) => {
    if (!query.trim()) {
      setSearchResults({ games: [], people: [], reviews: [], lists: [] })
      return
    }

    setIsSearching(true)

    // Simulate API call
    setTimeout(() => {
      const mockResults = {
        games: [
          {
            id: 1,
            title: "Baldur's Gate 3",
            year: 2023,
            developer: "Larian Studios",
            genre: ["RPG", "Strategy"],
            rating: 4.8,
            difficulty: 3,
            hours: 100,
            image: "/baldurs-gate-3-inspired-cover.png",
          },
          {
            id: 2,
            title: "Elden Ring",
            year: 2022,
            developer: "FromSoftware",
            genre: ["Action RPG", "Souls-like"],
            rating: 4.7,
            difficulty: 5,
            hours: 80,
            image: "/generic-fantasy-game-cover.png",
          },
        ],
        people: [
          {
            id: 1,
            name: "Alex Chen",
            username: "alexgamer92",
            avatar: "/placeholder.svg?height=40&width=40",
            followers: 1247,
            gamesPlayed: 156,
            bio: "RPG enthusiast and indie game lover",
          },
          {
            id: 2,
            name: "Sarah Kim",
            username: "sarahgames",
            avatar: "/placeholder.svg?height=40&width=40",
            followers: 892,
            gamesPlayed: 203,
            bio: "Casual gamer who loves story-driven adventures",
          },
        ],
        reviews: [
          {
            id: 1,
            user: {
              name: "Mike Chen",
              username: "mikeplays",
              avatar: "/placeholder.svg?height=40&width=40",
            },
            game: {
              title: "Baldur's Gate 3",
              image: "/baldurs-gate-3-inspired-cover.png",
            },
            rating: 5,
            difficulty: 3,
            hours: 120,
            completed: true,
            content:
              "An absolute masterpiece that redefines what an RPG can be. Every choice matters, every character is memorable, and the depth of storytelling is unparalleled.",
            date: "2 days ago",
            likes: 45,
            comments: 12,
          },
        ],
        lists: [
          {
            id: 1,
            name: "Best RPGs of 2023",
            creator: {
              name: "Emma Wilson",
              username: "emmaplays",
            },
            gameCount: 12,
            likes: 89,
            description: "My personal favorites from this incredible year for RPGs",
            games: ["/baldurs-gate-3-inspired-cover.png", "/placeholder.svg", "/placeholder.svg"],
          },
        ],
      }

      // Filter results based on query
      const filteredResults = {
        games: mockResults.games.filter(
          (game) =>
            game.title.toLowerCase().includes(query.toLowerCase()) ||
            game.developer.toLowerCase().includes(query.toLowerCase()),
        ),
        people: mockResults.people.filter(
          (person) =>
            person.name.toLowerCase().includes(query.toLowerCase()) ||
            person.username.toLowerCase().includes(query.toLowerCase()),
        ),
        reviews: mockResults.reviews.filter(
          (review) =>
            review.game.title.toLowerCase().includes(query.toLowerCase()) ||
            review.content.toLowerCase().includes(query.toLowerCase()),
        ),
        lists: mockResults.lists.filter(
          (list) =>
            list.name.toLowerCase().includes(query.toLowerCase()) ||
            list.description.toLowerCase().includes(query.toLowerCase()),
        ),
      }

      setSearchResults(filteredResults)
      setIsSearching(false)
    }, 500)
  }

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      performSearch(searchQuery)
    }, 300)

    return () => clearTimeout(debounceTimer)
  }, [searchQuery])

  const renderStars = (rating: number, size = "w-4 h-4") => {
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 !== 0
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0)

    return (
      <div className="flex items-center gap-1">
        {[...Array(fullStars)].map((_, i) => (
          <Star key={i} className={`${size} fill-primary text-primary`} />
        ))}
        {hasHalfStar && <Star className={`${size} fill-primary/50 text-primary`} />}
        {[...Array(emptyStars)].map((_, i) => (
          <Star key={i} className={`${size} text-muted-foreground`} />
        ))}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Navigation />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Search Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-playfair font-bold mb-4">Search</h1>
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              placeholder="Find games, cast + crew, members, reviews..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 text-lg bg-card border-border focus:border-primary"
            />
            {isSearching && (
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
              </div>
            )}
          </div>
        </div>

        {/* Search Results */}
        {searchQuery ? (
          <div className="mb-12">
            <Tabs defaultValue="games" className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-card">
                <TabsTrigger value="games">Games ({searchResults.games.length})</TabsTrigger>
                <TabsTrigger value="people">People ({searchResults.people.length})</TabsTrigger>
                <TabsTrigger value="reviews">Reviews ({searchResults.reviews.length})</TabsTrigger>
                <TabsTrigger value="lists">Lists ({searchResults.lists.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="games" className="mt-6">
                {searchResults.games.length > 0 ? (
                  <div className="space-y-4">
                    {searchResults.games.map((game: any) => (
                      <Card
                        key={game.id}
                        className="group cursor-pointer bg-card border-border hover:border-primary transition-colors"
                      >
                        <div className="flex gap-4 p-4">
                          <div className="w-16 h-20 bg-muted rounded overflow-hidden flex-shrink-0">
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
                                  {renderStars(game.rating)}
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
                            <div className="flex items-center gap-2">
                              {game.genre.map((g: string, index: number) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {g}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No games found for "{searchQuery}"</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="people" className="mt-6">
                {searchResults.people.length > 0 ? (
                  <div className="space-y-4">
                    {searchResults.people.map((person: any) => (
                      <Card
                        key={person.id}
                        className="group cursor-pointer bg-card border-border hover:border-primary transition-colors"
                      >
                        <div className="flex items-center gap-4 p-4">
                          <Avatar className="w-12 h-12">
                            <AvatarImage src={person.avatar || "/placeholder.svg"} alt={person.name} />
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              {person.name
                                .split(" ")
                                .map((n: string) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="font-semibold">{person.name}</h3>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-border hover:border-primary bg-transparent"
                              >
                                Follow
                              </Button>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">@{person.username}</p>
                            <p className="text-sm text-foreground mb-2">{person.bio}</p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{person.followers} followers</span>
                              <span>{person.gamesPlayed} games played</span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No people found for "{searchQuery}"</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="reviews" className="mt-6">
                {searchResults.reviews.length > 0 ? (
                  <div className="space-y-4">
                    {searchResults.reviews.map((review: any) => (
                      <Card key={review.id} className="bg-card border-border p-6">
                        <div className="flex items-start gap-4">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={review.user.avatar || "/placeholder.svg"} alt={review.user.name} />
                            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                              {review.user.name
                                .split(" ")
                                .map((n: string) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-4 mb-3">
                              <h3 className="font-semibold">{review.user.name}</h3>
                              <span className="text-muted-foreground">reviewed</span>
                              <span className="font-medium">{review.game.title}</span>
                              <div className="flex items-center gap-2">
                                {renderStars(review.rating, "w-3 h-3")}
                                <span className="text-sm text-muted-foreground">{review.date}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-6 mb-3 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Trophy className="w-4 h-4 text-secondary" />
                                <span>Difficulty: {review.difficulty}/5</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                <span>{review.hours}h played</span>
                              </div>
                              <span>{review.completed ? "Completed" : "In Progress"}</span>
                            </div>

                            <p className="text-foreground mb-4 leading-relaxed">{review.content}</p>

                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <Button variant="ghost" size="sm" className="h-8 px-2">
                                <Heart className="w-4 h-4 mr-1" />
                                {review.likes}
                              </Button>
                              <Button variant="ghost" size="sm" className="h-8 px-2">
                                <MessageSquare className="w-4 h-4 mr-1" />
                                {review.comments}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Star className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No reviews found for "{searchQuery}"</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="lists" className="mt-6">
                {searchResults.lists.length > 0 ? (
                  <div className="space-y-4">
                    {searchResults.lists.map((list: any) => (
                      <Card
                        key={list.id}
                        className="group cursor-pointer bg-card border-border hover:border-primary transition-colors p-6"
                      >
                        <div className="flex gap-4">
                          <div className="flex gap-1">
                            {list.games.slice(0, 3).map((gameImage: string, gameIndex: number) => (
                              <div key={gameIndex} className="w-12 h-16 bg-muted rounded overflow-hidden">
                                <img
                                  src={gameImage || "/placeholder.svg"}
                                  alt=""
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              </div>
                            ))}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="font-semibold text-lg">{list.name}</h3>
                              <div className="text-sm text-muted-foreground">by {list.creator.name}</div>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">{list.description}</p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{list.gameCount} games</span>
                              <div className="flex items-center gap-1">
                                <Heart className="w-4 h-4" />
                                <span>{list.likes}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <ListIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No lists found for "{searchQuery}"</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <>
            {/* Browse Categories */}
            <div className="mb-12">
              <h2 className="text-xl font-semibold mb-6">Browse by</h2>
              <div className="space-y-1">
                {browseCategories.map((category, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    className="w-full justify-between h-12 text-left px-0 hover:bg-transparent hover:text-primary"
                    asChild
                  >
                    <a href={category.href}>
                      <span>{category.name}</span>
                      <ChevronRight className="w-4 h-4" />
                    </a>
                  </Button>
                ))}
              </div>
            </div>

            {/* Skill Issued.com Section */}
            <div className="mb-12">
              <h2 className="text-xl font-semibold mb-6">Skill Issued.com</h2>
              <div className="space-y-1">
                {helpSections.map((section, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    className="w-full justify-between h-12 text-left px-0 hover:bg-transparent hover:text-primary"
                    asChild
                  >
                    <a href={section.href}>
                      <span>{section.name}</span>
                      <ChevronRight className="w-4 h-4" />
                    </a>
                  </Button>
                ))}
              </div>
            </div>

            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div className="mb-12">
                <h2 className="text-xl font-semibold mb-4">Recent searches</h2>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((search, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="bg-card border-border hover:border-primary"
                      onClick={() => setSearchQuery(search)}
                    >
                      {search}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Trending Games */}
            <div className="mb-12">
              <h2 className="text-xl font-semibold mb-6">Trending this week</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {trendingGames.map((game, index) => (
                  <Card
                    key={index}
                    className="group cursor-pointer bg-card border-border hover:border-primary transition-colors"
                  >
                    <div className="flex gap-3 p-4">
                      <div className="w-16 h-20 bg-muted rounded overflow-hidden flex-shrink-0">
                        <img
                          src={game.image || "/placeholder.svg"}
                          alt={game.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm mb-1 line-clamp-2">{game.title}</h3>
                        <p className="text-xs text-muted-foreground mb-2">{game.year}</p>
                        <div className="flex items-center gap-1 text-xs">
                          <Star className="w-3 h-3 fill-primary text-primary" />
                          <span>{game.rating}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
