"use client"

import { useState, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useFollows, useFollowRelationship } from '@/hooks/use-follows'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog'
import { toast } from '@/components/ui/use-toast'
import { 
  Heart, 
  HeartOff, 
  Eye, 
  Users, 
  UserPlus, 
  UserMinus, 
  Search, 
  MoreHorizontal,
  MessageCircle,
  Loader2,
  RefreshCw,
  SortAsc,
  Calendar,
  ArrowLeftRight,
  TrendingUp,
  Filter
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

interface FollowProfile {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  followed_at: string
}

interface FollowsListManagerProps {
  userId?: string
  variant?: 'full' | 'compact'
  showHeader?: boolean
  defaultTab?: 'followers' | 'following'
  className?: string
}

export function FollowsListManager({
  userId,
  variant = 'full',
  showHeader = true,
  defaultTab = 'followers',
  className = ''
}: FollowsListManagerProps) {
  const { user } = useAuth()
  const targetUserId = userId || user?.id
  const isOwnProfile = targetUserId === user?.id

  const {
    followers,
    following,
    loading,
    error,
    followersCount,
    followingCount,
    followUser,
    unfollowUser,
    refreshFollowers,
    refreshFollowing,
    refreshAll,
    clearError
  } = useFollows(targetUserId)

  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'date'>('name')
  const [selectedUser, setSelectedUser] = useState<FollowProfile | null>(null)
  const [showUnfollowDialog, setShowUnfollowDialog] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState(defaultTab)

  // Filter and sort followers/following
  const filterAndSort = (profiles: FollowProfile[]) => {
    return profiles
      .filter(profile => {
        if (!searchQuery) return true
        const query = searchQuery.toLowerCase()
        return (
          profile.display_name?.toLowerCase().includes(query) ||
          profile.username.toLowerCase().includes(query)
        )
      })
      .sort((a, b) => {
        if (sortBy === 'name') {
          const nameA = a.display_name || a.username
          const nameB = b.display_name || b.username
          return nameA.localeCompare(nameB)
        } else {
          return new Date(b.followed_at).getTime() - new Date(a.followed_at).getTime()
        }
      })
  }

  const filteredFollowers = filterAndSort(followers)
  const filteredFollowing = filterAndSort(following)

  // Handle follow/unfollow actions
  const handleFollowToggle = useCallback(async (profile: FollowProfile, isCurrentlyFollowing: boolean) => {
    if (!user?.id) return
    
    setActionLoading(`follow-${profile.id}`)
    
    try {
      const result = isCurrentlyFollowing 
        ? await unfollowUser({ targetUserId: profile.id })
        : await followUser({ targetUserId: profile.id })
      
      if (result.success) {
        toast({
          title: isCurrentlyFollowing ? "Unfollowed" : "Following",
          description: isCurrentlyFollowing 
            ? `You are no longer following ${profile.display_name || profile.username}`
            : `You are now following ${profile.display_name || profile.username}`,
        })
        
        // Refresh the appropriate list
        if (activeTab === 'following') {
          await refreshFollowing()
        } else {
          await refreshFollowers()
        }
      } else {
        toast({
          title: isCurrentlyFollowing ? "Failed to Unfollow" : "Failed to Follow",
          description: result.error || 'Please try again later',
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      })
    } finally {
      setActionLoading(null)
    }
  }, [user?.id, unfollowUser, followUser, activeTab, refreshFollowing, refreshFollowers])

  const handleUnfollowConfirm = useCallback(async () => {
    if (!selectedUser) return
    
    await handleFollowToggle(selectedUser, true)
    setShowUnfollowDialog(false)
    setSelectedUser(null)
  }, [selectedUser, handleFollowToggle])

  // Component for individual follow profile card
  const FollowProfileCard = ({ profile, type }: { profile: FollowProfile; type: 'follower' | 'following' }) => {
    const { isFollowing, canFollow } = useFollowRelationship(profile.id)
    
    return (
      <Card key={profile.id} className="hover:shadow-md transition-shadow">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={profile.avatar_url || ''} alt={profile.display_name || profile.username} />
                <AvatarFallback>
                  {(profile.display_name || profile.username).slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Link 
                    href={`/profile/${profile.username}`}
                    className="font-medium hover:underline"
                  >
                    {profile.display_name || profile.username}
                  </Link>
                  <Badge variant="outline" className="text-xs">
                    {type === 'follower' ? (
                      <>
                        <Eye className="h-3 w-3 mr-1" />
                        Follower
                      </>
                    ) : (
                      <>
                        <Heart className="h-3 w-3 mr-1" />
                        Following
                      </>
                    )}
                  </Badge>
                  {isFollowing && type === 'follower' && (
                    <Badge variant="secondary" className="text-xs">
                      <ArrowLeftRight className="h-3 w-3 mr-1" />
                      Mutual
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">@{profile.username}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {type === 'follower' ? 'Following you' : 'You followed'} {formatDistanceToNow(new Date(profile.followed_at), { addSuffix: true })}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Follow/Unfollow button for own profile */}
              {isOwnProfile && type === 'follower' && canFollow && (
                <>
                  {actionLoading === `follow-${profile.id}` ? (
                    <Button size="sm" disabled>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {isFollowing ? 'Unfollow' : 'Follow'}
                    </Button>
                  ) : (
                    <Button 
                      size="sm" 
                      variant={isFollowing ? "outline" : "default"}
                      onClick={() => handleFollowToggle(profile, isFollowing)}
                    >
                      {isFollowing ? (
                        <>
                          <HeartOff className="h-4 w-4 mr-2" />
                          Unfollow
                        </>
                      ) : (
                        <>
                          <Heart className="h-4 w-4 mr-2" />
                          Follow Back
                        </>
                      )}
                    </Button>
                  )}
                </>
              )}

              {/* Unfollow button for following list */}
              {isOwnProfile && type === 'following' && (
                <>
                  {actionLoading === `follow-${profile.id}` ? (
                    <Button size="sm" variant="outline" disabled>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Unfollow
                    </Button>
                  ) : (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setSelectedUser(profile)
                        setShowUnfollowDialog(true)
                      }}
                    >
                      <HeartOff className="h-4 w-4 mr-2" />
                      Unfollow
                    </Button>
                  )}
                </>
              )}

              {/* More actions menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/profile/${profile.username}`}>
                      <Eye className="h-4 w-4 mr-2" />
                      View Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {/* TODO: Implement messaging */}}>
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Send Message
                  </DropdownMenuItem>
                  {isOwnProfile && type === 'follower' && !isFollowing && canFollow && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleFollowToggle(profile, false)}>
                        <Heart className="h-4 w-4 mr-2" />
                        Follow Back
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Render loading state
  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mr-3" />
            <span>Loading follows...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Render error state
  if (error) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Heart className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Error Loading Follows</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <div className="flex items-center justify-center gap-2">
              <Button onClick={clearError} variant="outline">
                Dismiss
              </Button>
              <Button onClick={refreshAll}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <Card className={className}>
        {showHeader && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5" />
              Follows
            </CardTitle>
            <CardDescription>
              {followersCount} followers • {followingCount} following
            </CardDescription>
          </CardHeader>
        )}
        <CardContent>
          <div className="space-y-3">
            {/* Show recent followers */}
            {filteredFollowers.slice(0, 3).map(profile => (
              <FollowProfileCard key={profile.id} profile={profile} type="follower" />
            ))}
            
            {(followersCount > 3 || followingCount > 0) && (
              <div className="text-center pt-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/profile/${targetUserId}/follows`}>
                    View All Follows
                  </Link>
                </Button>
              </div>
            )}
            
            {followersCount === 0 && followingCount === 0 && (
              <div className="text-center py-6">
                <Heart className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground">No follows yet</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Full variant
  return (
    <div className={`space-y-6 ${className}`}>
      {showHeader && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              {isOwnProfile ? 'Your Follows' : 'Follows'}
            </h2>
            <p className="text-muted-foreground">
              {followersCount} followers • {followingCount} following
            </p>
          </div>
          <Button onClick={refreshAll} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="followers" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Followers ({followersCount})
          </TabsTrigger>
          <TabsTrigger value="following" className="flex items-center gap-2">
            <Heart className="h-4 w-4" />
            Following ({followingCount})
          </TabsTrigger>
        </TabsList>

        {/* Followers Tab */}
        <TabsContent value="followers" className="space-y-4">
          {/* Search and filters */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search followers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <SortAsc className="h-4 w-4 mr-2" />
                  Sort
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setSortBy('name')}>
                  Sort by Name
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('date')}>
                  Sort by Follow Date
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Followers list */}
          <div className="space-y-3">
            {filteredFollowers.map(profile => (
              <FollowProfileCard key={profile.id} profile={profile} type="follower" />
            ))}
            
            {filteredFollowers.length === 0 && followers.length > 0 && (
              <div className="text-center py-8">
                <Search className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground">No followers match your search</p>
              </div>
            )}
            
            {followers.length === 0 && (
              <div className="text-center py-12">
                <Eye className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Followers Yet</h3>
                <p className="text-muted-foreground mb-4">
                  {isOwnProfile 
                    ? "Share your gaming content to attract followers!"
                    : "This user doesn't have any followers yet."
                  }
                </p>
                {isOwnProfile && (
                  <Button asChild>
                    <Link href="/profile/edit">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Complete Your Profile
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Following Tab */}
        <TabsContent value="following" className="space-y-4">
          {/* Search and filters */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search following..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <SortAsc className="h-4 w-4 mr-2" />
                  Sort
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setSortBy('name')}>
                  Sort by Name
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('date')}>
                  Sort by Follow Date
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Following list */}
          <div className="space-y-3">
            {filteredFollowing.map(profile => (
              <FollowProfileCard key={profile.id} profile={profile} type="following" />
            ))}
            
            {filteredFollowing.length === 0 && following.length > 0 && (
              <div className="text-center py-8">
                <Search className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground">No following match your search</p>
              </div>
            )}
            
            {following.length === 0 && (
              <div className="text-center py-12">
                <Heart className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Not Following Anyone</h3>
                <p className="text-muted-foreground mb-4">
                  {isOwnProfile 
                    ? "Discover and follow other gamers to see their content!"
                    : "This user isn't following anyone yet."
                  }
                </p>
                {isOwnProfile && (
                  <Button asChild>
                    <Link href="/search">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Discover Users
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Unfollow Confirmation Dialog */}
      <Dialog open={showUnfollowDialog} onOpenChange={setShowUnfollowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unfollow User</DialogTitle>
            <DialogDescription>
              Are you sure you want to unfollow {selectedUser?.display_name || selectedUser?.username}? 
              You can follow them again at any time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowUnfollowDialog(false)
                setSelectedUser(null)
              }}
              disabled={actionLoading?.startsWith('follow-')}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleUnfollowConfirm}
              disabled={actionLoading?.startsWith('follow-')}
            >
              {actionLoading?.startsWith('follow-') && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Unfollow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
