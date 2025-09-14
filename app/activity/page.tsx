"use client"

import { useState } from "react"
import { Navigation } from "@/components/navigation"
import { SocialActivityFeed } from "@/components/profile/social-activity-feed"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/hooks/use-auth"
import { Plus, MessageSquare, Activity } from "lucide-react"

export default function ActivityPage() {
  const { user, isAuthenticated } = useAuth()
  const [activeTab, setActiveTab] = useState("friends")

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background pb-16 md:pb-0">
        <Navigation />
        
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card className="p-6">
            <div className="text-center py-8">
              <Activity className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
              <p className="text-muted-foreground mb-4">
                You need to be signed in to view your activity feed.
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

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Activity Feed</h1>
          <p className="text-muted-foreground">
            Stay updated with your gaming community
          </p>
        </div>

        {/* Activity Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="friends">Friends</TabsTrigger>
            <TabsTrigger value="following">Following</TabsTrigger>
            <TabsTrigger value="personal">Personal</TabsTrigger>
            <TabsTrigger value="public">Public</TabsTrigger>
          </TabsList>

          <TabsContent value="friends">
            <SocialActivityFeed
              userId={user?.id}
              feedType="friends"
              variant="full"
              showHeader={false}
              maxItems={25}
            />
          </TabsContent>

          <TabsContent value="following">
            <SocialActivityFeed
              userId={user?.id}
              feedType="following"
              variant="full"
              showHeader={false}
              maxItems={25}
            />
          </TabsContent>

          <TabsContent value="personal">
            <SocialActivityFeed
              userId={user?.id}
              feedType="personal"
              variant="full"
              showHeader={false}
              maxItems={25}
            />
          </TabsContent>

          <TabsContent value="public">
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
    </div>
  )
}
