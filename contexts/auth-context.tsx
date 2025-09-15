"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
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

  // Initialize auth state with simple Supabase session management
  useEffect(() => {
    let mounted = true

    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (mounted) {
          if (session?.user) {
            setSession(session)
            setUser(session.user)
            
            // Fetch user profile
            const profile = await fetchUserProfile(session.user.id)
            setUserProfile(profile)
          }
          setLoading(false)
        }
      } catch (error) {
        console.error('Error initializing authentication:', error)
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initializeAuth()

    // Listen for auth changes using Supabase's built-in listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      console.log('Auth state changed:', event, session?.user?.id)
      
      setSession(session)
      setUser(session?.user ?? null)
      
      if (session?.user) {
        // Fetch user profile
        const profile = await fetchUserProfile(session.user.id)
        setUserProfile(profile)
      } else {
        // Clear profile when user logs out
        setUserProfile(null)
      }
      
      setLoading(false)
    })

    // Cleanup on unmount
    return () => {
      mounted = false
      subscription.unsubscribe()
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
