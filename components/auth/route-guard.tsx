"use client"

import React from "react"
import { ProtectedRoute, type ProtectedRouteProps } from "./protected-route"

/**
 * Simple route guard component for common authentication scenarios
 */
interface RouteGuardProps extends Omit<ProtectedRouteProps, 'requireAuth' | 'requireVerified' | 'requireProfile'> {
  children: React.ReactNode
  /** Authentication level required */
  level?: 'public' | 'auth' | 'verified' | 'complete'
}

export function RouteGuard({ 
  children, 
  level = 'public',
  ...props 
}: RouteGuardProps) {
  // Public routes - no authentication required
  if (level === 'public') {
    return <>{children}</>
  }

  // Determine requirements based on level
  const requirements = {
    auth: { requireAuth: true },
    verified: { requireAuth: true, requireVerified: true },
    complete: { requireAuth: true, requireVerified: true, requireProfile: true }
  }

  return (
    <ProtectedRoute {...requirements[level]} {...props}>
      {children}
    </ProtectedRoute>
  )
}

// Convenience components for different protection levels
export function PublicRoute({ children }: { children: React.ReactNode }) {
  return <RouteGuard level="public">{children}</RouteGuard>
}

export function AuthRoute({ children, ...props }: Omit<RouteGuardProps, 'level'>) {
  return <RouteGuard level="auth" {...props}>{children}</RouteGuard>
}

export function VerifiedRoute({ children, ...props }: Omit<RouteGuardProps, 'level'>) {
  return <RouteGuard level="verified" {...props}>{children}</RouteGuard>
}

export function CompleteRoute({ children, ...props }: Omit<RouteGuardProps, 'level'>) {
  return <RouteGuard level="complete" {...props}>{children}</RouteGuard>
}

