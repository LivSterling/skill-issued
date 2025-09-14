"use client"

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './use-auth'
import { privacyService } from '@/lib/services/privacy-service'
import {
  ProfilePrivacySettingsType,
  UpdateProfilePrivacySettingsType,
  PrivacyCheckRequestType,
  PrivacyCheckResultType,
  BlockUserRequestType,
  UnblockUserRequestType,
  ReportUserRequestType,
  ApplyPrivacyPresetRequestType,
  PrivacyPresetType,
  PrivacyContextType,
  RelationshipTypeType
} from '@/lib/validations/privacy-schemas'

interface UsePrivacyReturn {
  // Privacy settings
  privacySettings: ProfilePrivacySettingsType | null
  loading: boolean
  error: string | null
  
  // Actions
  updatePrivacySettings: (updates: UpdateProfilePrivacySettingsType) => Promise<void>
  applyPrivacyPreset: (preset: PrivacyPresetType, overrides?: UpdateProfilePrivacySettingsType) => Promise<void>
  refreshPrivacySettings: () => Promise<void>
  
  // Privacy checks
  checkPrivacy: (request: Omit<PrivacyCheckRequestType, 'viewer_id'>) => Promise<PrivacyCheckResultType>
  
  // Blocking and reporting
  blockUser: (request: BlockUserRequestType) => Promise<void>
  unblockUser: (blockedUserId: string) => Promise<void>
  reportUser: (request: ReportUserRequestType) => Promise<void>
  
  // Blocked users
  blockedUsers: any[]
  loadingBlocked: boolean
  refreshBlockedUsers: () => Promise<void>
}

export function usePrivacy(): UsePrivacyReturn {
  const { user } = useAuth()
  
  const [privacySettings, setPrivacySettings] = useState<ProfilePrivacySettingsType | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [blockedUsers, setBlockedUsers] = useState<any[]>([])
  const [loadingBlocked, setLoadingBlocked] = useState(false)

  // Load privacy settings
  const loadPrivacySettings = useCallback(async () => {
    if (!user?.id) return

    setLoading(true)
    setError(null)

    try {
      const settings = await privacyService.getPrivacySettings(user.id)
      setPrivacySettings(settings)
    } catch (err) {
      console.error('Error loading privacy settings:', err)
      setError('Failed to load privacy settings')
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  // Update privacy settings
  const updatePrivacySettings = useCallback(async (updates: UpdateProfilePrivacySettingsType) => {
    if (!user?.id) {
      throw new Error('User not authenticated')
    }

    setLoading(true)
    setError(null)

    try {
      const updatedSettings = await privacyService.updatePrivacySettings(user.id, updates)
      setPrivacySettings(updatedSettings)
    } catch (err) {
      console.error('Error updating privacy settings:', err)
      setError('Failed to update privacy settings')
      throw err
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  // Apply privacy preset
  const applyPrivacyPreset = useCallback(async (
    preset: PrivacyPresetType, 
    overrides?: UpdateProfilePrivacySettingsType
  ) => {
    if (!user?.id) {
      throw new Error('User not authenticated')
    }

    setLoading(true)
    setError(null)

    try {
      const request: ApplyPrivacyPresetRequestType = {
        preset,
        override_settings: overrides
      }
      
      const updatedSettings = await privacyService.applyPrivacyPreset(user.id, request)
      setPrivacySettings(updatedSettings)
    } catch (err) {
      console.error('Error applying privacy preset:', err)
      setError('Failed to apply privacy preset')
      throw err
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  // Refresh privacy settings
  const refreshPrivacySettings = useCallback(async () => {
    await loadPrivacySettings()
  }, [loadPrivacySettings])

  // Check privacy
  const checkPrivacy = useCallback(async (
    request: Omit<PrivacyCheckRequestType, 'viewer_id'>
  ): Promise<PrivacyCheckResultType> => {
    try {
      const fullRequest: PrivacyCheckRequestType = {
        ...request,
        viewer_id: user?.id
      }
      
      return await privacyService.checkPrivacy(fullRequest)
    } catch (err) {
      console.error('Error checking privacy:', err)
      return {
        allowed: false,
        reason: 'Privacy check failed'
      }
    }
  }, [user?.id])

  // Block user
  const blockUser = useCallback(async (request: BlockUserRequestType) => {
    if (!user?.id) {
      throw new Error('User not authenticated')
    }

    try {
      await privacyService.blockUser(user.id, request)
      await refreshBlockedUsers()
    } catch (err) {
      console.error('Error blocking user:', err)
      throw err
    }
  }, [user?.id])

  // Unblock user
  const unblockUser = useCallback(async (blockedUserId: string) => {
    if (!user?.id) {
      throw new Error('User not authenticated')
    }

    try {
      await privacyService.unblockUser(user.id, { blocked_user_id: blockedUserId })
      await refreshBlockedUsers()
    } catch (err) {
      console.error('Error unblocking user:', err)
      throw err
    }
  }, [user?.id])

  // Report user
  const reportUser = useCallback(async (request: ReportUserRequestType) => {
    if (!user?.id) {
      throw new Error('User not authenticated')
    }

    try {
      await privacyService.reportUser(user.id, request)
    } catch (err) {
      console.error('Error reporting user:', err)
      throw err
    }
  }, [user?.id])

  // Load blocked users
  const loadBlockedUsers = useCallback(async () => {
    if (!user?.id) return

    setLoadingBlocked(true)

    try {
      const users = await privacyService.getBlockedUsers(user.id)
      setBlockedUsers(users)
    } catch (err) {
      console.error('Error loading blocked users:', err)
    } finally {
      setLoadingBlocked(false)
    }
  }, [user?.id])

  // Refresh blocked users
  const refreshBlockedUsers = useCallback(async () => {
    await loadBlockedUsers()
  }, [loadBlockedUsers])

  // Load data on mount and user change
  useEffect(() => {
    if (user?.id) {
      loadPrivacySettings()
      loadBlockedUsers()
    } else {
      setPrivacySettings(null)
      setBlockedUsers([])
    }
  }, [user?.id, loadPrivacySettings, loadBlockedUsers])

  return {
    privacySettings,
    loading,
    error,
    updatePrivacySettings,
    applyPrivacyPreset,
    refreshPrivacySettings,
    checkPrivacy,
    blockUser,
    unblockUser,
    reportUser,
    blockedUsers,
    loadingBlocked,
    refreshBlockedUsers
  }
}

// Hook for checking specific privacy contexts
interface UsePrivacyCheckReturn {
  allowed: boolean | null
  loading: boolean
  reason?: string
  checkAgain: () => Promise<void>
}

export function usePrivacyCheck(
  userId: string,
  context: PrivacyContextType,
  relationship?: RelationshipTypeType
): UsePrivacyCheckReturn {
  const { user } = useAuth()
  const [result, setResult] = useState<PrivacyCheckResultType | null>(null)
  const [loading, setLoading] = useState(false)

  const checkPrivacy = useCallback(async () => {
    if (!userId || !context) return

    setLoading(true)

    try {
      const request: PrivacyCheckRequestType = {
        user_id: userId,
        viewer_id: user?.id,
        context,
        relationship
      }

      const checkResult = await privacyService.checkPrivacy(request)
      setResult(checkResult)
    } catch (err) {
      console.error('Error checking privacy:', err)
      setResult({
        allowed: false,
        reason: 'Privacy check failed'
      })
    } finally {
      setLoading(false)
    }
  }, [userId, context, relationship, user?.id])

  useEffect(() => {
    checkPrivacy()
  }, [checkPrivacy])

  return {
    allowed: result?.allowed ?? null,
    loading,
    reason: result?.reason,
    checkAgain: checkPrivacy
  }
}

// Hook for checking if user is blocked
interface UseBlockStatusReturn {
  isBlocked: boolean | null
  loading: boolean
  checkAgain: () => Promise<void>
}

export function useBlockStatus(userId: string, targetUserId: string): UseBlockStatusReturn {
  const [isBlocked, setIsBlocked] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)

  const checkBlockStatus = useCallback(async () => {
    if (!userId || !targetUserId) return

    setLoading(true)

    try {
      const blocked = await privacyService.isUserBlocked(userId, targetUserId)
      setIsBlocked(blocked)
    } catch (err) {
      console.error('Error checking block status:', err)
      setIsBlocked(null)
    } finally {
      setLoading(false)
    }
  }, [userId, targetUserId])

  useEffect(() => {
    checkBlockStatus()
  }, [checkBlockStatus])

  return {
    isBlocked,
    loading,
    checkAgain: checkBlockStatus
  }
}
