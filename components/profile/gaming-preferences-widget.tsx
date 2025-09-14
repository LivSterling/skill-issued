"use client"

import { useState } from 'react'
import type { GamingPreferencesInput } from '@/lib/validations/profile-schemas'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { 
  Gamepad2, 
  Clock, 
  Globe, 
  Users, 
  Settings, 
  ChevronRight,
  Star,
  Zap
} from 'lucide-react'
import Link from 'next/link'

interface GamingPreferencesWidgetProps {
  preferences: GamingPreferencesInput | null | undefined
  showEditButton?: boolean
  compact?: boolean
  className?: string
}

const GENRE_COLORS = {
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

const PLAY_STYLE_ICONS = {
  'casual': '😌',
  'hardcore': '🔥',
  'competitive': '🏆',
  'social': '👥'
}

const PLATFORM_ICONS = {
  'pc': '🖥️',
  'playstation': '🎮',
  'xbox': '🎮',
  'nintendo': '🎮',
  'mobile': '📱',
  'vr': '🥽'
}

export function GamingPreferencesWidget({
  preferences,
  showEditButton = true,
  compact = false,
  className = ""
}: GamingPreferencesWidgetProps) {
  const [showAll, setShowAll] = useState(false)

  if (!preferences) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Gamepad2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="font-medium mb-2">No Gaming Preferences Set</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Set up your gaming preferences to connect with like-minded players.
            </p>
            {showEditButton && (
              <Button asChild size="sm">
                <Link href="/profile/gaming-preferences">
                  <Settings className="h-4 w-4 mr-2" />
                  Set Preferences
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  const hasAnyPreferences = 
    preferences.favoriteGenres?.length || 
    preferences.favoritePlatforms?.length || 
    preferences.playStyle ||
    preferences.languages?.length ||
    preferences.lookingFor?.length

  if (!hasAnyPreferences) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center py-6">
            <Gamepad2 className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground mb-3">
              Gaming preferences not configured yet.
            </p>
            {showEditButton && (
              <Button asChild size="sm" variant="outline">
                <Link href="/profile/gaming-preferences">
                  Configure Preferences
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (compact) {
    return (
      <Card className={className}>
        <CardContent className="pt-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium flex items-center gap-2">
                <Gamepad2 className="h-4 w-4" />
                Gaming Preferences
              </h4>
              {showEditButton && (
                <Button asChild size="sm" variant="ghost">
                  <Link href="/profile/gaming-preferences">
                    <Settings className="h-3 w-3" />
                  </Link>
                </Button>
              )}
            </div>

            {/* Quick Summary */}
            <div className="space-y-2">
              {preferences.favoriteGenres && preferences.favoriteGenres.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {preferences.favoriteGenres.slice(0, 3).map((genre) => (
                    <Badge 
                      key={genre} 
                      variant="secondary" 
                      className="text-xs"
                    >
                      {genre.charAt(0).toUpperCase() + genre.slice(1)}
                    </Badge>
                  ))}
                  {preferences.favoriteGenres.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{preferences.favoriteGenres.length - 3} more
                    </Badge>
                  )}
                </div>
              )}

              {preferences.playStyle && (
                <div className="flex items-center gap-2 text-sm">
                  <span>{PLAY_STYLE_ICONS[preferences.playStyle]}</span>
                  <span className="capitalize">{preferences.playStyle} player</span>
                </div>
              )}
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
            <Gamepad2 className="h-5 w-5" />
            Gaming Preferences
          </CardTitle>
          {showEditButton && (
            <Button asChild size="sm" variant="outline">
              <Link href="/profile/gaming-preferences">
                <Settings className="h-4 w-4 mr-2" />
                Edit
              </Link>
            </Button>
          )}
        </div>
        <CardDescription>
          Gaming preferences and what I'm looking for
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Favorite Genres */}
        {preferences.favoriteGenres && preferences.favoriteGenres.length > 0 && (
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Star className="h-4 w-4" />
              Favorite Genres
            </h4>
            <div className="flex flex-wrap gap-2">
              {preferences.favoriteGenres.map((genre) => (
                <Badge 
                  key={genre} 
                  variant="secondary"
                  className={GENRE_COLORS[genre as keyof typeof GENRE_COLORS] || ''}
                >
                  {genre.charAt(0).toUpperCase() + genre.slice(1).replace('_', ' ')}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Platforms & Play Style */}
        <div className="grid md:grid-cols-2 gap-6">
          {preferences.favoritePlatforms && preferences.favoritePlatforms.length > 0 && (
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Gamepad2 className="h-4 w-4" />
                Platforms
              </h4>
              <div className="flex flex-wrap gap-2">
                {preferences.favoritePlatforms.map((platform) => (
                  <Badge key={platform} variant="outline" className="flex items-center gap-1">
                    <span>{PLATFORM_ICONS[platform as keyof typeof PLATFORM_ICONS] || '🎮'}</span>
                    {platform.charAt(0).toUpperCase() + platform.slice(1).replace('_', ' ')}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {preferences.playStyle && (
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Play Style
              </h4>
              <Badge variant="default" className="flex items-center gap-2 w-fit">
                <span>{PLAY_STYLE_ICONS[preferences.playStyle]}</span>
                {preferences.playStyle.charAt(0).toUpperCase() + preferences.playStyle.slice(1)} Player
              </Badge>
            </div>
          )}
        </div>

        {/* Availability & Social */}
        {(preferences.availableHours?.weekdays || 
          preferences.availableHours?.weekends || 
          preferences.timeZone ||
          preferences.languages?.length ||
          preferences.lookingFor?.length) && (
          <>
            <Separator />
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* Availability */}
              {(preferences.availableHours?.weekdays || preferences.availableHours?.weekends || preferences.timeZone) && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Availability
                  </h4>
                  <div className="space-y-2 text-sm">
                    {preferences.availableHours?.weekdays && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Weekdays:</span>
                        <Badge variant="outline" className="text-xs">
                          {preferences.availableHours.weekdays.charAt(0).toUpperCase() + 
                           preferences.availableHours.weekdays.slice(1).replace('_', ' ')}
                        </Badge>
                      </div>
                    )}
                    {preferences.availableHours?.weekends && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Weekends:</span>
                        <Badge variant="outline" className="text-xs">
                          {preferences.availableHours.weekends.charAt(0).toUpperCase() + 
                           preferences.availableHours.weekends.slice(1).replace('_', ' ')}
                        </Badge>
                      </div>
                    )}
                    {preferences.timeZone && (
                      <div className="flex items-center gap-2">
                        <Globe className="h-3 w-3 text-muted-foreground" />
                        <span>{preferences.timeZone}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Social */}
              {(preferences.languages?.length || preferences.lookingFor?.length) && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Social
                  </h4>
                  <div className="space-y-3">
                    {preferences.languages && preferences.languages.length > 0 && (
                      <div>
                        <span className="text-sm text-muted-foreground mb-1 block">Languages:</span>
                        <div className="flex flex-wrap gap-1">
                          {preferences.languages.slice(0, showAll ? undefined : 3).map((lang) => (
                            <Badge key={lang} variant="outline" className="text-xs">
                              {lang}
                            </Badge>
                          ))}
                          {!showAll && preferences.languages.length > 3 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 px-2 text-xs"
                              onClick={() => setShowAll(true)}
                            >
                              +{preferences.languages.length - 3} more
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    {preferences.lookingFor && preferences.lookingFor.length > 0 && (
                      <div>
                        <span className="text-sm text-muted-foreground mb-1 block">Looking for:</span>
                        <div className="flex flex-wrap gap-1">
                          {preferences.lookingFor.slice(0, showAll ? undefined : 2).map((item) => (
                            <Badge key={item} variant="secondary" className="text-xs">
                              {item.charAt(0).toUpperCase() + item.slice(1).replace('_', ' ')}
                            </Badge>
                          ))}
                          {!showAll && preferences.lookingFor.length > 2 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 px-2 text-xs"
                              onClick={() => setShowAll(true)}
                            >
                              +{preferences.lookingFor.length - 2} more
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Show All/Less Toggle */}
        {(preferences.languages && preferences.languages.length > 3) || 
         (preferences.lookingFor && preferences.lookingFor.length > 2) ? (
          <div className="pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAll(!showAll)}
              className="text-xs"
            >
              {showAll ? 'Show Less' : 'Show All'}
              <ChevronRight className={`h-3 w-3 ml-1 transition-transform ${showAll ? 'rotate-90' : ''}`} />
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
