"use client"

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  User, 
  Shield, 
  Globe, 
  Users, 
  Eye, 
  EyeOff, 
  Settings, 
  MessageCircle,
  UserCheck,
  Lock,
  Unlock
} from 'lucide-react'
import Link from 'next/link'
import type { PrivacyLevel } from '@/lib/database/types'

interface BioPrivacyWidgetProps {
  bio?: string | null
  privacyLevel?: PrivacyLevel | null
  privacySettings?: {
    showEmail?: boolean
    showRealName?: boolean
    showLocation?: boolean
    showLastSeen?: boolean
    showGamingStats?: boolean
    showFriendsList?: boolean
    showActivity?: boolean
    allowDirectMessages?: boolean
    allowFriendRequests?: boolean
    allowFollows?: boolean
  } | null
  showEditButton?: boolean
  compact?: boolean
  className?: string
}

const PRIVACY_LEVEL_CONFIG = {
  public: {
    label: 'Public Profile',
    icon: Globe,
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    description: 'Visible to everyone'
  },
  friends: {
    label: 'Friends Only',
    icon: Users,
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    description: 'Visible to friends only'
  },
  private: {
    label: 'Private Profile',
    icon: Shield,
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    description: 'Only visible to you'
  }
}

export function BioPrivacyWidget({
  bio,
  privacyLevel = 'public',
  privacySettings,
  showEditButton = true,
  compact = false,
  className = ""
}: BioPrivacyWidgetProps) {
  const privacyConfig = PRIVACY_LEVEL_CONFIG[privacyLevel]
  const PrivacyIcon = privacyConfig.icon

  // Count active privacy settings
  const activeSettings = privacySettings ? Object.values(privacySettings).filter(Boolean).length : 0
  const totalSettings = 10 // Total number of privacy settings

  if (compact) {
    return (
      <Card className={className}>
        <CardContent className="pt-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                Bio & Privacy
              </h4>
              {showEditButton && (
                <Button asChild size="sm" variant="ghost">
                  <Link href="/profile/bio-privacy">
                    <Settings className="h-3 w-3" />
                  </Link>
                </Button>
              )}
            </div>

            {/* Bio Preview */}
            {bio ? (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {bio}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No bio set
              </p>
            )}

            {/* Privacy Level */}
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`${privacyConfig.color} flex items-center gap-1`}>
                <PrivacyIcon className="h-3 w-3" />
                <span className="text-xs">{privacyConfig.label}</span>
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Bio & Privacy
          </CardTitle>
          {showEditButton && (
            <Button asChild size="sm" variant="outline">
              <Link href="/profile/bio-privacy">
                <Settings className="h-4 w-4 mr-2" />
                Edit
              </Link>
            </Button>
          )}
        </div>
        <CardDescription>
          Your profile bio and privacy settings
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Bio Section */}
        <div>
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Profile Bio
          </h4>
          {bio ? (
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm leading-relaxed">{bio}</p>
              <div className="mt-2 text-xs text-muted-foreground">
                {bio.length} characters
              </div>
            </div>
          ) : (
            <div className="bg-muted/30 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground italic mb-2">
                No bio set yet
              </p>
              <p className="text-xs text-muted-foreground">
                Add a bio to tell others about your gaming interests and what you're looking for.
              </p>
            </div>
          )}
        </div>

        <Separator />

        {/* Privacy Level */}
        <div>
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Privacy Level
          </h4>
          <div className="flex items-start gap-3">
            <Badge className={`${privacyConfig.color} flex items-center gap-2`}>
              <PrivacyIcon className="h-4 w-4" />
              {privacyConfig.label}
            </Badge>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">
                {privacyConfig.description}
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Privacy Settings Summary */}
        <div>
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Privacy Settings
          </h4>
          
          <div className="space-y-4">
            {/* Settings Overview */}
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div>
                <p className="text-sm font-medium">Active Privacy Controls</p>
                <p className="text-xs text-muted-foreground">
                  {activeSettings} of {totalSettings} settings enabled
                </p>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold">{activeSettings}/{totalSettings}</div>
                <div className="text-xs text-muted-foreground">enabled</div>
              </div>
            </div>

            {privacySettings && (
              <div className="grid grid-cols-2 gap-3">
                {/* Profile Information */}
                <div className="space-y-2">
                  <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Profile Info
                  </h5>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span>Show Email</span>
                      {privacySettings.showEmail ? (
                        <Eye className="h-3 w-3 text-green-600" />
                      ) : (
                        <EyeOff className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span>Show Real Name</span>
                      {privacySettings.showRealName ? (
                        <Eye className="h-3 w-3 text-green-600" />
                      ) : (
                        <EyeOff className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span>Show Location</span>
                      {privacySettings.showLocation ? (
                        <Eye className="h-3 w-3 text-green-600" />
                      ) : (
                        <EyeOff className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span>Show Last Seen</span>
                      {privacySettings.showLastSeen ? (
                        <Eye className="h-3 w-3 text-green-600" />
                      ) : (
                        <EyeOff className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span>Show Gaming Stats</span>
                      {privacySettings.showGamingStats ? (
                        <Eye className="h-3 w-3 text-green-600" />
                      ) : (
                        <EyeOff className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Social & Interactions */}
                <div className="space-y-2">
                  <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Interactions
                  </h5>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span>Direct Messages</span>
                      {privacySettings.allowDirectMessages ? (
                        <Unlock className="h-3 w-3 text-green-600" />
                      ) : (
                        <Lock className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span>Friend Requests</span>
                      {privacySettings.allowFriendRequests ? (
                        <Unlock className="h-3 w-3 text-green-600" />
                      ) : (
                        <Lock className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span>Follows</span>
                      {privacySettings.allowFollows ? (
                        <Unlock className="h-3 w-3 text-green-600" />
                      ) : (
                        <Lock className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span>Show Friends</span>
                      {privacySettings.showFriendsList ? (
                        <Eye className="h-3 w-3 text-green-600" />
                      ) : (
                        <EyeOff className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span>Show Activity</span>
                      {privacySettings.showActivity ? (
                        <Eye className="h-3 w-3 text-green-600" />
                      ) : (
                        <EyeOff className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        {showEditButton && (
          <div className="pt-2">
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href="/profile/bio-privacy">
                <Settings className="h-4 w-4 mr-2" />
                Manage Bio & Privacy Settings
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
