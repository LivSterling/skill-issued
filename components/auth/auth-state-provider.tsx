"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { SessionWarning } from "./auth-status-indicator"
import { toast } from "sonner"
import { 
  CheckCircle, 
  AlertTriangle, 
  Mail, 
  RefreshCw,
  Wifi,
  WifiOff
} from "lucide-react"

interface AuthStateProviderProps {
  children: React.ReactNode
}

export function AuthStateProvider({ children }: AuthStateProviderProps) {
  const { 
    isAuthenticated, 
    user, 
    isEmailVerified,
    isSessionValid,
    needsRefresh,
    timeUntilExpiry,
    refreshSession
  } = useAuth()

  const [hasShownSessionWarning, setHasShownSessionWarning] = useState(false)
  const [hasShownEmailVerification, setHasShownEmailVerification] = useState(false)
  const [isOnline, setIsOnline] = useState(true)

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      toast.success("Connection restored", {
        icon: <Wifi className="h-4 w-4" />,
        duration: 3000
      })
    }

    const handleOffline = () => {
      setIsOnline(false)
      toast.error("Connection lost", {
        icon: <WifiOff className="h-4 w-4" />,
        duration: 5000
      })
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Check initial status
    setIsOnline(navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Session expiration warnings
  useEffect(() => {
    if (!isAuthenticated || !timeUntilExpiry) return

    const minutesLeft = Math.floor(timeUntilExpiry / 60)

    // Show warning at 5 minutes
    if (minutesLeft <= 5 && minutesLeft > 0 && !hasShownSessionWarning) {
      setHasShownSessionWarning(true)
      toast.warning(`Session expires in ${minutesLeft} minutes`, {
        icon: <AlertTriangle className="h-4 w-4" />,
        duration: 10000,
        action: {
          label: "Refresh",
          onClick: () => {
            refreshSession()
            toast.success("Session refreshed", {
              icon: <CheckCircle className="h-4 w-4" />
            })
          }
        }
      })
    }

    // Reset warning flag when session is refreshed
    if (minutesLeft > 10) {
      setHasShownSessionWarning(false)
    }
  }, [timeUntilExpiry, isAuthenticated, hasShownSessionWarning, refreshSession])

  // Session expired notification
  useEffect(() => {
    if (isAuthenticated && !isSessionValid) {
      toast.error("Your session has expired", {
        icon: <AlertTriangle className="h-4 w-4" />,
        duration: Infinity,
        action: {
          label: "Sign in again",
          onClick: () => window.location.href = "/auth"
        }
      })
    }
  }, [isAuthenticated, isSessionValid])

  // Email verification reminder
  useEffect(() => {
    if (isAuthenticated && user && !isEmailVerified && !hasShownEmailVerification) {
      // Show after a delay to not overwhelm on login
      const timer = setTimeout(() => {
        setHasShownEmailVerification(true)
        toast.info("Please verify your email address", {
          icon: <Mail className="h-4 w-4" />,
          duration: 8000,
          description: "Check your inbox for a verification link",
          action: {
            label: "Resend",
            onClick: () => {
              // This would trigger email resend
              toast.success("Verification email sent", {
                icon: <Mail className="h-4 w-4" />
              })
            }
          }
        })
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [isAuthenticated, user, isEmailVerified, hasShownEmailVerification])

  // Auto-refresh session when it's about to expire
  useEffect(() => {
    if (!isAuthenticated || !needsRefresh || !timeUntilExpiry) return

    const minutesLeft = Math.floor(timeUntilExpiry / 60)

    // Auto-refresh at 2 minutes if user is active
    if (minutesLeft <= 2 && minutesLeft > 0) {
      const handleActivity = () => {
        refreshSession()
        toast.success("Session automatically refreshed", {
          icon: <RefreshCw className="h-4 w-4" />,
          duration: 3000
        })
      }

      // Listen for user activity
      const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
      events.forEach(event => {
        document.addEventListener(event, handleActivity, { once: true })
      })

      return () => {
        events.forEach(event => {
          document.removeEventListener(event, handleActivity)
        })
      }
    }
  }, [isAuthenticated, needsRefresh, timeUntilExpiry, refreshSession])

  return (
    <>
      {children}
      
      {/* Session warning component - shows when session is about to expire */}
      {isAuthenticated && needsRefresh && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm">
          <SessionWarning />
        </div>
      )}
      
      {/* Offline indicator */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-500 text-white text-center py-2 text-sm">
          <div className="flex items-center justify-center gap-2">
            <WifiOff className="h-4 w-4" />
            You are offline. Some features may not work.
          </div>
        </div>
      )}
    </>
  )
}
