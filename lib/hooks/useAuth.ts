// lib/hooks/useAuth.ts
'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'

interface User {
  id?: string
  email?: string
  name?: string
  image?: string
  directus_role_id?: string
  walletAddress?: string
}

export function useAuth() {
  const { data: session, status } = useSession()
  const [isLoreCreator, setIsLoreCreator] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') {
      setIsLoading(true)
      return
    }

    if (session?.user) {
      // Check if user has the correct role ID for lore creation
      const userRoleId = (session.user as User).directus_role_id
      const requiredRoleId = process.env.NEXT_PUBLIC_ROLE_LORE_CREATOR_ID
      
      console.log('🔍 useAuth - Role comparison:', {
        userRoleId,
        requiredRoleId,
        isMatch: userRoleId === requiredRoleId,
        userEmail: session.user.email
      })
      
      const isValidRole = userRoleId === requiredRoleId
      setIsLoreCreator(isValidRole)
    } else {
      setIsLoreCreator(false)
    }
    
    setIsLoading(false)
  }, [session, status])

  return {
    user: session?.user as User,
    isAuthenticated: !!session,
    isLoreCreator,
    isLoading,
    status,
  }
}
