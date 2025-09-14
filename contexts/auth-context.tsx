"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { sessionManager } from '@/lib/auth/session-manager'
import { authPersistence, saveAuthData, loadAuthData } from '@/lib/auth/auth-persistence'
import type { User, Session, AuthError } from '@supabase/supabase-js'

// Define the user profile type
interface UserProfile {
  id: string
  username: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  privacy_level: string
  gaming_preferences: any | null
  created_at: string
  updated_at: string
}

// Define the authentication context type
interface AuthContextType {
  user: User | null
  session: Session | null
  userProfile: UserProfile | null
  loading: boolean
  signOut: () => Promise<{ error: AuthError | null }>
  refreshProfile: () => Promise<void>
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: AuthError | null }>
}

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Custom hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Auth provider component
interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch user profile
  const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching user profile:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Unexpected error fetching user profile:', error)
      return null
    }
  }

  // Refresh profile data
  const refreshProfile = async () => {
    if (user) {
      const profile = await fetchUserProfile(user.id)
      setUserProfile(profile)
    }
  }

  // Update profile
  const updateProfile = async (updates: Partial<UserProfile>): Promise<{ error: AuthError | null }> => {
    if (!user) {
      return { error: { message: 'User not authenticated', name: 'AuthError' } as AuthError }
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)

      if (error) {
        return { error: error as AuthError }
      }

      // Refresh the profile after update
      await refreshProfile()
      return { error: null }
    } catch (err) {
      return { 
        error: { 
          message: 'An unexpected error occurred while updating profile',
          name: 'UnknownError'
        } as AuthError 
      }
    }
  }

  // Sign out function
  const handleSignOut = async (): Promise<{ error: AuthError | null }> => {
    try {
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        return { error }
      }

      // Clear local state
      setUser(null)
      setSession(null)
      setUserProfile(null)
      
      // Clear persisted data
      authPersistence.clearAll()
      
      return { error: null }
    } catch (err) {
      return { 
        error: { 
          message: 'An unexpected error occurred during sign out',
          name: 'UnknownError'
        } as AuthError 
      }
    }
  }

  // Initialize auth state with persistence and session management
  useEffect(() => {
    let mounted = true

    // Initialize authentication with persistence
    const initializeAuth = async () => {
      try {
        // First, try to load persisted auth data
        const persistedData = loadAuthData()
        
        if (mounted && persistedData.user && persistedData.session) {
          console.log('Loading persisted auth data')
          setUser(persistedData.user)
          setSession(persistedData.session as Session)
          
          if (persistedData.profile) {
            setUserProfile(persistedData.profile)
          } else if (persistedData.user) {
            // Fetch fresh profile if not persisted
            const profile = await fetchUserProfile(persistedData.user.id)
            setUserProfile(profile)
            if (profile) {
              authPersistence.saveProfile(profile)
            }
          }
          
          setLoading(false)
        }

        // Initialize session manager (this will also handle fresh sessions)
        await sessionManager.initialize()
        
        if (mounted) {
          const sessionState = sessionManager.getSessionState()
          
          // Only update if we don't have persisted data or if session manager has newer data
          if (!persistedData.user || !persistedData.session) {
            setSession(sessionState.session)
            setUser(sessionState.user)
            
            if (sessionState.user) {
              const profile = await fetchUserProfile(sessionState.user.id)
              setUserProfile(profile)
            }
          }
          
          setLoading(sessionState.isLoading)
        }
      } catch (error) {
        console.error('Error initializing authentication:', error)
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initializeAuth()

    // Listen for session changes from session manager
    const unsubscribe = sessionManager.addSessionChangeListener(async (session, user) => {
      if (!mounted) return

      console.log('Session changed:', user?.id)
      
      setSession(session)
      setUser(user)
      
      if (user) {
        // Fetch user profile
        const profile = await fetchUserProfile(user.id)
        setUserProfile(profile)
        
        // Persist the auth data
        saveAuthData(user, session, profile)
      } else {
        // Clear profile and persisted data when user logs out
        setUserProfile(null)
        authPersistence.clearAll()
      }
      
      setLoading(false)
    })

    // Cleanup on unmount
    return () => {
      mounted = false
      unsubscribe()
    }
  }, [])

  // Context value
  const value: AuthContextType = {
    user,
    session,
    userProfile,
    loading,
    signOut: handleSignOut,
    refreshProfile,
    updateProfile
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// Export the context for advanced use cases
export { AuthContext }
