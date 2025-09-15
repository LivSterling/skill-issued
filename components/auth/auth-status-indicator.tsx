"use client"

import { useAuth } from "@/hooks/use-auth"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Wifi, 
  WifiOff, 
  Shield, 
  Mail,
  User,
  RefreshCw
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface AuthStatusIndicatorProps {
  variant?: "badge" | "card" | "inline" | "minimal"
  showDetails?: boolean
  className?: string
}

export function AuthStatusIndicator({ 
  variant = "badge", 
  showDetails = false,
  className 
}: AuthStatusIndicatorProps) {
  const { 
    isAuthenticated, 
    isLoading, 
    user, 
    userProfile,
    isEmailVerified,
    isProfileComplete,
    isSessionValid,
    needsRefresh,
    timeUntilExpiry,
    hasPersistedData
  } = useAuth()

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
        {variant !== "minimal" && (
          <span className="text-sm text-muted-foreground">Loading...</span>
        )}
      </div>
    )
  }

  // Not authenticated
  if (!isAuthenticated) {
    if (variant === "minimal") {
      return (
        <WifiOff className={cn("h-4 w-4 text-muted-foreground", className)} />
      )
    }

    if (variant === "badge") {
      return (
        <Badge variant="outline" className={cn("text-xs", className)}>
          <WifiOff className="h-3 w-3 mr-1" />
          Not signed in
        </Badge>
      )
    }

    if (variant === "card") {
      return (
        <Card className={className}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-2">
              <WifiOff className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Not signed in</span>
            </div>
            <Button size="sm" className="w-full" asChild>
              <Link href="/auth">Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      )
    }

    return (
      <div className={cn("flex items-center gap-2", className)}>
        <WifiOff className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Not signed in</span>
      </div>
    )
  }

  // Authenticated - determine status
  const getAuthStatus = () => {
    if (!isSessionValid) {
      return {
        status: "expired",
        icon: AlertTriangle,
        color: "text-red-500",
        bgColor: "bg-red-50 border-red-200",
        message: "Session expired",
        action: "Sign in again"
      }
    }

    if (needsRefresh) {
      return {
        status: "refresh-needed",
        icon: Clock,
        color: "text-yellow-600",
        bgColor: "bg-yellow-50 border-yellow-200",
        message: "Session expiring soon",
        action: "Refresh session"
      }
    }

    if (!isEmailVerified) {
      return {
        status: "email-unverified",
        icon: Mail,
        color: "text-blue-600",
        bgColor: "bg-blue-50 border-blue-200",
        message: "Email not verified",
        action: "Verify email"
      }
    }

    if (!isProfileComplete) {
      return {
        status: "profile-incomplete",
        icon: User,
        color: "text-yellow-600",
        bgColor: "bg-yellow-50 border-yellow-200",
        message: "Profile incomplete",
        action: "Complete profile"
      }
    }

    return {
      status: "authenticated",
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50 border-green-200",
      message: "Signed in",
      action: null
    }
  }

  const authStatus = getAuthStatus()
  const StatusIcon = authStatus.icon

  // Minimal variant - just icon
  if (variant === "minimal") {
    return (
      <StatusIcon className={cn("h-4 w-4", authStatus.color, className)} />
    )
  }

  // Badge variant
  if (variant === "badge") {
    return (
      <Badge 
        variant={authStatus.status === "authenticated" ? "default" : "outline"}
        className={cn(
          "text-xs",
          authStatus.status === "authenticated" ? "bg-green-100 text-green-800 border-green-200" : "",
          className
        )}
      >
        <StatusIcon className="h-3 w-3 mr-1" />
        {authStatus.message}
      </Badge>
    )
  }

  // Card variant
  if (variant === "card") {
    return (
      <Card className={cn(authStatus.bgColor, className)}>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-2">
            <StatusIcon className={cn("h-4 w-4", authStatus.color)} />
            <span className="text-sm font-medium">{authStatus.message}</span>
          </div>
          
          {showDetails && (
            <div className="space-y-1 text-xs text-muted-foreground mb-3">
              {user?.email && (
                <div className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  <span>{user.email}</span>
                </div>
              )}
              {hasPersistedData && (
                <div className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  <span>Session remembered</span>
                </div>
              )}
              {timeUntilExpiry && timeUntilExpiry > 0 && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>Expires in {Math.floor(timeUntilExpiry / 60)}m</span>
                </div>
              )}
            </div>
          )}
          
          {authStatus.action && (
            <Button size="sm" className="w-full" variant="outline">
              {authStatus.action}
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  // Inline variant (default)
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <StatusIcon className={cn("h-4 w-4", authStatus.color)} />
      <span className="text-sm">{authStatus.message}</span>
      {showDetails && user?.email && (
        <span className="text-xs text-muted-foreground">({user.email})</span>
      )}
    </div>
  )
}

// Connection status indicator
export function ConnectionStatusIndicator({ className }: { className?: string }) {
  // This would typically connect to a network status hook
  // For now, we'll show a simple online indicator
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Wifi className="h-3 w-3 text-green-500" />
      <span className="text-xs text-muted-foreground">Online</span>
    </div>
  )
}

// Session warning component
export function SessionWarning() {
  const { needsRefresh, timeUntilExpiry, refreshSession } = useAuth()

  if (!needsRefresh || !timeUntilExpiry) return null

  const minutesLeft = Math.floor(timeUntilExpiry / 60)

  return (
    <Card className="border-yellow-200 bg-yellow-50">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-800">
              Session expires in {minutesLeft} minutes
            </span>
          </div>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => refreshSession()}
            className="border-yellow-300 text-yellow-800 hover:bg-yellow-100"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
