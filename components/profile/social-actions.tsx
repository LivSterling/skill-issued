"use client"

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
  UserPlus, 
  UserMinus, 
  UserCheck, 
  UserX, 
  Heart, 
  HeartOff, 
  MessageCircle, 
  MoreHorizontal,
  Check,
  X,
  Clock,
  Users,
  Eye,
  EyeOff,
  Flag,
  Shield,
  Loader2
} from 'lucide-react'
import { useFriendRequests, useFriendshipStatus } from '@/hooks/use-friend-requests'
import { useFollowRelationship } from '@/hooks/use-follows'
import { useAuth } from '@/hooks/use-auth'

interface SocialActionsProps {
  userId: string
  username?: string
  displayName?: string
  variant?: 'default' | 'compact' | 'minimal'
  showCounts?: boolean
  className?: string
  onActionComplete?: (action: string, success: boolean) => void
}

export function SocialActions({
  userId,
  username,
  displayName,
  variant = 'default',
  showCounts = true,
  className = '',
  onActionComplete
}: SocialActionsProps) {
  const { user, isAuthenticated } = useAuth()
  const [friendRequestMessage, setFriendRequestMessage] = useState('')
  const [showFriendRequestDialog, setShowFriendRequestDialog] = useState(false)
  const [showUnfriendDialog, setShowUnfriendDialog] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Hooks for social data
  const { sendFriendRequest, acceptFriendRequest, declineFriendRequest, removeFriend } = useFriendRequests()
  const { status: friendshipStatus, refresh: refreshFriendship } = useFriendshipStatus(userId)
  const { 
    isFollowing, 
    isFollowedBy, 
    followUser, 
    unfollowUser, 
    refresh: refreshFollow,
    isMutualFollow 
  } = useFollowRelationship(userId)

  // Don't render if viewing own profile or not authenticated
  if (!isAuthenticated || user?.id === userId) {
    return null
  }

  const userDisplayName = displayName || username || 'this user'

  // Handle friend request with optional message
  const handleSendFriendRequest = useCallback(async () => {
    setActionLoading('friend_request')
    
    try {
      const result = await sendFriendRequest({ 
        recipientId: userId, 
        message: friendRequestMessage.trim() || undefined 
      })
      
      if (result.success) {
        toast({
          title: "Friend Request Sent",
          description: `Your friend request has been sent to ${userDisplayName}`,
        })
        setShowFriendRequestDialog(false)
        setFriendRequestMessage('')
        await refreshFriendship()
        onActionComplete?.('friend_request_sent', true)
      } else {
        toast({
          title: "Failed to Send Friend Request",
          description: result.error || 'Please try again later',
          variant: "destructive"
        })
        onActionComplete?.('friend_request_sent', false)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      })
      onActionComplete?.('friend_request_sent', false)
    } finally {
      setActionLoading(null)
    }
  }, [userId, friendRequestMessage, userDisplayName, sendFriendRequest, refreshFriendship, onActionComplete])

  // Handle accept friend request
  const handleAcceptFriendRequest = useCallback(async () => {
    if (!friendshipStatus.friendship?.id) return
    
    setActionLoading('accept_friend')
    
    try {
      const result = await acceptFriendRequest({
        requestId: friendshipStatus.friendship.id,
        action: 'accept'
      })
      
      if (result.success) {
        toast({
          title: "Friend Request Accepted",
          description: `You are now friends with ${userDisplayName}`,
        })
        await refreshFriendship()
        onActionComplete?.('friend_request_accepted', true)
      } else {
        toast({
          title: "Failed to Accept Friend Request",
          description: result.error || 'Please try again later',
          variant: "destructive"
        })
        onActionComplete?.('friend_request_accepted', false)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      })
      onActionComplete?.('friend_request_accepted', false)
    } finally {
      setActionLoading(null)
    }
  }, [friendshipStatus.friendship?.id, userDisplayName, acceptFriendRequest, refreshFriendship, onActionComplete])

  // Handle decline friend request
  const handleDeclineFriendRequest = useCallback(async () => {
    if (!friendshipStatus.friendship?.id) return
    
    setActionLoading('decline_friend')
    
    try {
      const result = await declineFriendRequest({
        requestId: friendshipStatus.friendship.id,
        action: 'decline'
      })
      
      if (result.success) {
        toast({
          title: "Friend Request Declined",
          description: "The friend request has been declined",
        })
        await refreshFriendship()
        onActionComplete?.('friend_request_declined', true)
      } else {
        toast({
          title: "Failed to Decline Friend Request",
          description: result.error || 'Please try again later',
          variant: "destructive"
        })
        onActionComplete?.('friend_request_declined', false)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      })
      onActionComplete?.('friend_request_declined', false)
    } finally {
      setActionLoading(null)
    }
  }, [friendshipStatus.friendship?.id, declineFriendRequest, refreshFriendship, onActionComplete])

  // Handle remove friend
  const handleRemoveFriend = useCallback(async () => {
    setActionLoading('remove_friend')
    
    try {
      const result = await removeFriend({ friendId: userId })
      
      if (result.success) {
        toast({
          title: "Friend Removed",
          description: `You are no longer friends with ${userDisplayName}`,
        })
        setShowUnfriendDialog(false)
        await refreshFriendship()
        onActionComplete?.('friend_removed', true)
      } else {
        toast({
          title: "Failed to Remove Friend",
          description: result.error || 'Please try again later',
          variant: "destructive"
        })
        onActionComplete?.('friend_removed', false)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      })
      onActionComplete?.('friend_removed', false)
    } finally {
      setActionLoading(null)
    }
  }, [userId, userDisplayName, removeFriend, refreshFriendship, onActionComplete])

  // Handle follow/unfollow
  const handleFollowToggle = useCallback(async () => {
    const action = isFollowing ? 'unfollow' : 'follow'
    setActionLoading(action)
    
    try {
      const result = isFollowing ? await unfollowUser() : await followUser()
      
      if (result.success) {
        toast({
          title: isFollowing ? "Unfollowed" : "Following",
          description: isFollowing 
            ? `You are no longer following ${userDisplayName}`
            : `You are now following ${userDisplayName}`,
        })
        await refreshFollow()
        onActionComplete?.(action, true)
      } else {
        toast({
          title: isFollowing ? "Failed to Unfollow" : "Failed to Follow",
          description: result.error || 'Please try again later',
          variant: "destructive"
        })
        onActionComplete?.(action, false)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      })
      onActionComplete?.(action, false)
    } finally {
      setActionLoading(null)
    }
  }, [isFollowing, unfollowUser, followUser, userDisplayName, refreshFollow, onActionComplete])

  // Render loading button
  const renderLoadingButton = (loadingAction: string, children: React.ReactNode) => (
    <Button disabled variant="outline" size={variant === 'compact' ? 'sm' : 'default'}>
      {actionLoading === loadingAction && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
      {children}
    </Button>
  )

  // Render friend request buttons based on status
  const renderFriendActions = () => {
    switch (friendshipStatus.status) {
      case 'friends':
        return (
          <Dialog open={showUnfriendDialog} onOpenChange={setShowUnfriendDialog}>
            <DialogTrigger asChild>
              {actionLoading === 'remove_friend' ? (
                renderLoadingButton('remove_friend', 
                  <>
                    <UserCheck className="h-4 w-4 mr-2" />
                    Friends
                  </>
                )
              ) : (
                <Button variant="outline" size={variant === 'compact' ? 'sm' : 'default'}>
                  <UserCheck className="h-4 w-4 mr-2" />
                  Friends
                </Button>
              )}
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Remove Friend</DialogTitle>
                <DialogDescription>
                  Are you sure you want to remove {userDisplayName} from your friends? 
                  You can send them a friend request again later.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setShowUnfriendDialog(false)}
                  disabled={actionLoading === 'remove_friend'}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleRemoveFriend}
                  disabled={actionLoading === 'remove_friend'}
                >
                  {actionLoading === 'remove_friend' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Remove Friend
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )

      case 'pending':
        // Check if current user sent the request or received it
        const isReceivedRequest = friendshipStatus.friendship?.friend_id === user?.id
        
        if (isReceivedRequest) {
          // User received the friend request - show accept/decline
          return (
            <div className="flex items-center gap-2">
              {actionLoading === 'accept_friend' ? (
                renderLoadingButton('accept_friend', 
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Accept
                  </>
                )
              ) : (
                <Button 
                  size={variant === 'compact' ? 'sm' : 'default'}
                  onClick={handleAcceptFriendRequest}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Accept
                </Button>
              )}
              
              {actionLoading === 'decline_friend' ? (
                renderLoadingButton('decline_friend', 
                  <>
                    <X className="h-4 w-4 mr-2" />
                    Decline
                  </>
                )
              ) : (
                <Button 
                  variant="outline" 
                  size={variant === 'compact' ? 'sm' : 'default'}
                  onClick={handleDeclineFriendRequest}
                >
                  <X className="h-4 w-4 mr-2" />
                  Decline
                </Button>
              )}
            </div>
          )
        } else {
          // User sent the friend request - show pending status
          return (
            <Button variant="outline" size={variant === 'compact' ? 'sm' : 'default'} disabled>
              <Clock className="h-4 w-4 mr-2" />
              Request Sent
            </Button>
          )
        }

      default:
        // No friendship - show add friend button
        return (
          <Dialog open={showFriendRequestDialog} onOpenChange={setShowFriendRequestDialog}>
            <DialogTrigger asChild>
              {actionLoading === 'friend_request' ? (
                renderLoadingButton('friend_request', 
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Friend
                  </>
                )
              ) : (
                <Button size={variant === 'compact' ? 'sm' : 'default'}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Friend
                </Button>
              )}
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Send Friend Request</DialogTitle>
                <DialogDescription>
                  Send a friend request to {userDisplayName}. You can include an optional message.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="message">Message (optional)</Label>
                  <Textarea
                    id="message"
                    placeholder={`Hi ${userDisplayName}, I'd like to connect with you!`}
                    value={friendRequestMessage}
                    onChange={(e) => setFriendRequestMessage(e.target.value)}
                    maxLength={500}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    {friendRequestMessage.length}/500 characters
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowFriendRequestDialog(false)
                    setFriendRequestMessage('')
                  }}
                  disabled={actionLoading === 'friend_request'}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSendFriendRequest}
                  disabled={actionLoading === 'friend_request'}
                >
                  {actionLoading === 'friend_request' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Send Request
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )
    }
  }

  // Render follow button
  const renderFollowAction = () => {
    if (actionLoading === 'follow' || actionLoading === 'unfollow') {
      return renderLoadingButton(actionLoading, 
        isFollowing ? (
          <>
            <HeartOff className="h-4 w-4 mr-2" />
            Unfollow
          </>
        ) : (
          <>
            <Heart className="h-4 w-4 mr-2" />
            Follow
          </>
        )
      )
    }

    return (
      <Button 
        variant={isFollowing ? "outline" : "secondary"}
        size={variant === 'compact' ? 'sm' : 'default'}
        onClick={handleFollowToggle}
      >
        {isFollowing ? (
          <>
            <HeartOff className="h-4 w-4 mr-2" />
            Unfollow
          </>
        ) : (
          <>
            <Heart className="h-4 w-4 mr-2" />
            Follow
          </>
        )}
      </Button>
    )
  }

  // Render additional actions dropdown
  const renderMoreActions = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size={variant === 'compact' ? 'sm' : 'default'}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => {/* TODO: Implement messaging */}}>
          <MessageCircle className="h-4 w-4 mr-2" />
          Send Message
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => {/* TODO: Implement blocking */}}>
          <Shield className="h-4 w-4 mr-2" />
          Block User
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => {/* TODO: Implement reporting */}}>
          <Flag className="h-4 w-4 mr-2" />
          Report User
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  // Render relationship badges
  const renderRelationshipBadges = () => {
    if (variant === 'minimal' || !showCounts) return null

    return (
      <div className="flex items-center gap-2 flex-wrap">
        {friendshipStatus.status === 'friends' && (
          <Badge variant="secondary" className="text-xs">
            <Users className="h-3 w-3 mr-1" />
            Friends
          </Badge>
        )}
        {isMutualFollow && (
          <Badge variant="outline" className="text-xs">
            <Heart className="h-3 w-3 mr-1" />
            Mutual
          </Badge>
        )}
        {isFollowedBy && !isMutualFollow && (
          <Badge variant="outline" className="text-xs">
            <Eye className="h-3 w-3 mr-1" />
            Follows you
          </Badge>
        )}
      </div>
    )
  }

  // Render based on variant
  if (variant === 'minimal') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {renderFriendActions()}
        {renderFollowAction()}
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {renderFriendActions()}
        {renderFollowAction()}
        {renderMoreActions()}
        {renderRelationshipBadges()}
      </div>
    )
  }

  // Default variant - full featured
  return (
    <Card className={className}>
      <CardContent className="pt-4">
        <div className="space-y-4">
          {/* Main actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {renderFriendActions()}
            {renderFollowAction()}
            {renderMoreActions()}
          </div>

          {/* Relationship status badges */}
          {renderRelationshipBadges()}

          {/* Additional context */}
          {showCounts && (
            <div className="text-sm text-muted-foreground">
              {friendshipStatus.status === 'friends' && (
                <p className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Connected as friends
                </p>
              )}
              {isFollowedBy && (
                <p className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  Follows you
                </p>
              )}
              {isMutualFollow && (
                <p className="flex items-center gap-1">
                  <Heart className="h-3 w-3" />
                  You follow each other
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
