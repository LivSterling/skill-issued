"use client"

import { useState } from "react"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Star, Clock, Trophy, Heart, MessageSquare, Plus, Filter } from "lucide-react"

export default function ActivityPage() {
  const [activeTab, setActiveTab] = useState("friends")

  const activities = [
    {
      id: 1,
      type: "game_added",
      user: {
        name: "Sarah Kim",
        username: "sarahgames",
        avatar: "/placeholder.svg?height=40&width=40",
      },
      game: {
        title: "Baldur's Gate 3",
        image: "/baldurs-gate-3-inspired-cover.png",
      },
      action: "added to watchlist",
      timestamp: "2 hours ago",
    },
    {
      id: 2,
      type: "review",
      user: {
        name: "Mike Chen",
        username: "mikeplays",
        avatar: "/placeholder.svg?height=40&width=40",
      },
      game: {
        title: "Spider-Man 2",
        image: "/spider-man-2-game-cover.jpg",
      },
      rating: 4.5,
      difficulty: 2,
      hours: 25,
      completed: true,
      review: "Amazing web-slinging mechanics and great story. The dual protagonist approach works really well.",
      action: "reviewed",
      timestamp: "4 hours ago",
      likes: 12,
      comments: 3,
    },
    {
      id: 3,
      type: "game_completed",
      user: {
        name: "Alex Rodriguez",
        username: "alexgamer",
        avatar: "/placeholder.svg?height=40&width=40",
      },
      game: {
        title: "Alan Wake 2",
        image: "/alan-wake-2-game-cover.jpg",
      },
      rating: 4,
      difficulty: 3,
      hours: 18,
      action: "completed",
      timestamp: "6 hours ago",
    },
    {
      id: 4,
      type: "list_created",
      user: {
        name: "Emma Wilson",
        username: "emmaplays",
        avatar: "/placeholder.svg?height=40&width=40",
      },
      list: {
        name: "Best Horror Games of 2023",
        gameCount: 8,
        games: ["/alan-wake-2-game-cover.jpg", "/placeholder.svg", "/placeholder.svg"],
      },
      action: "created a new list",
      timestamp: "8 hours ago",
      likes: 23,
    },
    {
      id: 5,
      type: "achievement",
      user: {
        name: "David Park",
        username: "davidgames",
        avatar: "/placeholder.svg?height=40&width=40",
      },
      achievement: {
        name: "Century Club",
        description: "Played 100 games",
        icon: "💯",
      },
      action: "earned an achievement",
      timestamp: "12 hours ago",
    },
    {
      id: 6,
      type: "game_rated",
      user: {
        name: "Lisa Chang",
        username: "lisaplays",
        avatar: "/placeholder.svg?height=40&width=40",
      },
      game: {
        title: "Hades",
        image: "/hades-game-cover.png",
      },
      rating: 5,
      difficulty: 4,
      hours: 85,
      completed: true,
      action: "rated",
      timestamp: "1 day ago",
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

  const renderActivity = (activity: any) => {
    const baseContent = (
      <div className="flex items-start gap-3">
        <Avatar className="w-10 h-10">
          <AvatarImage src={activity.user.avatar || "/placeholder.svg"} alt={activity.user.name} />
          <AvatarFallback className="bg-primary text-primary-foreground text-sm">
            {activity.user.name
              .split(" ")
              .map((n: string) => n[0])
              .join("")}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-semibold">{activity.user.name}</span>
            <span className="text-muted-foreground">{activity.action}</span>
            {activity.game && <span className="font-medium">{activity.game.title}</span>}
            {activity.list && <span className="font-medium">"{activity.list.name}"</span>}
            {activity.achievement && <span className="font-medium">{activity.achievement.name}</span>}
          </div>

          <div className="text-sm text-muted-foreground mb-3">{activity.timestamp}</div>

          {/* Game-specific content */}
          {activity.game && (
            <div className="flex gap-3 mb-3">
              <div className="w-12 h-16 bg-muted rounded overflow-hidden flex-shrink-0">
                <img
                  src={activity.game.image || "/placeholder.svg"}
                  alt={activity.game.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1">
                {activity.type === "review" && activity.review && (
                  <div>
                    <div className="flex items-center gap-4 mb-2 text-sm">
                      {renderStars(activity.rating, "w-3 h-3")}
                      <div className="flex items-center gap-1">
                        <Trophy className="w-3 h-3 text-secondary" />
                        <span>Difficulty: {activity.difficulty}/5</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{activity.hours}h</span>
                      </div>
                      {activity.completed && (
                        <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                          Completed
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-foreground">{activity.review}</p>
                  </div>
                )}
                {(activity.type === "game_completed" || activity.type === "game_rated") && (
                  <div className="flex items-center gap-4 text-sm">
                    {activity.rating && renderStars(activity.rating, "w-3 h-3")}
                    {activity.difficulty && (
                      <div className="flex items-center gap-1">
                        <Trophy className="w-3 h-3 text-secondary" />
                        <span>Difficulty: {activity.difficulty}/5</span>
                      </div>
                    )}
                    {activity.hours && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{activity.hours}h</span>
                      </div>
                    )}
                    {activity.completed && (
                      <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                        Completed
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* List-specific content */}
          {activity.list && (
            <div className="flex gap-2 mb-3">
              {activity.list.games.slice(0, 3).map((gameImage: string, index: number) => (
                <div key={index} className="w-8 h-10 bg-muted rounded overflow-hidden">
                  <img src={gameImage || "/placeholder.svg"} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
              <div className="flex items-center text-sm text-muted-foreground">
                <span>{activity.list.gameCount} games</span>
              </div>
            </div>
          )}

          {/* Achievement-specific content */}
          {activity.achievement && (
            <div className="flex items-center gap-3 mb-3 p-3 bg-primary/10 rounded-lg border border-primary/30">
              <div className="text-2xl">{activity.achievement.icon}</div>
              <div>
                <div className="font-semibold text-primary">{activity.achievement.name}</div>
                <div className="text-sm text-muted-foreground">{activity.achievement.description}</div>
              </div>
            </div>
          )}

          {/* Interaction buttons */}
          {(activity.type === "review" || activity.type === "list_created") && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <Button variant="ghost" size="sm" className="h-8 px-2 hover:text-primary">
                <Heart className="w-4 h-4 mr-1" />
                {activity.likes || 0}
              </Button>
              {activity.comments && (
                <Button variant="ghost" size="sm" className="h-8 px-2 hover:text-primary">
                  <MessageSquare className="w-4 h-4 mr-1" />
                  {activity.comments}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    )

    return baseContent
  }

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Navigation />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-playfair font-bold">Activity</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="border-border hover:border-primary bg-transparent">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
          </div>
        </div>

        {/* Activity Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-card mb-8">
            <TabsTrigger value="friends">Friends</TabsTrigger>
            <TabsTrigger value="you">You</TabsTrigger>
            <TabsTrigger value="incoming">Incoming</TabsTrigger>
          </TabsList>

          <TabsContent value="friends" className="space-y-4">
            {activities.map((activity) => (
              <Card key={activity.id} className="bg-card border-border p-6">
                {renderActivity(activity)}
              </Card>
            ))}

            {/* Load More */}
            <div className="text-center pt-6">
              <Button variant="outline" className="border-border hover:border-primary bg-transparent">
                Load More Activity
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="you" className="space-y-4">
            <Card className="bg-card border-border p-6">
              <div className="text-center py-12 text-muted-foreground">
                <Plus className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Your activity will appear here when you start playing and reviewing games.</p>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="incoming" className="space-y-4">
            <Card className="bg-card border-border p-6">
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Notifications and mentions will appear here.</p>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
