"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search, Menu, X, Gamepad2, List, Activity, User, Users, LogOut, Settings, Shield, Bell, MessageCircle, Bookmark, Heart } from "lucide-react"
import { AuthDialog } from "@/components/auth-dialog"
import { AuthStatusIndicator, ConnectionStatusIndicator } from "@/components/auth/auth-status-indicator"
import { NavigationLoadingSkeleton } from "@/components/auth/auth-loading-skeleton"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"

export function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const pathname = usePathname()
  
  // Use enhanced auth hook
  const { 
    isAuthenticated, 
    isLoading,
    userProfile, 
    getDisplayName, 
    getInitials,
    avatarUrl,
    userEmail,
    isEmailVerified,
    isProfileComplete,
    needsRefresh,
    signOut: authSignOut 
  } = useAuth()
  
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Cmd/Ctrl + K to open search
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault()
        window.location.href = '/search'
      }
      // Cmd/Ctrl + L to open auth dialog (if not authenticated)
      if ((event.metaKey || event.ctrlKey) && event.key === 'l' && !isAuthenticated) {
        event.preventDefault()
        setIsAuthDialogOpen(true)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isAuthenticated])

  const isActive = (path: string) => pathname === path

  // Handle logout
  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      const { success, error } = await authSignOut()
      if (!success && error) {
        console.error('Logout error:', error)
        toast.error('Failed to sign out. Please try again.')
      } else {
        toast.success('You have been signed out successfully.')
        // Close mobile menu if open
        setIsMobileMenuOpen(false)
        // Redirect to home page after a short delay
        setTimeout(() => {
          window.location.href = '/'
        }, 1000)
      }
    } catch (err) {
      console.error('Unexpected logout error:', err)
      toast.error('An unexpected error occurred while signing out.')
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:flex items-center justify-between p-4 bg-background border-b border-border">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold text-primary">
            <Gamepad2 className="w-6 h-6" />
            <span className="font-playfair">Skill Issued</span>
          </Link>

          <div className="flex items-center gap-6">
            <Link
              href="/games"
              className={`transition-colors ${isActive("/games") ? "text-primary" : "text-foreground hover:text-primary"}`}
            >
              Games
            </Link>
            <Link
              href="/reviews"
              className={`transition-colors ${isActive("/reviews") ? "text-primary" : "text-foreground hover:text-primary"}`}
            >
              Reviews
            </Link>
            <Link
              href="/lists"
              className={`transition-colors ${isActive("/lists") ? "text-primary" : "text-foreground hover:text-primary"}`}
            >
              Lists
            </Link>
            <Link
              href="/activity"
              className={`transition-colors ${isActive("/activity") ? "text-primary" : "text-foreground hover:text-primary"}`}
            >
              Activity
            </Link>
            {isAuthenticated && (
              <Link
                href="/friends"
                className={`transition-colors ${isActive("/friends") ? "text-primary" : "text-foreground hover:text-primary"}`}
              >
                Friends
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Find games, users, reviews..."
              className="pl-10 pr-16 w-80 bg-card border-border cursor-pointer"
              onClick={() => (window.location.href = "/search")}
              readOnly
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                <span className="text-xs">⌘</span>K
              </kbd>
            </div>
          </div>
          
          {isAuthenticated && (
            <div className="flex items-center gap-2">
              {/* Notifications Button */}
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-4 w-4" />
                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs bg-red-500 text-white">
                  3
                </Badge>
              </Button>
              
              {/* Messages Button */}
              <Button variant="ghost" size="sm" className="relative">
                <MessageCircle className="h-4 w-4" />
                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs bg-blue-500 text-white">
                  2
                </Badge>
              </Button>
            </div>
          )}
          
          {isLoading ? (
            <NavigationLoadingSkeleton />
          ) : isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={avatarUrl || ""} alt={getDisplayName()} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* Status indicator dot */}
                  <div className="absolute -bottom-0.5 -right-0.5">
                    <AuthStatusIndicator variant="minimal" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64" align="end" forceMount>
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none flex-1">
                    <p className="font-medium">{getDisplayName()}</p>
                    <p className="w-[180px] truncate text-sm text-muted-foreground">
                      {userEmail}
                    </p>
                  </div>
                </div>
                
                {/* Authentication Status */}
                <div className="px-2 pb-2">
                  <AuthStatusIndicator variant="badge" />
                  
                  {/* Status warnings */}
                  <div className="mt-2 space-y-1">
                    {!isEmailVerified && (
                      <div className="flex items-center gap-2 text-xs text-blue-600">
                        <div className="w-1 h-1 bg-blue-600 rounded-full" />
                        <span>Email verification pending</span>
                      </div>
                    )}
                    {!isProfileComplete && (
                      <div className="flex items-center gap-2 text-xs text-yellow-600">
                        <div className="w-1 h-1 bg-yellow-600 rounded-full" />
                        <span>Profile setup incomplete</span>
                      </div>
                    )}
                    {needsRefresh && (
                      <div className="flex items-center gap-2 text-xs text-orange-600">
                        <div className="w-1 h-1 bg-orange-600 rounded-full" />
                        <span>Session expiring soon</span>
                      </div>
                    )}
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <span>View Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/profile/edit" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Edit Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/lists" className="cursor-pointer">
                    <Bookmark className="mr-2 h-4 w-4" />
                    <span>My Lists</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/reviews" className="cursor-pointer">
                    <Heart className="mr-2 h-4 w-4" />
                    <span>My Reviews</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/friends" className="cursor-pointer">
                    <Users className="mr-2 h-4 w-4" />
                    <span>Friends</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/privacy" className="cursor-pointer">
                    <Shield className="mr-2 h-4 w-4" />
                    <span>Privacy Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="cursor-pointer text-red-600 focus:text-red-600" 
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{isLoggingOut ? "Signing out..." : "Sign out"}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => setIsAuthDialogOpen(true)}>
                Sign In
              </Button>
              <Button
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => setIsAuthDialogOpen(true)}
              >
                Create Account
              </Button>
            </>
          )}
        </div>
      </nav>

      {/* Mobile Navigation */}
      <nav className="md:hidden">
        <div className="flex items-center justify-between p-4 bg-background border-b border-border">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold text-primary">
            <Gamepad2 className="w-5 h-5" />
            <span className="font-playfair">Skill Issued</span>
          </Link>

          <Button variant="ghost" size="sm" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>

        {isMobileMenuOpen && (
          <div className="bg-background border-b border-border p-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Find games, users, reviews..."
                className="pl-10 bg-card border-border"
                onClick={() => (window.location.href = "/search")}
              />
            </div>
            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-3 p-3 bg-card rounded-lg border border-border">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={avatarUrl || ""} alt={getDisplayName()} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{getDisplayName()}</p>
                    <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="relative">
                      <Bell className="h-4 w-4" />
                      <Badge className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center text-xs bg-red-500 text-white">
                        3
                      </Badge>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="text-red-600 hover:text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Mobile Quick Actions */}
                <div className="grid grid-cols-4 gap-2">
                  <Link
                    href="/profile"
                    className="flex flex-col items-center gap-1 p-3 bg-card rounded-lg border border-border hover:bg-accent transition-colors"
                  >
                    <User className="h-5 w-5" />
                    <span className="text-xs">Profile</span>
                  </Link>
                  <Link
                    href="/lists"
                    className="flex flex-col items-center gap-1 p-3 bg-card rounded-lg border border-border hover:bg-accent transition-colors"
                  >
                    <Bookmark className="h-5 w-5" />
                    <span className="text-xs">Lists</span>
                  </Link>
                  <Link
                    href="/friends"
                    className="flex flex-col items-center gap-1 p-3 bg-card rounded-lg border border-border hover:bg-accent transition-colors"
                  >
                    <Users className="h-5 w-5" />
                    <span className="text-xs">Friends</span>
                  </Link>
                  <Link
                    href="/settings"
                    className="flex flex-col items-center gap-1 p-3 bg-card rounded-lg border border-border hover:bg-accent transition-colors"
                  >
                    <Settings className="h-5 w-5" />
                    <span className="text-xs">Settings</span>
                  </Link>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsAuthDialogOpen(true)}>
                  Sign In
                </Button>
                <Button
                  size="sm"
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => setIsAuthDialogOpen(true)}
                >
                  Create Account
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Mobile Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-2">
          <div className="flex items-center justify-around">
            <Link
              href="/games"
              className={`flex flex-col items-center gap-1 p-2 transition-colors ${
                isActive("/games") ? "text-primary" : "text-muted-foreground hover:text-primary"
              }`}
            >
              <Gamepad2 className="w-5 h-5" />
              <span className="text-xs">Games</span>
            </Link>
            <Link
              href="/search"
              className={`flex flex-col items-center gap-1 p-2 transition-colors ${
                isActive("/search") ? "text-primary" : "text-muted-foreground hover:text-primary"
              }`}
            >
              <Search className="w-5 h-5" />
              <span className="text-xs">Search</span>
            </Link>
            {isAuthenticated ? (
              <Link
                href="/friends"
                className={`flex flex-col items-center gap-1 p-2 transition-colors ${
                  isActive("/friends") ? "text-primary" : "text-muted-foreground hover:text-primary"
                }`}
              >
                <Users className="w-5 h-5" />
                <span className="text-xs">Friends</span>
              </Link>
            ) : (
              <Link
                href="/lists"
                className={`flex flex-col items-center gap-1 p-2 transition-colors ${
                  isActive("/lists") ? "text-primary" : "text-muted-foreground hover:text-primary"
                }`}
              >
                <List className="w-5 h-5" />
                <span className="text-xs">Lists</span>
              </Link>
            )}
            <Link
              href="/activity"
              className={`flex flex-col items-center gap-1 p-2 transition-colors ${
                isActive("/activity") ? "text-primary" : "text-muted-foreground hover:text-primary"
              }`}
            >
              <Activity className="w-5 h-5" />
              <span className="text-xs">Activity</span>
            </Link>
            <Link
              href="/profile"
              className={`flex flex-col items-center gap-1 p-2 transition-colors ${
                isActive("/profile") ? "text-primary" : "text-muted-foreground hover:text-primary"
              }`}
            >
              <User className="w-5 h-5" />
              <span className="text-xs">Profile</span>
            </Link>
          </div>
          
          {/* Connection Status */}
          <div className="absolute bottom-1 right-1">
            <ConnectionStatusIndicator />
          </div>
        </div>
      </nav>

      {/* AuthDialog Component */}
      <AuthDialog open={isAuthDialogOpen} onOpenChange={setIsAuthDialogOpen} />
    </>
  )
}
