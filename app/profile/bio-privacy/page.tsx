"use client"

import { Navigation } from "@/components/navigation"
import { BioPrivacyManager } from "@/components/profile/bio-privacy-manager"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Shield, User } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function BioPrivacyPage() {
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
                <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
                <p className="text-muted-foreground mb-4">
                  You need to be signed in to manage your bio and privacy settings.
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
            <h1 className="text-3xl font-bold">Bio & Privacy Settings</h1>
            <p className="text-muted-foreground">
              Manage your profile bio and control who can see your information and interact with you.
            </p>
          </div>
        </div>

        {/* Bio & Privacy Manager */}
        <BioPrivacyManager
          userId={user?.id}
          onSave={handleSave}
          onCancel={handleCancel}
          showHeader={false}
          compact={false}
        />

        {/* Privacy Tips Card */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Privacy & Safety Tips
            </CardTitle>
            <CardDescription>
              Keep your gaming experience safe and enjoyable
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Profile Best Practices
                </h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Keep personal information like real name and email private</li>
                  <li>• Use a bio that reflects your gaming interests and personality</li>
                  <li>• Be honest about your gaming preferences and skill level</li>
                  <li>• Consider what information helps others connect with you</li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Privacy Recommendations
                </h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Start with "Friends Only" privacy if you're unsure</li>
                  <li>• Review and adjust settings regularly</li>
                  <li>• Be cautious about showing personal contact information</li>
                  <li>• Consider disabling direct messages from strangers initially</li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium">🎮 Gaming Community</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• A good bio helps you find compatible gaming partners</li>
                  <li>• Mention your preferred communication style</li>
                  <li>• Include your gaming schedule and time zone</li>
                  <li>• Be clear about competitive vs. casual preferences</li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium">🔒 Account Security</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Never share account passwords or personal details</li>
                  <li>• Report any suspicious or inappropriate behavior</li>
                  <li>• Use strong, unique passwords for your gaming accounts</li>
                  <li>• Be cautious when clicking links from other users</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
