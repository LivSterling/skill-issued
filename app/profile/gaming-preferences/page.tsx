"use client"

import { Navigation } from "@/components/navigation"
import { GamingPreferencesManager } from "@/components/profile/gaming-preferences-manager"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Gamepad2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function GamingPreferencesPage() {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background pb-16 md:pb-0">
        <Navigation />
        
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Gamepad2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
                <p className="text-muted-foreground mb-4">
                  You need to be signed in to manage your gaming preferences.
                </p>
                <Button asChild>
                  <Link href="/auth/signin">Sign In</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const handleSave = () => {
    // Show success message and optionally redirect
    router.push('/profile')
  }

  const handleCancel = () => {
    router.back()
  }

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Gaming Preferences</h1>
            <p className="text-muted-foreground">
              Customize your gaming preferences to connect with like-minded gamers and get better recommendations.
            </p>
          </div>
        </div>

        {/* Gaming Preferences Manager */}
        <GamingPreferencesManager
          userId={user?.id}
          onSave={handleSave}
          onCancel={handleCancel}
          showHeader={false}
          compact={false}
        />

        {/* Tips Card */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Tips for Better Connections</CardTitle>
            <CardDescription>
              Make the most of your gaming preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <h4 className="font-medium">🎮 Genres & Platforms</h4>
                <p className="text-muted-foreground">
                  Select multiple genres and platforms to increase your chances of finding gaming partners.
                </p>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">⏰ Availability</h4>
                <p className="text-muted-foreground">
                  Set your time zone and gaming hours to help others coordinate sessions with you.
                </p>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">👥 Social Goals</h4>
                <p className="text-muted-foreground">
                  Be specific about what you're looking for - teammates, casual friends, or competitive partners.
                </p>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">🌍 Languages</h4>
                <p className="text-muted-foreground">
                  Adding multiple languages helps you connect with a broader gaming community.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
