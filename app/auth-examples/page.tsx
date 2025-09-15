"use client"

import { Navigation } from "@/components/navigation"
import { 
  ProtectedRoute, 
  RequireAuth, 
  RequireVerified, 
  RequireProfile,
  useAuthRequirements
} from "@/components/auth/protected-route"
import { 
  AuthRoute,
  VerifiedRoute,
  CompleteRoute
} from "@/components/auth/route-guard"
import { AuthGate } from "@/components/auth/auth-middleware"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/hooks/use-auth"
import { 
  Shield, 
  User, 
  CheckCircle, 
  AlertCircle, 
  Lock, 
  Unlock,
  Eye,
  EyeOff
} from "lucide-react"
import { useState } from "react"

export default function AuthExamplesPage() {
  const [showProtectedContent, setShowProtectedContent] = useState(false)
  const { isAuthenticated, isEmailVerified, hasProfile, isProfileComplete } = useAuth()
  
  // Example of using the auth requirements hook
  const authCheck = useAuthRequirements({
    requireAuth: true,
    requireVerified: true,
    requireProfile: true
  })

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Navigation />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Authentication Examples</h1>
          <p className="text-muted-foreground">
            Demonstration of different authentication protection levels and components
          </p>
        </div>

        {/* Auth Status Overview */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Current Authentication Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                {isAuthenticated ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm">
                  {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                {isEmailVerified ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                )}
                <span className="text-sm">
                  {isEmailVerified ? 'Email Verified' : 'Email Not Verified'}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                {hasProfile ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm">
                  {hasProfile ? 'Has Profile' : 'No Profile'}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                {isProfileComplete ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                )}
                <span className="text-sm">
                  {isProfileComplete ? 'Profile Complete' : 'Profile Incomplete'}
                </span>
              </div>
            </div>
            
            {/* Auth Requirements Hook Example */}
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">useAuthRequirements Hook Result:</h4>
              <div className="text-sm space-y-1">
                <div>Can Access: <Badge variant={authCheck.canAccess ? "default" : "destructive"}>
                  {authCheck.canAccess ? "Yes" : "No"}
                </Badge></div>
                <div>Loading: <Badge variant="outline">{authCheck.loading ? "Yes" : "No"}</Badge></div>
                {authCheck.unmetRequirements.length > 0 && (
                  <div>Unmet Requirements: <Badge variant="secondary">
                    {authCheck.unmetRequirements.join(", ")}
                  </Badge></div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="basic" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic Protection</TabsTrigger>
            <TabsTrigger value="levels">Protection Levels</TabsTrigger>
            <TabsTrigger value="conditional">Conditional Content</TabsTrigger>
            <TabsTrigger value="interactive">Interactive Examples</TabsTrigger>
          </TabsList>

          {/* Basic Protection Examples */}
          <TabsContent value="basic" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Public Content */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Unlock className="h-4 w-4 text-green-500" />
                    Public Content
                  </CardTitle>
                  <CardDescription>
                    This content is visible to everyone
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    This is public content that doesn't require any authentication.
                    Anyone can see this content regardless of their login status.
                  </p>
                </CardContent>
              </Card>

              {/* Protected Content */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-red-500" />
                    Protected Content
                  </CardTitle>
                  <CardDescription>
                    Requires authentication to view
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RequireAuth showLoadingSkeleton={false}>
                    <p className="text-sm text-muted-foreground">
                      🎉 Congratulations! You can see this protected content because you're authenticated.
                      This content is wrapped in a RequireAuth component.
                    </p>
                  </RequireAuth>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Protection Levels */}
          <TabsContent value="levels" className="space-y-6">
            <div className="grid gap-6">
              {/* Auth Required */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Level 1: Authentication Required
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <AuthRoute showLoadingSkeleton={false}>
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        ✅ You are authenticated! This content requires basic authentication.
                      </AlertDescription>
                    </Alert>
                  </AuthRoute>
                </CardContent>
              </Card>

              {/* Verified Required */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Level 2: Email Verification Required
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <VerifiedRoute showLoadingSkeleton={false} allowUnverified={true}>
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        ✅ Your email is verified! This content requires email verification.
                      </AlertDescription>
                    </Alert>
                  </VerifiedRoute>
                </CardContent>
              </Card>

              {/* Complete Profile Required */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Level 3: Complete Profile Required
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CompleteRoute showLoadingSkeleton={false}>
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        ✅ Your profile is complete! This content requires a complete profile.
                      </AlertDescription>
                    </Alert>
                  </CompleteRoute>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Conditional Content */}
          <TabsContent value="conditional" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>AuthGate Component Example</CardTitle>
                <CardDescription>
                  Shows different content based on authentication state
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AuthGate
                  authenticated={
                    <Alert>
                      <User className="h-4 w-4" />
                      <AlertDescription>
                        Welcome back! You're seeing the authenticated version of this content.
                      </AlertDescription>
                    </Alert>
                  }
                  unauthenticated={
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        You're not signed in. This is the public version of the content.
                      </AlertDescription>
                    </Alert>
                  }
                  loading={
                    <Alert>
                      <AlertDescription>
                        Checking authentication status...
                      </AlertDescription>
                    </Alert>
                  }
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Interactive Examples */}
          <TabsContent value="interactive" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Interactive Protection Toggle</CardTitle>
                <CardDescription>
                  Toggle to see protected content behavior
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowProtectedContent(!showProtectedContent)}
                  >
                    {showProtectedContent ? (
                      <>
                        <EyeOff className="mr-2 h-4 w-4" />
                        Hide Protected Content
                      </>
                    ) : (
                      <>
                        <Eye className="mr-2 h-4 w-4" />
                        Show Protected Content
                      </>
                    )}
                  </Button>
                </div>

                {showProtectedContent && (
                  <ProtectedRoute
                    requireAuth={true}
                    requireVerified={false}
                    showLoadingSkeleton={false}
                    errorMessage="This interactive example requires authentication"
                  >
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        🎉 This is dynamically protected content! It only shows when you toggle it on
                        and you meet the authentication requirements.
                      </AlertDescription>
                    </Alert>
                  </ProtectedRoute>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

