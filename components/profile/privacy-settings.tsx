"use client"

import { useState, useEffect } from 'react'
import { usePrivacy } from '@/hooks/use-privacy'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs'
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
  Eye, 
  Users, 
  UserPlus, 
  MessageCircle, 
  Activity, 
  Bell, 
  Settings, 
  Lock, 
  Globe, 
  UserCheck,
  AlertTriangle,
  Info,
  Zap,
  RefreshCw,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { toast } from 'sonner'
import {
  ProfilePrivacySettingsType,
  UpdateProfilePrivacySettingsType,
  PrivacyPresetType,
  PRIVACY_PRESETS
} from '@/lib/validations/privacy-schemas'

interface PrivacySettingsProps {
  className?: string
}

export function PrivacySettings({ className = '' }: PrivacySettingsProps) {
  const {
    privacySettings,
    loading,
    error,
    updatePrivacySettings,
    applyPrivacyPreset,
    refreshPrivacySettings
  } = usePrivacy()

  const [localSettings, setLocalSettings] = useState<ProfilePrivacySettingsType | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState<PrivacyPresetType | null>(null)

  // Sync with privacy settings
  useEffect(() => {
    if (privacySettings) {
      setLocalSettings(privacySettings)
      setHasChanges(false)
    }
  }, [privacySettings])

  // Update local setting
  const updateLocalSetting = <K extends keyof ProfilePrivacySettingsType>(
    key: K,
    value: ProfilePrivacySettingsType[K]
  ) => {
    if (!localSettings) return

    const updated = { ...localSettings, [key]: value }
    setLocalSettings(updated)
    setHasChanges(true)
  }

  // Save changes
  const handleSave = async () => {
    if (!localSettings || !hasChanges) return

    setSaving(true)

    try {
      // Create update object with only changed fields
      const updates: UpdateProfilePrivacySettingsType = {}
      
      if (privacySettings) {
        Object.keys(localSettings).forEach(key => {
          const k = key as keyof ProfilePrivacySettingsType
          if (k !== 'updated_at' && localSettings[k] !== privacySettings[k]) {
            (updates as any)[k] = localSettings[k]
          }
        })
      } else {
        // If no existing settings, use all local settings
        Object.assign(updates, localSettings)
      }

      await updatePrivacySettings(updates)
      setHasChanges(false)
      toast.success('Privacy settings updated successfully')
    } catch (err) {
      console.error('Error saving privacy settings:', err)
      toast.error('Failed to save privacy settings')
    } finally {
      setSaving(false)
    }
  }

  // Apply preset
  const handleApplyPreset = async (preset: PrivacyPresetType) => {
    try {
      await applyPrivacyPreset(preset)
      setSelectedPreset(null)
      setHasChanges(false)
      toast.success(`Applied ${preset} privacy preset`)
    } catch (err) {
      console.error('Error applying preset:', err)
      toast.error('Failed to apply privacy preset')
    }
  }

  // Reset changes
  const handleReset = () => {
    if (privacySettings) {
      setLocalSettings(privacySettings)
      setHasChanges(false)
    }
  }

  if (loading && !localSettings) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse w-32" />
                  <div className="h-3 bg-muted rounded animate-pulse w-48" />
                </div>
                <div className="h-6 w-12 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-destructive" />
            <h3 className="text-lg font-semibold mb-2">Error Loading Privacy Settings</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={refreshPrivacySettings}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!localSettings) {
    return null
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Privacy Settings
          </h2>
          <p className="text-muted-foreground">
            Control who can see your information and interact with you
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasChanges && (
            <>
              <Button variant="outline" onClick={handleReset}>
                Reset
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Privacy Presets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Quick Setup
          </CardTitle>
          <CardDescription>
            Apply a privacy preset to quickly configure your settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.keys(PRIVACY_PRESETS).map((preset) => {
              const presetKey = preset as PrivacyPresetType
              const config = PRIVACY_PRESETS[presetKey]
              
              return (
                <AlertDialog key={preset}>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-auto p-4 flex flex-col items-start gap-2"
                      onClick={() => setSelectedPreset(presetKey)}
                    >
                      <div className="flex items-center gap-2">
                        {preset === 'public' && <Globe className="h-4 w-4" />}
                        {preset === 'social' && <Users className="h-4 w-4" />}
                        {preset === 'friends' && <UserCheck className="h-4 w-4" />}
                        {preset === 'private' && <Lock className="h-4 w-4" />}
                        <span className="font-medium capitalize">{preset}</span>
                      </div>
                      <p className="text-xs text-muted-foreground text-left">
                        {preset === 'public' && 'Maximum visibility and interaction'}
                        {preset === 'social' && 'Balanced social interaction'}
                        {preset === 'friends' && 'Friends-only interaction'}
                        {preset === 'private' && 'Minimal visibility'}
                      </p>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Apply {preset.charAt(0).toUpperCase() + preset.slice(1)} Preset?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will update all your privacy settings to the {preset} configuration. 
                        Your current settings will be overwritten.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleApplyPreset(presetKey)}>
                        Apply Preset
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Settings */}
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="social">Social</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        {/* Profile Settings */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Profile Visibility
              </CardTitle>
              <CardDescription>
                Control who can see your profile and personal information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Visibility */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="font-medium">Profile Visibility</Label>
                  <p className="text-sm text-muted-foreground">
                    Who can see your profile page
                  </p>
                </div>
                <Select
                  value={localSettings.profile_visibility}
                  onValueChange={(value) => updateLocalSetting('profile_visibility', value as any)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="friends">Friends</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Game Library */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="font-medium">Game Library</Label>
                  <p className="text-sm text-muted-foreground">
                    Who can see your game collection
                  </p>
                </div>
                <Select
                  value={localSettings.show_game_library}
                  onValueChange={(value) => updateLocalSetting('show_game_library', value as any)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="friends">Friends</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Achievements */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="font-medium">Achievements</Label>
                  <p className="text-sm text-muted-foreground">
                    Who can see your gaming achievements
                  </p>
                </div>
                <Select
                  value={localSettings.show_achievements}
                  onValueChange={(value) => updateLocalSetting('show_achievements', value as any)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="friends">Friends</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Reviews */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="font-medium">Reviews</Label>
                  <p className="text-sm text-muted-foreground">
                    Who can see your game reviews
                  </p>
                </div>
                <Select
                  value={localSettings.show_reviews}
                  onValueChange={(value) => updateLocalSetting('show_reviews', value as any)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="friends">Friends</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Lists */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="font-medium">Game Lists</Label>
                  <p className="text-sm text-muted-foreground">
                    Who can see your game lists
                  </p>
                </div>
                <Select
                  value={localSettings.show_lists}
                  onValueChange={(value) => updateLocalSetting('show_lists', value as any)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="friends">Friends</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Search Settings */}
              <div className="space-y-4">
                <h4 className="font-medium">Search & Discovery</h4>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="font-medium">Username Search</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow others to find you by username
                    </p>
                  </div>
                  <Switch
                    checked={localSettings.searchable_by_username}
                    onCheckedChange={(checked) => updateLocalSetting('searchable_by_username', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="font-medium">Friend Suggestions</Label>
                    <p className="text-sm text-muted-foreground">
                      Appear in friend suggestions for others
                    </p>
                  </div>
                  <Switch
                    checked={localSettings.show_in_suggestions}
                    onCheckedChange={(checked) => updateLocalSetting('show_in_suggestions', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="font-medium">Search Engine Indexing</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow search engines to index your profile
                    </p>
                  </div>
                  <Switch
                    checked={localSettings.allow_indexing}
                    onCheckedChange={(checked) => updateLocalSetting('allow_indexing', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Social Settings */}
        <TabsContent value="social">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Social Interactions
              </CardTitle>
              <CardDescription>
                Control how others can interact with you socially
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Friend Requests */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="font-medium">Friend Requests</Label>
                  <p className="text-sm text-muted-foreground">
                    Who can send you friend requests
                  </p>
                </div>
                <Select
                  value={localSettings.allow_friend_requests}
                  onValueChange={(value) => updateLocalSetting('allow_friend_requests', value as any)}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="everyone">Everyone</SelectItem>
                    <SelectItem value="friends_of_friends">Friends of Friends</SelectItem>
                    <SelectItem value="nobody">Nobody</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Follow Requests */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="font-medium">Follow Requests</Label>
                  <p className="text-sm text-muted-foreground">
                    Who can follow you
                  </p>
                </div>
                <Select
                  value={localSettings.allow_follow}
                  onValueChange={(value) => updateLocalSetting('allow_follow', value as any)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Everyone</SelectItem>
                    <SelectItem value="friends">Friends</SelectItem>
                    <SelectItem value="private">Nobody</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Messages */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="font-medium">Messages</Label>
                  <p className="text-sm text-muted-foreground">
                    Who can send you messages
                  </p>
                </div>
                <Select
                  value={localSettings.allow_messages}
                  onValueChange={(value) => updateLocalSetting('allow_messages', value as any)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="everyone">Everyone</SelectItem>
                    <SelectItem value="friends">Friends</SelectItem>
                    <SelectItem value="nobody">Nobody</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Social Lists Visibility */}
              <div className="space-y-4">
                <h4 className="font-medium">Social Lists</h4>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="font-medium">Friends List</Label>
                    <p className="text-sm text-muted-foreground">
                      Who can see your friends list
                    </p>
                  </div>
                  <Select
                    value={localSettings.show_friends_list}
                    onValueChange={(value) => updateLocalSetting('show_friends_list', value as any)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="friends">Friends</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="font-medium">Followers List</Label>
                    <p className="text-sm text-muted-foreground">
                      Who can see your followers
                    </p>
                  </div>
                  <Select
                    value={localSettings.show_followers_list}
                    onValueChange={(value) => updateLocalSetting('show_followers_list', value as any)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="friends">Friends</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="font-medium">Following List</Label>
                    <p className="text-sm text-muted-foreground">
                      Who can see who you follow
                    </p>
                  </div>
                  <Select
                    value={localSettings.show_following_list}
                    onValueChange={(value) => updateLocalSetting('show_following_list', value as any)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="friends">Friends</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Auto-approve Settings */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="font-medium">Auto-approve Friend Requests</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically accept friend requests from allowed users
                  </p>
                </div>
                <Switch
                  checked={localSettings.auto_approve_friend_requests}
                  onCheckedChange={(checked) => updateLocalSetting('auto_approve_friend_requests', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Settings */}
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Activity & Status
              </CardTitle>
              <CardDescription>
                Control what activity information others can see
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Activity Visibility */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="font-medium">Activity Feed</Label>
                  <p className="text-sm text-muted-foreground">
                    Who can see your gaming activity
                  </p>
                </div>
                <Select
                  value={localSettings.activity_visibility}
                  onValueChange={(value) => updateLocalSetting('activity_visibility', value as any)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="friends">Friends</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Online Status */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="font-medium">Online Status</Label>
                  <p className="text-sm text-muted-foreground">
                    Who can see when you're online
                  </p>
                </div>
                <Select
                  value={localSettings.show_online_status}
                  onValueChange={(value) => updateLocalSetting('show_online_status', value as any)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="friends">Friends</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Recently Played */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="font-medium">Recently Played</Label>
                  <p className="text-sm text-muted-foreground">
                    Who can see your recently played games
                  </p>
                </div>
                <Select
                  value={localSettings.show_recently_played}
                  onValueChange={(value) => updateLocalSetting('show_recently_played', value as any)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="friends">Friends</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Settings */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
              <CardDescription>
                Choose what notifications you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Email Notifications */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="font-medium">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications via email
                  </p>
                </div>
                <Switch
                  checked={localSettings.email_notifications}
                  onCheckedChange={(checked) => updateLocalSetting('email_notifications', checked)}
                />
              </div>

              {/* Push Notifications */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="font-medium">Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive browser push notifications
                  </p>
                </div>
                <Switch
                  checked={localSettings.push_notifications}
                  onCheckedChange={(checked) => updateLocalSetting('push_notifications', checked)}
                />
              </div>

              <Separator />

              {/* Specific Notification Types */}
              <div className="space-y-4">
                <h4 className="font-medium">Notification Types</h4>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="font-medium">Activity Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Friends' gaming activity and updates
                    </p>
                  </div>
                  <Switch
                    checked={localSettings.activity_notifications}
                    onCheckedChange={(checked) => updateLocalSetting('activity_notifications', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="font-medium">Friend Requests</Label>
                    <p className="text-sm text-muted-foreground">
                      New friend requests and responses
                    </p>
                  </div>
                  <Switch
                    checked={localSettings.friend_request_notifications}
                    onCheckedChange={(checked) => updateLocalSetting('friend_request_notifications', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="font-medium">Follow Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      New followers and follow activity
                    </p>
                  </div>
                  <Switch
                    checked={localSettings.follow_notifications}
                    onCheckedChange={(checked) => updateLocalSetting('follow_notifications', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="font-medium">Review Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Likes and comments on your reviews
                    </p>
                  </div>
                  <Switch
                    checked={localSettings.review_notifications}
                    onCheckedChange={(checked) => updateLocalSetting('review_notifications', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Changes Indicator */}
      {hasChanges && (
        <div className="fixed bottom-4 right-4 z-50">
          <Card className="bg-background border-2 border-primary">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Info className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Unsaved Changes</p>
                  <p className="text-sm text-muted-foreground">
                    You have unsaved privacy settings changes
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleReset}>
                    Reset
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={saving}>
                    {saving ? (
                      <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-1" />
                    )}
                    Save
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
