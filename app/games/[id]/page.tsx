"use client"

import { useState, useCallback, useEffect } from "react"
import { useParams } from "next/navigation"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/hooks/use-auth"
import { useGameDetail } from "@/hooks/use-game-detail"
import { UserGameActions } from "@/components/games/user-game-actions"
import { 
  Star, 
  Clock, 
  Trophy, 
  Heart, 
  MessageSquare, 
  Share, 
  Plus, 
  Monitor, 
  CheckCircle, 
  XCircle, 
  User,
  Edit,
  Bookmark,
  Flag,
  AlertCircle,
  Loader2,
  ArrowLeft
} from "lucide-react"
import Link from "next/link"

export default function GameDetailPage() {
  const params = useParams()
  const gameId = params?.id as string
  const [userRating, setUserRating] = useState([0])
  const [difficultyRating, setDifficultyRating] = useState([3])
  const [hoursPlayed, setHoursPlayed] = useState("")
  const [completed, setCompleted] = useState(false)
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false)
  const [reviewText, setReviewText] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)
  
  const { 
    isAuthenticated, 
    user, 
    userProfile, 
    displayName, 
    username, 
    avatarUrl 
  } = useAuth()

  // Use real game data from RAWG API
  const { 
    game, 
    userGame, 
    loading, 
    error, 
    updateUserGame, 
    refetch 
  } = useGameDetail(gameId)

  // Initialize form values from user game data
  useEffect(() => {
    if (userGame) {
      setUserRating([userGame.user_rating || 0])
      setDifficultyRating([userGame.difficulty_rating || 3])
      setHoursPlayed(userGame.hours_played?.toString() || "")
      setCompleted(userGame.completed || false)
      setReviewText(userGame.review || "")
    }
  }, [userGame])

  // Handle user game updates
  const handleUserGameUpdate = useCallback(async (data: any) => {
    if (!isAuthenticated) return
    
    setIsUpdating(true)
    try {
      await updateUserGame(data)
    } catch (error) {
      console.error('Failed to update user game:', error)
      // Optionally show error toast
    } finally {
      setIsUpdating(false)
    }
  }, [isAuthenticated, updateUserGame])

  // Handle review submission
  const handleReviewSubmit = useCallback(async () => {
    await handleUserGameUpdate({
      user_rating: userRating[0] || null,
      difficulty_rating: difficultyRating[0] || null,
      hours_played: parseInt(hoursPlayed) || 0,
      completed,
      review: reviewText || null
    })
    setIsReviewDialogOpen(false)
  }, [userRating, difficultyRating, hoursPlayed, completed, reviewText, handleUserGameUpdate])

  // Transform game data for display
  const displayGame = game ? {
    id: game.id,
    title: game.name,
    year: game.released ? new Date(game.released).getFullYear() : null,
    developer: game.developers?.[0]?.name || 'Unknown Developer',
    publisher: game.publishers?.[0]?.name || 'Unknown Publisher',
    genre: game.genres?.map(g => g.name) || [],
    platforms: game.platforms?.map(p => p.platform.name) || [],
    rating: game.rating || 0,
    totalRatings: game.ratings_count ? `${Math.round(game.ratings_count / 1000)}K` : '0',
    difficulty: 3.2, // We don't have this from RAWG, could calculate from user ratings
    averageHours: game.playtime || 0,
    image: game.background_image || "/placeholder.svg",
    description: game.description || 'No description available.',
    releaseDate: game.released || 'Unknown',
    esrbRating: game.esrb_rating?.name || 'Not Rated',
    tags: game.tags?.map(t => t.name).slice(0, 5) || [],
    metacritic: game.metacritic
  } : null

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

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-16 md:pb-0">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-4 gap-8 mb-12">
            <div className="col-span-1">
              <Skeleton className="aspect-[2/3] w-full" />
            </div>
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-12 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
            {isAuthenticated && (
              <div className="space-y-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background pb-16 md:pb-0">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center py-12">
            <Alert className="max-w-md mx-auto">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error}
                <div className="mt-4 space-x-2">
                  <Button variant="outline" onClick={refetch}>
                    Try Again
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/games">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to Games
                    </Link>
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    )
  }

  // Game not found
  if (!game || !displayGame) {
    return (
      <div className="min-h-screen bg-background pb-16 md:pb-0">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold mb-4">Game Not Found</h1>
            <p className="text-muted-foreground mb-6">
              The game you're looking for doesn't exist or couldn't be loaded.
            </p>
            <Button variant="outline" asChild>
              <Link href="/games">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Games
              </Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Game Header */}
        <div className={`grid ${isAuthenticated ? 'lg:grid-cols-4' : 'md:grid-cols-3'} gap-8 mb-12`}>
          {/* Game Cover */}
          <div className="md:col-span-1">
            <div className="aspect-[2/3] bg-card rounded-lg overflow-hidden border border-border">
              <img src={displayGame.image || "/placeholder.svg"} alt={displayGame.title} className="w-full h-full object-cover" />
            </div>
          </div>

          {/* Game Info */}
          <div className={isAuthenticated ? "lg:col-span-2" : "md:col-span-2"}>
            <div className="mb-6">
              <h1 className="text-4xl font-playfair font-bold mb-2">{displayGame.title}</h1>
              <p className="text-xl text-muted-foreground mb-4">
                {displayGame.year && `${displayGame.year} • `}Developed by {displayGame.developer}
              </p>

              {/* Rating and Stats */}
              <div className="flex flex-wrap items-center gap-6 mb-6">
                <div className="flex items-center gap-2">
                  {renderStars(displayGame.rating, "w-5 h-5")}
                  <span className="text-lg font-semibold">{displayGame.rating.toFixed(1)}</span>
                  <span className="text-muted-foreground">({displayGame.totalRatings} ratings)</span>
                </div>
                {displayGame.metacritic && (
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-secondary" />
                    <span>Metacritic: {displayGame.metacritic}</span>
                  </div>
                )}
                {displayGame.averageHours > 0 && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    <span>~{displayGame.averageHours}h average</span>
                  </div>
                )}
              </div>

              {/* Genres and Platforms */}
              <div className="mb-6">
                <div className="flex flex-wrap gap-2 mb-3">
                  {displayGame.genre.map((g, index) => (
                    <Badge key={index} variant="outline" className="bg-card">
                      {g}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Monitor className="w-4 h-4" />
                  <span>{displayGame.platforms.slice(0, 4).join(", ")}{displayGame.platforms.length > 4 ? '...' : ''}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 mb-6">
                {isAuthenticated ? (
                  <>
                    <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          className="bg-primary text-primary-foreground hover:bg-primary/90"
                          disabled={isUpdating}
                        >
                          {isUpdating ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Updating...
                            </>
                          ) : (
                            <>
                              <Star className="w-4 h-4 mr-2" />
                              Rate & Review
                            </>
                          )}
                        </Button>
                      </DialogTrigger>
                  <DialogContent className="bg-card border-border max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Rate & Review {displayGame.title}</DialogTitle>
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
                          value={reviewText}
                          onChange={(e) => setReviewText(e.target.value)}
                        />
                      </div>

                      <div className="flex gap-3">
                        <Button 
                          className="bg-primary text-primary-foreground hover:bg-primary/90 flex-1"
                          onClick={handleReviewSubmit}
                          disabled={isUpdating}
                        >
                          {isUpdating ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            'Save Review'
                          )}
                        </Button>
                        <Button variant="outline" onClick={() => setIsReviewDialogOpen(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                    </Dialog>

                    <Button 
                      variant="outline" 
                      className="border-border hover:border-primary bg-transparent"
                      onClick={() => handleUserGameUpdate({ is_favorite: !userGame?.is_favorite })}
                      disabled={isUpdating}
                    >
                      <Heart className={`w-4 h-4 mr-2 ${userGame?.is_favorite ? 'fill-current' : ''}`} />
                      {userGame?.is_favorite ? 'Remove from Wishlist' : 'Add to Wishlist'}
                    </Button>

                    <Button 
                      variant="outline" 
                      className="border-border hover:border-primary bg-transparent"
                      onClick={() => handleUserGameUpdate({ status: 'want_to_play' })}
                      disabled={isUpdating}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add to Library
                    </Button>

                    <Button 
                      variant="outline" 
                      className="border-border hover:border-primary bg-transparent"
                      onClick={() => handleUserGameUpdate({ completed: true, status: 'completed' })}
                      disabled={isUpdating}
                    >
                      <Bookmark className="w-4 h-4 mr-2" />
                      Mark as Completed
                    </Button>

                    <Button variant="outline" size="icon" className="border-border hover:border-primary bg-transparent">
                      <Share className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button className="bg-primary text-primary-foreground hover:bg-primary/90" asChild>
                      <Link href="/auth">
                        <Star className="w-4 h-4 mr-2" />
                        Sign in to Rate & Review
                      </Link>
                    </Button>
                    
                    <Button variant="outline" className="border-border hover:border-primary bg-transparent" asChild>
                      <Link href="/auth">
                        <Heart className="w-4 h-4 mr-2" />
                        Sign in to Add to Wishlist
                      </Link>
                    </Button>

                    <Button variant="outline" size="icon" className="border-border hover:border-primary bg-transparent">
                      <Share className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>

              {/* Description */}
              <p className="text-muted-foreground leading-relaxed">{displayGame.description}</p>
            </div>
          </div>

          {/* Personalized Sidebar for Authenticated Users */}
          {isAuthenticated && (
            <div className="space-y-6">
              {/* My Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4" />
                    My Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={avatarUrl || undefined} alt={displayName || username || 'User'} />
                      <AvatarFallback className="text-xs">
                        {displayName ? displayName.charAt(0).toUpperCase() : 
                         username ? username.charAt(0).toUpperCase() : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-sm">{displayName || username}</div>
                      <Badge variant="outline" className="text-xs">
                        {userGame?.status ? 
                          userGame.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 
                          'Not in Library'
                        }
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">My Rating</span>
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-primary text-primary" />
                        <span>{userGame?.user_rating ? `${userGame.user_rating}/5` : 'Not rated'}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Hours Played</span>
                      <span>{userGame?.hours_played || 0}h</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Progress</span>
                      <Badge variant="outline" className="text-xs">
                        {userGame?.completed ? 'Completed' : 
                         userGame?.status === 'playing' ? 'In Progress' :
                         userGame?.status ? 'Not Started' : 'Not in Library'}
                      </Badge>
                    </div>
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
                    <Edit className="h-4 w-4 mr-2" />
                    Update Status
                  </Button>
                  <Button variant="outline" className="w-full justify-start" size="sm">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Write Review
                  </Button>
                  <Button variant="outline" className="w-full justify-start" size="sm">
                    <Flag className="h-4 w-4 mr-2" />
                    Report Issue
                  </Button>
                </CardContent>
              </Card>

              {/* Friends Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Friends Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">JD</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <span className="font-medium">John</span> rated this 
                        <div className="inline-flex items-center gap-1 ml-1">
                          <Star className="w-3 h-3 fill-primary text-primary" />
                          <span>4.5</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">SM</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <span className="font-medium">Sarah</span> added to wishlist
                      </div>
                    </div>
                    <div className="text-center pt-2">
                      <Button variant="ghost" size="sm" className="text-xs">
                        View All Activity
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
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
                        <span>{displayGame.releaseDate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Developer:</span>
                        <span>{displayGame.developer}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Publisher:</span>
                        <span>{displayGame.publisher}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">ESRB Rating:</span>
                        <span>{displayGame.esrbRating}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Platforms</h3>
                    <div className="flex flex-wrap gap-2">
                      {displayGame.platforms.map((platform, index) => (
                        <Badge key={index} variant="outline" className="bg-background">
                          {platform}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {displayGame.tags.map((tag, index) => (
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
