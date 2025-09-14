"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Navigation } from '@/components/navigation'
import { FollowsListManager } from '@/components/profile/follows-list-manager'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '@/hooks/use-auth'
import { getProfileByUsername } from '@/lib/database/queries'
import { Profile } from '@/lib/database/types'
import { ArrowLeft, Heart, User, Lock, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

export default function UserFollowsPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const username = params.username as string
  
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load profile data
  useEffect(() => {
    const loadProfile = async () => {
      if (!username) return
      
      setLoading(true)
      setError(null)
      
      try {
        const { data, error } = await getProfileByUsername(username)
        
        if (error) {
          setError('User not found')
          setProfile(null)
        } else {
          setProfile(data)
        }
      } catch (err) {
        console.error('Error loading profile:', err)
        setError('Failed to load user profile')
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [username])

  // Check if user can view follows
  const canViewFollows = () => {
    if (!profile) return false
    if (profile.id === user?.id) return true // Own profile
    
    switch (profile.privacy_level) {
      case 'public':
        return true
      case 'friends':
        // TODO: Check if users are friends
        return false
      case 'private':
        return false
      default:
        return false
    }
  }

  // Redirect to own follows page if viewing own profile
  useEffect(() => {
    if (profile && profile.id === user?.id) {
      router.replace('/follows')
    }
  }, [profile, user?.id, router])

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-16 md:pb-0">
        <Navigation />
        
        <div className="max-w-6xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3"></div>
                <span>Loading profile...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !profile) {
    return (
      <div className="min-h-screen bg-background pb-16 md:pb-0">
        <Navigation />
        
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="mb-6">
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
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <User className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-xl font-semibold mb-2">Profile Not Found</h2>
                <p className="text-muted-foreground mb-4">
                  The profile "@{username}" doesn't exist or has been removed.
                </p>
                <Button asChild>
                  <Link href="/search">Find Other Users</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Privacy restricted
  if (!canViewFollows()) {
    return (
      <div className="min-h-screen bg-background pb-16 md:pb-0">
        <Navigation />
        
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="mb-6">
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
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Lock className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-xl font-semibold mb-2">Private Profile</h2>
                <p className="text-muted-foreground mb-4">
                  This user's follows are private. You need to be friends to view their follows.
                </p>
                <Button asChild>
                  <Link href={`/profile/${username}`}>
                    View Profile
                  </Link>
                </Button>
              </div>
            </CardContent>
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
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
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
            
            <div className="flex items-center gap-2">
              <Button variant="outline" asChild>
                <Link href={`/profile/${username}`}>
                  <User className="h-4 w-4 mr-2" />
                  View Profile
                </Link>
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">
              {profile.display_name || profile.username}'s Follows
            </h1>
            <p className="text-muted-foreground">
              Followers and following for @{profile.username}
            </p>
          </div>
        </div>

        {/* Privacy Notice */}
        {profile.privacy_level !== 'public' && (
          <Alert className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This profile has limited visibility. Some information may not be available.
            </AlertDescription>
          </Alert>
        )}

        {/* Follows List Manager */}
        <FollowsListManager 
          userId={profile.id}
          variant="full"
          showHeader={false}
        />
      </div>
    </div>
  )
}
