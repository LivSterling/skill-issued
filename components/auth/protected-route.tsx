"use client"

import React, { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AuthDialog } from "@/components/auth-dialog"
import { Lock, Shield, User, AlertCircle, ArrowLeft, Home } from "lucide-react"

interface ProtectedRouteProps {
  children: React.ReactNode
  /** Require specific authentication level */
  requireAuth?: boolean
  /** Require verified email */
  requireVerified?: boolean
  /** Require complete profile */
  requireProfile?: boolean
  /** Custom redirect path instead of showing auth UI */
  redirectTo?: string
  /** Show loading skeleton while checking auth */
  showLoadingSkeleton?: boolean
  /** Custom loading component */
  loadingComponent?: React.ReactNode
  /** Custom unauthorized component */
  unauthorizedComponent?: React.ReactNode
  /** Allow access to unverified users but show warning */
  allowUnverified?: boolean
  /** Minimum role required (for future role-based access) */
  minimumRole?: string
  /** Custom error message */
  errorMessage?: string
  /** Show back button on unauthorized page */
  showBackButton?: boolean
}

interface AuthRequirement {
  met: boolean
  message: string
  action?: string
  icon: React.ReactNode
}

export function ProtectedRoute({
  children,
  requireAuth = true,
  requireVerified = false,
  requireProfile = false,
  redirectTo,
  showLoadingSkeleton = true,
  loadingComponent,
  unauthorizedComponent,
  allowUnverified = false,
  minimumRole,
  errorMessage,
  showBackButton = true
}: ProtectedRouteProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false)
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false)
  
  const {
    isAuthenticated,
    loading: authLoading,
    user,
    userProfile,
    isEmailVerified,
    hasProfile,
    isProfileComplete,
    needsProfileSetup
  } = useAuth()

  // Check authentication requirements
  const checkRequirements = (): AuthRequirement[] => {
    const requirements: AuthRequirement[] = []

    // Check basic authentication
    if (requireAuth && !isAuthenticated) {
      requirements.push({
        met: false,
        message: "You need to sign in to access this page",
        action: "Sign In",
        icon: <User className="h-5 w-5" />
      })
    }

    // Check email verification
    if (requireVerified && isAuthenticated && !isEmailVerified) {
      requirements.push({
        met: false,
        message: allowUnverified 
          ? "Please verify your email address for full access" 
          : "You need to verify your email address to access this page",
        action: "Resend Verification",
        icon: <Shield className="h-5 w-5" />
      })
    }

    // Check profile completion
    if (requireProfile && isAuthenticated && (!hasProfile || !isProfileComplete)) {
      requirements.push({
        met: false,
        message: "Please complete your profile to access this page",
        action: "Complete Profile",
        icon: <User className="h-5 w-5" />
      })
    }

    return requirements
  }

  // Handle redirects and auth state changes
  useEffect(() => {
    if (authLoading) return

    setHasCheckedAuth(true)

    // If we have a custom redirect path, use it
    if (redirectTo) {
      const unmetRequirements = checkRequirements()
      if (unmetRequirements.length > 0) {
        router.push(redirectTo)
        return
      }
    }

    // Handle profile setup redirect
    if (isAuthenticated && needsProfileSetup() && pathname !== '/profile/setup') {
      router.push('/profile/setup')
      return
    }

  }, [
    authLoading, 
    isAuthenticated, 
    isEmailVerified, 
    hasProfile, 
    isProfileComplete,
    redirectTo, 
    router, 
    pathname,
    needsProfileSetup
  ])

  // Show loading state
  if (authLoading || !hasCheckedAuth) {
    if (loadingComponent) {
      return <>{loadingComponent}</>
    }

    if (showLoadingSkeleton) {
      return (
        <div className="container mx-auto px-4 py-8 space-y-6">
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="grid gap-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      )
    }

    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Check all requirements
  const unmetRequirements = checkRequirements()
  
  // If all requirements are met, render children
  if (unmetRequirements.length === 0) {
    return <>{children}</>
  }

  // Handle unverified users with allowUnverified flag
  if (allowUnverified && unmetRequirements.every(req => req.message.includes("verify your email"))) {
    return (
      <div className="space-y-4">
        <Alert className="border-yellow-200 bg-yellow-50 text-yellow-800">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please verify your email address for full access to all features.
          </AlertDescription>
        </Alert>
        {children}
      </div>
    )
  }

  // Show custom unauthorized component if provided
  if (unauthorizedComponent) {
    return <>{unauthorizedComponent}</>
  }

  // Default unauthorized UI
  const primaryRequirement = unmetRequirements[0]

  return (
    <>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <Card className="border-border bg-card">
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                <Lock className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <CardTitle className="text-xl">Access Required</CardTitle>
                <CardDescription>
                  {errorMessage || primaryRequirement.message}
                </CardDescription>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Show all unmet requirements */}
              <div className="space-y-3">
                {unmetRequirements.map((requirement, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    {requirement.icon}
                    <div className="flex-1 text-sm">
                      <p className="text-foreground">{requirement.message}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              <div className="space-y-3">
                {!isAuthenticated && (
                  <Button 
                    onClick={() => setIsAuthDialogOpen(true)}
                    className="w-full"
                  >
                    <User className="mr-2 h-4 w-4" />
                    Sign In
                  </Button>
                )}

                {isAuthenticated && !isEmailVerified && (
                  <Button 
                    onClick={() => {
                      // TODO: Implement resend verification
                      console.log('Resend verification email')
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    <Shield className="mr-2 h-4 w-4" />
                    Resend Verification Email
                  </Button>
                )}

                {isAuthenticated && (!hasProfile || !isProfileComplete) && (
                  <Button 
                    onClick={() => router.push('/profile/setup')}
                    className="w-full"
                  >
                    <User className="mr-2 h-4 w-4" />
                    Complete Profile
                  </Button>
                )}

                {/* Navigation buttons */}
                <div className="flex gap-2">
                  {showBackButton && (
                    <Button 
                      variant="outline" 
                      onClick={() => router.back()}
                      className="flex-1"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Go Back
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    onClick={() => router.push('/')}
                    className="flex-1"
                  >
                    <Home className="mr-2 h-4 w-4" />
                    Home
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Auth Dialog */}
      <AuthDialog 
        open={isAuthDialogOpen} 
        onOpenChange={setIsAuthDialogOpen} 
      />
    </>
  )
}

// Convenience wrapper components for common use cases
export function RequireAuth({ children, ...props }: Omit<ProtectedRouteProps, 'requireAuth'>) {
  return (
    <ProtectedRoute requireAuth={true} {...props}>
      {children}
    </ProtectedRoute>
  )
}

export function RequireVerified({ children, ...props }: Omit<ProtectedRouteProps, 'requireVerified'>) {
  return (
    <ProtectedRoute requireAuth={true} requireVerified={true} {...props}>
      {children}
    </ProtectedRoute>
  )
}

export function RequireProfile({ children, ...props }: Omit<ProtectedRouteProps, 'requireProfile'>) {
  return (
    <ProtectedRoute requireAuth={true} requireProfile={true} {...props}>
      {children}
    </ProtectedRoute>
  )
}

// Higher-order component for page-level protection
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<ProtectedRouteProps, 'children'>
) {
  return function AuthenticatedComponent(props: P) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    )
  }
}

// Hook for checking auth requirements in components
export function useAuthRequirements(requirements: {
  requireAuth?: boolean
  requireVerified?: boolean
  requireProfile?: boolean
}) {
  const {
    isAuthenticated,
    isEmailVerified,
    hasProfile,
    isProfileComplete,
    loading
  } = useAuth()

  const checkRequirements = () => {
    const unmet: string[] = []

    if (requirements.requireAuth && !isAuthenticated) {
      unmet.push('authentication')
    }

    if (requirements.requireVerified && !isEmailVerified) {
      unmet.push('email_verification')
    }

    if (requirements.requireProfile && (!hasProfile || !isProfileComplete)) {
      unmet.push('profile_completion')
    }

    return {
      canAccess: unmet.length === 0,
      unmetRequirements: unmet,
      loading
    }
  }

  return checkRequirements()
}

