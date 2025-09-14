"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useProfile } from '@/hooks/use-profile'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  User, 
  Shield, 
  Eye, 
  EyeOff, 
  Users, 
  Globe, 
  Save, 
  RotateCcw, 
  Info,
  Lock,
  Unlock,
  CheckCircle,
  AlertTriangle,
  Loader2,
  MessageCircle,
  UserCheck,
  Settings
} from 'lucide-react'
import type { PrivacyLevel } from '@/lib/database/types'

interface BioPrivacyManagerProps {
  userId?: string
  onSave?: (data: BioPrivacyData) => void
  onCancel?: () => void
  className?: string
  showHeader?: boolean
  compact?: boolean
}

interface BioPrivacyData {
  bio: string
  privacy_level: PrivacyLevel
  privacy_settings?: {
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
  }
}

// Validation schema
const bioPrivacySchema = z.object({
  bio: z.string().max(500, 'Bio must be 500 characters or less').optional().default(''),
  privacy_level: z.enum(['public', 'friends', 'private']),
  privacy_settings: z.object({
    showEmail: z.boolean().optional().default(false),
    showRealName: z.boolean().optional().default(false),
    showLocation: z.boolean().optional().default(true),
    showLastSeen: z.boolean().optional().default(true),
    showGamingStats: z.boolean().optional().default(true),
    showFriendsList: z.boolean().optional().default(true),
    showActivity: z.boolean().optional().default(true),
    allowDirectMessages: z.boolean().optional().default(true),
    allowFriendRequests: z.boolean().optional().default(true),
    allowFollows: z.boolean().optional().default(true),
  }).optional()
})

const PRIVACY_LEVELS = [
  {
    value: 'public' as PrivacyLevel,
    label: 'Public',
    icon: Globe,
    description: 'Anyone can see your profile and gaming activity',
    details: 'Your profile will be visible to everyone, including search engines. All your gaming activity, reviews, and lists will be public.'
  },
  {
    value: 'friends' as PrivacyLevel,
    label: 'Friends Only',
    icon: Users,
    description: 'Only your friends can see your full profile',
    details: 'Only people you\'ve accepted as friends can see your full profile and activity. Others will see limited information.'
  },
  {
    value: 'private' as PrivacyLevel,
    label: 'Private',
    icon: Shield,
    description: 'Only you can see your profile',
    details: 'Your profile will be completely private. Only you can see your activity, and others cannot find or view your profile.'
  }
]

const PRIVACY_SETTINGS = [
  {
    key: 'showEmail' as const,
    label: 'Show Email Address',
    description: 'Display your email address on your profile',
    icon: MessageCircle,
    sensitive: true
  },
  {
    key: 'showRealName' as const,
    label: 'Show Real Name',
    description: 'Display your real name instead of just username',
    icon: User,
    sensitive: true
  },
  {
    key: 'showLocation' as const,
    label: 'Show Location',
    description: 'Display your location/time zone information',
    icon: Globe,
    sensitive: false
  },
  {
    key: 'showLastSeen' as const,
    label: 'Show Last Seen',
    description: 'Display when you were last active',
    icon: Eye,
    sensitive: false
  },
  {
    key: 'showGamingStats' as const,
    label: 'Show Gaming Stats',
    description: 'Display your gaming statistics and achievements',
    icon: Settings,
    sensitive: false
  },
  {
    key: 'showFriendsList' as const,
    label: 'Show Friends List',
    description: 'Allow others to see who your friends are',
    icon: Users,
    sensitive: false
  },
  {
    key: 'showActivity' as const,
    label: 'Show Activity Feed',
    description: 'Display your recent gaming activity and reviews',
    icon: Settings,
    sensitive: false
  }
]

const INTERACTION_SETTINGS = [
  {
    key: 'allowDirectMessages' as const,
    label: 'Allow Direct Messages',
    description: 'Let other users send you direct messages',
    icon: MessageCircle
  },
  {
    key: 'allowFriendRequests' as const,
    label: 'Allow Friend Requests',
    description: 'Let other users send you friend requests',
    icon: UserCheck
  },
  {
    key: 'allowFollows' as const,
    label: 'Allow Follows',
    description: 'Let other users follow your activity',
    icon: Eye
  }
]

export function BioPrivacyManager({
  userId,
  onSave,
  onCancel,
  className = "",
  showHeader = true,
  compact = false
}: BioPrivacyManagerProps) {
  const { user } = useAuth()
  const { profile, updateProfile, loading: profileLoading } = useProfile(userId)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [activeTab, setActiveTab] = useState('bio')

  // Form setup
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty }
  } = useForm<BioPrivacyData>({
    resolver: zodResolver(bioPrivacySchema),
    defaultValues: {
      bio: '',
      privacy_level: 'public',
      privacy_settings: {
        showEmail: false,
        showRealName: false,
        showLocation: true,
        showLastSeen: true,
        showGamingStats: true,
        showFriendsList: true,
        showActivity: true,
        allowDirectMessages: true,
        allowFriendRequests: true,
        allowFollows: true,
      }
    }
  })

  const watchedValues = watch()
  const currentPrivacyLevel = watchedValues.privacy_level

  // Load profile data
  useEffect(() => {
    if (profile) {
      reset({
        bio: profile.bio || '',
        privacy_level: profile.privacy_level || 'public',
        privacy_settings: {
          showEmail: false,
          showRealName: false,
          showLocation: true,
          showLastSeen: true,
          showGamingStats: true,
          showFriendsList: true,
          showActivity: true,
          allowDirectMessages: true,
          allowFriendRequests: true,
          allowFollows: true,
          // Override with any existing privacy settings
          ...profile.privacy_settings
        }
      })
    }
  }, [profile, reset])

  // Handle form submission
  const onSubmit = async (data: BioPrivacyData) => {
    setIsSubmitting(true)
    setSubmitError(null)
    setSubmitSuccess(false)

    try {
      // If we have a profile, update it
      if (profile) {
        const result = await updateProfile({
          bio: data.bio,
          privacy_level: data.privacy_level,
          privacy_settings: data.privacy_settings
        })

        if (result.success) {
          setSubmitSuccess(true)
          onSave?.(data)
          
          // Clear success message after 3 seconds
          setTimeout(() => setSubmitSuccess(false), 3000)
        } else {
          throw new Error(result.error || 'Failed to update bio and privacy settings')
        }
      } else {
        // If no profile, just call the onSave callback
        onSave?.(data)
        setSubmitSuccess(true)
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to save settings')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Reset form to original values
  const handleReset = () => {
    if (profile) {
      reset({
        bio: profile.bio || '',
        privacy_level: profile.privacy_level || 'public',
        privacy_settings: profile.privacy_settings || {}
      })
    } else {
      reset()
    }
    setSubmitError(null)
    setSubmitSuccess(false)
  }

  // Get character count for bio
  const bioLength = watchedValues.bio?.length || 0
  const bioMaxLength = 500

  // Loading state
  if (profileLoading) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading bio and privacy settings...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Bio & Privacy Settings
          </CardTitle>
          <CardDescription>
            Manage your profile bio and control who can see your information.
          </CardDescription>
        </CardHeader>
      )}

      <CardContent className="space-y-6">
        {/* Status Messages */}
        {submitError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}

        {submitSuccess && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>Bio and privacy settings saved successfully!</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {compact ? (
            // Compact layout - simplified view
            <div className="space-y-6">
              {/* Bio */}
              <div className="space-y-3">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell others about yourself and your gaming interests..."
                  className="min-h-[100px] resize-none"
                  maxLength={bioMaxLength}
                  {...register('bio')}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{errors.bio?.message}</span>
                  <span>{bioLength}/{bioMaxLength}</span>
                </div>
              </div>

              {/* Privacy Level */}
              <div className="space-y-3">
                <Label>Privacy Level</Label>
                <Select
                  value={currentPrivacyLevel}
                  onValueChange={(value: PrivacyLevel) => setValue('privacy_level', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIVACY_LEVELS.map((level) => {
                      const Icon = level.icon
                      return (
                        <SelectItem key={level.value} value={level.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            <span>{level.label}</span>
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            // Full tabbed layout
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="bio">Bio</TabsTrigger>
                <TabsTrigger value="privacy">Privacy Level</TabsTrigger>
                <TabsTrigger value="settings">Privacy Settings</TabsTrigger>
              </TabsList>

              {/* Bio Tab */}
              <TabsContent value="bio" className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 mt-1 text-muted-foreground" />
                    <div className="flex-1">
                      <Label htmlFor="bio" className="text-base font-medium">
                        Profile Bio
                      </Label>
                      <p className="text-sm text-muted-foreground mb-3">
                        Tell other gamers about yourself, your gaming interests, and what you're looking for.
                      </p>
                      <Textarea
                        id="bio"
                        placeholder="I'm a passionate gamer who loves RPGs and cooperative games. Always looking for new friends to play with! I enjoy both casual and competitive gaming, and I'm particularly interested in story-driven games with great characters..."
                        className="min-h-[150px] resize-none"
                        maxLength={bioMaxLength}
                        {...register('bio')}
                      />
                      <div className="flex justify-between mt-2">
                        <div className="text-sm">
                          {errors.bio && (
                            <span className="text-red-500">{errors.bio.message}</span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <span className={bioLength > bioMaxLength * 0.9 ? 'text-orange-500' : ''}>
                            {bioLength}
                          </span>
                          <span>/{bioMaxLength}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Bio Tips:</strong> Mention your favorite games, preferred play styles, 
                      gaming schedule, and what type of gaming partners you're looking for. 
                      A good bio helps others understand if you'd be a good gaming match!
                    </AlertDescription>
                  </Alert>
                </div>
              </TabsContent>

              {/* Privacy Level Tab */}
              <TabsContent value="privacy" className="space-y-6">
                <div className="space-y-6">
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 mt-1 text-muted-foreground" />
                    <div className="flex-1">
                      <Label className="text-base font-medium">Profile Privacy Level</Label>
                      <p className="text-sm text-muted-foreground mb-4">
                        Control who can see your profile and gaming activity.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {PRIVACY_LEVELS.map((level) => {
                      const Icon = level.icon
                      const isSelected = currentPrivacyLevel === level.value
                      
                      return (
                        <div
                          key={level.value}
                          className={`border rounded-lg p-4 cursor-pointer transition-all ${
                            isSelected 
                              ? 'border-primary bg-primary/5' 
                              : 'border-border hover:border-primary/50'
                          }`}
                          onClick={() => setValue('privacy_level', level.value)}
                        >
                          <div className="flex items-start gap-3">
                            <Icon className={`h-5 w-5 mt-1 ${
                              isSelected ? 'text-primary' : 'text-muted-foreground'
                            }`} />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`font-medium ${
                                  isSelected ? 'text-primary' : ''
                                }`}>
                                  {level.label}
                                </span>
                                {isSelected && <CheckCircle className="h-4 w-4 text-primary" />}
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                {level.description}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {level.details}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      You can always change your privacy level later. Individual privacy settings 
                      in the next tab provide more granular control over what information is shared.
                    </AlertDescription>
                  </Alert>
                </div>
              </TabsContent>

              {/* Privacy Settings Tab */}
              <TabsContent value="settings" className="space-y-6">
                <div className="space-y-6">
                  <div className="flex items-start gap-3">
                    <Settings className="h-5 w-5 mt-1 text-muted-foreground" />
                    <div className="flex-1">
                      <Label className="text-base font-medium">Detailed Privacy Settings</Label>
                      <p className="text-sm text-muted-foreground mb-4">
                        Fine-tune exactly what information others can see about you.
                      </p>
                    </div>
                  </div>

                  {/* Profile Information Settings */}
                  <div className="space-y-4">
                    <h4 className="font-medium flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Profile Information
                    </h4>
                    <div className="space-y-4 pl-6">
                      {PRIVACY_SETTINGS.map((setting) => {
                        const Icon = setting.icon
                        return (
                          <div key={setting.key} className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1">
                              <Icon className="h-4 w-4 mt-1 text-muted-foreground" />
                              <div>
                                <div className="flex items-center gap-2">
                                  <Label className="font-medium">{setting.label}</Label>
                                  {setting.sensitive && (
                                    <Lock className="h-3 w-3 text-orange-500" />
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {setting.description}
                                </p>
                              </div>
                            </div>
                            <Switch
                              checked={watchedValues.privacy_settings?.[setting.key] || false}
                              onCheckedChange={(checked) => 
                                setValue(`privacy_settings.${setting.key}`, checked)
                              }
                            />
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <Separator />

                  {/* Interaction Settings */}
                  <div className="space-y-4">
                    <h4 className="font-medium flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Interaction Permissions
                    </h4>
                    <div className="space-y-4 pl-6">
                      {INTERACTION_SETTINGS.map((setting) => {
                        const Icon = setting.icon
                        return (
                          <div key={setting.key} className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1">
                              <Icon className="h-4 w-4 mt-1 text-muted-foreground" />
                              <div>
                                <Label className="font-medium">{setting.label}</Label>
                                <p className="text-sm text-muted-foreground">
                                  {setting.description}
                                </p>
                              </div>
                            </div>
                            <Switch
                              checked={watchedValues.privacy_settings?.[setting.key] || false}
                              onCheckedChange={(checked) => 
                                setValue(`privacy_settings.${setting.key}`, checked)
                              }
                            />
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <Alert>
                    <Shield className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Privacy Note:</strong> These settings work in combination with your overall 
                      privacy level. If your profile is set to "Private", these individual settings won't 
                      apply since your profile won't be visible to others.
                    </AlertDescription>
                  </Alert>
                </div>
              </TabsContent>
            </Tabs>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              type="submit"
              disabled={isSubmitting || !isDirty}
              className="flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Settings
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={isSubmitting || !isDirty}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>

            {onCancel && (
              <Button
                type="button"
                variant="ghost"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
