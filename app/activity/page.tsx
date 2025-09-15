"use client"

import { useState } from "react"
import { Navigation } from "@/components/navigation"
import { SocialActivityFeed } from "@/components/profile/social-activity-feed"
import { RequireAuth } from "@/components/auth/protected-route"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/hooks/use-auth"
import { 
  Plus, 
  MessageSquare, 
  Activity, 
  Users, 
  Heart, 
  Star, 
  Gamepad2, 
  TrendingUp,
  Filter,
  Settings,
  Bell,
  Eye,
  Clock,
  Calendar
} from "lucide-react"
import Link from "next/link"

export default function ActivityPage() {
  const { 
    user, 
    userProfile, 
    displayName, 
    username, 
    avatarUrl,
    gamingPreferences,
    privacyLevel 
  } = useAuth()
  const [activeTab, setActiveTab] = useState("friends")

  return (
    <RequireAuth 
      showLoadingSkeleton={true}
      errorMessage="You need to be signed in to view your activity feed"
    >
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Personalized Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={avatarUrl || undefined} alt={displayName || username || 'User'} />
                <AvatarFallback className="text-lg">
                  {displayName ? displayName.charAt(0).toUpperCase() : 
                   username ? username.charAt(0).toUpperCase() : 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-3xl font-bold mb-1">
                  {displayName || username}'s Activity Feed
                </h1>
                <p className="text-muted-foreground">
                  Stay connected with your gaming community and discover new content
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" asChild>
                <Link href="/search">
                  <Users className="h-4 w-4 mr-2" />
                  Find Friends
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/profile">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Link>
              </Button>
              <Button size="sm">
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </Button>
            </div>
          </div>
          
          {/* Activity Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <Card className="text-center">
              <CardContent className="pt-4 pb-3">
                <div className="text-2xl font-bold text-primary">0</div>
                <div className="text-xs text-muted-foreground">Friends Active</div>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-4 pb-3">
                <div className="text-2xl font-bold text-secondary">0</div>
                <div className="text-xs text-muted-foreground">New Reviews</div>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-4 pb-3">
                <div className="text-2xl font-bold text-primary">0</div>
                <div className="text-xs text-muted-foreground">Games Added</div>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-4 pb-3">
                <div className="text-2xl font-bold text-secondary">0</div>
                <div className="text-xs text-muted-foreground">Interactions</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Activity Content */}
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Main Activity Feed */}
          <div className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-6">
                <TabsTrigger value="friends" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">Friends</span>
                </TabsTrigger>
                <TabsTrigger value="following" className="flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  <span className="hidden sm:inline">Following</span>
                </TabsTrigger>
                <TabsTrigger value="personal" className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  <span className="hidden sm:inline">Personal</span>
                </TabsTrigger>
                <TabsTrigger value="public" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  <span className="hidden sm:inline">Public</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="friends" className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">Friends Activity</h2>
                    <p className="text-muted-foreground">
                      See what your gaming friends are up to
                    </p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/friends">
                      <Users className="h-4 w-4 mr-2" />
                      Manage Friends
                    </Link>
                  </Button>
                </div>
                
                <SocialActivityFeed
                  userId={user?.id}
                  feedType="friends"
                  variant="full"
                  showHeader={false}
                  maxItems={25}
                />
              </TabsContent>

              <TabsContent value="following" className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">Following Activity</h2>
                    <p className="text-muted-foreground">
                      Updates from users and creators you follow
                    </p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/follows">
                      <Heart className="h-4 w-4 mr-2" />
                      Manage Follows
                    </Link>
                  </Button>
                </div>
                
                <SocialActivityFeed
                  userId={user?.id}
                  feedType="following"
                  variant="full"
                  showHeader={false}
                  maxItems={25}
                />
              </TabsContent>

              <TabsContent value="personal" className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">Your Activity</h2>
                    <p className="text-muted-foreground">
                      Your gaming journey and interactions
                    </p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/profile">
                      <Eye className="h-4 w-4 mr-2" />
                      View Profile
                    </Link>
                  </Button>
                </div>
                
                <SocialActivityFeed
                  userId={user?.id}
                  feedType="personal"
                  variant="full"
                  showHeader={false}
                  maxItems={25}
                />
              </TabsContent>

              <TabsContent value="public" className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">Public Activity</h2>
                    <p className="text-muted-foreground">
                      Discover what's trending in the gaming community
                    </p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/search">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Explore More
                    </Link>
                  </Button>
                </div>
                
                <SocialActivityFeed
                  userId={user?.id}
                  feedType="public"
                  variant="full"
                  showHeader={false}
                  maxItems={25}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Gaming Preferences */}
            {gamingPreferences && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Gamepad2 className="h-4 w-4" />
                    Your Gaming Interests
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {gamingPreferences.favorite_genres && gamingPreferences.favorite_genres.length > 0 && (
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Favorite Genres</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {gamingPreferences.favorite_genres.slice(0, 3).map((genre) => (
                            <Badge key={genre} variant="secondary" className="text-xs">
                              {genre}
                            </Badge>
                          ))}
                          {gamingPreferences.favorite_genres.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{gamingPreferences.favorite_genres.length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {gamingPreferences.platforms && gamingPreferences.platforms.length > 0 && (
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Platforms</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {gamingPreferences.platforms.slice(0, 3).map((platform) => (
                            <Badge key={platform} variant="outline" className="text-xs">
                              {platform}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Activity Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Activity Filters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 text-sm">
                    <input type="checkbox" className="rounded" defaultChecked />
                    <span>Game Reviews</span>
                  </label>
                  <label className="flex items-center space-x-2 text-sm">
                    <input type="checkbox" className="rounded" defaultChecked />
                    <span>Game Ratings</span>
                  </label>
                  <label className="flex items-center space-x-2 text-sm">
                    <input type="checkbox" className="rounded" defaultChecked />
                    <span>Friend Requests</span>
                  </label>
                  <label className="flex items-center space-x-2 text-sm">
                    <input type="checkbox" className="rounded" defaultChecked />
                    <span>List Updates</span>
                  </label>
                  <label className="flex items-center space-x-2 text-sm">
                    <input type="checkbox" className="rounded" />
                    <span>Achievement Unlocks</span>
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start" size="sm" asChild>
                  <Link href="/games">
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Game
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" size="sm" asChild>
                  <Link href="/search">
                    <Users className="h-4 w-4 mr-2" />
                    Find Friends
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" size="sm" asChild>
                  <Link href="/profile/edit">
                    <Settings className="h-4 w-4 mr-2" />
                    Update Profile
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Activity Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  This Week
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Games Played</span>
                    <Badge variant="outline">0</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Reviews Written</span>
                    <Badge variant="outline">0</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Friends Added</span>
                    <Badge variant="outline">0</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Hours Played</span>
                    <Badge variant="outline">0h</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Games */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  Recently Played
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4 text-muted-foreground">
                  <Gamepad2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No recent games</p>
                  <Button variant="ghost" size="sm" className="mt-2" asChild>
                    <Link href="/games">Browse Games</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
    </RequireAuth>
  )
}
