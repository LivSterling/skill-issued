"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useProfile } from '@/hooks/use-profile'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { 
  validateGamingPreferences, 
  type GamingPreferencesInput 
} from '@/lib/validations/profile-schemas'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { 
  Gamepad2, 
  Plus, 
  X, 
  Save, 
  RotateCcw, 
  Clock, 
  Users, 
  Globe, 
  Star,
  Zap,
  Target,
  Heart,
  Trophy,
  Loader2,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'

interface GamingPreferencesManagerProps {
  userId?: string
  onSave?: (preferences: GamingPreferencesInput) => void
  onCancel?: () => void
  className?: string
  showHeader?: boolean
  compact?: boolean
}

const GAMING_GENRES = [
  'action', 'adventure', 'rpg', 'strategy', 'simulation', 'sports', 
  'racing', 'fighting', 'puzzle', 'horror', 'platformer', 'shooter',
  'mmorpg', 'moba', 'battle_royale', 'survival', 'sandbox', 'rhythm',
  'visual_novel', 'card_game', 'board_game', 'educational'
]

const GAMING_PLATFORMS = [
  'pc', 'playstation', 'xbox', 'nintendo', 'mobile', 'vr', 
  'steam_deck', 'retro_consoles', 'arcade', 'browser'
]

const PLAY_STYLES = [
  { value: 'casual', label: 'Casual', icon: '😌', description: 'Relaxed gaming sessions' },
  { value: 'hardcore', label: 'Hardcore', icon: '🔥', description: 'Intense, dedicated gaming' },
  { value: 'competitive', label: 'Competitive', icon: '🏆', description: 'Focus on winning and rankings' },
  { value: 'social', label: 'Social', icon: '👥', description: 'Gaming with friends and community' }
]

const GAME_MODES = [
  'single_player', 'multiplayer', 'co_op', 'pvp', 'mmo', 'battle_royale',
  'team_based', 'open_world', 'story_driven', 'sandbox', 'competitive_ranked'
]

const LOOKING_FOR_OPTIONS = [
  'teammates', 'friends', 'mentorship', 'competition', 'casual_play',
  'learning', 'streaming_partners', 'guild_members', 'practice_partners'
]

const AVAILABILITY_SLOTS = [
  'morning', 'afternoon', 'evening', 'night', 'late_night'
]

const TIME_ZONES = [
  'UTC-12', 'UTC-11', 'UTC-10', 'UTC-9', 'UTC-8', 'UTC-7', 'UTC-6',
  'UTC-5', 'UTC-4', 'UTC-3', 'UTC-2', 'UTC-1', 'UTC+0', 'UTC+1',
  'UTC+2', 'UTC+3', 'UTC+4', 'UTC+5', 'UTC+6', 'UTC+7', 'UTC+8',
  'UTC+9', 'UTC+10', 'UTC+11', 'UTC+12'
]

const LANGUAGES = [
  'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese',
  'Russian', 'Japanese', 'Korean', 'Chinese', 'Arabic', 'Hindi',
  'Dutch', 'Swedish', 'Norwegian', 'Danish', 'Finnish', 'Polish'
]

export function GamingPreferencesManager({
  userId,
  onSave,
  onCancel,
  className = "",
  showHeader = true,
  compact = false
}: GamingPreferencesManagerProps) {
  const { user } = useAuth()
  const { profile, updateProfile, loading: profileLoading } = useProfile(userId)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [activeTab, setActiveTab] = useState('genres')

  // Form setup
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty }
  } = useForm<GamingPreferencesInput>({
    resolver: zodResolver(validateGamingPreferences),
    defaultValues: {
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

  const watchedValues = watch()

  // Load profile data
  useEffect(() => {
    if (profile?.gaming_preferences) {
      reset(profile.gaming_preferences)
    }
  }, [profile, reset])

  // Helper functions for managing arrays
  const addToArray = (field: keyof GamingPreferencesInput, value: string) => {
    const currentArray = (watchedValues[field] as string[]) || []
    if (!currentArray.includes(value)) {
      setValue(field, [...currentArray, value] as any)
    }
  }

  const removeFromArray = (field: keyof GamingPreferencesInput, value: string) => {
    const currentArray = (watchedValues[field] as string[]) || []
    setValue(field, currentArray.filter(item => item !== value) as any)
  }

  // Handle form submission
  const onSubmit = async (data: GamingPreferencesInput) => {
    setIsSubmitting(true)
    setSubmitError(null)
    setSubmitSuccess(false)

    try {
      // If we have a profile, update it with new gaming preferences
      if (profile) {
        const result = await updateProfile({
          gaming_preferences: data
        })

        if (result.success) {
          setSubmitSuccess(true)
          onSave?.(data)
          
          // Clear success message after 3 seconds
          setTimeout(() => setSubmitSuccess(false), 3000)
        } else {
          throw new Error(result.error || 'Failed to update preferences')
        }
      } else {
        // If no profile, just call the onSave callback
        onSave?.(data)
        setSubmitSuccess(true)
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to save preferences')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Reset form to original values
  const handleReset = () => {
    if (profile?.gaming_preferences) {
      reset(profile.gaming_preferences)
    } else {
      reset({
        favoriteGenres: [],
        favoritePlatforms: [],
        playStyle: undefined,
        preferredGameModes: [],
        availableHours: { weekdays: undefined, weekends: undefined },
        timeZone: '',
        languages: [],
        lookingFor: []
      })
    }
    setSubmitError(null)
    setSubmitSuccess(false)
  }

  // Loading state
  if (profileLoading) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading gaming preferences...</span>
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
            <Gamepad2 className="h-5 w-5" />
            Gaming Preferences
          </CardTitle>
          <CardDescription>
            Customize your gaming preferences to help others find you and get better recommendations.
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
            <AlertDescription>Gaming preferences saved successfully!</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {compact ? (
            // Compact layout - all in one column
            <div className="space-y-6">
              {/* Favorite Genres */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Favorite Genres</Label>
                <div className="flex flex-wrap gap-2">
                  {GAMING_GENRES.map((genre) => (
                    <Badge
                      key={genre}
                      variant={watchedValues.favoriteGenres?.includes(genre) ? "default" : "outline"}
                      className="cursor-pointer transition-colors"
                      onClick={() => {
                        if (watchedValues.favoriteGenres?.includes(genre)) {
                          removeFromArray('favoriteGenres', genre)
                        } else {
                          addToArray('favoriteGenres', genre)
                        }
                      }}
                    >
                      {genre.charAt(0).toUpperCase() + genre.slice(1).replace('_', ' ')}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Favorite Platforms */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Platforms</Label>
                <div className="flex flex-wrap gap-2">
                  {GAMING_PLATFORMS.map((platform) => (
                    <Badge
                      key={platform}
                      variant={watchedValues.favoritePlatforms?.includes(platform) ? "default" : "outline"}
                      className="cursor-pointer transition-colors"
                      onClick={() => {
                        if (watchedValues.favoritePlatforms?.includes(platform)) {
                          removeFromArray('favoritePlatforms', platform)
                        } else {
                          addToArray('favoritePlatforms', platform)
                        }
                      }}
                    >
                      {platform.charAt(0).toUpperCase() + platform.slice(1).replace('_', ' ')}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Play Style */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Play Style</Label>
                <div className="grid grid-cols-2 gap-2">
                  {PLAY_STYLES.map((style) => (
                    <Button
                      key={style.value}
                      type="button"
                      variant={watchedValues.playStyle === style.value ? "default" : "outline"}
                      className="justify-start"
                      onClick={() => setValue('playStyle', style.value as any)}
                    >
                      <span className="mr-2">{style.icon}</span>
                      {style.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            // Full tabbed layout
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="genres">Genres & Modes</TabsTrigger>
                <TabsTrigger value="platforms">Platforms & Style</TabsTrigger>
                <TabsTrigger value="social">Social & Goals</TabsTrigger>
                <TabsTrigger value="availability">Availability</TabsTrigger>
              </TabsList>

              {/* Genres & Game Modes Tab */}
              <TabsContent value="genres" className="space-y-6">
                {/* Favorite Genres */}
                <div className="space-y-3">
                  <Label className="text-base font-medium flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    Favorite Genres
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Select the game genres you enjoy most. This helps others find you and improves recommendations.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {GAMING_GENRES.map((genre) => (
                      <Badge
                        key={genre}
                        variant={watchedValues.favoriteGenres?.includes(genre) ? "default" : "outline"}
                        className="cursor-pointer transition-colors hover:scale-105"
                        onClick={() => {
                          if (watchedValues.favoriteGenres?.includes(genre)) {
                            removeFromArray('favoriteGenres', genre)
                          } else {
                            addToArray('favoriteGenres', genre)
                          }
                        }}
                      >
                        {genre.charAt(0).toUpperCase() + genre.slice(1).replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                  {errors.favoriteGenres && (
                    <p className="text-sm text-red-500">{errors.favoriteGenres.message}</p>
                  )}
                </div>

                <Separator />

                {/* Preferred Game Modes */}
                <div className="space-y-3">
                  <Label className="text-base font-medium flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Preferred Game Modes
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    What types of gameplay do you prefer?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {GAME_MODES.map((mode) => (
                      <Badge
                        key={mode}
                        variant={watchedValues.preferredGameModes?.includes(mode) ? "default" : "outline"}
                        className="cursor-pointer transition-colors hover:scale-105"
                        onClick={() => {
                          if (watchedValues.preferredGameModes?.includes(mode)) {
                            removeFromArray('preferredGameModes', mode)
                          } else {
                            addToArray('preferredGameModes', mode)
                          }
                        }}
                      >
                        {mode.charAt(0).toUpperCase() + mode.slice(1).replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Platforms & Play Style Tab */}
              <TabsContent value="platforms" className="space-y-6">
                {/* Favorite Platforms */}
                <div className="space-y-3">
                  <Label className="text-base font-medium flex items-center gap-2">
                    <Gamepad2 className="h-4 w-4" />
                    Gaming Platforms
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Which platforms do you game on?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {GAMING_PLATFORMS.map((platform) => (
                      <Badge
                        key={platform}
                        variant={watchedValues.favoritePlatforms?.includes(platform) ? "default" : "outline"}
                        className="cursor-pointer transition-colors hover:scale-105"
                        onClick={() => {
                          if (watchedValues.favoritePlatforms?.includes(platform)) {
                            removeFromArray('favoritePlatforms', platform)
                          } else {
                            addToArray('favoritePlatforms', platform)
                          }
                        }}
                      >
                        {platform.charAt(0).toUpperCase() + platform.slice(1).replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                  {errors.favoritePlatforms && (
                    <p className="text-sm text-red-500">{errors.favoritePlatforms.message}</p>
                  )}
                </div>

                <Separator />

                {/* Play Style */}
                <div className="space-y-3">
                  <Label className="text-base font-medium flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Play Style
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    How would you describe your gaming approach?
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {PLAY_STYLES.map((style) => (
                      <Button
                        key={style.value}
                        type="button"
                        variant={watchedValues.playStyle === style.value ? "default" : "outline"}
                        className="justify-start h-auto p-4"
                        onClick={() => setValue('playStyle', style.value as any)}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-lg">{style.icon}</span>
                          <div className="text-left">
                            <div className="font-medium">{style.label}</div>
                            <div className="text-xs text-muted-foreground">{style.description}</div>
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                  {errors.playStyle && (
                    <p className="text-sm text-red-500">{errors.playStyle.message}</p>
                  )}
                </div>
              </TabsContent>

              {/* Social & Goals Tab */}
              <TabsContent value="social" className="space-y-6">
                {/* Looking For */}
                <div className="space-y-3">
                  <Label className="text-base font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    What Are You Looking For?
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    What type of gaming connections are you interested in?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {LOOKING_FOR_OPTIONS.map((option) => (
                      <Badge
                        key={option}
                        variant={watchedValues.lookingFor?.includes(option) ? "default" : "outline"}
                        className="cursor-pointer transition-colors hover:scale-105"
                        onClick={() => {
                          if (watchedValues.lookingFor?.includes(option)) {
                            removeFromArray('lookingFor', option)
                          } else {
                            addToArray('lookingFor', option)
                          }
                        }}
                      >
                        {option.charAt(0).toUpperCase() + option.slice(1).replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Languages */}
                <div className="space-y-3">
                  <Label className="text-base font-medium flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Languages
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    What languages do you speak for gaming communication?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {LANGUAGES.map((language) => (
                      <Badge
                        key={language}
                        variant={watchedValues.languages?.includes(language) ? "default" : "outline"}
                        className="cursor-pointer transition-colors hover:scale-105"
                        onClick={() => {
                          if (watchedValues.languages?.includes(language)) {
                            removeFromArray('languages', language)
                          } else {
                            addToArray('languages', language)
                          }
                        }}
                      >
                        {language}
                      </Badge>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Availability Tab */}
              <TabsContent value="availability" className="space-y-6">
                {/* Gaming Hours */}
                <div className="space-y-4">
                  <Label className="text-base font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Gaming Hours
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    When are you typically available for gaming?
                  </p>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="weekdays">Weekdays</Label>
                      <Select
                        value={watchedValues.availableHours?.weekdays || ''}
                        onValueChange={(value) => setValue('availableHours.weekdays', value as any)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select weekday hours" />
                        </SelectTrigger>
                        <SelectContent>
                          {AVAILABILITY_SLOTS.map((slot) => (
                            <SelectItem key={slot} value={slot}>
                              {slot.charAt(0).toUpperCase() + slot.slice(1).replace('_', ' ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="weekends">Weekends</Label>
                      <Select
                        value={watchedValues.availableHours?.weekends || ''}
                        onValueChange={(value) => setValue('availableHours.weekends', value as any)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select weekend hours" />
                        </SelectTrigger>
                        <SelectContent>
                          {AVAILABILITY_SLOTS.map((slot) => (
                            <SelectItem key={slot} value={slot}>
                              {slot.charAt(0).toUpperCase() + slot.slice(1).replace('_', ' ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Time Zone */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">Time Zone</Label>
                  <p className="text-sm text-muted-foreground">
                    Your time zone helps others coordinate gaming sessions with you.
                  </p>
                  <Select
                    value={watchedValues.timeZone || ''}
                    onValueChange={(value) => setValue('timeZone', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your time zone" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_ZONES.map((timezone) => (
                        <SelectItem key={timezone} value={timezone}>
                          {timezone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.timeZone && (
                    <p className="text-sm text-red-500">{errors.timeZone.message}</p>
                  )}
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
                  Save Preferences
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
