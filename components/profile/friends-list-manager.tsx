"use client"

import { useState, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useFriendRequests } from '@/hooks/use-friend-requests'
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
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/use-toast'
import { 
  Users, 
  UserPlus, 
  UserMinus, 
  UserCheck, 
  UserX, 
  Clock, 
  Search, 
  MoreHorizontal,
  Check,
  X,
  MessageCircle,
  Eye,
  Loader2,
  RefreshCw,
  Filter,
  SortAsc,
  Calendar,
  Heart,
  Shield
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

interface Friend {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  friendship_date: string
}

interface FriendRequest {
  id: string
  user_id: string
  friend_id: string
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
  message?: string
  sender_profile?: any
  recipient_profile?: any
}

interface FriendsListManagerProps {
  userId?: string
  variant?: 'full' | 'compact'
  showHeader?: boolean
  className?: string
}

export function FriendsListManager({
  userId,
  variant = 'full',
  showHeader = true,
  className = ''
}: FriendsListManagerProps) {
  const { user } = useAuth()
  const targetUserId = userId || user?.id
  const isOwnFriends = targetUserId === user?.id

  const {
    friends,
    pendingRequests,
    sentRequests,
    loading,
    error,
    friendsCount,
    pendingRequestsCount,
    sentRequestsCount,
    acceptFriendRequest,
    declineFriendRequest,
    cancelFriendRequest,
    removeFriend,
    refreshAll,
    clearError
  } = useFriendRequests()

  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'date'>('name')
  const [filterStatus, setFilterStatus] = useState<'all' | 'online' | 'recent'>('all')
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null)
  const [showRemoveDialog, setShowRemoveDialog] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Filter and sort friends
  const filteredFriends = friends
    .filter(friend => {
      if (!searchQuery) return true
      const query = searchQuery.toLowerCase()
      return (
        friend.display_name?.toLowerCase().includes(query) ||
        friend.username.toLowerCase().includes(query)
      )
    })
    .sort((a, b) => {
      if (sortBy === 'name') {
        const nameA = a.display_name || a.username
        const nameB = b.display_name || b.username
        return nameA.localeCompare(nameB)
      } else {
        return new Date(b.friendship_date).getTime() - new Date(a.friendship_date).getTime()
      }
    })

  // Handle friend request actions
  const handleAcceptRequest = useCallback(async (request: FriendRequest) => {
    setActionLoading(`accept-${request.id}`)
    
    try {
      const result = await acceptFriendRequest({
        requestId: request.id,
        action: 'accept'
      })
      
      if (result.success) {
        toast({
          title: "Friend Request Accepted",
          description: `You are now friends with ${request.sender_profile?.display_name || request.sender_profile?.username}`,
        })
      } else {
        toast({
          title: "Failed to Accept Friend Request",
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
  }, [acceptFriendRequest])

  const handleDeclineRequest = useCallback(async (request: FriendRequest) => {
    setActionLoading(`decline-${request.id}`)
    
    try {
      const result = await declineFriendRequest({
        requestId: request.id,
        action: 'decline'
      })
      
      if (result.success) {
        toast({
          title: "Friend Request Declined",
          description: "The friend request has been declined",
        })
      } else {
        toast({
          title: "Failed to Decline Friend Request",
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
  }, [declineFriendRequest])

  const handleCancelRequest = useCallback(async (request: FriendRequest) => {
    setActionLoading(`cancel-${request.id}`)
    
    try {
      const result = await cancelFriendRequest(request.id)
      
      if (result.success) {
        toast({
          title: "Friend Request Cancelled",
          description: "Your friend request has been cancelled",
        })
      } else {
        toast({
          title: "Failed to Cancel Friend Request",
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
  }, [cancelFriendRequest])

  const handleRemoveFriend = useCallback(async () => {
    if (!selectedFriend) return
    
    setActionLoading(`remove-${selectedFriend.id}`)
    
    try {
      const result = await removeFriend({ friendId: selectedFriend.id })
      
      if (result.success) {
        toast({
          title: "Friend Removed",
          description: `You are no longer friends with ${selectedFriend.display_name || selectedFriend.username}`,
        })
        setShowRemoveDialog(false)
        setSelectedFriend(null)
      } else {
        toast({
          title: "Failed to Remove Friend",
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
  }, [selectedFriend, removeFriend])

  // Render friend card
  const renderFriendCard = (friend: Friend) => (
    <Card key={friend.id} className="hover:shadow-md transition-shadow">
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={friend.avatar_url || ''} alt={friend.display_name || friend.username} />
              <AvatarFallback>
                {(friend.display_name || friend.username).slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Link 
                  href={`/profile/${friend.username}`}
                  className="font-medium hover:underline"
                >
                  {friend.display_name || friend.username}
                </Link>
                <Badge variant="secondary" className="text-xs">
                  <Users className="h-3 w-3 mr-1" />
                  Friend
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">@{friend.username}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Friends since {formatDistanceToNow(new Date(friend.friendship_date), { addSuffix: true })}
              </p>
            </div>
          </div>
          
          {isOwnFriends && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/profile/${friend.username}`}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {/* TODO: Implement messaging */}}>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Send Message
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => {
                    setSelectedFriend(friend)
                    setShowRemoveDialog(true)
                  }}
                  className="text-red-600"
                >
                  <UserMinus className="h-4 w-4 mr-2" />
                  Remove Friend
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardContent>
    </Card>
  )

  // Render friend request card
  const renderFriendRequestCard = (request: FriendRequest, type: 'received' | 'sent') => {
    const profile = type === 'received' ? request.sender_profile : request.recipient_profile
    const loadingKey = type === 'received' 
      ? `accept-${request.id}` 
      : `cancel-${request.id}`
    
    return (
      <Card key={request.id} className="hover:shadow-md transition-shadow">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={profile?.avatar_url || ''} alt={profile?.display_name || profile?.username} />
                <AvatarFallback>
                  {(profile?.display_name || profile?.username || 'U').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Link 
                    href={`/profile/${profile?.username}`}
                    className="font-medium hover:underline"
                  >
                    {profile?.display_name || profile?.username}
                  </Link>
                  <Badge variant="outline" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    Pending
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">@{profile?.username}</p>
                <p className="text-xs text-muted-foreground">
                  {type === 'received' ? 'Sent' : 'Requested'} {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                </p>
                {request.message && (
                  <p className="text-sm mt-2 p-2 bg-muted rounded-md">"{request.message}"</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {type === 'received' ? (
                <>
                  {actionLoading === `accept-${request.id}` ? (
                    <Button size="sm" disabled>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Accept
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => handleAcceptRequest(request)}>
                      <Check className="h-4 w-4 mr-2" />
                      Accept
                    </Button>
                  )}
                  
                  {actionLoading === `decline-${request.id}` ? (
                    <Button size="sm" variant="outline" disabled>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Decline
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => handleDeclineRequest(request)}>
                      <X className="h-4 w-4 mr-2" />
                      Decline
                    </Button>
                  )}
                </>
              ) : (
                <>
                  {actionLoading === `cancel-${request.id}` ? (
                    <Button size="sm" variant="outline" disabled>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Cancel
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => handleCancelRequest(request)}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  )}
                </>
              )}
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
            <span>Loading friends...</span>
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
            <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Error Loading Friends</h3>
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
              <Users className="h-5 w-5" />
              Friends ({friendsCount})
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="space-y-3">
            {filteredFriends.slice(0, 5).map(renderFriendCard)}
            
            {friendsCount > 5 && (
              <div className="text-center pt-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/friends">
                    View All {friendsCount} Friends
                  </Link>
                </Button>
              </div>
            )}
            
            {friendsCount === 0 && (
              <div className="text-center py-6">
                <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground">No friends yet</p>
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
          <h2 className="text-2xl font-bold">
            {isOwnFriends ? 'Your Friends' : 'Friends'}
          </h2>
          <Button onClick={refreshAll} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      )}

      <Tabs defaultValue="friends" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="friends" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Friends ({friendsCount})
          </TabsTrigger>
          {isOwnFriends && (
            <>
              <TabsTrigger value="pending" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Requests ({pendingRequestsCount})
              </TabsTrigger>
              <TabsTrigger value="sent" className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Sent ({sentRequestsCount})
              </TabsTrigger>
            </>
          )}
        </TabsList>

        {/* Friends Tab */}
        <TabsContent value="friends" className="space-y-4">
          {/* Search and filters */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search friends..."
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
                  Sort by Date Added
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Friends list */}
          <div className="space-y-3">
            {filteredFriends.map(renderFriendCard)}
            
            {filteredFriends.length === 0 && friends.length > 0 && (
              <div className="text-center py-8">
                <Search className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground">No friends match your search</p>
              </div>
            )}
            
            {friends.length === 0 && (
              <div className="text-center py-12">
                <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Friends Yet</h3>
                <p className="text-muted-foreground mb-4">
                  {isOwnFriends 
                    ? "Start connecting with other gamers to build your friend network!"
                    : "This user hasn't added any friends yet."
                  }
                </p>
                {isOwnFriends && (
                  <Button asChild>
                    <Link href="/search">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Find Friends
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Pending Requests Tab */}
        {isOwnFriends && (
          <TabsContent value="pending" className="space-y-4">
            <div className="space-y-3">
              {pendingRequests.map(request => renderFriendRequestCard(request, 'received'))}
              
              {pendingRequests.length === 0 && (
                <div className="text-center py-12">
                  <Clock className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Pending Requests</h3>
                  <p className="text-muted-foreground">
                    You don't have any pending friend requests at the moment.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        )}

        {/* Sent Requests Tab */}
        {isOwnFriends && (
          <TabsContent value="sent" className="space-y-4">
            <div className="space-y-3">
              {sentRequests.map(request => renderFriendRequestCard(request, 'sent'))}
              
              {sentRequests.length === 0 && (
                <div className="text-center py-12">
                  <UserPlus className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Sent Requests</h3>
                  <p className="text-muted-foreground">
                    You haven't sent any friend requests recently.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Remove Friend Confirmation Dialog */}
      <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Friend</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {selectedFriend?.display_name || selectedFriend?.username} from your friends? 
              You can send them a friend request again later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowRemoveDialog(false)
                setSelectedFriend(null)
              }}
              disabled={actionLoading?.startsWith('remove-')}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleRemoveFriend}
              disabled={actionLoading?.startsWith('remove-')}
            >
              {actionLoading?.startsWith('remove-') && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Remove Friend
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
