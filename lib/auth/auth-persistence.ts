import type { User, Session } from '@supabase/supabase-js'

// Storage keys for authentication data
const AUTH_STORAGE_KEYS = {
  USER: 'skill-issued-auth-user',
  SESSION: 'skill-issued-auth-session',
  PROFILE: 'skill-issued-auth-profile',
  LAST_ACTIVITY: 'skill-issued-last-activity',
  PREFERENCES: 'skill-issued-auth-preferences'
} as const

// Authentication preferences
interface AuthPreferences {
  rememberMe: boolean
  autoRefresh: boolean
  sessionTimeout: number // in milliseconds
}

// Default preferences
const DEFAULT_PREFERENCES: AuthPreferences = {
  rememberMe: true,
  autoRefresh: true,
  sessionTimeout: 7 * 24 * 60 * 60 * 1000 // 7 days
}

// Storage interface for different storage types
interface StorageAdapter {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
  clear(): void
}

// Browser storage adapters
class LocalStorageAdapter implements StorageAdapter {
  getItem(key: string): string | null {
    try {
      return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null
    } catch {
      return null
    }
  }

  setItem(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, value)
      }
    } catch (error) {
      console.warn('Failed to save to localStorage:', error)
    }
  }

  removeItem(key: string): void {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key)
      }
    } catch (error) {
      console.warn('Failed to remove from localStorage:', error)
    }
  }

  clear(): void {
    try {
      if (typeof window !== 'undefined') {
        Object.values(AUTH_STORAGE_KEYS).forEach(key => {
          window.localStorage.removeItem(key)
        })
      }
    } catch (error) {
      console.warn('Failed to clear localStorage:', error)
    }
  }
}

class SessionStorageAdapter implements StorageAdapter {
  getItem(key: string): string | null {
    try {
      return typeof window !== 'undefined' ? window.sessionStorage.getItem(key) : null
    } catch {
      return null
    }
  }

  setItem(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(key, value)
      }
    } catch (error) {
      console.warn('Failed to save to sessionStorage:', error)
    }
  }

  removeItem(key: string): void {
    try {
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(key)
      }
    } catch (error) {
      console.warn('Failed to remove from sessionStorage:', error)
    }
  }

  clear(): void {
    try {
      if (typeof window !== 'undefined') {
        Object.values(AUTH_STORAGE_KEYS).forEach(key => {
          window.sessionStorage.removeItem(key)
        })
      }
    } catch (error) {
      console.warn('Failed to clear sessionStorage:', error)
    }
  }
}

// In-memory storage for SSR/fallback
class MemoryStorageAdapter implements StorageAdapter {
  private storage = new Map<string, string>()

  getItem(key: string): string | null {
    return this.storage.get(key) || null
  }

  setItem(key: string, value: string): void {
    this.storage.set(key, value)
  }

  removeItem(key: string): void {
    this.storage.delete(key)
  }

  clear(): void {
    Object.values(AUTH_STORAGE_KEYS).forEach(key => {
      this.storage.delete(key)
    })
  }
}

// Authentication persistence manager
export class AuthPersistence {
  private persistentStorage: StorageAdapter
  private sessionStorage: StorageAdapter
  private memoryStorage: StorageAdapter
  private preferences: AuthPreferences

  constructor() {
    this.persistentStorage = new LocalStorageAdapter()
    this.sessionStorage = new SessionStorageAdapter()
    this.memoryStorage = new MemoryStorageAdapter()
    this.preferences = this.loadPreferences()
  }

  // Get appropriate storage based on preferences
  private getStorage(): StorageAdapter {
    if (this.preferences.rememberMe) {
      return this.persistentStorage
    }
    return this.sessionStorage
  }

  // Save user data
  saveUser(user: User | null): void {
    const storage = this.getStorage()
    
    if (user) {
      try {
        storage.setItem(AUTH_STORAGE_KEYS.USER, JSON.stringify(user))
        this.updateLastActivity()
      } catch (error) {
        console.error('Failed to save user data:', error)
        // Fallback to memory storage
        this.memoryStorage.setItem(AUTH_STORAGE_KEYS.USER, JSON.stringify(user))
      }
    } else {
      storage.removeItem(AUTH_STORAGE_KEYS.USER)
      this.memoryStorage.removeItem(AUTH_STORAGE_KEYS.USER)
    }
  }

  // Load user data
  loadUser(): User | null {
    const storage = this.getStorage()
    
    try {
      const userData = storage.getItem(AUTH_STORAGE_KEYS.USER) || 
                      this.memoryStorage.getItem(AUTH_STORAGE_KEYS.USER)
      
      if (userData) {
        const user = JSON.parse(userData)
        
        // Check if data is expired
        if (this.isDataExpired()) {
          this.clearAll()
          return null
        }
        
        return user
      }
    } catch (error) {
      console.error('Failed to load user data:', error)
      // Clear corrupted data
      storage.removeItem(AUTH_STORAGE_KEYS.USER)
      this.memoryStorage.removeItem(AUTH_STORAGE_KEYS.USER)
    }
    
    return null
  }

  // Save session data
  saveSession(session: Session | null): void {
    const storage = this.getStorage()
    
    if (session) {
      try {
        // Don't store the full session for security, just essential data
        const sessionData = {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: session.expires_at,
          expires_in: session.expires_in,
          token_type: session.token_type,
          user: session.user
        }
        
        storage.setItem(AUTH_STORAGE_KEYS.SESSION, JSON.stringify(sessionData))
        this.updateLastActivity()
      } catch (error) {
        console.error('Failed to save session data:', error)
        // Don't fallback to memory for session data for security
      }
    } else {
      storage.removeItem(AUTH_STORAGE_KEYS.SESSION)
      this.memoryStorage.removeItem(AUTH_STORAGE_KEYS.SESSION)
    }
  }

  // Load session data
  loadSession(): Partial<Session> | null {
    const storage = this.getStorage()
    
    try {
      const sessionData = storage.getItem(AUTH_STORAGE_KEYS.SESSION)
      
      if (sessionData) {
        const session = JSON.parse(sessionData)
        
        // Check if session is expired
        if (session.expires_at && new Date(session.expires_at) <= new Date()) {
          this.clearSession()
          return null
        }
        
        // Check if data is expired based on last activity
        if (this.isDataExpired()) {
          this.clearAll()
          return null
        }
        
        return session
      }
    } catch (error) {
      console.error('Failed to load session data:', error)
      // Clear corrupted data
      storage.removeItem(AUTH_STORAGE_KEYS.SESSION)
    }
    
    return null
  }

  // Save user profile
  saveProfile(profile: any): void {
    const storage = this.getStorage()
    
    if (profile) {
      try {
        storage.setItem(AUTH_STORAGE_KEYS.PROFILE, JSON.stringify(profile))
        this.updateLastActivity()
      } catch (error) {
        console.error('Failed to save profile data:', error)
        this.memoryStorage.setItem(AUTH_STORAGE_KEYS.PROFILE, JSON.stringify(profile))
      }
    } else {
      storage.removeItem(AUTH_STORAGE_KEYS.PROFILE)
      this.memoryStorage.removeItem(AUTH_STORAGE_KEYS.PROFILE)
    }
  }

  // Load user profile
  loadProfile(): any | null {
    const storage = this.getStorage()
    
    try {
      const profileData = storage.getItem(AUTH_STORAGE_KEYS.PROFILE) || 
                         this.memoryStorage.getItem(AUTH_STORAGE_KEYS.PROFILE)
      
      if (profileData) {
        // Check if data is expired
        if (this.isDataExpired()) {
          this.clearAll()
          return null
        }
        
        return JSON.parse(profileData)
      }
    } catch (error) {
      console.error('Failed to load profile data:', error)
      storage.removeItem(AUTH_STORAGE_KEYS.PROFILE)
      this.memoryStorage.removeItem(AUTH_STORAGE_KEYS.PROFILE)
    }
    
    return null
  }

  // Update last activity timestamp
  private updateLastActivity(): void {
    const storage = this.getStorage()
    try {
      storage.setItem(AUTH_STORAGE_KEYS.LAST_ACTIVITY, Date.now().toString())
    } catch (error) {
      console.warn('Failed to update last activity:', error)
    }
  }

  // Check if stored data is expired based on last activity
  private isDataExpired(): boolean {
    const storage = this.getStorage()
    
    try {
      const lastActivity = storage.getItem(AUTH_STORAGE_KEYS.LAST_ACTIVITY)
      
      if (lastActivity) {
        const lastActivityTime = parseInt(lastActivity, 10)
        const now = Date.now()
        const timeDiff = now - lastActivityTime
        
        return timeDiff > this.preferences.sessionTimeout
      }
    } catch (error) {
      console.warn('Failed to check data expiry:', error)
    }
    
    // If we can't determine expiry, consider it expired for security
    return true
  }

  // Load authentication preferences
  private loadPreferences(): AuthPreferences {
    try {
      const prefsData = this.persistentStorage.getItem(AUTH_STORAGE_KEYS.PREFERENCES)
      
      if (prefsData) {
        const prefs = JSON.parse(prefsData)
        return { ...DEFAULT_PREFERENCES, ...prefs }
      }
    } catch (error) {
      console.warn('Failed to load preferences:', error)
    }
    
    return DEFAULT_PREFERENCES
  }

  // Save authentication preferences
  savePreferences(preferences: Partial<AuthPreferences>): void {
    try {
      this.preferences = { ...this.preferences, ...preferences }
      this.persistentStorage.setItem(
        AUTH_STORAGE_KEYS.PREFERENCES, 
        JSON.stringify(this.preferences)
      )
    } catch (error) {
      console.error('Failed to save preferences:', error)
    }
  }

  // Get current preferences
  getPreferences(): AuthPreferences {
    return { ...this.preferences }
  }

  // Clear session data only
  clearSession(): void {
    this.persistentStorage.removeItem(AUTH_STORAGE_KEYS.SESSION)
    this.sessionStorage.removeItem(AUTH_STORAGE_KEYS.SESSION)
    this.memoryStorage.removeItem(AUTH_STORAGE_KEYS.SESSION)
  }

  // Clear all authentication data
  clearAll(): void {
    this.persistentStorage.clear()
    this.sessionStorage.clear()
    this.memoryStorage.clear()
  }

  // Check if we have any persisted authentication data
  hasPersistedData(): boolean {
    const storage = this.getStorage()
    return !!(storage.getItem(AUTH_STORAGE_KEYS.USER) || 
             storage.getItem(AUTH_STORAGE_KEYS.SESSION) ||
             this.memoryStorage.getItem(AUTH_STORAGE_KEYS.USER))
  }

  // Migrate data between storage types when preferences change
  migrateStorage(newRememberMe: boolean): void {
    if (newRememberMe !== this.preferences.rememberMe) {
      const oldStorage = this.getStorage()
      this.preferences.rememberMe = newRememberMe
      const newStorage = this.getStorage()
      
      // Migrate data if changing storage type
      if (oldStorage !== newStorage) {
        Object.values(AUTH_STORAGE_KEYS).forEach(key => {
          if (key === AUTH_STORAGE_KEYS.PREFERENCES) return // Don't migrate preferences
          
          const data = oldStorage.getItem(key)
          if (data) {
            newStorage.setItem(key, data)
            oldStorage.removeItem(key)
          }
        })
      }
    }
  }
}

// Export singleton instance
export const authPersistence = new AuthPersistence()

// Convenience functions
export const saveAuthData = (user: User | null, session: Session | null, profile: any = null) => {
  authPersistence.saveUser(user)
  authPersistence.saveSession(session)
  if (profile) {
    authPersistence.saveProfile(profile)
  }
}

export const loadAuthData = () => ({
  user: authPersistence.loadUser(),
  session: authPersistence.loadSession(),
  profile: authPersistence.loadProfile()
})

export const clearAuthData = () => authPersistence.clearAll()
