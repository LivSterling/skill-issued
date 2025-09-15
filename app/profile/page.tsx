"use client"

import { useState } from "react"
import { Navigation } from "@/components/navigation"
import { ProfileViewer } from "@/components/profile/profile-viewer"
import { SocialActivityFeed } from "@/components/profile/social-activity-feed"
import { FriendsListManager } from "@/components/profile/friends-list-manager"
import { FollowsListManager } from "@/components/profile/follows-list-manager"
import { PrivacySettings } from "@/components/profile/privacy-settings"
import { BlockedUsersManager } from "@/components/profile/blocked-users-manager"
import { RequireAuth } from "@/components/auth/protected-route"
import { AuthStatusIndicator, PageLoadingSkeleton } from "@/components/auth"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  User, 
  Activity, 
  Users, 
  Heart, 
  Shield, 
  UserX,
  Settings,
  ArrowLeft,
  AlertTriangle,
  Mail,
  Calendar,
  Gamepad2
} from "lucide-react"
import Link from "next/link"

export default function ProfilePage() {
  const { 
    user, 
    userProfile, 
    displayName, 
    username, 
    isProfileComplete, 
    accountCreatedAt,
    isEmailVerified,
    privacyLevel,
    gamingPreferences
  } = useAuth()
  const [activeTab, setActiveTab] = useState("profile")

  return (
    <RequireAuth 
      showLoadingSkeleton={true}
      errorMessage="You need to be signed in to view your profile"
    >
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Link>
            </Button>
          </div>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                {displayName ? `${displayName}'s Profile` : 'My Profile'}
              </h1>
              <p className="text-muted-foreground mb-2">
                Manage your gaming profile, social connections, and privacy settings
              </p>
              
              {/* Profile Status Indicators */}
              <div className="flex items-center gap-2 flex-wrap">
                {!isProfileComplete && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Profile Incomplete
                  </Badge>
                )}
                {!isEmailVerified && (
                  <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600">
                    <Mail className="h-3 w-3 mr-1" />
                    Email Not Verified
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs">
                  <Shield className="h-3 w-3 mr-1" />
                  {privacyLevel === 'public' ? 'Public Profile' : 
                   privacyLevel === 'friends' ? 'Friends Only' : 'Private Profile'}
                </Badge>
                {accountCreatedAt && (
                  <Badge variant="outline" className="text-xs">
                    <Calendar className="h-3 w-3 mr-1" />
                    Member since {new Date(accountCreatedAt).toLocaleDateString()}
                  </Badge>
                )}
              </div>
            </div>
            
            {/* Quick Profile Actions */}
            <div className="flex items-center gap-2">
              {!isProfileComplete && (
                <Button size="sm" asChild>
                  <Link href="/profile/edit">
                    <Settings className="h-4 w-4 mr-2" />
                    Complete Profile
                  </Link>
                </Button>
              )}
              {!isEmailVerified && (
                <Button variant="outline" size="sm">
                  <Mail className="h-4 w-4 mr-2" />
                  Verify Email
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Profile Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6 mb-8">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Activity</span>
            </TabsTrigger>
            <TabsTrigger value="friends" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Friends</span>
            </TabsTrigger>
            <TabsTrigger value="follows" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              <span className="hidden sm:inline">Follows</span>
            </TabsTrigger>
            <TabsTrigger value="privacy" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Privacy</span>
            </TabsTrigger>
            <TabsTrigger value="blocked" className="flex items-center gap-2">
              <UserX className="h-4 w-4" />
              <span className="hidden sm:inline">Blocked</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Profile */}
              <div className="lg:col-span-2">
                <ProfileViewer 
                  userId={user?.id}
                  showSocialActions={false}
                  showEditButton={true}
                  showPrivateInfo={true}
                  variant="full"
                />
              </div>
              
              {/* Sidebar - Quick Stats & Actions */}
              <div className="space-y-6">
                {/* Profile Completion Status */}
                {!isProfileComplete && (
                  <Card className="border-yellow-200 bg-yellow-50">
                    <CardContent className="pt-6">
                      <h3 className="font-semibold mb-2 flex items-center gap-2 text-yellow-800">
                        <AlertTriangle className="h-4 w-4" />
                        Complete Your Profile
                      </h3>
                      <p className="text-sm text-yellow-700 mb-4">
                        Your profile is incomplete. Complete it to get the most out of Skill Issued!
                      </p>
                      <Button size="sm" className="w-full" asChild>
                        <Link href="/profile/edit">
                          <Settings className="h-4 w-4 mr-2" />
                          Complete Now
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Email Verification Status */}
                {!isEmailVerified && (
                  <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="pt-6">
                      <h3 className="font-semibold mb-2 flex items-center gap-2 text-blue-800">
                        <Mail className="h-4 w-4" />
                        Verify Your Email
                      </h3>
                      <p className="text-sm text-blue-700 mb-4">
                        Please verify your email address to unlock all features and improve security.
                      </p>
                      <Button variant="outline" size="sm" className="w-full">
                        <Mail className="h-4 w-4 mr-2" />
                        Resend Verification
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Quick Actions */}
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Quick Actions
                    </h3>
                    <div className="space-y-3">
                      <Button variant="outline" className="w-full justify-start" asChild>
                        <Link href="/profile/edit">
                          <Settings className="h-4 w-4 mr-2" />
                          Edit Profile
                        </Link>
                      </Button>
                      <Button variant="outline" className="w-full justify-start" asChild>
                        <Link href="/privacy">
                          <Shield className="h-4 w-4 mr-2" />
                          Privacy Settings
                        </Link>
                      </Button>
                      <Button variant="outline" className="w-full justify-start" asChild>
                        <Link href="/friends">
                          <Users className="h-4 w-4 mr-2" />
                          Manage Friends
                        </Link>
                      </Button>
                      <Button variant="outline" className="w-full justify-start" asChild>
                        <Link href="/follows">
                          <Heart className="h-4 w-4 mr-2" />
                          Manage Follows
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Authentication Status */}
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Account Status
                    </h3>
                    <div className="space-y-3">
                      <AuthStatusIndicator variant="card" showDetails={true} />
                    </div>
                  </CardContent>
                </Card>

                {/* Gaming Preferences Summary */}
                {gamingPreferences && (
                  <Card>
                    <CardContent className="pt-6">
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <Gamepad2 className="h-4 w-4" />
                        Gaming Preferences
                      </h3>
                      <div className="space-y-3 text-sm">
                        {gamingPreferences.favorite_genres && gamingPreferences.favorite_genres.length > 0 && (
                          <div>
                            <span className="font-medium text-muted-foreground">Favorite Genres:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {gamingPreferences.favorite_genres.slice(0, 3).map((genre) => (
                                <Badge key={genre} variant="secondary" className="text-xs">
                                  {genre}
                                </Badge>
                              ))}
                              {gamingPreferences.favorite_genres.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{gamingPreferences.favorite_genres.length - 3} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {gamingPreferences.platforms && gamingPreferences.platforms.length > 0 && (
                          <div>
                            <span className="font-medium text-muted-foreground">Platforms:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {gamingPreferences.platforms.slice(0, 3).map((platform) => (
                                <Badge key={platform} variant="outline" className="text-xs">
                                  {platform}
                                </Badge>
                              ))}
                              {gamingPreferences.platforms.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{gamingPreferences.platforms.length - 3} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {gamingPreferences.playtime_preference && (
                          <div>
                            <span className="font-medium text-muted-foreground">Playtime:</span>
                            <Badge variant="outline" className="text-xs ml-2">
                              {gamingPreferences.playtime_preference}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Recent Activity Preview */}
                <div className="lg:block">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Recent Activity
                  </h3>
                  <SocialActivityFeed
                    userId={user?.id}
                    feedType="personal"
                    variant="compact"
                    showHeader={false}
                    maxItems={5}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Your Activity</h2>
                <p className="text-muted-foreground">
                  Track your gaming journey and social interactions
                </p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/activity">
                  <Activity className="h-4 w-4 mr-2" />
                  View All Activity
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

          {/* Friends Tab */}
          <TabsContent value="friends" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Your Friends</h2>
                <p className="text-muted-foreground">
                  Manage your gaming friends and connections
                </p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/friends">
                  <Users className="h-4 w-4 mr-2" />
                  Find Friends
                </Link>
              </Button>
            </div>
            
            <FriendsListManager />
          </TabsContent>

          {/* Follows Tab */}
          <TabsContent value="follows" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Following</h2>
                <p className="text-muted-foreground">
                  Users and creators you're following
                </p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/search">
                  <Heart className="h-4 w-4 mr-2" />
                  Discover Users
                </Link>
              </Button>
            </div>
            
            <FollowsListManager userId={user?.id} />
          </TabsContent>

          {/* Privacy Tab */}
          <TabsContent value="privacy" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Privacy Settings</h2>
                <p className="text-muted-foreground">
                  Control who can see your profile and interact with you
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                <Shield className="h-3 w-3 mr-1" />
                Current: {privacyLevel === 'public' ? 'Public' : 
                         privacyLevel === 'friends' ? 'Friends Only' : 'Private'}
              </Badge>
            </div>
            
            <PrivacySettings />
          </TabsContent>

          {/* Blocked Users Tab */}
          <TabsContent value="blocked" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Blocked Users</h2>
                <p className="text-muted-foreground">
                  Manage users you've blocked from interacting with you
                </p>
              </div>
            </div>
            
            <BlockedUsersManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
    </RequireAuth>
  )
}
