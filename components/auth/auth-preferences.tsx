"use client"

import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Settings, Database, Clock, Shield, AlertTriangle, CheckCircle } from 'lucide-react'

interface AuthPreferencesProps {
  className?: string
}

export function AuthPreferences({ className = "" }: AuthPreferencesProps) {
  const { 
    rememberMe, 
    autoRefresh, 
    hasPersistedData,
    updatePreferences,
    clearPersistedData
  } = useAuth()
  
  const [isUpdating, setIsUpdating] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Handle preference updates
  const handlePreferenceChange = async (key: string, value: boolean) => {
    setIsUpdating(true)
    setMessage(null)
    
    try {
      const { success, error } = await updatePreferences({ [key]: value })
      
      if (success) {
        setMessage({ 
          type: 'success', 
          text: `${key === 'rememberMe' ? 'Remember me' : 'Auto refresh'} setting updated` 
        })
      } else {
        setMessage({ type: 'error', text: error || 'Failed to update preference' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'An unexpected error occurred' })
    } finally {
      setIsUpdating(false)
    }
  }

  // Handle clearing persisted data
  const handleClearData = async () => {
    setIsClearing(true)
    setMessage(null)
    
    try {
      const { success, error } = await clearPersistedData()
      
      if (success) {
        setMessage({ type: 'success', text: 'All persisted authentication data cleared' })
      } else {
        setMessage({ type: 'error', text: error || 'Failed to clear data' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'An unexpected error occurred' })
    } finally {
      setIsClearing(false)
    }
  }

  // Clear message after some time
  if (message) {
    setTimeout(() => setMessage(null), 5000)
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Authentication Preferences
        </CardTitle>
        <CardDescription>
          Manage how your authentication data is stored and handled
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Status message */}
        {message && (
          <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
            {message.type === 'success' ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        {/* Remember Me Setting */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="remember-me" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Remember Me
              </Label>
              <p className="text-sm text-muted-foreground">
                Keep me signed in across browser sessions. Data is stored in local storage.
              </p>
            </div>
            <Switch
              id="remember-me"
              checked={rememberMe}
              onCheckedChange={(checked) => handlePreferenceChange('rememberMe', checked)}
              disabled={isUpdating}
            />
          </div>
          
          <div className="pl-6 text-xs text-muted-foreground">
            {rememberMe ? (
              <Badge variant="outline" className="text-green-600">
                <Shield className="h-3 w-3 mr-1" />
                Using persistent storage
              </Badge>
            ) : (
              <Badge variant="outline" className="text-orange-600">
                <Clock className="h-3 w-3 mr-1" />
                Using session storage
              </Badge>
            )}
          </div>
        </div>

        <Separator />

        {/* Auto Refresh Setting */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="auto-refresh" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Auto Refresh Sessions
              </Label>
              <p className="text-sm text-muted-foreground">
                Automatically refresh authentication tokens before they expire.
              </p>
            </div>
            <Switch
              id="auto-refresh"
              checked={autoRefresh}
              onCheckedChange={(checked) => handlePreferenceChange('autoRefresh', checked)}
              disabled={isUpdating}
            />
          </div>
        </div>

        <Separator />

        {/* Data Management */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Stored Data Management
            </Label>
            <p className="text-sm text-muted-foreground">
              Manage your locally stored authentication data.
            </p>
          </div>

          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="space-y-1">
              <p className="text-sm font-medium">Persisted Authentication Data</p>
              <p className="text-xs text-muted-foreground">
                {hasPersistedData ? 
                  'You have authentication data stored locally' : 
                  'No authentication data is currently stored'
                }
              </p>
            </div>
            <Badge variant={hasPersistedData ? 'default' : 'outline'}>
              {hasPersistedData ? 'Stored' : 'None'}
            </Badge>
          </div>

          {hasPersistedData && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearData}
              disabled={isClearing}
              className="w-full"
            >
              {isClearing ? 'Clearing...' : 'Clear All Stored Data'}
            </Button>
          )}
        </div>

        {/* Security Notice */}
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Security Note:</strong> Authentication tokens are encrypted and stored securely. 
            Clearing your browser data or signing out will remove all stored authentication information.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}

// Compact version for settings pages
export function AuthPreferencesCompact({ className = "" }: AuthPreferencesProps) {
  const { rememberMe, autoRefresh, updatePreferences } = useAuth()
  const [isUpdating, setIsUpdating] = useState(false)

  const handlePreferenceChange = async (key: string, value: boolean) => {
    setIsUpdating(true)
    try {
      await updatePreferences({ [key]: value })
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <Label htmlFor="remember-me-compact" className="text-sm">Remember Me</Label>
        <Switch
          id="remember-me-compact"
          checked={rememberMe}
          onCheckedChange={(checked) => handlePreferenceChange('rememberMe', checked)}
          disabled={isUpdating}
          size="sm"
        />
      </div>
      
      <div className="flex items-center justify-between">
        <Label htmlFor="auto-refresh-compact" className="text-sm">Auto Refresh</Label>
        <Switch
          id="auto-refresh-compact"
          checked={autoRefresh}
          onCheckedChange={(checked) => handlePreferenceChange('autoRefresh', checked)}
          disabled={isUpdating}
          size="sm"
        />
      </div>
    </div>
  )
}
