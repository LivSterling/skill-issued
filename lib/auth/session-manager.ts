import { supabase } from '@/lib/supabase/client'
import type { Session, User } from '@supabase/supabase-js'

// Session refresh configuration
const SESSION_REFRESH_THRESHOLD = 5 * 60 * 1000 // 5 minutes in milliseconds
const MAX_REFRESH_RETRIES = 3
const REFRESH_RETRY_DELAY = 1000 // 1 second

// Session state interface
interface SessionState {
  session: Session | null
  user: User | null
  isLoading: boolean
  lastRefresh: number
  refreshPromise: Promise<void> | null
}

// Global session state
let sessionState: SessionState = {
  session: null,
  user: null,
  isLoading: true,
  lastRefresh: 0,
  refreshPromise: null
}

// Event listeners for session changes
type SessionChangeListener = (session: Session | null, user: User | null) => void
const sessionListeners = new Set<SessionChangeListener>()

// Session manager class
export class SessionManager {
  private static instance: SessionManager | null = null
  private refreshTimer: NodeJS.Timeout | null = null
  private isInitialized = false

  private constructor() {}

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager()
    }
    return SessionManager.instance
  }

  // Initialize session management
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      // Get initial session
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Error getting initial session:', error)
      }

      this.updateSessionState(session, session?.user || null, false)
      
      // Set up auth state change listener
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event)
        
        // Handle session refresh
        if (event === 'TOKEN_REFRESHED' && session) {
          this.updateSessionState(session, session.user, false)
          sessionState.lastRefresh = Date.now()
        }
        // Handle sign in
        else if (event === 'SIGNED_IN' && session) {
          this.updateSessionState(session, session.user, false)
          this.scheduleTokenRefresh(session)
        }
        // Handle sign out
        else if (event === 'SIGNED_OUT') {
          this.updateSessionState(null, null, false)
          this.clearRefreshTimer()
        }
        // Handle other session changes
        else {
          this.updateSessionState(session, session?.user || null, false)
        }
      })

      // Schedule automatic token refresh if we have a session
      if (session) {
        this.scheduleTokenRefresh(session)
      }

      this.isInitialized = true
    } catch (error) {
      console.error('Error initializing session manager:', error)
      this.updateSessionState(null, null, false)
    }
  }

  // Get current session state
  getSessionState(): Readonly<SessionState> {
    return { ...sessionState }
  }

  // Check if session needs refresh
  needsRefresh(session: Session | null = sessionState.session): boolean {
    if (!session) return false
    
    const now = Date.now()
    const expiresAt = new Date(session.expires_at || 0).getTime()
    const timeUntilExpiry = expiresAt - now
    
    return timeUntilExpiry <= SESSION_REFRESH_THRESHOLD
  }

  // Manually refresh session
  async refreshSession(): Promise<{ session: Session | null; error: any }> {
    // Prevent concurrent refresh attempts
    if (sessionState.refreshPromise) {
      await sessionState.refreshPromise
      return { session: sessionState.session, error: null }
    }

    // Create refresh promise
    sessionState.refreshPromise = this.performRefresh()
    
    try {
      await sessionState.refreshPromise
      return { session: sessionState.session, error: null }
    } catch (error) {
      return { session: null, error }
    } finally {
      sessionState.refreshPromise = null
    }
  }

  // Perform the actual refresh with retries
  private async performRefresh(): Promise<void> {
    let retries = 0
    
    while (retries < MAX_REFRESH_RETRIES) {
      try {
        const { data, error } = await supabase.auth.refreshSession()
        
        if (error) {
          throw error
        }

        if (data.session) {
          this.updateSessionState(data.session, data.user, false)
          sessionState.lastRefresh = Date.now()
          this.scheduleTokenRefresh(data.session)
          return
        }
        
        throw new Error('No session returned from refresh')
      } catch (error) {
        retries++
        console.error(`Session refresh attempt ${retries} failed:`, error)
        
        if (retries < MAX_REFRESH_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, REFRESH_RETRY_DELAY * retries))
        } else {
          // Max retries reached, sign out user
          console.error('Max refresh retries reached, signing out user')
          await supabase.auth.signOut()
          throw error
        }
      }
    }
  }

  // Schedule automatic token refresh
  private scheduleTokenRefresh(session: Session): void {
    this.clearRefreshTimer()
    
    if (!session.expires_at) return
    
    const expiresAt = new Date(session.expires_at).getTime()
    const now = Date.now()
    const timeUntilRefresh = Math.max(0, expiresAt - now - SESSION_REFRESH_THRESHOLD)
    
    this.refreshTimer = setTimeout(() => {
      if (this.needsRefresh(session)) {
        this.refreshSession().catch(error => {
          console.error('Automatic session refresh failed:', error)
        })
      }
    }, timeUntilRefresh)
  }

  // Clear refresh timer
  private clearRefreshTimer(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
      this.refreshTimer = null
    }
  }

  // Update session state and notify listeners
  private updateSessionState(session: Session | null, user: User | null, isLoading: boolean): void {
    sessionState = {
      ...sessionState,
      session,
      user,
      isLoading
    }
    
    // Notify all listeners
    sessionListeners.forEach(listener => {
      try {
        listener(session, user)
      } catch (error) {
        console.error('Error in session change listener:', error)
      }
    })
  }

  // Add session change listener
  addSessionChangeListener(listener: SessionChangeListener): () => void {
    sessionListeners.add(listener)
    
    // Return cleanup function
    return () => {
      sessionListeners.delete(listener)
    }
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!sessionState.user && !!sessionState.session
  }

  // Check if session is valid (not expired)
  isSessionValid(): boolean {
    if (!sessionState.session) return false
    
    const expiresAt = new Date(sessionState.session.expires_at || 0).getTime()
    return Date.now() < expiresAt
  }

  // Get time until session expires (in milliseconds)
  getTimeUntilExpiry(): number {
    if (!sessionState.session?.expires_at) return 0
    
    const expiresAt = new Date(sessionState.session.expires_at).getTime()
    return Math.max(0, expiresAt - Date.now())
  }

  // Clean up session manager
  cleanup(): void {
    this.clearRefreshTimer()
    sessionListeners.clear()
    sessionState = {
      session: null,
      user: null,
      isLoading: false,
      lastRefresh: 0,
      refreshPromise: null
    }
    this.isInitialized = false
  }
}

// Export singleton instance
export const sessionManager = SessionManager.getInstance()

// Convenience functions
export const getSession = () => sessionState.session
export const getUser = () => sessionState.user
export const isAuthenticated = () => sessionManager.isAuthenticated()
export const isSessionValid = () => sessionManager.isSessionValid()
export const refreshSession = () => sessionManager.refreshSession()
export const addSessionChangeListener = (listener: SessionChangeListener) => 
  sessionManager.addSessionChangeListener(listener)
