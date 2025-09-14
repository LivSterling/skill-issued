"use client"

import { useState } from "react"
import { Navigation } from "@/components/navigation"
import { ProfileViewer } from "@/components/profile/profile-viewer"
import { SocialActivityFeed } from "@/components/profile/social-activity-feed"
import { FriendsListManager } from "@/components/profile/friends-list-manager"
import { FollowsListManager } from "@/components/profile/follows-list-manager"
import { PrivacySettings } from "@/components/profile/privacy-settings"
import { BlockedUsersManager } from "@/components/profile/blocked-users-manager"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  User, 
  Activity, 
  Users, 
  Heart, 
  Shield, 
  UserX,
  Settings,
  ArrowLeft
} from "lucide-react"
import Link from "next/link"

export default function ProfilePage() {
  const { user, isAuthenticated } = useAuth()
  const [activeTab, setActiveTab] = useState("profile")

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background pb-16 md:pb-0">
        <Navigation />
        
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card className="p-6">
            <div className="text-center py-8">
              <User className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
              <p className="text-muted-foreground mb-4">
                You need to be signed in to view your profile.
              </p>
              <Button asChild>
                <a href="/auth/signin">Sign In</a>
              </Button>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
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
          
          <h1 className="text-3xl font-bold mb-2">My Profile</h1>
          <p className="text-muted-foreground">
            Manage your gaming profile, social connections, and privacy settings
          </p>
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
          <TabsContent value="activity">
            <SocialActivityFeed
              userId={user?.id}
              feedType="personal"
              variant="full"
              showHeader={true}
              maxItems={25}
            />
          </TabsContent>

          {/* Friends Tab */}
          <TabsContent value="friends">
            <FriendsListManager />
          </TabsContent>

          {/* Follows Tab */}
          <TabsContent value="follows">
            <FollowsListManager userId={user?.id} />
          </TabsContent>

          {/* Privacy Tab */}
          <TabsContent value="privacy">
            <PrivacySettings />
          </TabsContent>

          {/* Blocked Users Tab */}
          <TabsContent value="blocked">
            <BlockedUsersManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
