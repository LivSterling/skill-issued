"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Lock, AlertCircle, CheckCircle } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { validatePassword } from "@/lib/auth/auth-utils"
import Link from "next/link"

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [passwordValidation, setPasswordValidation] = useState<{ valid: boolean; errors: string[] }>({ valid: true, errors: [] })

  // Check if we have the necessary parameters
  useEffect(() => {
    const accessToken = searchParams.get('access_token')
    const refreshToken = searchParams.get('refresh_token')
    
    if (!accessToken || !refreshToken) {
      setError("Invalid or expired reset link. Please request a new password reset.")
      return
    }

    // Set the session with the tokens from the URL
    const setSession = async () => {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      })
      
      if (error) {
        setError("Invalid or expired reset link. Please request a new password reset.")
      }
    }

    setSession()
  }, [searchParams])

  const handlePasswordChange = (newPassword: string) => {
    setPassword(newPassword)
    setPasswordValidation(validatePassword(newPassword))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      // Validate passwords
      if (!password || !confirmPassword) {
        setError("Please enter both password fields")
        setIsLoading(false)
        return
      }

      if (password !== confirmPassword) {
        setError("Passwords do not match")
        setIsLoading(false)
        return
      }

      if (!passwordValidation.valid) {
        setError("Please fix the password requirements below")
        setIsLoading(false)
        return
      }

      // Update the password
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) {
        setError(error.message)
        setIsLoading(false)
        return
      }

      setSuccess(true)
      
      // Redirect to home page after success
      setTimeout(() => {
        router.push('/')
      }, 3000)

    } catch (err) {
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md p-6 space-y-4">
          <div className="text-center space-y-2">
            <CheckCircle className="mx-auto h-12 w-12 text-green-600" />
            <h1 className="text-2xl font-bold text-foreground">Password Updated!</h1>
            <p className="text-muted-foreground">
              Your password has been successfully updated. You will be redirected to the home page shortly.
            </p>
          </div>
          <Button asChild className="w-full">
            <Link href="/">Continue to Home</Link>
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-6 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Reset Your Password</h1>
          <p className="text-muted-foreground">
            Enter your new password below.
          </p>
        </div>

        {error && (
          <Alert className="border-red-200 bg-red-50 text-red-800">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              New Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                id="password"
                type="password"
                placeholder="Enter new password"
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                className={`pl-10 bg-background border-border ${!passwordValidation.valid && password ? 'border-red-500' : passwordValidation.valid && password ? 'border-green-500' : ''}`}
                disabled={isLoading}
                required
              />
              {password && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {passwordValidation.valid ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}
                </div>
              )}
            </div>
            {!passwordValidation.valid && passwordValidation.errors.length > 0 && (
              <div className="space-y-1">
                {passwordValidation.errors.map((error, index) => (
                  <p key={index} className="text-sm text-red-500">{error}</p>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirm New Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`pl-10 bg-background border-border ${confirmPassword && password !== confirmPassword ? 'border-red-500' : confirmPassword && password === confirmPassword ? 'border-green-500' : ''}`}
                disabled={isLoading}
                required
              />
              {confirmPassword && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {password === confirmPassword ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}
                </div>
              )}
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="text-sm text-red-500">Passwords do not match</p>
            )}
          </div>

          <Button 
            type="submit" 
            disabled={isLoading || !passwordValidation.valid || password !== confirmPassword}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isLoading ? "Updating Password..." : "Update Password"}
          </Button>
        </form>

        <div className="text-center">
          <Button variant="link" asChild className="text-sm text-muted-foreground hover:text-primary">
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      </Card>
    </div>
  )
}
