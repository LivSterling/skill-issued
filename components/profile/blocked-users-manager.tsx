"use client"

import { useState } from 'react'
import { usePrivacy } from '@/hooks/use-privacy'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { 
  Shield, 
  UserX, 
  Search, 
  RefreshCw, 
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { toast } from 'sonner'

interface BlockedUsersManagerProps {
  className?: string
}

export function BlockedUsersManager({ className = '' }: BlockedUsersManagerProps) {
  const {
    blockedUsers,
    loadingBlocked,
    unblockUser,
    refreshBlockedUsers
  } = usePrivacy()

  const [searchTerm, setSearchTerm] = useState('')
  const [unblocking, setUnblocking] = useState<string | null>(null)

  // Filter blocked users by search term
  const filteredUsers = blockedUsers.filter(block => {
    const user = block.blocked_user
    if (!user) return false
    
    const searchLower = searchTerm.toLowerCase()
    return (
      user.username?.toLowerCase().includes(searchLower) ||
      user.display_name?.toLowerCase().includes(searchLower)
    )
  })

  // Handle unblock user
  const handleUnblockUser = async (blockedUserId: string, username: string) => {
    setUnblocking(blockedUserId)

    try {
      await unblockUser(blockedUserId)
      toast.success(`Unblocked ${username}`)
    } catch (err) {
      console.error('Error unblocking user:', err)
      toast.error('Failed to unblock user')
    } finally {
      setUnblocking(null)
    }
  }

  // Render blocked user card
  const renderBlockedUser = (block: any) => {
    const user = block.blocked_user
    if (!user) return null

    const isExpired = block.expires_at && new Date(block.expires_at) < new Date()
    const isTemporary = block.expires_at && !isExpired

    return (
      <Card key={block.id} className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <Avatar className="h-12 w-12">
            <AvatarImage src={user.avatar_url || ''} alt={user.display_name || user.username} />
            <AvatarFallback className="bg-destructive/10 text-destructive">
              <UserX className="h-6 w-6" />
            </AvatarFallback>
          </Avatar>

          {/* User Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold truncate">
                {user.display_name || user.username}
              </h4>
              {user.display_name && (
                <span className="text-sm text-muted-foreground">@{user.username}</span>
              )}
              
              {/* Status Badges */}
              <div className="flex items-center gap-1 ml-auto">
                {isExpired && (
                  <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                    <Clock className="h-3 w-3 mr-1" />
                    Expired
                  </Badge>
                )}
                {isTemporary && (
                  <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                    <Calendar className="h-3 w-3 mr-1" />
                    Temporary
                  </Badge>
                )}
                {!block.expires_at && (
                  <Badge variant="destructive" className="text-xs">
                    <Shield className="h-3 w-3 mr-1" />
                    Permanent
                  </Badge>
                )}
              </div>
            </div>

            {/* Block Details */}
            <div className="space-y-2">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>
                  Blocked {formatDistanceToNow(new Date(block.blocked_at), { addSuffix: true })}
                </span>
                {isTemporary && (
                  <span>
                    Expires {formatDistanceToNow(new Date(block.expires_at), { addSuffix: true })}
                  </span>
                )}
              </div>

              {block.reason && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Reason: </span>
                  <span>{block.reason}</span>
                </div>
              )}

              {/* Exact dates on hover */}
              <div className="text-xs text-muted-foreground">
                <div>Blocked on {format(new Date(block.blocked_at), 'PPP')}</div>
                {block.expires_at && (
                  <div>Expires on {format(new Date(block.expires_at), 'PPP')}</div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={unblocking === user.id}
                >
                  {unblocking === user.id ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  Unblock
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Unblock {user.display_name || user.username}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove the block and allow {user.display_name || user.username} to 
                    interact with you again according to your privacy settings.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => handleUnblockUser(user.id, user.display_name || user.username)}
                  >
                    Unblock User
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <UserX className="h-6 w-6" />
            Blocked Users
          </h2>
          <p className="text-muted-foreground">
            Manage users you've blocked from interacting with you
          </p>
        </div>

        <Button variant="outline" onClick={refreshBlockedUsers} disabled={loadingBlocked}>
          {loadingBlocked ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {/* Search */}
      {blockedUsers.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search blocked users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {/* Loading State */}
      {loadingBlocked && blockedUsers.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="flex items-start gap-3 p-4">
                  <div className="w-12 h-12 bg-muted rounded-full animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded animate-pulse" />
                    <div className="h-3 bg-muted rounded w-3/4 animate-pulse" />
                    <div className="h-3 bg-muted rounded w-1/2 animate-pulse" />
                  </div>
                  <div className="w-20 h-8 bg-muted rounded animate-pulse" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Blocked Users List */}
      {!loadingBlocked && (
        <>
          {filteredUsers.length > 0 ? (
            <div className="space-y-3">
              {filteredUsers.map(renderBlockedUser)}
            </div>
          ) : blockedUsers.length > 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Search className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Results Found</h3>
                  <p className="text-muted-foreground">
                    No blocked users match "{searchTerm}"
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Blocked Users</h3>
                  <p className="text-muted-foreground mb-4">
                    You haven't blocked any users yet. Blocked users won't be able to 
                    interact with you or see your content.
                  </p>
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <AlertTriangle className="h-4 w-4" />
                    <span>You can block users from their profile pages or reports</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Info Card */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5" />
            About Blocking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              <strong>When you block someone:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>They can't send you friend requests or messages</li>
              <li>They can't see your profile, activity, or content</li>
              <li>They can't follow you or interact with your posts</li>
              <li>Any existing friendship or follow relationship is removed</li>
              <li>They won't be notified that you've blocked them</li>
            </ul>
            <p>
              <strong>Block duration:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><Badge variant="destructive" className="text-xs mr-1">Permanent</Badge> blocks last until you unblock them</li>
              <li><Badge variant="outline" className="text-xs mr-1">Temporary</Badge> blocks expire automatically</li>
              <li><Badge variant="outline" className="text-xs mr-1 bg-yellow-50 text-yellow-700 border-yellow-200">Expired</Badge> blocks are no longer active but remain in history</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
