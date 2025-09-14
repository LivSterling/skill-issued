"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navigation } from '@/components/navigation'
import { ProfileEditor } from '@/components/profile/profile-editor'
import { GamingPreferencesManager } from '@/components/profile/gaming-preferences-manager'
import { BioPrivacyManager } from '@/components/profile/bio-privacy-manager'
import { AvatarUpload } from '@/components/profile/avatar-upload'
import { CacheMonitor } from '@/components/profile/cache-monitor'
import { useAuth } from '@/hooks/use-auth'
import { useProfileEnhanced } from '@/hooks/use-profile-enhanced'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { 
  ArrowLeft, 
  Save, 
  User, 
  Camera, 
  Gamepad2, 
  Shield, 
  Settings, 
  CheckCircle,
  AlertTriangle,
  Eye,
  Activity,
  RefreshCw
} from 'lucide-react'
import Link from 'next/link'

export default function ProfileEditPage() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()
  const { profile, loading, error, refreshProfile } = useProfileEnhanced(user?.id)
  
  const [activeTab, setActiveTab] = useState('overview')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [saveProgress, setSaveProgress] = useState(0)
  const [showCacheMonitor, setShowCacheMonitor] = useState(false)

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background pb-16 md:pb-0">
        <Navigation />
        
        <div className="max-w-6xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <User className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
                <p className="text-muted-foreground mb-4">
                  You need to be signed in to edit your profile.
                </p>
                <Button asChild>
                  <Link href="/auth/signin">Sign In</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Handle save completion
  const handleSaveComplete = () => {
    setHasUnsavedChanges(false)
    setSaveProgress(100)
    
    // Reset progress after delay
    setTimeout(() => {
      setSaveProgress(0)
    }, 2000)
  }

  // Handle changes
  const handleProfileChange = () => {
    setHasUnsavedChanges(true)
  }

  // Handle navigation with unsaved changes warning
  const handleNavigation = (path: string) => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to leave this page?'
      )
      if (!confirmed) return
    }
    
    router.push(path)
  }

  // Profile completion calculation
  const calculateProfileCompletion = () => {
    if (!profile) return 0
    
    let completed = 0
    let total = 10
    
    // Basic info
    if (profile.display_name) completed++
    if (profile.bio) completed++
    if (profile.avatar_url) completed++
    
    // Gaming preferences
    if (profile.gaming_preferences?.favoriteGenres?.length) completed++
    if (profile.gaming_preferences?.favoritePlatforms?.length) completed++
    if (profile.gaming_preferences?.playStyle) completed++
    if (profile.gaming_preferences?.timeZone) completed++
    
    // Privacy settings
    if (profile.privacy_level) completed++
    if (profile.privacy_settings) completed++
    
    // Social readiness
    if (profile.gaming_preferences?.lookingFor?.length) completed++
    
    return Math.round((completed / total) * 100)
  }

  const profileCompletion = calculateProfileCompletion()

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Navigation />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleNavigation('/profile')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Profile
              </Button>
              
              {hasUnsavedChanges && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Unsaved Changes
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCacheMonitor(!showCacheMonitor)}
              >
                <Activity className="h-4 w-4 mr-2" />
                {showCacheMonitor ? 'Hide' : 'Show'} Cache Monitor
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleNavigation(`/profile/${profile?.username || user?.id}`)}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview Profile
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Edit Profile</h1>
            <p className="text-muted-foreground">
              Customize your gaming profile to connect with like-minded players.
            </p>
          </div>
          
          {/* Profile Completion */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-medium">Profile Completion</span>
              <span>{profileCompletion}%</span>
            </div>
            <Progress value={profileCompletion} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Complete your profile to improve your visibility and connections
            </p>
          </div>
        </div>

        {/* Save Progress */}
        {saveProgress > 0 && saveProgress < 100 && (
          <Card className="mb-6">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <div className="flex-1">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>Saving changes...</span>
                    <span>{saveProgress}%</span>
                  </div>
                  <Progress value={saveProgress} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Success Message */}
        {saveProgress === 100 && (
          <Alert className="mb-6">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Your profile has been saved successfully!
            </AlertDescription>
          </Alert>
        )}

        {/* Error State */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Error loading profile: {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Cache Monitor */}
        {showCacheMonitor && (
          <div className="mb-6">
            <CacheMonitor compact={false} />
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="text-lg">Edit Sections</CardTitle>
                <CardDescription>
                  Choose what to edit
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <nav className="space-y-1">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`w-full text-left px-4 py-3 text-sm transition-colors flex items-center gap-3 ${
                      activeTab === 'overview'
                        ? 'bg-primary/10 text-primary border-r-2 border-primary'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <Settings className="h-4 w-4" />
                    Overview
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('avatar')}
                    className={`w-full text-left px-4 py-3 text-sm transition-colors flex items-center gap-3 ${
                      activeTab === 'avatar'
                        ? 'bg-primary/10 text-primary border-r-2 border-primary'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <Camera className="h-4 w-4" />
                    Profile Picture
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('basic')}
                    className={`w-full text-left px-4 py-3 text-sm transition-colors flex items-center gap-3 ${
                      activeTab === 'basic'
                        ? 'bg-primary/10 text-primary border-r-2 border-primary'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <User className="h-4 w-4" />
                    Basic Info
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('gaming')}
                    className={`w-full text-left px-4 py-3 text-sm transition-colors flex items-center gap-3 ${
                      activeTab === 'gaming'
                        ? 'bg-primary/10 text-primary border-r-2 border-primary'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <Gamepad2 className="h-4 w-4" />
                    Gaming Preferences
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('privacy')}
                    className={`w-full text-left px-4 py-3 text-sm transition-colors flex items-center gap-3 ${
                      activeTab === 'privacy'
                        ? 'bg-primary/10 text-primary border-r-2 border-primary'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <Shield className="h-4 w-4" />
                    Bio & Privacy
                  </button>
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            {loading ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-8 w-8 animate-spin mr-3" />
                    <span>Loading profile...</span>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Settings className="h-5 w-5" />
                          Profile Overview
                        </CardTitle>
                        <CardDescription>
                          Quick overview of your profile completeness and key information
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Profile Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="text-center p-4 bg-muted/30 rounded-lg">
                            <div className="text-2xl font-bold text-primary">{profileCompletion}%</div>
                            <div className="text-sm text-muted-foreground">Complete</div>
                          </div>
                          <div className="text-center p-4 bg-muted/30 rounded-lg">
                            <div className="text-2xl font-bold text-primary">
                              {profile?.gaming_preferences?.favoriteGenres?.length || 0}
                            </div>
                            <div className="text-sm text-muted-foreground">Genres</div>
                          </div>
                          <div className="text-center p-4 bg-muted/30 rounded-lg">
                            <div className="text-2xl font-bold text-primary">
                              {profile?.privacy_level === 'public' ? 'Public' : 
                               profile?.privacy_level === 'friends' ? 'Friends' : 'Private'}
                            </div>
                            <div className="text-sm text-muted-foreground">Privacy</div>
                          </div>
                        </div>

                        <Separator />

                        {/* Quick Actions */}
                        <div>
                          <h4 className="font-medium mb-3">Quick Actions</h4>
                          <div className="grid grid-cols-2 gap-3">
                            <Button
                              variant="outline"
                              onClick={() => setActiveTab('avatar')}
                              className="justify-start"
                            >
                              <Camera className="h-4 w-4 mr-2" />
                              Update Photo
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setActiveTab('gaming')}
                              className="justify-start"
                            >
                              <Gamepad2 className="h-4 w-4 mr-2" />
                              Gaming Prefs
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setActiveTab('privacy')}
                              className="justify-start"
                            >
                              <Shield className="h-4 w-4 mr-2" />
                              Privacy Settings
                            </Button>
                            <Button
                              variant="outline"
                              onClick={refreshProfile}
                              className="justify-start"
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Refresh Data
                            </Button>
                          </div>
                        </div>

                        {/* Profile Tips */}
                        <div>
                          <h4 className="font-medium mb-3">Tips to Improve Your Profile</h4>
                          <div className="space-y-2">
                            {!profile?.avatar_url && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Camera className="h-3 w-3" />
                                Add a profile picture to make your profile more personal
                              </div>
                            )}
                            {!profile?.bio && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <User className="h-3 w-3" />
                                Write a bio to tell others about your gaming interests
                              </div>
                            )}
                            {(!profile?.gaming_preferences?.favoriteGenres?.length) && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Gamepad2 className="h-3 w-3" />
                                Add favorite genres to find compatible gaming partners
                              </div>
                            )}
                            {profileCompletion === 100 && (
                              <div className="flex items-center gap-2 text-sm text-green-600">
                                <CheckCircle className="h-3 w-3" />
                                Your profile is complete! Great job!
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Avatar Tab */}
                {activeTab === 'avatar' && (
                  <AvatarUpload
                    currentAvatarUrl={profile?.avatar_url}
                    onUploadComplete={handleSaveComplete}
                    showHeader={true}
                  />
                )}

                {/* Basic Info Tab */}
                {activeTab === 'basic' && (
                  <ProfileEditor
                    userId={user?.id}
                    onSave={handleSaveComplete}
                    showHeader={true}
                  />
                )}

                {/* Gaming Preferences Tab */}
                {activeTab === 'gaming' && (
                  <GamingPreferencesManager
                    userId={user?.id}
                    onSave={handleSaveComplete}
                    showHeader={true}
                  />
                )}

                {/* Bio & Privacy Tab */}
                {activeTab === 'privacy' && (
                  <BioPrivacyManager
                    userId={user?.id}
                    onSave={handleSaveComplete}
                    showHeader={true}
                  />
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => handleNavigation('/profile')}
            >
              Cancel
            </Button>
            
            <Button
              variant="outline"
              onClick={refreshProfile}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Profile {profileCompletion}% complete
            </span>
            
            <Button
              onClick={() => handleNavigation('/profile')}
              disabled={hasUnsavedChanges}
            >
              <Save className="h-4 w-4 mr-2" />
              {hasUnsavedChanges ? 'Save Changes First' : 'Done'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
