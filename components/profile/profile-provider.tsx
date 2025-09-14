"use client"

import { ProfileProvider } from '@/contexts/profile-context'

interface ProfileProviderWrapperProps {
  children: React.ReactNode
  cacheTimeout?: number
}

export function ProfileProviderWrapper({ 
  children, 
  cacheTimeout 
}: ProfileProviderWrapperProps) {
  return (
    <ProfileProvider cacheTimeout={cacheTimeout}>
      {children}
    </ProfileProvider>
  )
}
