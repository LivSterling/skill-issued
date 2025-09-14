import { useAuth as useAuthContext } from '@/contexts/auth-context'
import { useMemo, useCallback, useState, useEffect } from 'react'
import { signUpWithEmail, signInWithEmail, signInWithGoogle, signInWithDiscord, resetPassword } from '@/lib/auth/auth-utils'
import { sessionManager, refreshSession, isSessionValid } from '@/lib/auth/session-manager'
import { authPersistence } from '@/lib/auth/auth-persistence'
import type { AuthError } from '@supabase/supabase-js'

// Types for authentication operations
interface SignUpData {
  email: string
  password: string
  username: string
  displayName?: string
}

interface SignInData {
  email: string
  password: string
}

interface ResetPasswordData {
  email: string
}

// Enhanced authentication hook with additional utilities
export function useAuth() {
  const context = useAuthContext()
  const [authPreferences, setAuthPreferences] = useState(() => authPersistence.getPreferences())

  // Computed authentication states
  const computedValues = useMemo(() => ({
    // Basic authentication state
    isAuthenticated: !!context.user,
    isLoading: context.loading,
    hasProfile: !!context.userProfile,
    
    // User information helpers
    userId: context.user?.id || null,
    userEmail: context.user?.email || null,
    username: context.userProfile?.username || null,
    displayName: context.userProfile?.display_name || context.userProfile?.username || null,
    avatarUrl: context.userProfile?.avatar_url || null,
    
    // Profile completeness check
    isProfileComplete: !!(
      context.userProfile?.username &&
      context.userProfile?.display_name
    ),
    
    // Privacy and preferences
    privacyLevel: context.userProfile?.privacy_level || 'public',
    gamingPreferences: context.userProfile?.gaming_preferences || null,
    
    // Account status
    isEmailVerified: context.user?.email_confirmed_at !== null,
    accountCreatedAt: context.userProfile?.created_at || null,
    lastUpdatedAt: context.userProfile?.updated_at || null,
    
    // Session status
    isSessionValid: isSessionValid(),
    needsRefresh: sessionManager.needsRefresh(),
    timeUntilExpiry: sessionManager.getTimeUntilExpiry(),
    
    // Persistence status
    hasPersistedData: authPersistence.hasPersistedData(),
    rememberMe: authPreferences.rememberMe,
    autoRefresh: authPreferences.autoRefresh,
  }), [context.user, context.userProfile, context.loading])

  // Authentication methods with error handling
  const authMethods = useMemo(() => ({
    // Sign up with email and password
    signUp: async (data: SignUpData): Promise<{ success: boolean; error?: AuthError }> => {
      try {
        const { user, error } = await signUpWithEmail(data)
        if (error) {
          return { success: false, error }
        }
        return { success: true }
      } catch (err) {
        return {
          success: false,
          error: {
            message: 'An unexpected error occurred during sign up',
            name: 'UnknownError'
          } as AuthError
        }
      }
    },

    // Sign in with email and password
    signIn: async (data: SignInData): Promise<{ success: boolean; error?: AuthError }> => {
      try {
        const { user, error } = await signInWithEmail(data)
        if (error) {
          return { success: false, error }
        }
        return { success: true }
      } catch (err) {
        return {
          success: false,
          error: {
            message: 'An unexpected error occurred during sign in',
            name: 'UnknownError'
          } as AuthError
        }
      }
    },

    // Sign in with Google OAuth
    signInWithGoogle: async (): Promise<{ success: boolean; error?: AuthError }> => {
      try {
        const { error } = await signInWithGoogle()
        if (error) {
          return { success: false, error }
        }
        return { success: true }
      } catch (err) {
        return {
          success: false,
          error: {
            message: 'An unexpected error occurred during Google sign in',
            name: 'UnknownError'
          } as AuthError
        }
      }
    },

    // Sign in with Discord OAuth
    signInWithDiscord: async (): Promise<{ success: boolean; error?: AuthError }> => {
      try {
        const { error } = await signInWithDiscord()
        if (error) {
          return { success: false, error }
        }
        return { success: true }
      } catch (err) {
        return {
          success: false,
          error: {
            message: 'An unexpected error occurred during Discord sign in',
            name: 'UnknownError'
          } as AuthError
        }
      }
    },

    // Reset password
    resetPassword: async (data: ResetPasswordData): Promise<{ success: boolean; error?: AuthError }> => {
      try {
        const { error } = await resetPassword(data)
        if (error) {
          return { success: false, error }
        }
        return { success: true }
      } catch (err) {
        return {
          success: false,
          error: {
            message: 'An unexpected error occurred during password reset',
            name: 'UnknownError'
          } as AuthError
        }
      }
    },

    // Sign out (using context method)
    signOut: async (): Promise<{ success: boolean; error?: AuthError }> => {
      try {
        const { error } = await context.signOut()
        if (error) {
          return { success: false, error }
        }
        return { success: true }
      } catch (err) {
        return {
          success: false,
          error: {
            message: 'An unexpected error occurred during sign out',
            name: 'UnknownError'
          } as AuthError
        }
      }
    },

    // Refresh profile data
    refreshProfile: async (): Promise<{ success: boolean; error?: string }> => {
      try {
        await context.refreshProfile()
        return { success: true }
      } catch (err) {
        return {
          success: false,
          error: 'Failed to refresh profile data'
        }
      }
    },

    // Update profile
    updateProfile: async (updates: Record<string, any>): Promise<{ success: boolean; error?: AuthError }> => {
      try {
        const { error } = await context.updateProfile(updates)
        if (error) {
          return { success: false, error }
        }
        return { success: true }
      } catch (err) {
        return {
          success: false,
          error: {
            message: 'An unexpected error occurred during profile update',
            name: 'UnknownError'
          } as AuthError
        }
      }
    },

    // Refresh session manually
    refreshSession: async (): Promise<{ success: boolean; error?: any }> => {
      try {
        const { session, error } = await refreshSession()
        if (error) {
          return { success: false, error }
        }
        return { success: true }
      } catch (err) {
        return {
          success: false,
          error: 'Failed to refresh session'
        }
      }
    },

    // Update authentication preferences
    updatePreferences: async (newPreferences: Partial<typeof authPreferences>): Promise<{ success: boolean; error?: string }> => {
      try {
        // Handle remember me change (migrate storage if needed)
        if ('rememberMe' in newPreferences && newPreferences.rememberMe !== authPreferences.rememberMe) {
          authPersistence.migrateStorage(newPreferences.rememberMe!)
        }
        
        authPersistence.savePreferences(newPreferences)
        setAuthPreferences(prev => ({ ...prev, ...newPreferences }))
        
        return { success: true }
      } catch (err) {
        return {
          success: false,
          error: 'Failed to update preferences'
        }
      }
    },

    // Clear all persisted data
    clearPersistedData: async (): Promise<{ success: boolean; error?: string }> => {
      try {
        authPersistence.clearAll()
        return { success: true }
      } catch (err) {
        return {
          success: false,
          error: 'Failed to clear persisted data'
        }
      }
    },
  }), [context, authPreferences])

  // Profile helper methods
  const profileHelpers = useMemo(() => ({
    // Get user's initials for avatar fallback
    getInitials: (): string => {
      const name = computedValues.displayName || computedValues.username || computedValues.userEmail
      if (!name) return '??'
      
      const parts = name.split(' ')
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      }
      return name.substring(0, 2).toUpperCase()
    },

    // Check if user can perform certain actions based on profile completeness
    canCreateContent: (): boolean => {
      return computedValues.isAuthenticated && computedValues.hasProfile
    },

    // Check if profile is public
    isPublicProfile: (): boolean => {
      return computedValues.privacyLevel === 'public'
    },

    // Get user's preferred name for display
    getDisplayName: (): string => {
      return computedValues.displayName || computedValues.username || 'User'
    },

    // Check if user needs to complete profile setup
    needsProfileSetup: (): boolean => {
      return computedValues.isAuthenticated && !computedValues.isProfileComplete
    },

    // Format account creation date
    getAccountAge: (): string | null => {
      if (!computedValues.accountCreatedAt) return null
      
      const createdDate = new Date(computedValues.accountCreatedAt)
      const now = new Date()
      const diffTime = Math.abs(now.getTime() - createdDate.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      if (diffDays < 30) {
        return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
      } else if (diffDays < 365) {
        const months = Math.floor(diffDays / 30)
        return `${months} month${months === 1 ? '' : 's'} ago`
      } else {
        const years = Math.floor(diffDays / 365)
        return `${years} year${years === 1 ? '' : 's'} ago`
      }
    },

    // Format time until session expires
    getSessionExpiryTime: (): string | null => {
      const timeUntilExpiry = computedValues.timeUntilExpiry
      if (timeUntilExpiry <= 0) return 'Expired'
      
      const minutes = Math.floor(timeUntilExpiry / (1000 * 60))
      const hours = Math.floor(minutes / 60)
      const days = Math.floor(hours / 24)
      
      if (days > 0) {
        return `${days} day${days === 1 ? '' : 's'}`
      } else if (hours > 0) {
        return `${hours} hour${hours === 1 ? '' : 's'}`
      } else {
        return `${minutes} minute${minutes === 1 ? '' : 's'}`
      }
    },

    // Check if session is about to expire (within 10 minutes)
    isSessionExpiringSoon: (): boolean => {
      return computedValues.timeUntilExpiry > 0 && computedValues.timeUntilExpiry <= 10 * 60 * 1000
    },
  }), [computedValues])

  // Return combined hook interface
  return {
    // Original context values
    user: context.user,
    session: context.session,
    userProfile: context.userProfile,
    loading: context.loading,
    
    // Computed values
    ...computedValues,
    
    // Authentication methods
    ...authMethods,
    
    // Profile helpers
    ...profileHelpers,
  }
}

// Export types for external use
export type { SignUpData, SignInData, ResetPasswordData }
