// Database schema types for Supabase integration
// This file defines all TypeScript types that match our database schema

// Base types for common patterns
export type UUID = string
export type Timestamp = string
export type JSONValue = string | number | boolean | null | { [x: string]: JSONValue } | JSONValue[]

// Privacy levels for user profiles
export type PrivacyLevel = 'public' | 'friends' | 'private'

// Friendship status types
export type FriendshipStatus = 'pending' | 'accepted' | 'declined' | 'blocked'

// Gaming preference categories
export interface GamingPreferences {
  favoriteGenres?: string[]
  favoritePlatforms?: string[]
  playStyle?: 'casual' | 'competitive' | 'hardcore' | 'mixed'
  preferredGameModes?: string[]
  availableHours?: {
    weekdays?: number
    weekends?: number
  }
  timeZone?: string
  languages?: string[]
  lookingFor?: ('friends' | 'teammates' | 'mentorship' | 'casual_play')[]
}

// User profile from the profiles table
export interface Profile {
  id: UUID
  username: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  privacy_level: PrivacyLevel
  gaming_preferences: GamingPreferences | null
  created_at: Timestamp
  updated_at: Timestamp
}

// Friendship relationship
export interface Friendship {
  id: UUID
  user_id: UUID
  friend_id: UUID
  status: FriendshipStatus
  created_at: Timestamp
}

// Follow relationship (for public following without mutual acceptance)
export interface Follow {
  id: UUID
  follower_id: UUID
  following_id: UUID
  created_at: Timestamp
}

// Extended profile with computed fields and relationships
export interface ExtendedProfile extends Profile {
  // Relationship status with current user
  friendship_status?: FriendshipStatus | null
  is_following?: boolean
  is_followed_by?: boolean
  
  // Counts
  followers_count?: number
  following_count?: number
  friends_count?: number
  
  // Recent activity or games (to be expanded later)
  recent_games?: any[]
  total_games?: number
}

// Profile creation/update payloads
export interface CreateProfileData {
  username: string
  display_name?: string
  bio?: string
  avatar_url?: string
  privacy_level?: PrivacyLevel
  gaming_preferences?: GamingPreferences
}

export interface UpdateProfileData {
  display_name?: string
  bio?: string
  avatar_url?: string
  privacy_level?: PrivacyLevel
  gaming_preferences?: GamingPreferences
  updated_at?: Timestamp
}

// Friendship management payloads
export interface CreateFriendshipData {
  friend_id: UUID
}

export interface UpdateFriendshipData {
  status: FriendshipStatus
}

// Follow management payloads
export interface CreateFollowData {
  following_id: UUID
}

// Search and filtering types
export interface ProfileSearchFilters {
  username?: string
  display_name?: string
  genres?: string[]
  platforms?: string[]
  play_style?: GamingPreferences['playStyle']
  looking_for?: GamingPreferences['lookingFor']
  privacy_level?: PrivacyLevel[]
}

export interface ProfileSearchOptions {
  limit?: number
  offset?: number
  order_by?: 'username' | 'display_name' | 'created_at' | 'updated_at'
  order_direction?: 'asc' | 'desc'
}

// Database response types
export interface DatabaseResponse<T> {
  data: T | null
  error: Error | null
}

export interface DatabaseListResponse<T> {
  data: T[] | null
  error: Error | null
  count?: number
}

// Profile validation types
export interface ProfileValidationError {
  field: keyof CreateProfileData | keyof UpdateProfileData
  message: string
  code: string
}

export interface ProfileValidationResult {
  valid: boolean
  errors: ProfileValidationError[]
}

// Avatar upload types
export interface AvatarUploadOptions {
  maxSize?: number // in bytes
  allowedTypes?: string[]
  quality?: number // for image compression
}

export interface AvatarUploadResult {
  success: boolean
  url?: string
  error?: string
  file_path?: string
}

// Profile statistics
export interface ProfileStatistics {
  total_profiles: number
  active_profiles: number // profiles updated in last 30 days
  public_profiles: number
  private_profiles: number
  friends_only_profiles: number
  total_friendships: number
  total_follows: number
  average_friends_per_user: number
  top_genres: Array<{ genre: string; count: number }>
  top_platforms: Array<{ platform: string; count: number }>
}

// Social graph types
export interface SocialConnection {
  profile: Profile
  connection_type: 'friend' | 'following' | 'follower' | 'mutual_follow'
  status?: FriendshipStatus
  connected_at: Timestamp
}

export interface SocialGraph {
  friends: SocialConnection[]
  following: SocialConnection[]
  followers: SocialConnection[]
  mutual_connections: SocialConnection[]
  suggested_connections: Profile[]
}

// Activity and engagement types (for future expansion)
export interface ProfileActivity {
  id: UUID
  profile_id: UUID
  activity_type: 'game_added' | 'review_posted' | 'friend_added' | 'profile_updated'
  activity_data: JSONValue
  created_at: Timestamp
}

// Notification types (for future expansion)
export interface ProfileNotification {
  id: UUID
  recipient_id: UUID
  sender_id: UUID | null
  type: 'friend_request' | 'friend_accepted' | 'new_follower' | 'mention'
  title: string
  message: string
  read: boolean
  created_at: Timestamp
}

// Supabase-specific types
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>
      }
      friendships: {
        Row: Friendship
        Insert: Omit<Friendship, 'id' | 'created_at'>
        Update: Partial<Omit<Friendship, 'id' | 'user_id' | 'friend_id' | 'created_at'>>
      }
      follows: {
        Row: Follow
        Insert: Omit<Follow, 'id' | 'created_at'>
        Update: never // Follows are create/delete only
      }
    }
    Views: {
      profile_stats: {
        Row: {
          profile_id: UUID
          friends_count: number
          followers_count: number
          following_count: number
          games_count: number // for future game tracking
          reviews_count: number // for future review system
        }
      }
    }
    Functions: {
      get_mutual_friends: {
        Args: { user_id: UUID; other_user_id: UUID }
        Returns: Profile[]
      }
      get_friend_suggestions: {
        Args: { user_id: UUID; limit?: number }
        Returns: Profile[]
      }
      search_profiles: {
        Args: { 
          search_term: string
          filters?: ProfileSearchFilters
          options?: ProfileSearchOptions
        }
        Returns: ExtendedProfile[]
      }
    }
  }
}

// Type helpers for common operations
export type ProfileRow = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export type FriendshipRow = Database['public']['Tables']['friendships']['Row']
export type FriendshipInsert = Database['public']['Tables']['friendships']['Insert']
export type FriendshipUpdate = Database['public']['Tables']['friendships']['Update']

export type FollowRow = Database['public']['Tables']['follows']['Row']
export type FollowInsert = Database['public']['Tables']['follows']['Insert']


// All types are already exported above, no need for duplicate export
