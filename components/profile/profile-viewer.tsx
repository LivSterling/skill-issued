"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useProfile } from '@/hooks/use-profile'
import type { ExtendedProfile, PrivacyLevel } from '@/lib/database/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  User, 
  Calendar, 
  MapPin, 
  Clock, 
  Globe, 
  Users, 
  Shield, 
  Mail,
  Edit,
  UserPlus,
  UserMinus,
  MessageCircle,
  Gamepad2,
  Trophy,
  Star,
  Heart,
  Eye,
  EyeOff,
  Settings,
  AlertTriangle
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { GamingPreferencesWidget } from './gaming-preferences-widget'
import { BioPrivacyWidget } from './bio-privacy-widget'
import { SocialActions } from './social-actions'

interface ProfileViewerProps {
  userId?: string
  profile?: ExtendedProfile | null
  showSocialActions?: boolean
  showEditButton?: boolean
  showPrivateInfo?: boolean
  className?: string
  variant?: 'full' | 'compact' | 'card'
}

interface ProfileStats {
  gamesPlayed?: number
  reviewsWritten?: number
  listsCreated?: number
  followers?: number
  following?: number
  friends?: number
}

const PRIVACY_ICONS = {
  public: Globe,
  friends: Users,
  private: Shield
}

const PRIVACY_LABELS = {
  public: 'Public Profile',
  friends: 'Friends Only',
  private: 'Private Profile'
}

const PRIVACY_DESCRIPTIONS = {
  public: 'Visible to everyone',
  friends: 'Visible to friends only',
  private: 'Only visible to you'
}

const GAMING_GENRE_COLORS = {
  'action': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  'adventure': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'rpg': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'strategy': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'simulation': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  'sports': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'racing': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  'fighting': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  'puzzle': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  'horror': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
}

const PLATFORM_ICONS = {
  'pc': '🖥️',
  'playstation': '🎮',
  'xbox': '🎮',
  'nintendo': '🎮',
  'mobile': '📱',
  'vr': '🥽'
}

export function ProfileViewer({ 
  userId, 
  profile: externalProfile, 
  showSocialActions = true,
  showEditButton = true, 
  showPrivateInfo = false,
  className = "",
  variant = 'full'
}: ProfileViewerProps) {
  const { user: currentUser, isAuthenticated } = useAuth()
  const { profile: fetchedProfile, loading, error } = useProfile(userId)
  const [stats, setStats] = useState<ProfileStats>({})

  // Use external profile if provided, otherwise use fetched profile
  const profile = externalProfile || fetchedProfile
  const isOwnProfile = currentUser?.id === profile?.id
  const canViewProfile = isOwnProfile || showPrivateInfo || profile?.privacy_level === 'public' || 
    (profile?.privacy_level === 'friends' && isFriend)

  // Load profile stats (mock data for now)
  useEffect(() => {
    if (profile?.id) {
      // In a real app, you'd fetch these from your database
      setStats({
        gamesPlayed: Math.floor(Math.random() * 100) + 10,
        reviewsWritten: Math.floor(Math.random() * 50) + 5,
        listsCreated: Math.floor(Math.random() * 20) + 2,
        followers: Math.floor(Math.random() * 500) + 10,
        following: Math.floor(Math.random() * 200) + 5,
        friends: Math.floor(Math.random() * 100) + 3
      })
    }
  }, [profile?.id])


  // Get display name with fallback
  const getDisplayName = () => {
    return profile?.display_name || profile?.username || 'Unknown User'
  }

  // Get user initials
  const getInitials = () => {
    const name = getDisplayName()
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  // Format join date
  const getJoinDate = () => {
    if (!profile?.created_at) return 'Unknown'
    return formatDistanceToNow(new Date(profile.created_at), { addSuffix: true })
  }

  // Get privacy icon and info
  const PrivacyIcon = PRIVACY_ICONS[profile?.privacy_level as PrivacyLevel] || Shield
  const privacyLabel = PRIVACY_LABELS[profile?.privacy_level as PrivacyLevel] || 'Private Profile'
  const privacyDescription = PRIVACY_DESCRIPTIONS[profile?.privacy_level as PrivacyLevel] || 'Visibility unknown'

  // Loading state
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center space-x-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load profile: {error}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  // No profile found
  if (!profile) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <Alert>
            <User className="h-4 w-4" />
            <AlertDescription>
              Profile not found or does not exist.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  // Privacy check - show limited info for private profiles
  if (!canViewProfile) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={profile.avatar_url || ''} alt={getDisplayName()} />
                <AvatarFallback>{getInitials()}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="flex items-center gap-2">
                  {getDisplayName()}
                  <PrivacyIcon className="h-4 w-4 text-muted-foreground" />
                </CardTitle>
                <CardDescription>@{profile.username}</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Alert>
            <EyeOff className="h-4 w-4" />
            <AlertDescription>
              This profile is {privacyLabel.toLowerCase()}. {privacyDescription}.
            </AlertDescription>
          </Alert>
          
          {showSocialActions && profile?.id && (
            <div className="mt-4">
              <SocialActions 
                userId={profile.id}
                username={profile.username}
                displayName={profile.display_name}
                variant="minimal"
                showCounts={false}
              />
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <div className={`flex items-center space-x-3 ${className}`}>
        <Avatar className="h-10 w-10">
          <AvatarImage src={profile.avatar_url || ''} alt={getDisplayName()} />
          <AvatarFallback className="text-sm">{getInitials()}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{getDisplayName()}</p>
          <p className="text-xs text-muted-foreground truncate">@{profile.username}</p>
        </div>
        {showSocialActions && profile?.id && (
          <SocialActions 
            userId={profile.id}
            username={profile.username}
            displayName={profile.display_name}
            variant="minimal"
            showCounts={false}
          />
        )}
      </div>
    )
  }

  // Card variant
  if (variant === 'card') {
    return (
      <Card className={`hover:shadow-md transition-shadow ${className}`}>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile.avatar_url || ''} alt={getDisplayName()} />
              <AvatarFallback className="text-lg">{getInitials()}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold">{getDisplayName()}</h3>
              <p className="text-sm text-muted-foreground">@{profile.username}</p>
            </div>
            {profile.bio && (
              <p className="text-sm text-center line-clamp-2">{profile.bio}</p>
            )}
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>{stats.followers || 0} followers</span>
              <span>{stats.gamesPlayed || 0} games</span>
            </div>
            {showSocialActions && profile?.id && (
              <SocialActions 
                userId={profile.id}
                username={profile.username}
                displayName={profile.display_name}
                variant="compact"
                showCounts={false}
              />
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Full variant (default)
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Section */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile.avatar_url || ''} alt={getDisplayName()} />
                <AvatarFallback className="text-xl">{getInitials()}</AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  {getDisplayName()}
                  <PrivacyIcon className="h-4 w-4 text-muted-foreground" />
                </CardTitle>
                <CardDescription className="flex items-center gap-2">
                  @{profile.username}
                  {profile.created_at && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Joined {getJoinDate()}
                      </span>
                    </>
                  )}
                </CardDescription>
                {profile.bio && (
                  <p className="text-sm mt-2 max-w-md">{profile.bio}</p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              {isOwnProfile && showEditButton ? (
                <Button variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              ) : showSocialActions && profile?.id ? (
                <SocialActions 
                  userId={profile.id}
                  username={profile.username}
                  displayName={profile.display_name}
                  variant="compact"
                  showCounts={true}
                />
              ) : null}
            </div>
          </div>
        </CardHeader>

        {/* Stats Section */}
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{stats.gamesPlayed || 0}</div>
              <div className="text-xs text-muted-foreground">Games Played</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{stats.reviewsWritten || 0}</div>
              <div className="text-xs text-muted-foreground">Reviews</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{stats.listsCreated || 0}</div>
              <div className="text-xs text-muted-foreground">Lists</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{stats.followers || 0}</div>
              <div className="text-xs text-muted-foreground">Followers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{stats.following || 0}</div>
              <div className="text-xs text-muted-foreground">Following</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{stats.friends || 0}</div>
              <div className="text-xs text-muted-foreground">Friends</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gaming Preferences Section */}
      <GamingPreferencesWidget 
        preferences={profile.gaming_preferences}
        showEditButton={isOwnProfile}
        compact={false}
      />

      {/* Bio & Privacy Section */}
      {isOwnProfile && (
        <BioPrivacyWidget
          bio={profile.bio}
          privacyLevel={profile.privacy_level}
          privacySettings={profile.privacy_settings}
          showEditButton={isOwnProfile}
          compact={false}
        />
      )}

      {/* Recent Activity Section (placeholder) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Gamepad2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No recent activity to display</p>
            <p className="text-sm">Game reviews and lists will appear here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
