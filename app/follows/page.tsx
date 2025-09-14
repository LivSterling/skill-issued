"use client"

import { Navigation } from '@/components/navigation'
import { FollowsListManager } from '@/components/profile/follows-list-manager'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'
import { Heart, Search, TrendingUp } from 'lucide-react'
import Link from 'next/link'

export default function FollowsPage() {
  const { user, isAuthenticated } = useAuth()

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background pb-16 md:pb-0">
        <Navigation />
        
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Heart className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
                <p className="text-muted-foreground mb-4">
                  You need to be signed in to view your follows.
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

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Navigation />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold">Follows</h1>
              <p className="text-muted-foreground">
                Manage your followers and who you're following
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" asChild>
                <Link href="/search">
                  <Search className="h-4 w-4 mr-2" />
                  Discover Users
                </Link>
              </Button>
              
              <Button asChild>
                <Link href="/profile">
                  <Heart className="h-4 w-4 mr-2" />
                  My Profile
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Follows List Manager */}
        <FollowsListManager 
          userId={user?.id}
          variant="full"
          showHeader={false}
        />
      </div>
    </div>
  )
}
