"use client"

import { useState } from "react"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Star, Clock, Trophy, Heart, MessageSquare, Calendar, Edit, Settings, Award } from "lucide-react"

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState("games")

  // Mock user data
  const user = {
    name: "Alex Chen",
    username: "alexgamer92",
    avatar: "/placeholder.svg?height=120&width=120",
    bio: "Passionate gamer who loves RPGs, indie games, and anything with a great story. Always looking for the next adventure!",
    joinDate: "March 2023",
    location: "San Francisco, CA",
    followers: 1247,
    following: 892,
    stats: {
      gamesPlayed: 156,
      reviewsWritten: 43,
      listsCreated: 8,
      totalHours: 2847,
    },
    achievements: [
      { name: "First Review", description: "Wrote your first review", icon: "📝", earned: true },
      { name: "Century Club", description: "Played 100 games", icon: "💯", earned: true },
      { name: "Critic", description: "Wrote 25 reviews", icon: "⭐", earned: true },
      { name: "Completionist", description: "Completed 50 games", icon: "🏆", earned: false },
      { name: "Social Butterfly", description: "Follow 100 users", icon: "👥", earned: true },
      { name: "Time Traveler", description: "Played 1000+ hours", icon: "⏰", earned: true },
    ],
  }

  const recentGames = [
    {
      title: "Baldur's Gate 3",
      rating: 5,
      difficulty: 3,
      hours: 120,
      completed: true,
      image: "/baldurs-gate-3-inspired-cover.png",
      playedDate: "2 days ago",
    },
    {
      title: "Spider-Man 2",
      rating: 4.5,
      difficulty: 2,
      hours: 25,
      completed: true,
      image: "/spider-man-2-game-cover.jpg",
      playedDate: "1 week ago",
    },
    {
      title: "Alan Wake 2",
      rating: 4,
      difficulty: 3,
      hours: 15,
      completed: false,
      image: "/alan-wake-2-game-cover.jpg",
      playedDate: "2 weeks ago",
    },
  ]

  const reviews = [
    {
      id: 1,
      game: "Baldur's Gate 3",
      rating: 5,
      difficulty: 3,
      hours: 120,
      completed: true,
      date: "2 days ago",
      content:
        "An absolute masterpiece that redefines what an RPG can be. Every choice matters, every character is memorable.",
      likes: 45,
      comments: 12,
      image: "/baldurs-gate-3-inspired-cover.png",
    },
    {
      id: 2,
      game: "Hades",
      rating: 4.5,
      difficulty: 4,
      hours: 85,
      completed: true,
      date: "1 month ago",
      content: "Perfect blend of story and gameplay. Each run feels meaningful and the narrative unfolds beautifully.",
      likes: 32,
      comments: 8,
      image: "/hades-game-cover.png",
    },
  ]

  const lists = [
    {
      name: "Best RPGs of 2023",
      gameCount: 12,
      likes: 89,
      description: "My personal favorites from this incredible year for RPGs",
      games: ["/baldurs-gate-3-inspired-cover.png", "/placeholder.svg", "/placeholder.svg"],
    },
    {
      name: "Hidden Indie Gems",
      gameCount: 8,
      likes: 56,
      description: "Underrated indie games that deserve more attention",
      games: ["/hades-game-cover.png", "/placeholder.svg", "/placeholder.svg"],
    },
  ]

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

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <Card className="bg-card border-border p-8 mb-8">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex flex-col items-center md:items-start">
              <Avatar className="w-32 h-32 mb-4">
                <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                  {user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex gap-2">
                <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
                <Button variant="outline" size="sm" className="border-border hover:border-primary bg-transparent">
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1">
              <div className="text-center md:text-left">
                <h1 className="text-3xl font-playfair font-bold mb-2">{user.name}</h1>
                <p className="text-lg text-muted-foreground mb-4">@{user.username}</p>
                <p className="text-foreground mb-4 leading-relaxed">{user.bio}</p>

                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>Joined {user.joinDate}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>{user.location}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span>
                      <strong className="text-foreground">{user.followers.toLocaleString()}</strong> followers
                    </span>
                    <span>
                      <strong className="text-foreground">{user.following.toLocaleString()}</strong> following
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{user.stats.gamesPlayed}</div>
                    <div className="text-sm text-muted-foreground">Games Played</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-secondary">{user.stats.reviewsWritten}</div>
                    <div className="text-sm text-muted-foreground">Reviews</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{user.stats.listsCreated}</div>
                    <div className="text-sm text-muted-foreground">Lists</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-secondary">{user.stats.totalHours.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">Hours Played</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Achievements */}
        <Card className="bg-card border-border p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-secondary" />
            Achievements
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {user.achievements.map((achievement, index) => (
              <div
                key={index}
                className={`text-center p-3 rounded-lg border transition-colors ${
                  achievement.earned
                    ? "bg-primary/10 border-primary/30 text-foreground"
                    : "bg-muted/50 border-border text-muted-foreground"
                }`}
              >
                <div className="text-2xl mb-2">{achievement.icon}</div>
                <div className="text-sm font-semibold mb-1">{achievement.name}</div>
                <div className="text-xs">{achievement.description}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Profile Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-card mb-8">
            <TabsTrigger value="games">Games</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="lists">Lists</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="games" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Recently Played</h2>
              <Button variant="outline" className="border-border hover:border-primary bg-transparent">
                View All Games
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {recentGames.map((game, index) => (
                <Card
                  key={index}
                  className="group cursor-pointer bg-card border-border hover:border-primary transition-colors"
                >
                  <div className="aspect-[2/3] bg-muted rounded-t-lg overflow-hidden relative">
                    <img
                      src={game.image || "/placeholder.svg"}
                      alt={game.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2 right-2">
                      <Badge
                        variant={game.completed ? "default" : "secondary"}
                        className={
                          game.completed
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary/20 text-secondary-foreground"
                        }
                      >
                        {game.completed ? "✓" : "▶"}
                      </Badge>
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-sm mb-2 line-clamp-2">{game.title}</h3>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <div className="flex items-center gap-1">{renderStars(game.rating, "w-3 h-3")}</div>
                      <span>{game.hours}h</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{game.playedDate}</div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="reviews" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Reviews ({reviews.length})</h2>
              <Button variant="outline" className="border-border hover:border-primary bg-transparent">
                View All Reviews
              </Button>
            </div>

            {reviews.map((review) => (
              <Card key={review.id} className="bg-card border-border p-6">
                <div className="flex gap-4">
                  <div className="w-16 h-20 bg-muted rounded overflow-hidden flex-shrink-0">
                    <img
                      src={review.image || "/placeholder.svg"}
                      alt={review.game}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-3">
                      <h3 className="font-semibold text-lg">{review.game}</h3>
                      <div className="flex items-center gap-2">
                        {renderStars(review.rating)}
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
                      <div className="flex items-center gap-1">
                        <Heart className="w-4 h-4" />
                        <span>{review.likes}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageSquare className="w-4 h-4" />
                        <span>{review.comments}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="lists" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Lists ({lists.length})</h2>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">Create New List</Button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {lists.map((list, index) => (
                <Card
                  key={index}
                  className="group cursor-pointer bg-card border-border hover:border-primary transition-colors p-6"
                >
                  <div className="flex gap-4">
                    <div className="flex gap-1">
                      {list.games.slice(0, 3).map((gameImage, gameIndex) => (
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
                      <h3 className="font-semibold text-lg mb-2">{list.name}</h3>
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
          </TabsContent>

          <TabsContent value="activity">
            <Card className="bg-card border-border p-6">
              <h2 className="text-2xl font-semibold mb-4">Recent Activity</h2>
              <p className="text-muted-foreground">
                Activity feed will show your recent gaming activity, reviews, and social interactions.
              </p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
