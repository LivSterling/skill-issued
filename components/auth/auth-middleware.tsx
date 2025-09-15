"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"

/**
 * Client-side authentication middleware for automatic redirects
 */
interface AuthMiddlewareProps {
  children: React.ReactNode
  /** Routes that require authentication */
  protectedRoutes?: string[]
  /** Routes that redirect authenticated users (like login pages) */
  guestOnlyRoutes?: string[]
  /** Default redirect for unauthenticated users */
  loginRedirect?: string
  /** Default redirect for authenticated users on guest-only routes */
  homeRedirect?: string
  /** Show toast notifications on redirects */
  showToasts?: boolean
}

export function AuthMiddleware({
  children,
  protectedRoutes = [
    '/profile',
    '/profile/edit',
    '/friends',
    '/settings',
    '/privacy',
    '/lists/create',
    '/reviews/create'
  ],
  guestOnlyRoutes = [
    '/login',
    '/register',
    '/auth/callback'
  ],
  loginRedirect = '/auth/login',
  homeRedirect = '/',
  showToasts = true
}: AuthMiddlewareProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, loading, user } = useAuth()

  useEffect(() => {
    // Don't redirect while auth is loading
    if (loading) return

    // Check if current route requires authentication
    const isProtectedRoute = protectedRoutes.some(route => 
      pathname.startsWith(route)
    )

    // Check if current route is guest-only
    const isGuestOnlyRoute = guestOnlyRoutes.some(route => 
      pathname.startsWith(route)
    )

    // Redirect unauthenticated users from protected routes
    if (isProtectedRoute && !isAuthenticated) {
      if (showToasts) {
        toast.error("Please sign in to access this page")
      }
      
      // Store the intended destination
      const returnUrl = encodeURIComponent(pathname)
      router.push(`${loginRedirect}?returnUrl=${returnUrl}`)
      return
    }

    // Redirect authenticated users from guest-only routes
    if (isGuestOnlyRoute && isAuthenticated) {
      if (showToasts) {
        toast.info("You are already signed in")
      }
      
      // Check for return URL in query params
      const urlParams = new URLSearchParams(window.location.search)
      const returnUrl = urlParams.get('returnUrl')
      
      if (returnUrl) {
        router.push(decodeURIComponent(returnUrl))
      } else {
        router.push(homeRedirect)
      }
      return
    }

  }, [
    pathname,
    isAuthenticated,
    loading,
    router,
    protectedRoutes,
    guestOnlyRoutes,
    loginRedirect,
    homeRedirect,
    showToasts
  ])

  return <>{children}</>
}

/**
 * Hook for checking if a route is protected
 */
export function useRouteProtection() {
  const pathname = usePathname()
  const { isAuthenticated, loading } = useAuth()

  const isProtectedRoute = (routes: string[] = []) => {
    return routes.some(route => pathname.startsWith(route))
  }

  const canAccessRoute = (routes: string[] = []) => {
    if (loading) return null // Still checking
    
    const isProtected = isProtectedRoute(routes)
    if (!isProtected) return true // Public route
    
    return isAuthenticated // Protected route requires auth
  }

  return {
    isProtectedRoute,
    canAccessRoute,
    isAuthenticated,
    loading,
    pathname
  }
}

/**
 * Component for showing different content based on auth state
 */
interface AuthGateProps {
  children: React.ReactNode
  /** Content to show when user is authenticated */
  authenticated?: React.ReactNode
  /** Content to show when user is not authenticated */
  unauthenticated?: React.ReactNode
  /** Content to show while checking authentication */
  loading?: React.ReactNode
  /** Fallback content */
  fallback?: React.ReactNode
}

export function AuthGate({
  children,
  authenticated,
  unauthenticated,
  loading: loadingContent,
  fallback
}: AuthGateProps) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return <>{loadingContent || fallback || children}</>
  }

  if (isAuthenticated) {
    return <>{authenticated || children}</>
  }

  return <>{unauthenticated || fallback || children}</>
}

/**
 * Higher-order component for adding route protection
 */
export function withRouteProtection<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    requireAuth?: boolean
    redirectTo?: string
    showToast?: boolean
  }
) {
  return function ProtectedComponent(props: P) {
    const router = useRouter()
    const { isAuthenticated, loading } = useAuth()

    useEffect(() => {
      if (loading) return

      if (options?.requireAuth && !isAuthenticated) {
        if (options.showToast) {
          toast.error("Please sign in to access this page")
        }
        
        router.push(options.redirectTo || '/auth/login')
      }
    }, [isAuthenticated, loading, router])

    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )
    }

    if (options?.requireAuth && !isAuthenticated) {
      return null
    }

    return <Component {...props} />
  }
}

