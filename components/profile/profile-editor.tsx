"use client"

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useProfile } from '@/hooks/use-profile'
import { updateProfileSchema, validateUpdateProfile } from '@/lib/validations/profile-schemas'
import type { UpdateProfileInput, GamingPreferencesInput } from '@/lib/validations/profile-schemas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Save, 
  X, 
  Plus, 
  Trash2, 
  User, 
  Settings, 
  Gamepad2, 
  Shield, 
  AlertTriangle,
  CheckCircle,
  Loader2
} from 'lucide-react'
import { AvatarUpload } from './avatar-upload'

interface ProfileEditorProps {
  userId?: string
  onSave?: (profile: any) => void
  onCancel?: () => void
  className?: string
}

// Gaming genres and platforms for selection
const GAMING_GENRES = [
  'Action', 'Adventure', 'RPG', 'Strategy', 'Simulation', 'Sports', 
  'Racing', 'Fighting', 'Shooter', 'Platform', 'Puzzle', 'Horror',
  'Survival', 'MMO', 'MOBA', 'Battle Royale', 'Indie', 'Casual'
]

const GAMING_PLATFORMS = [
  'PC', 'PlayStation', 'Xbox', 'Nintendo Switch', 'Mobile', 
  'Steam Deck', 'VR', 'Retro Consoles'
]

const GAME_MODES = [
  'Single Player', 'Multiplayer', 'Co-op', 'PvP', 'PvE', 
  'Online', 'Local', 'Competitive', 'Casual'
]

const LANGUAGES = [
  'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese',
  'Russian', 'Japanese', 'Korean', 'Chinese', 'Arabic', 'Hindi'
]

const LOOKING_FOR_OPTIONS = [
  { value: 'friends', label: 'Friends' },
  { value: 'teammates', label: 'Teammates' },
  { value: 'mentorship', label: 'Mentorship' },
  { value: 'casual_play', label: 'Casual Play' }
]

export function ProfileEditor({ userId, onSave, onCancel, className = "" }: ProfileEditorProps) {
  const { profile, updateProfile, loading: profileLoading, error: profileError } = useProfile(userId)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  // Form setup with validation
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    setValue,
    watch,
    reset
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      display_name: '',
      bio: '',
      privacy_level: 'public',
      gaming_preferences: {
        favoriteGenres: [],
        favoritePlatforms: [],
        playStyle: undefined,
        preferredGameModes: [],
        availableHours: {
          weekdays: undefined,
          weekends: undefined
        },
        timeZone: '',
        languages: [],
        lookingFor: []
      }
    }
  })

  // Watch form values for dynamic updates
  const watchedValues = watch()
  const gamingPrefs = watchedValues.gaming_preferences || {}

  // Load profile data into form
  useEffect(() => {
    if (profile) {
      setAvatarUrl(profile.avatar_url)
      reset({
        display_name: profile.display_name || '',
        bio: profile.bio || '',
        avatar_url: profile.avatar_url || '',
        privacy_level: profile.privacy_level as 'public' | 'friends' | 'private',
        gaming_preferences: profile.gaming_preferences || {
          favoriteGenres: [],
          favoritePlatforms: [],
          playStyle: undefined,
          preferredGameModes: [],
          availableHours: {
            weekdays: undefined,
            weekends: undefined
          },
          timeZone: '',
          languages: [],
          lookingFor: []
        }
      })
    }
  }, [profile, reset])

  // Handle form submission
  const onSubmit = async (data: UpdateProfileInput) => {
    setIsSubmitting(true)
    setSubmitError(null)
    setSubmitSuccess(false)

    try {
      // Include current avatar URL in the data
      const profileData = {
        ...data,
        avatar_url: avatarUrl || undefined
      }

      // Validate the data
      const validation = validateUpdateProfile(profileData)
      if (!validation.success) {
        setSubmitError(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`)
        return
      }

      // Update the profile
      const result = await updateProfile(profileData)
      if (result.success) {
        setSubmitSuccess(true)
        onSave?.(result.data)
        
        // Clear success message after 3 seconds
        setTimeout(() => setSubmitSuccess(false), 3000)
      } else {
        setSubmitError(result.error || 'Failed to update profile')
      }
    } catch (error) {
      setSubmitError('An unexpected error occurred while updating profile')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Helper functions for managing arrays
  const addToArray = (field: string, value: string) => {
    const currentArray = (gamingPrefs[field as keyof typeof gamingPrefs] as string[]) || []
    if (!currentArray.includes(value)) {
      setValue(`gaming_preferences.${field}` as any, [...currentArray, value])
    }
  }

  const removeFromArray = (field: string, value: string) => {
    const currentArray = (gamingPrefs[field as keyof typeof gamingPrefs] as string[]) || []
    setValue(`gaming_preferences.${field}` as any, currentArray.filter(item => item !== value))
  }

  // Avatar handlers
  const handleAvatarUpload = (url: string) => {
    setAvatarUrl(url)
    setValue('avatar_url', url)
  }

  const handleAvatarRemove = () => {
    setAvatarUrl(null)
    setValue('avatar_url', '')
  }

  // Loading state
  if (profileLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading profile...</span>
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (profileError) {
    return (
      <Card className={className}>
        <CardContent className="py-8">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{profileError}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Edit Profile
        </CardTitle>
        <CardDescription>
          Update your profile information and gaming preferences
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
              <AlertDescription>Profile updated successfully!</AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="gaming">Gaming</TabsTrigger>
              <TabsTrigger value="privacy">Privacy</TabsTrigger>
            </TabsList>

            {/* Basic Information Tab */}
            <TabsContent value="basic" className="space-y-6">
              {/* Avatar Upload */}
              <AvatarUpload
                currentAvatarUrl={avatarUrl}
                onUploadComplete={handleAvatarUpload}
                onRemove={handleAvatarRemove}
                size="md"
                className="mb-6"
              />

              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="display_name">Display Name</Label>
                  <Input
                    id="display_name"
                    placeholder="Enter your display name"
                    {...register('display_name')}
                  />
                  {errors.display_name && (
                    <p className="text-sm text-red-500">{errors.display_name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    placeholder="Tell others about yourself..."
                    rows={4}
                    {...register('bio')}
                  />
                  {errors.bio && (
                    <p className="text-sm text-red-500">{errors.bio.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {watchedValues.bio?.length || 0}/500 characters
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* Gaming Preferences Tab */}
            <TabsContent value="gaming" className="space-y-6">
              {/* Favorite Genres */}
              <div className="space-y-3">
                <Label>Favorite Genres</Label>
                <div className="flex flex-wrap gap-2">
                  {(gamingPrefs.favoriteGenres || []).map((genre) => (
                    <Badge key={genre} variant="secondary" className="flex items-center gap-1">
                      {genre}
                      <button
                        type="button"
                        onClick={() => removeFromArray('favoriteGenres', genre)}
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <Select onValueChange={(value) => addToArray('favoriteGenres', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Add a genre" />
                  </SelectTrigger>
                  <SelectContent>
                    {GAMING_GENRES.filter(genre => 
                      !(gamingPrefs.favoriteGenres || []).includes(genre)
                    ).map((genre) => (
                      <SelectItem key={genre} value={genre}>{genre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Favorite Platforms */}
              <div className="space-y-3">
                <Label>Favorite Platforms</Label>
                <div className="flex flex-wrap gap-2">
                  {(gamingPrefs.favoritePlatforms || []).map((platform) => (
                    <Badge key={platform} variant="secondary" className="flex items-center gap-1">
                      {platform}
                      <button
                        type="button"
                        onClick={() => removeFromArray('favoritePlatforms', platform)}
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <Select onValueChange={(value) => addToArray('favoritePlatforms', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Add a platform" />
                  </SelectTrigger>
                  <SelectContent>
                    {GAMING_PLATFORMS.filter(platform => 
                      !(gamingPrefs.favoritePlatforms || []).includes(platform)
                    ).map((platform) => (
                      <SelectItem key={platform} value={platform}>{platform}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Play Style */}
              <div className="space-y-2">
                <Label>Play Style</Label>
                <Select 
                  value={gamingPrefs.playStyle || ''} 
                  onValueChange={(value) => setValue('gaming_preferences.playStyle', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your play style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="competitive">Competitive</SelectItem>
                    <SelectItem value="hardcore">Hardcore</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Available Hours */}
              <div className="space-y-3">
                <Label>Available Hours (per day)</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="weekdays" className="text-sm">Weekdays</Label>
                    <Input
                      id="weekdays"
                      type="number"
                      min="0"
                      max="24"
                      placeholder="Hours"
                      value={gamingPrefs.availableHours?.weekdays || ''}
                      onChange={(e) => setValue('gaming_preferences.availableHours.weekdays', 
                        e.target.value ? Number(e.target.value) : undefined)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weekends" className="text-sm">Weekends</Label>
                    <Input
                      id="weekends"
                      type="number"
                      min="0"
                      max="24"
                      placeholder="Hours"
                      value={gamingPrefs.availableHours?.weekends || ''}
                      onChange={(e) => setValue('gaming_preferences.availableHours.weekends', 
                        e.target.value ? Number(e.target.value) : undefined)}
                    />
                  </div>
                </div>
              </div>

              {/* Looking For */}
              <div className="space-y-3">
                <Label>Looking For</Label>
                <div className="space-y-2">
                  {LOOKING_FOR_OPTIONS.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <Switch
                        id={option.value}
                        checked={(gamingPrefs.lookingFor || []).includes(option.value as any)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            addToArray('lookingFor', option.value)
                          } else {
                            removeFromArray('lookingFor', option.value)
                          }
                        }}
                      />
                      <Label htmlFor={option.value}>{option.label}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Privacy Settings Tab */}
            <TabsContent value="privacy" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Profile Privacy
                  </Label>
                  <Select 
                    value={watchedValues.privacy_level || 'public'} 
                    onValueChange={(value) => setValue('privacy_level', value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select privacy level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">
                        <div className="flex flex-col">
                          <span>Public</span>
                          <span className="text-xs text-muted-foreground">
                            Everyone can see your profile
                          </span>
                        </div>
                      </SelectItem>
                      <SelectItem value="friends">
                        <div className="flex flex-col">
                          <span>Friends Only</span>
                          <span className="text-xs text-muted-foreground">
                            Only friends can see your profile
                          </span>
                        </div>
                      </SelectItem>
                      <SelectItem value="private">
                        <div className="flex flex-col">
                          <span>Private</span>
                          <span className="text-xs text-muted-foreground">
                            Only you can see your profile
                          </span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    Your privacy settings control who can see your profile information, 
                    gaming preferences, and activity. You can change this at any time.
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>
          </Tabs>

          <Separator />

          {/* Form Actions */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {isDirty ? 'You have unsaved changes' : 'All changes saved'}
            </div>
            <div className="flex gap-3">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                disabled={!isDirty || isSubmitting}
                className="flex items-center gap-2"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

