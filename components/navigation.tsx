"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Menu, X, Gamepad2, List, Activity, User } from "lucide-react"
import { AuthDialog } from "@/components/auth-dialog"

export function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false)
  const pathname = usePathname()

  const isActive = (path: string) => pathname === path

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
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Find games, users, reviews..."
              className="pl-10 w-80 bg-card border-border"
              onClick={() => (window.location.href = "/search")}
            />
          </div>
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
            <Link
              href="/lists"
              className={`flex flex-col items-center gap-1 p-2 transition-colors ${
                isActive("/lists") ? "text-primary" : "text-muted-foreground hover:text-primary"
              }`}
            >
              <List className="w-5 h-5" />
              <span className="text-xs">Lists</span>
            </Link>
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
        </div>
      </nav>

      {/* AuthDialog Component */}
      <AuthDialog open={isAuthDialogOpen} onOpenChange={setIsAuthDialogOpen} />
    </>
  )
}
