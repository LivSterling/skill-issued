"use client"

import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AuthLoadingSkeleton } from "@/components/auth"
import { useAuth } from "@/hooks/use-auth"
import { SocialActivityFeed } from "@/components/profile/social-activity-feed"
import { 
  Star, 
  Clock, 
  Trophy, 
  Eye, 
  Heart, 
  MessageSquare, 
  User, 
  Gamepad2, 
  Users, 
  Activity,
  Plus,
  TrendingUp,
  Calendar,
  Settings
} from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  const { 
    isAuthenticated, 
    isLoading,
    user, 
    userProfile, 
    displayName, 
    username, 
    avatarUrl,
    isProfileComplete,
    gamingPreferences,
    privacyLevel
  } = useAuth()

  // Show loading skeleton while auth is loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <AuthLoadingSkeleton variant="page" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero Section */}
      {isAuthenticated ? (
        // Personalized Hero for Authenticated Users
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10" />
          <div className="relative max-w-6xl mx-auto px-4 py-12">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={avatarUrl || undefined} alt={displayName || username || 'User'} />
                  <AvatarFallback>
                    {displayName ? displayName.charAt(0).toUpperCase() : 
                     username ? username.charAt(0).toUpperCase() : 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-3xl font-playfair font-bold">
                    Welcome back, {displayName || username || 'Gamer'}!
                  </h1>
                  <p className="text-muted-foreground">
                    Ready to discover your next favorite game?
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {!isProfileComplete && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/profile/edit">
                      <Settings className="h-4 w-4 mr-2" />
                      Complete Profile
                    </Link>
                  </Button>
                )}
                <Button size="sm" asChild>
                  <Link href="/games">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Game
                  </Link>
                </Button>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card className="text-center">
                <CardContent className="pt-4 pb-3">
                  <div className="text-2xl font-bold text-primary">0</div>
                  <div className="text-xs text-muted-foreground">Games Played</div>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="pt-4 pb-3">
                  <div className="text-2xl font-bold text-secondary">0</div>
                  <div className="text-xs text-muted-foreground">Reviews Written</div>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="pt-4 pb-3">
                  <div className="text-2xl font-bold text-primary">0</div>
                  <div className="text-xs text-muted-foreground">Friends</div>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="pt-4 pb-3">
                  <div className="text-2xl font-bold text-secondary">0</div>
                  <div className="text-xs text-muted-foreground">Hours Played</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      ) : (
        // Original Hero for Non-Authenticated Users
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-secondary/20" />
          <div className="relative max-w-6xl mx-auto px-4 py-20 text-center">
            <h1 className="text-4xl md:text-6xl font-playfair font-bold mb-6 text-balance">
              Track games you've played.
              <br />
              Save those you want to play.
              <br />
              Tell your friends what's good.
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto text-pretty">
              The social network for gamers. Also available on <span className="text-primary">mobile</span> and{" "}
              <span className="text-primary">desktop</span>.
            </p>
            <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 text-lg px-8 py-3">
              Get started — it's free!
            </Button>
          </div>
        </section>
      )}

      {/* Personalized Dashboard for Authenticated Users */}
      {isAuthenticated && (
        <section className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Gaming Preferences */}
              {gamingPreferences && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Gamepad2 className="h-5 w-5" />
                      Your Gaming Preferences
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {gamingPreferences.favorite_genres && gamingPreferences.favorite_genres.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">Favorite Genres</h4>
                          <div className="flex flex-wrap gap-2">
                            {gamingPreferences.favorite_genres.map((genre) => (
                              <Badge key={genre} variant="secondary">
                                {genre}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {gamingPreferences.platforms && gamingPreferences.platforms.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">Platforms</h4>
                          <div className="flex flex-wrap gap-2">
                            {gamingPreferences.platforms.map((platform) => (
                              <Badge key={platform} variant="outline">
                                {platform}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-sm text-muted-foreground">
                          Playtime: {gamingPreferences.playtime_preference || 'Not set'}
                        </span>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href="/profile/edit">
                            <Settings className="h-4 w-4 mr-2" />
                            Update
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recent Activity Feed */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Your Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <SocialActivityFeed
                    userId={user?.id}
                    feedType="personal"
                    variant="compact"
                    showHeader={false}
                    maxItems={5}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Profile Completion */}
              {!isProfileComplete && (
                <Card className="border-yellow-200 bg-yellow-50">
                  <CardContent className="pt-6">
                    <h3 className="font-semibold mb-2 text-yellow-800">Complete Your Profile</h3>
                    <p className="text-sm text-yellow-700 mb-4">
                      Unlock all features by completing your profile setup.
                    </p>
                    <Button size="sm" className="w-full" asChild>
                      <Link href="/profile/edit">Complete Now</Link>
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link href="/games">
                      <Plus className="h-4 w-4 mr-2" />
                      Add New Game
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link href="/search">
                      <Users className="h-4 w-4 mr-2" />
                      Find Friends
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link href="/profile">
                      <User className="h-4 w-4 mr-2" />
                      View Profile
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Trending Games */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Trending Now
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { title: "Baldur's Gate 3", rating: 4.5 },
                      { title: "Spider-Man 2", rating: 4.2 },
                      { title: "Alan Wake 2", rating: 4.3 },
                    ].map((game, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span className="font-medium">{game.title}</span>
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
        </section>
      )}

      {/* Featured Games Grid */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-12">
          {[
            { title: "Elden Ring", image: "/generic-fantasy-game-cover.png" },
            { title: "The Last of Us Part II", image: "/the-last-of-us-part-2-game-cover.jpg" },
            { title: "Hades", image: "/hades-game-cover.png" },
            { title: "Cyberpunk 2077", image: "/cyberpunk-2077-inspired-cover.png" },
            { title: "Ghost of Tsushima", image: "/ghost-of-tsushima-game-cover.jpg" },
            { title: "Baldur's Gate 3", image: "/baldurs-gate-3-inspired-cover.png" },
          ].map((game, index) => (
            <div key={index} className="group cursor-pointer">
              <div className="aspect-[2/3] bg-card rounded-lg overflow-hidden mb-2 border border-border group-hover:border-primary transition-colors">
                <img
                  src={game.image || "/placeholder.svg"}
                  alt={game.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section - Only for non-authenticated users */}
      {!isAuthenticated && (
        <section className="bg-card/50 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl font-playfair font-bold text-center mb-12">SKILL ISSUED LETS YOU...</h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Eye className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Keep track of every game you've ever played</h3>
              <p className="text-muted-foreground">(or just start from the day you join)</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-secondary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-secondary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Show some love for your favorite games, lists and reviews</h3>
              <p className="text-muted-foreground">with a "like"</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                Write and share reviews, and follow friends and other members
              </h3>
              <p className="text-muted-foreground">to read theirs</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mt-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-secondary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-secondary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Rate each game on a five star scale</h3>
              <p className="text-muted-foreground">(with halves) to record and share your reaction</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Keep a diary of your gaming life</h3>
              <p className="text-muted-foreground">and track your hours played and completion status</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-secondary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-8 h-8 text-secondary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Compile and share lists of games</h3>
              <p className="text-muted-foreground">and earn achievement badges for your activity</p>
            </div>
          </div>
        </div>
        </section>
      )}

      {/* Popular This Week / Personalized Recommendations */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-playfair font-bold">
              {isAuthenticated ? 'Recommended for You' : 'Popular this week'}
            </h2>
            {isAuthenticated && (
              <p className="text-muted-foreground mt-1">
                Based on your gaming preferences and activity
              </p>
            )}
          </div>
          <Button variant="ghost" className="text-primary hover:text-primary/80" asChild>
            <Link href="/games">
              {isAuthenticated ? 'Browse All Games' : 'More'} →
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            {
              title: "Baldur's Gate 3",
              image: "/baldurs-gate-3-inspired-cover.png",
              rating: 4.5,
              reviews: "2.1K",
              likes: "15K",
            },
            {
              title: "Spider-Man 2",
              image: "/spider-man-2-game-cover.jpg",
              rating: 4.2,
              reviews: "1.8K",
              likes: "12K",
            },
            {
              title: "Alan Wake 2",
              image: "/alan-wake-2-game-cover.jpg",
              rating: 4.3,
              reviews: "956",
              likes: "8.2K",
            },
            {
              title: "Super Mario Bros. Wonder",
              image: "/super-mario-bros-wonder-game-cover.jpg",
              rating: 4.4,
              reviews: "1.2K",
              likes: "9.8K",
            },
          ].map((game, index) => (
            <Card
              key={index}
              className="group cursor-pointer bg-card border-border hover:border-primary transition-colors"
            >
              <div className="aspect-[2/3] bg-muted rounded-t-lg overflow-hidden">
                <img
                  src={game.image || "/placeholder.svg"}
                  alt={game.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-3">
                <h3 className="font-semibold text-sm mb-2 line-clamp-2">{game.title}</h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 fill-primary text-primary" />
                    <span>{game.rating}</span>
                  </div>
                  <span>•</span>
                  <span>{game.reviews} reviews</span>
                  <span>•</span>
                  <span>{game.likes} likes</span>
                </div>
                
                {/* Personalized info for authenticated users */}
                {isAuthenticated && (
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      Want to Play
                    </Badge>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card/50 border-t border-border py-12 mb-16 md:mb-0">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-2xl font-playfair font-bold text-primary">Skill Issued</span>
          </div>
          <p className="text-muted-foreground mb-6">
            The social network for gamers. Track, review, and discover games.
          </p>
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-primary transition-colors">
              About
            </a>
            <a href="#" className="hover:text-primary transition-colors">
              Help
            </a>
            <a href="#" className="hover:text-primary transition-colors">
              Terms
            </a>
            <a href="#" className="hover:text-primary transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-primary transition-colors">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
