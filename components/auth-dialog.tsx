"use client"

import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Upload, User, Mail, Lock, AlertCircle, CheckCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { signUpWithEmail, signInWithEmail, signInWithGoogle, signInWithDiscord, resetPassword, validatePassword, validateUsername, isValidEmail, checkUsernameAvailability } from "@/lib/auth/auth-utils"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"

interface AuthDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AuthDialog({ open, onOpenChange }: AuthDialogProps) {
  const { user, refreshProfile } = useAuth()
  
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        onOpenChange(false)
      }
    }

    if (open) {
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onOpenChange])
  const [signInData, setSignInData] = useState({
    email: "",
    password: "",
  })

  const [signUpData, setSignUpData] = useState({
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
    profilePhoto: null as File | null,
  })

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  
  // Loading and error states
  const [isSignUpLoading, setIsSignUpLoading] = useState(false)
  const [isSignInLoading, setIsSignInLoading] = useState(false)
  const [signUpError, setSignUpError] = useState<string | null>(null)
  const [signInError, setSignInError] = useState<string | null>(null)
  const [signUpSuccess, setSignUpSuccess] = useState(false)
  
  // Validation states
  const [usernameValidation, setUsernameValidation] = useState<{ valid: boolean; errors: string[] }>({ valid: true, errors: [] })
  const [passwordValidation, setPasswordValidation] = useState<{ valid: boolean; errors: string[] }>({ valid: true, errors: [] })
  const [emailValidation, setEmailValidation] = useState<{ valid: boolean; error?: string }>({ valid: true })
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  
  // Password reset states
  const [showPasswordReset, setShowPasswordReset] = useState(false)
  const [resetEmail, setResetEmail] = useState("")
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  const [resetPasswordError, setResetPasswordError] = useState<string | null>(null)
  const [resetPasswordSuccess, setResetPasswordSuccess] = useState(false)

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSignUpData({ ...signUpData, profilePhoto: file })
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    }
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setSignInError(null)
    setIsSignInLoading(true)

    try {
      // Basic validation
      if (!signInData.email || !signInData.password) {
        setSignInError("Please enter both email and password")
        setIsSignInLoading(false)
        return
      }

      if (!isValidEmail(signInData.email)) {
        setSignInError("Please enter a valid email address")
        setIsSignInLoading(false)
        return
      }

      // Attempt to sign in
      const { user, error } = await signInWithEmail({
        email: signInData.email,
        password: signInData.password
      })

      if (error) {
        // Handle specific error types
        if (error.message.includes('Invalid login credentials')) {
          setSignInError("Invalid email or password. Please check your credentials and try again.")
        } else if (error.message.includes('Email not confirmed')) {
          setSignInError("Please check your email and click the confirmation link before signing in.")
        } else if (error.message.includes('Too many requests')) {
          setSignInError("Too many login attempts. Please wait a moment and try again.")
        } else {
          setSignInError(error.message)
        }
        setIsSignInLoading(false)
        return
      }

      if (user) {
        // Reset form
        setSignInData({
          email: "",
          password: ""
        })
        
        // Refresh auth context
        await refreshProfile()
        
        // Close dialog
        onOpenChange(false)
        
        // Show success toast
        toast.success("Welcome back! You've been signed in successfully.")
      }
    } catch (err) {
      setSignInError("An unexpected error occurred. Please try again.")
    } finally {
      setIsSignInLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setSignUpError(null)
    setSignUpSuccess(false)
    setIsSignUpLoading(true)

    try {
      // Validate all fields before submission
      const emailValid = isValidEmail(signUpData.email)
      const usernameValid = validateUsername(signUpData.username)
      const passwordValid = validatePassword(signUpData.password)
      
      // Update validation states
      setEmailValidation({ valid: emailValid, error: emailValid ? undefined : 'Please enter a valid email address' })
      setUsernameValidation(usernameValid)
      setPasswordValidation(passwordValid)

      // Check if passwords match
      if (signUpData.password !== signUpData.confirmPassword) {
        setSignUpError("Passwords do not match")
        setIsSignUpLoading(false)
        return
      }

      // Stop if any validation fails
      if (!emailValid || !usernameValid.valid || !passwordValid.valid) {
        setSignUpError("Please fix the validation errors above")
        setIsSignUpLoading(false)
        return
      }

      // Check username availability
      const { available, error: availabilityError } = await checkUsernameAvailability(signUpData.username)
      
      if (availabilityError) {
        setSignUpError("Error checking username availability. Please try again.")
        setIsSignUpLoading(false)
        return
      }

      if (!available) {
        setUsernameAvailable(false)
        setSignUpError("This username is already taken")
        setIsSignUpLoading(false)
        return
      }

      setUsernameAvailable(true)

      // Attempt to sign up
      const { user, error } = await signUpWithEmail({
        email: signUpData.email,
        password: signUpData.password,
        username: signUpData.username,
        displayName: signUpData.username // Use username as display name for now
      })

      if (error) {
        setSignUpError(error.message)
        setIsSignUpLoading(false)
        return
      }

      if (user) {
        setSignUpSuccess(true)
        
        // Reset form
        setSignUpData({
          email: "",
          username: "",
          password: "",
          confirmPassword: "",
          profilePhoto: null,
        })
        setPreviewUrl(null)
        
        // Show success toast
        toast.success("Account created successfully! Please check your email to verify your account.")
        
        // Close dialog after a short delay to show success message
        setTimeout(() => {
          onOpenChange(false)
          setSignUpSuccess(false)
        }, 2000)
      }
    } catch (err) {
      setSignUpError("An unexpected error occurred. Please try again.")
    } finally {
      setIsSignUpLoading(false)
    }
  }

  // Real-time validation functions
  const handleEmailChange = (email: string) => {
    setSignUpData({ ...signUpData, email })
    setEmailValidation({ 
      valid: isValidEmail(email), 
      error: isValidEmail(email) ? undefined : 'Please enter a valid email address' 
    })
  }

  const handleUsernameChange = async (username: string) => {
    setSignUpData({ ...signUpData, username })
    const validation = validateUsername(username)
    setUsernameValidation(validation)
    
    // Check availability if username is valid
    if (validation.valid && username.length >= 3) {
      try {
        const { available } = await checkUsernameAvailability(username)
        setUsernameAvailable(available)
      } catch (err) {
        setUsernameAvailable(null)
      }
    } else {
      setUsernameAvailable(null)
    }
  }

  const handlePasswordChange = (password: string) => {
    setSignUpData({ ...signUpData, password })
    setPasswordValidation(validatePassword(password))
  }

  // Google OAuth handler
  const handleGoogleSignIn = async () => {
    try {
      setSignInError(null)
      setSignUpError(null)
      
      // Show loading toast
      toast.loading("Redirecting to Google...")
      
      const { error } = await signInWithGoogle()
      
      if (error) {
        toast.dismiss()
        setSignInError("Failed to sign in with Google. Please try again.")
        return
      }
      
      // OAuth will redirect, so we don't need to handle success here
    } catch (err) {
      toast.dismiss()
      setSignInError("An unexpected error occurred with Google sign in.")
    }
  }

  // Discord OAuth handler
  const handleDiscordSignIn = async () => {
    try {
      setSignInError(null)
      setSignUpError(null)
      
      // Show loading toast
      toast.loading("Redirecting to Discord...")
      
      const { error } = await signInWithDiscord()
      
      if (error) {
        toast.dismiss()
        setSignInError("Failed to sign in with Discord. Please try again.")
        return
      }
      
      // OAuth will redirect, so we don't need to handle success here
    } catch (err) {
      toast.dismiss()
      setSignInError("An unexpected error occurred with Discord sign in.")
    }
  }

  // Password reset handler
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetPasswordError(null)
    setIsResettingPassword(true)

    try {
      if (!resetEmail) {
        setResetPasswordError("Please enter your email address")
        setIsResettingPassword(false)
        return
      }

      if (!isValidEmail(resetEmail)) {
        setResetPasswordError("Please enter a valid email address")
        setIsResettingPassword(false)
        return
      }

      const { error } = await resetPassword({ email: resetEmail })

      if (error) {
        setResetPasswordError(error.message)
        setIsResettingPassword(false)
        return
      }

      setResetPasswordSuccess(true)
      setResetEmail("")
      
      // Show success toast
      toast.success("Password reset email sent! Check your inbox for instructions.")
      
      // Close reset form after showing success message
      setTimeout(() => {
        setShowPasswordReset(false)
        setResetPasswordSuccess(false)
      }, 3000)
      
    } catch (err) {
      setResetPasswordError("An unexpected error occurred. Please try again.")
    } finally {
      setIsResettingPassword(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-playfair">Join Skill Issued</DialogTitle>
        </DialogHeader>

        {showPasswordReset ? (
          <div className="space-y-4 mt-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold">Reset Password</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Enter your email address and we'll send you a link to reset your password.
              </p>
            </div>

            {resetPasswordSuccess && (
              <Alert className="border-green-200 bg-green-50 text-green-800">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Password reset email sent! Check your inbox for instructions.
                </AlertDescription>
              </Alert>
            )}
            
            {resetPasswordError && (
              <Alert className="border-red-200 bg-red-50 text-red-800">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{resetPasswordError}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email" className="text-sm font-medium">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="Enter your email address"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="pl-10 bg-background border-border"
                    disabled={isResettingPassword}
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={isResettingPassword}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {isResettingPassword ? "Sending Reset Email..." : "Send Reset Email"}
              </Button>

              <div className="text-center">
                <Button 
                  type="button"
                  variant="link" 
                  className="text-sm text-muted-foreground hover:text-primary"
                  onClick={() => {
                    setShowPasswordReset(false)
                    setResetPasswordError(null)
                    setResetPasswordSuccess(false)
                    setResetEmail("")
                  }}
                >
                  Back to Sign In
                </Button>
              </div>
            </form>
          </div>
        ) : (
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-muted">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Create Account</TabsTrigger>
            </TabsList>

          <TabsContent value="signin" className="space-y-4 mt-6">
            {signInError && (
              <Alert className="border-red-200 bg-red-50 text-red-800">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{signInError}</AlertDescription>
              </Alert>
            )}
            
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email" className="text-sm font-medium">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="Enter your email"
                    value={signInData.email}
                    onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                    className="pl-10 bg-background border-border"
                    disabled={isSignInLoading}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signin-password" className="text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="Enter your password"
                    value={signInData.password}
                    onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                    className="pl-10 bg-background border-border"
                    disabled={isSignInLoading}
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={isSignInLoading}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {isSignInLoading ? "Signing In..." : "Sign In"}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleSignIn}
                  disabled={isSignInLoading}
                  className="w-full border-border hover:border-primary bg-transparent"
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Continue with Google
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDiscordSignIn}
                  disabled={isSignInLoading}
                  className="w-full border-border hover:border-primary bg-transparent"
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="#5865F2">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                  Continue with Discord
                </Button>
              </div>

              <div className="text-center">
                <Button 
                  type="button"
                  variant="link" 
                  className="text-sm text-muted-foreground hover:text-primary"
                  onClick={() => setShowPasswordReset(true)}
                >
                  Forgot your password?
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="signup" className="space-y-4 mt-6">
            {signUpSuccess && (
              <Alert className="border-green-200 bg-green-50 text-green-800">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Account created successfully! Check your email to verify your account.
                </AlertDescription>
              </Alert>
            )}
            
            {signUpError && (
              <Alert className="border-red-200 bg-red-50 text-red-800">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{signUpError}</AlertDescription>
              </Alert>
            )}
            
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-email" className="text-sm font-medium">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="Enter your email"
                    value={signUpData.email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    className={`pl-10 bg-background border-border ${!emailValidation.valid && signUpData.email ? 'border-red-500' : ''}`}
                    required
                  />
                  {!emailValidation.valid && signUpData.email && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    </div>
                  )}
                </div>
                {!emailValidation.valid && emailValidation.error && (
                  <p className="text-sm text-red-500">{emailValidation.error}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-username" className="text-sm font-medium">
                  Username
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    id="signup-username"
                    type="text"
                    placeholder="Choose a username"
                    value={signUpData.username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    className={`pl-10 bg-background border-border ${!usernameValidation.valid && signUpData.username ? 'border-red-500' : usernameAvailable === false ? 'border-red-500' : usernameAvailable === true ? 'border-green-500' : ''}`}
                    required
                  />
                  {signUpData.username && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      {usernameAvailable === true && usernameValidation.valid ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (!usernameValidation.valid || usernameAvailable === false) ? (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      ) : null}
                    </div>
                  )}
                </div>
                {!usernameValidation.valid && usernameValidation.errors.length > 0 && (
                  <div className="space-y-1">
                    {usernameValidation.errors.map((error, index) => (
                      <p key={index} className="text-sm text-red-500">{error}</p>
                    ))}
                  </div>
                )}
                {usernameValidation.valid && usernameAvailable === false && (
                  <p className="text-sm text-red-500">This username is already taken</p>
                )}
                {usernameValidation.valid && usernameAvailable === true && (
                  <p className="text-sm text-green-600">Username is available</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-password" className="text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Create a password"
                    value={signUpData.password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    className={`pl-10 bg-background border-border ${!passwordValidation.valid && signUpData.password ? 'border-red-500' : passwordValidation.valid && signUpData.password ? 'border-green-500' : ''}`}
                    required
                  />
                  {signUpData.password && (
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
                <Label htmlFor="confirm-password" className="text-sm font-medium">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Confirm your password"
                    value={signUpData.confirmPassword}
                    onChange={(e) => setSignUpData({ ...signUpData, confirmPassword: e.target.value })}
                    className={`pl-10 bg-background border-border ${signUpData.confirmPassword && signUpData.password !== signUpData.confirmPassword ? 'border-red-500' : signUpData.confirmPassword && signUpData.password === signUpData.confirmPassword ? 'border-green-500' : ''}`}
                    required
                  />
                  {signUpData.confirmPassword && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      {signUpData.password === signUpData.confirmPassword ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                  )}
                </div>
                {signUpData.confirmPassword && signUpData.password !== signUpData.confirmPassword && (
                  <p className="text-sm text-red-500">Passwords do not match</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Profile Photo (Optional)</Label>
                <div className="flex items-center gap-4">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={previewUrl || ""} alt="Profile preview" />
                    <AvatarFallback className="bg-muted">
                      <User className="w-8 h-8 text-muted-foreground" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                      id="photo-upload"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-border hover:border-primary bg-transparent"
                      onClick={() => document.getElementById("photo-upload")?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Photo
                    </Button>
                  </div>
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={isSignUpLoading || !emailValidation.valid || !usernameValidation.valid || !passwordValidation.valid || usernameAvailable === false}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {isSignUpLoading ? "Creating Account..." : "Create Account"}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleSignIn}
                  disabled={isSignUpLoading}
                  className="w-full border-border hover:border-primary bg-transparent"
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Continue with Google
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDiscordSignIn}
                  disabled={isSignUpLoading}
                  className="w-full border-border hover:border-primary bg-transparent"
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="#5865F2">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                  Continue with Discord
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                By creating an account, you agree to our Terms of Service and Privacy Policy.
              </p>
            </form>
          </TabsContent>
        </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}
