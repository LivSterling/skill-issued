"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Navigation } from '@/components/navigation'
import { ProfileViewer } from '@/components/profile/profile-viewer'
import { SocialActivityFeed } from '@/components/profile/social-activity-feed'
import { SocialActions } from '@/components/profile/social-actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ArrowLeft, 
  User, 
  Share2, 
  Flag, 
  Eye, 
  EyeOff, 
  Lock,
  AlertTriangle,
  RefreshCw,
  Calendar,
  MapPin,
  Clock,
  Users,
  Gamepad2,
  Shield
} from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import { getProfileByUsername } from '@/lib/database/queries'
import { Profile } from '@/lib/database/types'
import { formatDistanceToNow, format } from 'date-fns'

export default function PublicProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()
  const username = params.username as string
  
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [isBlocked, setIsBlocked] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [showReportDialog, setShowReportDialog] = useState(false)

  // Mock social data for privacy checks (in real app, this would come from hooks)
  const friends: any[] = []
  const followers: any[] = []
  const following: any[] = []

  // Load profile data
  useEffect(() => {
    const loadProfile = async () => {
      if (!username) return
      
      setLoading(true)
      setError(null)
      
      try {
        const { data, error } = await getProfileByUsername(username)
        
        if (error) {
          setError('Profile not found')
          setProfile(null)
        } else {
          setProfile(data)
          
          // Check if user is blocked (you would implement this logic)
          // setIsBlocked(await checkIfBlocked(data.id))
        }
      } catch (err) {
        console.error('Error loading profile:', err)
        setError('Failed to load profile')
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [username])

  // Check if this is the current user's own profile
  const isOwnProfile = user?.id === profile?.id

  // Check privacy permissions
  const canViewProfile = () => {
    if (!profile) return false
    if (isOwnProfile) return true
    
    switch (profile.privacy_level) {
      case 'public':
        return true
      case 'friends':
        return friends.some(friend => friend.id === profile.id)
      case 'private':
        return false
      default:
        return false
    }
  }

  // Check if users are friends
  const isFriend = friends.some(friend => friend.id === profile?.id)
  const isFollowing = following.some(follow => follow.id === profile?.id)
  const isFollower = followers.some(follower => follower.id === profile?.id)


  const handleBlock = async () => {
    if (!profile) return
    
    const confirmed = window.confirm(
      `Are you sure you want to block ${profile.display_name || profile.username}? This will remove them from your friends and prevent them from seeing your profile.`
    )
    
    if (confirmed) {
      try {
        // TODO: Implement block functionality
        console.log('Block user:', profile.id)
        setIsBlocked(true)
        alert('Block functionality will be implemented in the social features phase')
      } catch (error) {
        console.error('Error blocking user:', error)
      }
    }
  }

  const handleReport = async () => {
    if (!profile || !reportReason) return
    
    try {
      // TODO: Implement report functionality
      console.log('Report user:', profile.id, 'Reason:', reportReason)
      setShowReportDialog(false)
      setReportReason('')
      alert('Report functionality will be implemented in the social features phase')
    } catch (error) {
      console.error('Error reporting user:', error)
      alert('Failed to submit report')
    }
  }

  const handleShare = async () => {
    if (!profile) return
    
    const shareData = {
      title: `${profile.display_name || profile.username}'s Profile - Skill Issued`,
      text: `Check out ${profile.display_name || profile.username}'s gaming profile on Skill Issued`,
      url: window.location.href
    }
    
    try {
      if (navigator.share) {
        await navigator.share(shareData)
      } else {
        await navigator.clipboard.writeText(window.location.href)
        alert('Profile link copied to clipboard!')
      }
    } catch (error) {
      console.error('Error sharing profile:', error)
    }
  }

  // Redirect to own profile if viewing own username
  useEffect(() => {
    if (isOwnProfile && profile) {
      router.replace('/profile')
    }
  }, [isOwnProfile, profile, router])

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Navigation />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            
            {profile && !isOwnProfile && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShare}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowReportDialog(true)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Flag className="h-4 w-4 mr-2" />
                  Report
                </Button>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">
                {profile?.display_name || username}
              </h1>
              {profile?.username && profile.username !== profile.display_name && (
                <Badge variant="secondary">@{profile.username}</Badge>
              )}
            </div>
            
            {profile && (
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Joined {format(new Date(profile.created_at), 'MMMM yyyy')}
                </div>
                
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Last seen {formatDistanceToNow(new Date(profile.updated_at), { addSuffix: true })}
                </div>
                
                <div className="flex items-center gap-1">
                  <Shield className="h-4 w-4" />
                  {profile.privacy_level === 'public' ? 'Public Profile' :
                   profile.privacy_level === 'friends' ? 'Friends Only' : 'Private Profile'}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mr-3" />
                <span>Loading profile...</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {error && (
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
        )}

        {/* Blocked User */}
        {isBlocked && profile && (
          <Alert className="mb-6">
            <EyeOff className="h-4 w-4" />
            <AlertDescription>
              You have blocked this user. You won't see their content and they won't be able to contact you.
              <Button 
                variant="link" 
                size="sm" 
                onClick={() => {
                  console.log('Unblock user:', profile.id)
                  setIsBlocked(false)
                  alert('Unblock functionality will be implemented in the social features phase')
                }}
                className="ml-2"
              >
                Unblock
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Privacy Restricted */}
        {profile && !canViewProfile() && !isBlocked && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Lock className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-xl font-semibold mb-2">Private Profile</h2>
                <p className="text-muted-foreground mb-4">
                  This user's profile is private. {isFriend ? 'You need to be friends to view their full profile.' : 'Send a friend request to view their profile.'}
                </p>
                
                {isAuthenticated && !isFriend && (
                  <div className="flex items-center justify-center gap-2">
                    <Button onClick={handleFriendRequest}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Send Friend Request
                    </Button>
                    
                    <Button variant="outline" onClick={handleFollow}>
                      <Eye className="h-4 w-4 mr-2" />
                      {isFollowing ? 'Unfollow' : 'Follow'}
                    </Button>
                  </div>
                )}
                
                {!isAuthenticated && (
                  <Button asChild>
                    <Link href="/auth/signin">Sign In to Connect</Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Profile Content */}
        {profile && canViewProfile() && !isBlocked && (
          <div className="space-y-6">
            {/* Social Actions Bar */}
            {isAuthenticated && !isOwnProfile && (
              <Card>
                <CardContent className="pt-4">
                  <SocialActions
                    userId={profile.id}
                    username={profile.username}
                    displayName={profile.display_name}
                    variant="default"
                    showCounts={true}
                  />
                </CardContent>
              </Card>
            )}

            {/* Profile Content Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="gaming">Gaming</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-6">
                <ProfileViewer
                  userId={profile.id}
                  variant="full"
                  showSocialActions={false}
                  showEditButton={false}
                />
              </TabsContent>
              
              <TabsContent value="gaming" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Gamepad2 className="h-5 w-5" />
                      Gaming Profile
                    </CardTitle>
                    <CardDescription>
                      {profile.display_name || profile.username}'s gaming preferences and activity
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {profile.gaming_preferences ? (
                      <div className="space-y-6">
                        {/* Gaming preferences would be displayed here */}
                        <p className="text-muted-foreground">
                          Gaming preferences and statistics will be displayed here.
                        </p>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Gamepad2 className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          No gaming preferences set yet
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="activity" className="space-y-6">
                <SocialActivityFeed
                  userId={profile.id}
                  feedType="personal"
                  variant="full"
                  showHeader={false}
                  maxItems={20}
                />
              </TabsContent>
              
              <TabsContent value="reviews" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Game Reviews</CardTitle>
                    <CardDescription>
                      Reviews and ratings by {profile.display_name || profile.username}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <User className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        No reviews yet
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Report Dialog */}
        {showReportDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Flag className="h-5 w-5" />
                  Report User
                </CardTitle>
                <CardDescription>
                  Help us keep the community safe by reporting inappropriate behavior
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Reason for reporting</label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full mt-1 p-2 border rounded-md"
                  >
                    <option value="">Select a reason</option>
                    <option value="harassment">Harassment or bullying</option>
                    <option value="spam">Spam or unwanted content</option>
                    <option value="inappropriate">Inappropriate content</option>
                    <option value="impersonation">Impersonation</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleReport}
                    disabled={!reportReason}
                    className="flex-1"
                  >
                    Submit Report
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowReportDialog(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
