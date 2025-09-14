"use client"

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { 
  Activity, 
  Users, 
  UserPlus, 
  Heart, 
  Gamepad2, 
  Star, 
  MessageCircle, 
  Trophy, 
  Calendar, 
  MoreHorizontal,
  RefreshCw,
  Filter,
  Clock,
  TrendingUp,
  Eye,
  Bookmark,
  Share2,
  ThumbsUp,
  Award,
  Target,
  Zap
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import Link from 'next/link'

// Activity types
type ActivityType = 
  | 'friend_added'
  | 'friend_request_sent' 
  | 'friend_request_accepted'
  | 'user_followed'
  | 'user_started_following'
  | 'profile_updated'
  | 'game_added'
  | 'review_posted'
  | 'achievement_earned'
  | 'list_created'
  | 'game_completed'
  | 'milestone_reached'

interface SocialActivity {
  id: string
  type: ActivityType
  user_id: string
  target_user_id?: string
  target_game_id?: string
  target_content_id?: string
  activity_data: {
    user_profile?: {
      id: string
      username: string
      display_name: string | null
      avatar_url: string | null
    }
    target_user_profile?: {
      id: string
      username: string
      display_name: string | null
      avatar_url: string | null
    }
    game_data?: {
      id: string
      title: string
      cover_url?: string
    }
    content_data?: {
      title?: string
      description?: string
      rating?: number
      tags?: string[]
    }
    metadata?: {
      count?: number
      achievement_name?: string
      milestone_type?: string
      list_name?: string
    }
  }
  created_at: string
  is_public: boolean
}

interface SocialActivityFeedProps {
  userId?: string
  feedType?: 'personal' | 'friends' | 'following' | 'public'
  variant?: 'full' | 'compact' | 'minimal'
  showHeader?: boolean
  maxItems?: number
  className?: string
}

export function SocialActivityFeed({
  userId,
  feedType = 'friends',
  variant = 'full',
  showHeader = true,
  maxItems = 20,
  className = ''
}: SocialActivityFeedProps) {
  const { user, isAuthenticated } = useAuth()
  const targetUserId = userId || user?.id

  const [activities, setActivities] = useState<SocialActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<ActivityType | 'all'>('all')

  // Mock data for demonstration - in real app this would come from API
  const generateMockActivities = useCallback((): SocialActivity[] => {
    const mockUsers = [
      { id: '1', username: 'gamer_alice', display_name: 'Alice Chen', avatar_url: '/placeholder-user.jpg' },
      { id: '2', username: 'pro_bob', display_name: 'Bob Wilson', avatar_url: '/placeholder-user.jpg' },
      { id: '3', username: 'casual_carol', display_name: 'Carol Davis', avatar_url: '/placeholder-user.jpg' },
      { id: '4', username: 'speedrun_dave', display_name: 'Dave Miller', avatar_url: '/placeholder-user.jpg' },
      { id: '5', username: 'retro_emma', display_name: 'Emma Johnson', avatar_url: '/placeholder-user.jpg' },
    ]

    const mockGames = [
      { id: '1', title: 'Cyberpunk 2077', cover_url: '/cyberpunk-2077-inspired-cover.png' },
      { id: '2', title: 'The Last of Us Part II', cover_url: '/the-last-of-us-part-2-game-cover.jpg' },
      { id: '3', title: 'Ghost of Tsushima', cover_url: '/ghost-of-tsushima-game-cover.jpg' },
      { id: '4', title: 'Hades', cover_url: '/hades-game-cover.png' },
      { id: '5', title: 'Spider-Man 2', cover_url: '/spider-man-2-game-cover.jpg' },
    ]

    const activityTypes: ActivityType[] = [
      'friend_added', 'user_followed', 'game_added', 'review_posted', 
      'achievement_earned', 'profile_updated', 'game_completed', 'list_created'
    ]

    return Array.from({ length: maxItems }, (_, i) => {
      const user = mockUsers[Math.floor(Math.random() * mockUsers.length)]
      const targetUser = mockUsers[Math.floor(Math.random() * mockUsers.length)]
      const game = mockGames[Math.floor(Math.random() * mockGames.length)]
      const type = activityTypes[Math.floor(Math.random() * activityTypes.length)]
      
      const baseActivity: SocialActivity = {
        id: `activity-${i}`,
        type,
        user_id: user.id,
        created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        is_public: Math.random() > 0.2, // 80% public
        activity_data: {
          user_profile: user
        }
      }

      switch (type) {
        case 'friend_added':
          return {
            ...baseActivity,
            target_user_id: targetUser.id,
            activity_data: {
              ...baseActivity.activity_data,
              target_user_profile: targetUser
            }
          }
        
        case 'user_followed':
          return {
            ...baseActivity,
            target_user_id: targetUser.id,
            activity_data: {
              ...baseActivity.activity_data,
              target_user_profile: targetUser
            }
          }

        case 'game_added':
        case 'game_completed':
          return {
            ...baseActivity,
            target_game_id: game.id,
            activity_data: {
              ...baseActivity.activity_data,
              game_data: game
            }
          }

        case 'review_posted':
          return {
            ...baseActivity,
            target_game_id: game.id,
            activity_data: {
              ...baseActivity.activity_data,
              game_data: game,
              content_data: {
                title: `Review of ${game.title}`,
                description: "An amazing gaming experience with incredible storytelling...",
                rating: Math.floor(Math.random() * 5) + 1
              }
            }
          }

        case 'achievement_earned':
          return {
            ...baseActivity,
            target_game_id: game.id,
            activity_data: {
              ...baseActivity.activity_data,
              game_data: game,
              metadata: {
                achievement_name: ['Master Explorer', 'Speed Demon', 'Completionist', 'Legendary'][Math.floor(Math.random() * 4)]
              }
            }
          }

        case 'list_created':
          return {
            ...baseActivity,
            activity_data: {
              ...baseActivity.activity_data,
              metadata: {
                list_name: ['Top 10 RPGs', 'Indie Favorites', 'Completed This Year', 'Want to Play'][Math.floor(Math.random() * 4)]
              }
            }
          }

        default:
          return baseActivity
      }
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [maxItems])

  // Load activities
  useEffect(() => {
    const loadActivities = async () => {
      setLoading(true)
      setError(null)

      try {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // In real app, this would be an API call based on feedType and targetUserId
        const mockActivities = generateMockActivities()
        setActivities(mockActivities)
      } catch (err) {
        console.error('Error loading activities:', err)
        setError('Failed to load activity feed')
      } finally {
        setLoading(false)
      }
    }

    loadActivities()
  }, [targetUserId, feedType, generateMockActivities])

  // Filter activities
  const filteredActivities = activities.filter(activity => 
    filterType === 'all' || activity.type === filterType
  )

  // Get activity icon
  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case 'friend_added':
      case 'friend_request_accepted':
        return <Users className="h-4 w-4" />
      case 'friend_request_sent':
        return <UserPlus className="h-4 w-4" />
      case 'user_followed':
      case 'user_started_following':
        return <Heart className="h-4 w-4" />
      case 'game_added':
      case 'game_completed':
        return <Gamepad2 className="h-4 w-4" />
      case 'review_posted':
        return <Star className="h-4 w-4" />
      case 'achievement_earned':
        return <Trophy className="h-4 w-4" />
      case 'list_created':
        return <Bookmark className="h-4 w-4" />
      case 'milestone_reached':
        return <Target className="h-4 w-4" />
      case 'profile_updated':
        return <Eye className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  // Get activity color
  const getActivityColor = (type: ActivityType) => {
    switch (type) {
      case 'friend_added':
      case 'friend_request_accepted':
        return 'text-blue-500'
      case 'user_followed':
      case 'user_started_following':
        return 'text-red-500'
      case 'game_added':
      case 'game_completed':
        return 'text-green-500'
      case 'review_posted':
        return 'text-yellow-500'
      case 'achievement_earned':
        return 'text-purple-500'
      case 'list_created':
        return 'text-indigo-500'
      default:
        return 'text-gray-500'
    }
  }

  // Get activity text
  const getActivityText = (activity: SocialActivity) => {
    const user = activity.activity_data.user_profile
    const targetUser = activity.activity_data.target_user_profile
    const game = activity.activity_data.game_data
    const content = activity.activity_data.content_data
    const metadata = activity.activity_data.metadata

    switch (activity.type) {
      case 'friend_added':
        return `${user?.display_name || user?.username} became friends with ${targetUser?.display_name || targetUser?.username}`
      
      case 'friend_request_sent':
        return `${user?.display_name || user?.username} sent a friend request to ${targetUser?.display_name || targetUser?.username}`
      
      case 'friend_request_accepted':
        return `${user?.display_name || user?.username} accepted a friend request from ${targetUser?.display_name || targetUser?.username}`
      
      case 'user_followed':
        return `${user?.display_name || user?.username} started following ${targetUser?.display_name || targetUser?.username}`
      
      case 'game_added':
        return `${user?.display_name || user?.username} added ${game?.title} to their library`
      
      case 'game_completed':
        return `${user?.display_name || user?.username} completed ${game?.title}`
      
      case 'review_posted':
        return `${user?.display_name || user?.username} reviewed ${game?.title}`
      
      case 'achievement_earned':
        return `${user?.display_name || user?.username} earned "${metadata?.achievement_name}" in ${game?.title}`
      
      case 'list_created':
        return `${user?.display_name || user?.username} created a new list: "${metadata?.list_name}"`
      
      case 'profile_updated':
        return `${user?.display_name || user?.username} updated their profile`
      
      default:
        return `${user?.display_name || user?.username} had some activity`
    }
  }

  // Render activity item
  const renderActivityItem = (activity: SocialActivity) => {
    const user = activity.activity_data.user_profile
    const game = activity.activity_data.game_data
    const content = activity.activity_data.content_data

    return (
      <div key={activity.id} className="flex items-start space-x-3 p-4 hover:bg-muted/30 transition-colors rounded-lg">
        {/* Activity icon */}
        <div className={`p-2 rounded-full bg-muted ${getActivityColor(activity.type)}`}>
          {getActivityIcon(activity.type)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Main activity text */}
          <div className="flex items-start justify-between">
            <p className="text-sm">
              {getActivityText(activity)}
            </p>
            <div className="flex items-center gap-2 ml-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
              </span>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-600">
                    Hide This Type
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Additional content based on activity type */}
          {activity.type === 'review_posted' && content && (
            <div className="bg-muted/50 rounded-lg p-3 mt-2">
              <div className="flex items-center gap-2 mb-2">
                {game?.cover_url && (
                  <img 
                    src={game.cover_url} 
                    alt={game.title}
                    className="w-8 h-8 rounded object-cover"
                  />
                )}
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star 
                      key={i} 
                      className={`h-3 w-3 ${i < (content.rating || 0) ? 'text-yellow-500 fill-current' : 'text-gray-300'}`} 
                    />
                  ))}
                  <span className="text-xs text-muted-foreground ml-1">
                    {content.rating}/5
                  </span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {content.description}
              </p>
            </div>
          )}

          {(activity.type === 'game_added' || activity.type === 'game_completed' || activity.type === 'achievement_earned') && game && (
            <div className="flex items-center gap-2 mt-2">
              {game.cover_url && (
                <img 
                  src={game.cover_url} 
                  alt={game.title}
                  className="w-10 h-10 rounded object-cover"
                />
              )}
              <div>
                <p className="text-sm font-medium">{game.title}</p>
                {activity.type === 'achievement_earned' && activity.activity_data.metadata?.achievement_name && (
                  <div className="flex items-center gap-1 mt-1">
                    <Award className="h-3 w-3 text-purple-500" />
                    <span className="text-xs text-muted-foreground">
                      {activity.activity_data.metadata.achievement_name}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* User avatars for social activities */}
          {(activity.type === 'friend_added' || activity.type === 'user_followed') && (
            <div className="flex items-center gap-2 mt-2">
              <div className="flex -space-x-2">
                <Avatar className="h-6 w-6 border-2 border-background">
                  <AvatarImage src={user?.avatar_url || ''} alt={user?.display_name || user?.username} />
                  <AvatarFallback className="text-xs">
                    {(user?.display_name || user?.username || 'U').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <Avatar className="h-6 w-6 border-2 border-background">
                  <AvatarImage src={activity.activity_data.target_user_profile?.avatar_url || ''} alt={activity.activity_data.target_user_profile?.display_name} />
                  <AvatarFallback className="text-xs">
                    {(activity.activity_data.target_user_profile?.display_name || activity.activity_data.target_user_profile?.username || 'U').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
          )}

          {/* Engagement actions for full variant */}
          {variant === 'full' && (
            <div className="flex items-center gap-4 mt-2 pt-2 border-t border-border/50">
              <Button variant="ghost" size="sm" className="h-7 text-xs">
                <ThumbsUp className="h-3 w-3 mr-1" />
                Like
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs">
                <MessageCircle className="h-3 w-3 mr-1" />
                Comment
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs">
                <Share2 className="h-3 w-3 mr-1" />
                Share
              </Button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Render loading state
  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex items-start space-x-3 p-4">
                <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-3 bg-muted rounded w-3/4 animate-pulse" />
                </div>
              </div>
            ))}
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
            <Activity className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Error Loading Activity Feed</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Minimal variant
  if (variant === 'minimal') {
    return (
      <div className={`space-y-2 ${className}`}>
        {filteredActivities.slice(0, 5).map(activity => (
          <div key={activity.id} className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded">
            <div className={`${getActivityColor(activity.type)}`}>
              {getActivityIcon(activity.type)}
            </div>
            <p className="text-sm flex-1 truncate">
              {getActivityText(activity)}
            </p>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
            </span>
          </div>
        ))}
      </div>
    )
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <Card className={className}>
        {showHeader && (
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="space-y-3">
            {filteredActivities.slice(0, 8).map(activity => (
              <div key={activity.id} className="flex items-start gap-3">
                <div className={`p-1.5 rounded-full bg-muted/50 ${getActivityColor(activity.type)}`}>
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm line-clamp-2">
                    {getActivityText(activity)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
            
            {activities.length > 8 && (
              <div className="text-center pt-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/activity">
                    View All Activity
                  </Link>
                </Button>
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
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Activity className="h-6 w-6" />
              Activity Feed
            </h2>
            <p className="text-muted-foreground">
              Stay updated with your gaming community
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setFilterType('all')}>
                  All Activity
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setFilterType('friend_added')}>
                  <Users className="h-4 w-4 mr-2" />
                  Friends
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterType('user_followed')}>
                  <Heart className="h-4 w-4 mr-2" />
                  Follows
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterType('game_added')}>
                  <Gamepad2 className="h-4 w-4 mr-2" />
                  Games
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterType('review_posted')}>
                  <Star className="h-4 w-4 mr-2" />
                  Reviews
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterType('achievement_earned')}>
                  <Trophy className="h-4 w-4 mr-2" />
                  Achievements
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {filteredActivities.length > 0 ? (
            <div className="divide-y divide-border">
              {filteredActivities.map(renderActivityItem)}
            </div>
          ) : (
            <div className="text-center py-12">
              <Activity className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Activity Yet</h3>
              <p className="text-muted-foreground mb-4">
                {filterType === 'all' 
                  ? "Start connecting with friends and playing games to see activity here!"
                  : `No ${filterType.replace('_', ' ')} activity to show.`
                }
              </p>
              <div className="flex items-center justify-center gap-2">
                <Button asChild>
                  <Link href="/friends">
                    <Users className="h-4 w-4 mr-2" />
                    Find Friends
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/games">
                    <Gamepad2 className="h-4 w-4 mr-2" />
                    Discover Games
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
