"use client"

import { AuthProvider } from '@/contexts/auth-context'

interface AuthProviderWrapperProps {
  children: React.ReactNode
}

export function AuthProviderWrapper({ children }: AuthProviderWrapperProps) {
  return <AuthProvider>{children}</AuthProvider>
}
