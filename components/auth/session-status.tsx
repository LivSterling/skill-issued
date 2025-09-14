"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

interface SessionStatusProps {
  showDetails?: boolean
  showRefreshButton?: boolean
  className?: string
}

export function SessionStatus({ 
  showDetails = false, 
  showRefreshButton = true,
  className = ""
}: SessionStatusProps) {
  const { 
    isAuthenticated, 
    isSessionValid, 
    needsRefresh, 
    isSessionExpiringSoon,
    getSessionExpiryTime,
    refreshSession 
  } = useAuth()
  
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState<string | null>(null)

  // Handle manual session refresh
  const handleRefresh = async () => {
    setIsRefreshing(true)
    setRefreshError(null)
    
    try {
      const { success, error } = await refreshSession()
      if (!success) {
        setRefreshError(error?.message || 'Failed to refresh session')
      }
    } catch (err) {
      setRefreshError('An unexpected error occurred')
    } finally {
      setIsRefreshing(false)
    }
  }

  // Clear error after some time
  useEffect(() => {
    if (refreshError) {
      const timer = setTimeout(() => {
        setRefreshError(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [refreshError])

  if (!isAuthenticated) {
    return null
  }

  // Determine session status
  const getSessionStatus = () => {
    if (!isSessionValid) {
      return { 
        status: 'expired', 
        color: 'destructive' as const,
        icon: XCircle,
        text: 'Session Expired'
      }
    } else if (isSessionExpiringSoon()) {
      return { 
        status: 'expiring', 
        color: 'warning' as const,
        icon: AlertTriangle,
        text: 'Expiring Soon'
      }
    } else if (needsRefresh) {
      return { 
        status: 'needs-refresh', 
        color: 'secondary' as const,
        icon: RefreshCw,
        text: 'Needs Refresh'
      }
    } else {
      return { 
        status: 'valid', 
        color: 'success' as const,
        icon: CheckCircle,
        text: 'Active'
      }
    }
  }

  const sessionStatus = getSessionStatus()
  const Icon = sessionStatus.icon
  const expiryTime = getSessionExpiryTime()

  return (
    <div className={className}>
      {/* Session expiring warning */}
      {isSessionExpiringSoon() && (
        <Alert className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Your session will expire in {expiryTime}. 
            {showRefreshButton && (
              <Button 
                variant="link" 
                size="sm" 
                className="p-0 ml-2 h-auto"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                Refresh now
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Session expired alert */}
      {!isSessionValid && (
        <Alert variant="destructive" className="mb-4">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            Your session has expired. Please sign in again.
          </AlertDescription>
        </Alert>
      )}

      {/* Refresh error */}
      {refreshError && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {refreshError}
          </AlertDescription>
        </Alert>
      )}

      {/* Session details */}
      {showDetails && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Badge 
              variant={sessionStatus.color === 'success' ? 'default' : 
                     sessionStatus.color === 'warning' ? 'secondary' : 
                     sessionStatus.color === 'destructive' ? 'destructive' : 'outline'}
            >
              <Icon className="h-3 w-3 mr-1" />
              {sessionStatus.text}
            </Badge>
            
            {expiryTime && isSessionValid && (
              <span className="text-sm text-muted-foreground">
                Expires in {expiryTime}
              </span>
            )}
          </div>

          {/* Manual refresh button */}
          {showRefreshButton && isSessionValid && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// Session status indicator for navigation/header
export function SessionStatusIndicator() {
  const { isSessionExpiringSoon, needsRefresh, isSessionValid } = useAuth()

  if (!isSessionValid) {
    return (
      <Badge variant="destructive" className="animate-pulse">
        <XCircle className="h-3 w-3 mr-1" />
        Expired
      </Badge>
    )
  }

  if (isSessionExpiringSoon()) {
    return (
      <Badge variant="secondary" className="animate-pulse">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Expiring
      </Badge>
    )
  }

  if (needsRefresh) {
    return (
      <Badge variant="outline">
        <RefreshCw className="h-3 w-3 mr-1" />
        Refresh
      </Badge>
    )
  }

  return null
}
