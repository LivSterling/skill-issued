"use client"

import { useState } from "react"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Star, Clock, Trophy, Heart, MessageSquare, Share, Plus, Monitor, CheckCircle, XCircle } from "lucide-react"

export default function GameDetailPage() {
  const [userRating, setUserRating] = useState([0])
  const [difficultyRating, setDifficultyRating] = useState([3])
  const [hoursPlayed, setHoursPlayed] = useState("")
  const [completed, setCompleted] = useState(false)
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false)

  // Mock game data
  const game = {
    id: 1,
    title: "Baldur's Gate 3",
    year: 2023,
    developer: "Larian Studios",
    publisher: "Larian Studios",
    genre: ["RPG", "Turn-Based Strategy", "Fantasy"],
    platforms: ["PC", "PS5", "Xbox Series X/S", "macOS"],
    rating: 4.8,
    totalRatings: "125K",
    difficulty: 3.2,
    averageHours: 100,
    image: "/baldurs-gate-3-inspired-cover.png",
    description:
      "Baldur's Gate 3 is a story-rich, party-based RPG set in the universe of Dungeons & Dragons, where your choices shape a tale of fellowship and betrayal, survival and sacrifice, and the lure of absolute power.",
    releaseDate: "August 3, 2023",
    esrbRating: "M",
    tags: ["Story Rich", "Character Customization", "Choices Matter", "Co-op", "Turn-Based Combat"],
  }

  const reviews = [
    {
      id: 1,
      user: "GameMaster92",
      avatar: "/placeholder.svg?height=40&width=40",
      rating: 5,
      difficulty: 3,
      hoursPlayed: 120,
      completed: true,
      date: "2 days ago",
      content:
        "An absolute masterpiece that sets a new standard for RPGs. The depth of choice and consequence is unparalleled, and every character feels alive and meaningful.",
      likes: 45,
      comments: 12,
    },
    {
      id: 2,
      user: "RPGLover",
      avatar: "/placeholder.svg?height=40&width=40",
      rating: 4.5,
      difficulty: 4,
      hoursPlayed: 85,
      completed: false,
      date: "1 week ago",
      content:
        "Incredible storytelling and character development. The combat system takes some getting used to, but once you master it, it's incredibly rewarding.",
      likes: 32,
      comments: 8,
    },
  ]

  const relatedGames = [
    {
      title: "Divinity: Original Sin 2",
      year: 2017,
      rating: 4.6,
      image: "/placeholder.svg?height=200&width=150",
    },
    {
      title: "The Witcher 3",
      year: 2015,
      rating: 4.7,
      image: "/placeholder.svg?height=200&width=150",
    },
    {
      title: "Disco Elysium",
      year: 2019,
      rating: 4.5,
      image: "/placeholder.svg?height=200&width=150",
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

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Game Header */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {/* Game Cover */}
          <div className="md:col-span-1">
            <div className="aspect-[2/3] bg-card rounded-lg overflow-hidden border border-border">
              <img src={game.image || "/placeholder.svg"} alt={game.title} className="w-full h-full object-cover" />
            </div>
          </div>

          {/* Game Info */}
          <div className="md:col-span-2">
            <div className="mb-6">
              <h1 className="text-4xl font-playfair font-bold mb-2">{game.title}</h1>
              <p className="text-xl text-muted-foreground mb-4">
                {game.year} • Directed by {game.developer}
              </p>

              {/* Rating and Stats */}
              <div className="flex flex-wrap items-center gap-6 mb-6">
                <div className="flex items-center gap-2">
                  {renderStars(game.rating, "w-5 h-5")}
                  <span className="text-lg font-semibold">{game.rating}</span>
                  <span className="text-muted-foreground">({game.totalRatings} ratings)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-secondary" />
                  <span>Difficulty: {game.difficulty}/5</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  <span>~{game.averageHours}h average</span>
                </div>
              </div>

              {/* Genres and Platforms */}
              <div className="mb-6">
                <div className="flex flex-wrap gap-2 mb-3">
                  {game.genre.map((g, index) => (
                    <Badge key={index} variant="outline" className="bg-card">
                      {g}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Monitor className="w-4 h-4" />
                  <span>{game.platforms.join(", ")}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 mb-6">
                <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                      <Star className="w-4 h-4 mr-2" />
                      Rate & Review
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-border max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Rate & Review {game.title}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6">
                      <div>
                        <Label className="text-sm font-medium mb-2 block">Your Rating</Label>
                        <div className="flex items-center gap-4">
                          <Slider
                            value={userRating}
                            onValueChange={setUserRating}
                            max={5}
                            step={0.5}
                            className="flex-1"
                          />
                          <span className="text-sm font-medium w-8">{userRating[0]}/5</span>
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-medium mb-2 block">Difficulty Rating</Label>
                        <div className="flex items-center gap-4">
                          <Slider
                            value={difficultyRating}
                            onValueChange={setDifficultyRating}
                            max={5}
                            step={1}
                            className="flex-1"
                          />
                          <span className="text-sm font-medium w-8">{difficultyRating[0]}/5</span>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="hours" className="text-sm font-medium mb-2 block">
                          Hours Played
                        </Label>
                        <Input
                          id="hours"
                          type="number"
                          placeholder="0"
                          value={hoursPlayed}
                          onChange={(e) => setHoursPlayed(e.target.value)}
                          className="bg-background border-border"
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch id="completed" checked={completed} onCheckedChange={setCompleted} />
                        <Label htmlFor="completed" className="text-sm font-medium">
                          I completed this game
                        </Label>
                      </div>

                      <div>
                        <Label className="text-sm font-medium mb-2 block">Review (Optional)</Label>
                        <Textarea
                          placeholder="Share your thoughts about this game..."
                          className="bg-background border-border min-h-[100px]"
                        />
                      </div>

                      <div className="flex gap-3">
                        <Button className="bg-primary text-primary-foreground hover:bg-primary/90 flex-1">
                          Save Review
                        </Button>
                        <Button variant="outline" onClick={() => setIsReviewDialogOpen(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button variant="outline" className="border-border hover:border-primary bg-transparent">
                  <Heart className="w-4 h-4 mr-2" />
                  Add to Wishlist
                </Button>

                <Button variant="outline" className="border-border hover:border-primary bg-transparent">
                  <Plus className="w-4 h-4 mr-2" />
                  Add to List
                </Button>

                <Button variant="outline" size="icon" className="border-border hover:border-primary bg-transparent">
                  <Share className="w-4 h-4" />
                </Button>
              </div>

              {/* Description */}
              <p className="text-muted-foreground leading-relaxed">{game.description}</p>
            </div>
          </div>
        </div>

        {/* Game Details and Reviews */}
        <Tabs defaultValue="reviews" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-card mb-8">
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="lists">Lists</TabsTrigger>
            <TabsTrigger value="related">Related</TabsTrigger>
          </TabsList>

          <TabsContent value="reviews" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Reviews ({reviews.length})</h2>
              <Button variant="outline" className="border-border hover:border-primary bg-transparent">
                Sort by Popular
              </Button>
            </div>

            {reviews.map((review) => (
              <Card key={review.id} className="bg-card border-border p-6">
                <div className="flex items-start gap-4">
                  <img
                    src={review.avatar || "/placeholder.svg"}
                    alt={review.user}
                    className="w-10 h-10 rounded-full bg-muted"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-3">
                      <h3 className="font-semibold">{review.user}</h3>
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
                        <span>{review.hoursPlayed}h played</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {review.completed ? (
                          <CheckCircle className="w-4 h-4 text-primary" />
                        ) : (
                          <XCircle className="w-4 h-4 text-muted-foreground" />
                        )}
                        <span>{review.completed ? "Completed" : "In Progress"}</span>
                      </div>
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
          </TabsContent>

          <TabsContent value="details" className="space-y-6">
            <Card className="bg-card border-border p-6">
              <h2 className="text-2xl font-semibold mb-6">Game Details</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Release Information</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Release Date:</span>
                        <span>{game.releaseDate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Developer:</span>
                        <span>{game.developer}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Publisher:</span>
                        <span>{game.publisher}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">ESRB Rating:</span>
                        <span>{game.esrbRating}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Platforms</h3>
                    <div className="flex flex-wrap gap-2">
                      {game.platforms.map((platform, index) => (
                        <Badge key={index} variant="outline" className="bg-background">
                          {platform}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {game.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="bg-secondary/20 text-secondary-foreground">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="lists">
            <Card className="bg-card border-border p-6">
              <h2 className="text-2xl font-semibold mb-4">Featured in Lists</h2>
              <p className="text-muted-foreground">This game hasn't been added to any public lists yet.</p>
            </Card>
          </TabsContent>

          <TabsContent value="related" className="space-y-6">
            <h2 className="text-2xl font-semibold">Related Games</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {relatedGames.map((relatedGame, index) => (
                <Card
                  key={index}
                  className="group cursor-pointer bg-card border-border hover:border-primary transition-colors"
                >
                  <div className="aspect-[2/3] bg-muted rounded-t-lg overflow-hidden">
                    <img
                      src={relatedGame.image || "/placeholder.svg"}
                      alt={relatedGame.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-sm mb-1 line-clamp-2">{relatedGame.title}</h3>
                    <p className="text-xs text-muted-foreground mb-2">{relatedGame.year}</p>
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-primary text-primary" />
                      <span className="text-xs">{relatedGame.rating}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
