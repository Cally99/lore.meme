// @ts-ignore
// src/app/(components)/navigation/MobileNav.tsx
"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image" // Import the Image component
import { Button } from "@/components/ui/button"
import { Menu, X, TrendingUp, LogIn, LogOut, Mail, Lock, BookOpen } from "lucide-react"
import ThemeToggle from "@/components/theme-toggle"
import { useSession, signOut } from 'next-auth/react'
import { useAuthModal } from "@/providers/AuthModalProvider"
import { UserAvatar } from "@/components/ui/UserAvatar"
import { useAuth } from '@/lib/hooks/useAuth'

export default function MobileNav() {
  const [isOpen, setIsOpen] = useState(false)
  const { session, status } = useSession()
  const { openModal } = useAuthModal()
  const { isAuthenticated, isLoreCreator } = useAuth()
  const user = session?.user

  const toggleMenu = () => setIsOpen(!isOpen)
  const closeMenu = () => setIsOpen(false)

  const handleAuthClick = () => {
    closeMenu()
    openModal()
  }

  const handleSubmitLoreClick = (e: React.MouseEvent) => {
    if (!isAuthenticated) {
      e.preventDefault()
      closeMenu()
      openModal()
      return
    }

    if (!isLoreCreator) {
      e.preventDefault()
      closeMenu()
      alert('You need the "Lore Creator" role to submit token lore. Please contact an administrator.')
      return
    }

    closeMenu()
    // Allow navigation to proceed
  }

  return (
    <>
      {/* Mobile Header - Always visible on mobile */}
      <div className="md:hidden sticky top-0 z-50 flex items-center justify-between container mx-auto p-4 bg-background border-b">
        <Link href="/" className="flex items-center gap-2" onClick={closeMenu}>
          {/* Replace BookOpen with the custom logo */}
          <Image 
            className="h-8 w-8" 
            src="/logo.png" 
            alt="Lore.meme Logo" 
            width={32} 
            height={32} 
          />
          <span className="font-bold text-lg">Lore.meme</span>
        </Link>

        {/* Hamburger Menu and Theme Toggle */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Hamburger Menu Button */}
          <Button variant="ghost" size="icon" onClick={toggleMenu} className="z-50">
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm" 
            onClick={closeMenu} 
          />

          {/* Menu Panel */}
          <div className="fixed right-0 top-0 h-full w-full max-w-xs bg-background border-l shadow-xl animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Menu</h2>
              <Button variant="ghost" size="icon" onClick={closeMenu}>
                <X className="h-6 w-6" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex flex-col h-full">
              {/* User Section */}
              <div className="p-4 border-b">
                {isAuthenticated && user ? (
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-3 min-w-0">
                      <UserAvatar user={user} />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm truncate">
                          {user.name || user.email}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {user.email}
                        </div>
                        {isLoreCreator && (
                          <div className="text-xs text-green-600 dark:text-green-400">
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { closeMenu(); signOut(); }}
                      className="flex-shrink-0 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button 
                    onClick={handleAuthClick} 
                    className="w-full justify-start bg-blue-600 text-white hover:bg-blue-700"
                  >
                    <LogIn className="h-4 w-4 mr-2" />
                    Sign In / Sign Up
                  </Button>
                )}
              </div>

              {/* Navigation Links */}
              <nav className="flex-1 p-4 space-y-2">
                <Link href="/all-tokens" onClick={closeMenu} className="block">
                  <Button variant="ghost" className="w-full justify-start">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    All Tokens
                  </Button>
                </Link>
                
                <Link href="/submit-lore" onClick={handleSubmitLoreClick} className="block">
                  <Button 
                    variant="ghost" 
                    className={`w-full justify-start ${
                      isAuthenticated && !isLoreCreator 
                        ? 'text-muted-foreground cursor-not-allowed' 
                        : ''
                    }`}
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    Submit Lore
                    {isAuthenticated && !isLoreCreator && (
                      <Lock className="h-3 w-3 ml-auto text-red-400" />
                    )}
                  </Button>
                </Link>

                {/* Contact Us Link */}
                <Link href="/contact" onClick={closeMenu} className="block">
                  <Button variant="ghost" className="w-full justify-start">
                    <Mail className="h-4 w-4 mr-2" />
                    Contact Us
                  </Button>
                </Link>
              </nav>
            </div>
          </div>
        </div>
      )}
    </>
  )
}