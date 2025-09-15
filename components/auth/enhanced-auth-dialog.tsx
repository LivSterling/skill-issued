"use client"

import React, { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { ValidatedInput, PasswordInput } from "@/components/ui/validated-input"
import { useFormValidation } from "@/hooks/use-form-validation"
import { usePasswordStrength, useUsernameAvailability } from "@/hooks/use-form-validation"
import { 
  signUpSchema, 
  signInSchema, 
  passwordResetRequestSchema,
  emailSchema,
  usernameSchema,
  passwordSchema
} from "@/lib/validations/auth-schemas"
import { signUpWithEmail, signInWithEmail, signInWithGoogle, signInWithDiscord, resetPassword } from "@/lib/auth/auth-utils"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"
import { 
  Mail, 
  Lock, 
  User, 
  AlertCircle, 
  CheckCircle, 
  Loader2,
  Chrome,
  MessageSquare
} from "lucide-react"

interface EnhancedAuthDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultTab?: 'signin' | 'signup' | 'reset'
}

export function EnhancedAuthDialog({ 
  open, 
  onOpenChange, 
  defaultTab = 'signin' 
}: EnhancedAuthDialogProps) {
  const { refreshProfile } = useAuth()
  const [activeTab, setActiveTab] = useState(defaultTab)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Sign In Form
  const signInForm = useFormValidation({
    email: "",
    password: ""
  }, {
    schema: signInSchema,
    validateOnChange: true,
    validateOnBlur: true,
    debounceMs: 300
  })

  // Sign Up Form
  const signUpForm = useFormValidation({
    email: "",
    username: "",
    password: "",
    confirmPassword: ""
  }, {
    schema: signUpSchema.extend({
      confirmPassword: passwordSchema
    }).refine(
      data => data.password === data.confirmPassword,
      {
        message: "Passwords don't match",
        path: ["confirmPassword"]
      }
    ),
    rules: {
      email: {
        schema: emailSchema,
        debounceMs: 300
      },
      username: {
        schema: usernameSchema,
        debounceMs: 500,
        asyncValidator: async (value: string) => {
          if (value.length < 3) return []
          
          // Simulate username availability check
          const unavailable = ['admin', 'user', 'test', 'demo']
          if (unavailable.includes(value.toLowerCase())) {
            return [{
              field: 'username',
              message: 'Username is already taken',
              code: 'not_unique'
            }]
          }
          return []
        }
      },
      password: {
        schema: passwordSchema,
        debounceMs: 200
      }
    },
    validateOnChange: true,
    validateOnBlur: true
  })

  // Password Reset Form
  const resetForm = useFormValidation({
    email: ""
  }, {
    schema: passwordResetRequestSchema,
    validateOnChange: true,
    validateOnBlur: true
  })

  // Password strength for signup
  const passwordStrength = usePasswordStrength(signUpForm.values.password)
  const usernameAvailability = useUsernameAvailability(signUpForm.values.username)

  // Handle sign in
  const handleSignIn = async () => {
    if (!signInForm.validation.isValid) {
      await signInForm.validateForm()
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const result = await signInWithEmail(
        signInForm.values.email,
        signInForm.values.password
      )

      if (result.success) {
        toast.success("Welcome back!")
        await refreshProfile()
        onOpenChange(false)
        signInForm.reset()
      } else {
        setSubmitError(result.error || "Sign in failed")
      }
    } catch (error) {
      setSubmitError("An unexpected error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle sign up
  const handleSignUp = async () => {
    if (!signUpForm.validation.isValid) {
      await signUpForm.validateForm()
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const result = await signUpWithEmail({
        email: signUpForm.values.email,
        password: signUpForm.values.password,
        username: signUpForm.values.username
      })

      if (result.success) {
        toast.success("Account created successfully! Please check your email for verification.")
        onOpenChange(false)
        signUpForm.reset()
      } else {
        setSubmitError(result.error || "Sign up failed")
      }
    } catch (error) {
      setSubmitError("An unexpected error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle password reset
  const handlePasswordReset = async () => {
    if (!resetForm.validation.isValid) {
      await resetForm.validateForm()
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const result = await resetPassword(resetForm.values.email)

      if (result.success) {
        toast.success("Password reset email sent! Check your inbox.")
        setActiveTab('signin')
        resetForm.reset()
      } else {
        setSubmitError(result.error || "Failed to send reset email")
      }
    } catch (error) {
      setSubmitError("An unexpected error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle OAuth sign in
  const handleOAuthSignIn = async (provider: 'google' | 'discord') => {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const result = provider === 'google' 
        ? await signInWithGoogle()
        : await signInWithDiscord()

      if (result.success) {
        toast.success(`Signed in with ${provider}!`)
        await refreshProfile()
        onOpenChange(false)
      } else {
        setSubmitError(result.error || `${provider} sign in failed`)
      }
    } catch (error) {
      setSubmitError("An unexpected error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Clear error when switching tabs
  const handleTabChange = (tab: string) => {
    setActiveTab(tab as any)
    setSubmitError(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Welcome to Skill Issued</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
            <TabsTrigger value="reset">Reset</TabsTrigger>
          </TabsList>

          {/* Sign In Tab */}
          <TabsContent value="signin" className="space-y-4">
            <div className="space-y-4">
              <ValidatedInput
                {...signInForm.getFieldProps('email')}
                type="email"
                label="Email"
                placeholder="Enter your email"
                required
                disabled={isSubmitting}
                onValueChange={(value) => signInForm.setValue('email', value)}
              />

              <ValidatedInput
                {...signInForm.getFieldProps('password')}
                type="password"
                label="Password"
                placeholder="Enter your password"
                required
                disabled={isSubmitting}
                onValueChange={(value) => signInForm.setValue('password', value)}
              />

              {submitError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleSignIn}
                disabled={isSubmitting || !signInForm.validation.isValid}
                className="w-full"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Sign In
                  </>
                )}
              </Button>

              <div className="text-center">
                <Button
                  variant="link"
                  onClick={() => setActiveTab('reset')}
                  className="text-sm"
                >
                  Forgot your password?
                </Button>
              </div>
            </div>

            <Separator />

            {/* OAuth Options */}
            <div className="space-y-2">
              <Button
                variant="outline"
                onClick={() => handleOAuthSignIn('google')}
                disabled={isSubmitting}
                className="w-full"
              >
                <Chrome className="mr-2 h-4 w-4" />
                Continue with Google
              </Button>

              <Button
                variant="outline"
                onClick={() => handleOAuthSignIn('discord')}
                disabled={isSubmitting}
                className="w-full"
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Continue with Discord
              </Button>
            </div>
          </TabsContent>

          {/* Sign Up Tab */}
          <TabsContent value="signup" className="space-y-4">
            <div className="space-y-4">
              <ValidatedInput
                {...signUpForm.getFieldProps('email')}
                type="email"
                label="Email"
                placeholder="Enter your email"
                description="We'll send you a verification email"
                required
                disabled={isSubmitting}
                onValueChange={(value) => signUpForm.setValue('email', value)}
              />

              <ValidatedInput
                {...signUpForm.getFieldProps('username')}
                type="text"
                label="Username"
                placeholder="Choose a username"
                description="3-30 characters, letters, numbers, _ and - only"
                required
                disabled={isSubmitting}
                isValidating={usernameAvailability.isChecking}
                successMessage={usernameAvailability.isAvailable ? "Username is available!" : undefined}
                onValueChange={(value) => signUpForm.setValue('username', value)}
              />

              <PasswordInput
                {...signUpForm.getFieldProps('password')}
                label="Password"
                placeholder="Create a strong password"
                description="Must include uppercase, lowercase, number, and special character"
                required
                disabled={isSubmitting}
                showStrengthIndicator={true}
                strengthScore={passwordStrength.score}
                strengthLevel={passwordStrength.level}
                strengthChecks={passwordStrength.checks}
                strengthSuggestions={passwordStrength.suggestions}
                onValueChange={(value) => signUpForm.setValue('password', value)}
              />

              <ValidatedInput
                {...signUpForm.getFieldProps('confirmPassword')}
                type="password"
                label="Confirm Password"
                placeholder="Confirm your password"
                required
                disabled={isSubmitting}
                onValueChange={(value) => signUpForm.setValue('confirmPassword', value)}
              />

              {submitError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleSignUp}
                disabled={isSubmitting || !signUpForm.validation.isValid}
                className="w-full"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    <User className="mr-2 h-4 w-4" />
                    Create Account
                  </>
                )}
              </Button>
            </div>

            <Separator />

            {/* OAuth Options */}
            <div className="space-y-2">
              <Button
                variant="outline"
                onClick={() => handleOAuthSignIn('google')}
                disabled={isSubmitting}
                className="w-full"
              >
                <Chrome className="mr-2 h-4 w-4" />
                Sign up with Google
              </Button>

              <Button
                variant="outline"
                onClick={() => handleOAuthSignIn('discord')}
                disabled={isSubmitting}
                className="w-full"
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Sign up with Discord
              </Button>
            </div>
          </TabsContent>

          {/* Password Reset Tab */}
          <TabsContent value="reset" className="space-y-4">
            <div className="space-y-4">
              <div className="text-center text-sm text-muted-foreground">
                Enter your email address and we'll send you a link to reset your password.
              </div>

              <ValidatedInput
                {...resetForm.getFieldProps('email')}
                type="email"
                label="Email"
                placeholder="Enter your email"
                required
                disabled={isSubmitting}
                onValueChange={(value) => resetForm.setValue('email', value)}
              />

              {submitError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handlePasswordReset}
                disabled={isSubmitting || !resetForm.validation.isValid}
                className="w-full"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Reset Email
                  </>
                )}
              </Button>

              <div className="text-center">
                <Button
                  variant="link"
                  onClick={() => setActiveTab('signin')}
                  className="text-sm"
                >
                  Back to Sign In
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
