"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { ThumbsUp } from "lucide-react"
import { toggleUserLike, getUserLikeStatus } from "@/app/actions/token-actions"
import { useAuthModal } from "@/providers/AuthModalProvider"

interface GoodLoreButtonProps {
  tokenId: string
  initialCount: number
}

export default function GoodLoreButton({ tokenId, initialCount = 0 }: GoodLoreButtonProps) {
  const { data: session, status } = useSession()
  const { openModal } = useAuthModal()
  const [hasVoted, setHasVoted] = useState(false)
  const [goodLoreCount, setGoodLoreCount] = useState(initialCount)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const [localVoteAdjustment, setLocalVoteAdjustment] = useState(0) // Track local vote adjustment (+1 or 0)

  // Check if component is mounted
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Helper function to manage anonymous votes in localStorage
  const getAnonymousVotes = () => {
    try {
      const anonymousVotes = localStorage.getItem("anonymousVotes")
      return anonymousVotes ? JSON.parse(anonymousVotes) : {}
    } catch (error) {
      console.error("Error reading anonymous votes:", error)
      return {}
    }
  }

  const setAnonymousVote = (tokenId: string, hasVoted: boolean) => {
    try {
      const anonymousVotes = getAnonymousVotes()
      if (hasVoted) {
        anonymousVotes[tokenId] = true
      } else {
        delete anonymousVotes[tokenId]
      }
      localStorage.setItem("anonymousVotes", JSON.stringify(anonymousVotes))
    } catch (error) {
      console.error("Error saving anonymous vote:", error)
    }
  }

  const getAnonymousVoteCount = () => {
    try {
      const anonymousVotes = getAnonymousVotes()
      return Object.keys(anonymousVotes).length
    } catch (error) {
      console.error("Error counting anonymous votes:", error)
      return 0
    }
  }

  // Check if user has already voted for this token
  useEffect(() => {
    if (!isMounted) return

    console.log("🔍 [PAGE REFRESH DEBUG] useEffect triggered - checking vote status")
    console.log("🔍 [PAGE REFRESH DEBUG] Current state:", {
      hasVoted,
      goodLoreCount,
      localVoteAdjustment,
      initialCount,
      tokenId,
      status
    })

    async function checkUserLikeStatus() {
      if (session?.user) {
        // For authenticated users, check database
        const userId = session.user.id || session.user.email
        if (userId) {
          try {
            const likeStatus = await getUserLikeStatus(tokenId, userId)
            if (likeStatus.success) {
              setHasVoted(likeStatus.hasLiked)
            }
          } catch (error) {
            console.error("Error checking user like status:", error)
            // Fallback to localStorage
            const userVotesKey = `user_votes_${userId}`
            try {
              const userVotes = localStorage.getItem(userVotesKey)
                ? JSON.parse(localStorage.getItem(userVotesKey) || "{}")
                : {}
              setHasVoted(!!userVotes[tokenId])
            } catch (localError) {
              console.error("Error checking local votes:", localError)
              setHasVoted(false)
            }
          }
        }
      } else {
        // For unauthenticated users, check anonymous votes
        console.log("🔍 [GOOD LORE DEBUG] Checking anonymous votes for unauthenticated user")
        try {
          const anonymousVotes = getAnonymousVotes()
          console.log("🔍 [GOOD LORE DEBUG] Found anonymous votes:", anonymousVotes)
          const hasAnonymousVote = !!anonymousVotes[tokenId]
          console.log("🔍 [GOOD LORE DEBUG] Has anonymous vote for token", tokenId, ":", hasAnonymousVote)
          setHasVoted(hasAnonymousVote)
          
          // Set local vote adjustment for display - always set it properly
          setLocalVoteAdjustment(hasAnonymousVote ? 1 : 0)
          
          console.log("🔍 [PAGE REFRESH DEBUG] Anonymous vote state set:", {
            hasAnonymousVote,
            localVoteAdjustment: hasAnonymousVote ? 1 : 0,
            willShowTotal: initialCount + (hasAnonymousVote ? 1 : 0)
          })
        } catch (error) {
          console.error("Error checking anonymous votes:", error)
          setHasVoted(false)
          setLocalVoteAdjustment(0)
        }
      }
    }

    checkUserLikeStatus().then(() => {
      console.log("🔍 [PAGE REFRESH DEBUG] Vote checking completed. Final state:", {
        hasVoted,
        goodLoreCount,
        localVoteAdjustment,
        totalDisplayCount: goodLoreCount + localVoteAdjustment
      })
    })
  }, [tokenId, isMounted, session])

  const handleGoodLoreClick = async () => {
    // DEBUG: Log authentication status and user requirements
    console.log("🔍 [GOOD LORE DEBUG] Click handler called:", {
      status,
      hasSession: !!session,
      userRequirement: "Should allow anonymous voting with localStorage persistence"
    })
    
    if (isLoading) return

    setIsLoading(true)
    setError(null)

    try {
      const newVoteState = !hasVoted
      const countChange = newVoteState ? 1 : -1

      // Update local state optimistically
      setHasVoted(newVoteState)
      setGoodLoreCount((prev) => Math.max(0, prev + countChange))

      if (status === 'authenticated' && session?.user) {
        // Authenticated user - use server action
        console.log("✅ [GOOD LORE DEBUG] Authenticated user - using server action")
        const userId = session.user.id || session.user.email
        
        if (!userId) {
          setError("User ID not found")
          return
        }

        // Save vote state to localStorage as backup
        const userVotesKey = `user_votes_${userId}`
        try {
          const userVotes = localStorage.getItem(userVotesKey)
            ? JSON.parse(localStorage.getItem(userVotesKey) || "{}")
            : {}

          if (newVoteState) {
            userVotes[tokenId] = true
          } else {
            delete userVotes[tokenId]
          }
          
          localStorage.setItem(userVotesKey, JSON.stringify(userVotes))
        } catch (error) {
          console.error("Error saving user vote to localStorage:", error)
        }

        // Send to server using the toggle function
        const result = await toggleUserLike(tokenId, userId)

        if (!result.success) {
          console.error("Failed to toggle user like:", result.error)
          setError("Failed to update your vote. Please try again.")
          // Revert optimistic update
          setGoodLoreCount((prev) => Math.max(0, prev - countChange))
          setHasVoted(!newVoteState)
        } else {
          // Update with server response
          if (typeof result.count === 'number') {
            setGoodLoreCount(result.count)
          }
          setHasVoted(result.hasLiked ?? false)
        }
      } else {
        // Anonymous user - use localStorage only
        console.log("✅ [GOOD LORE DEBUG] Anonymous user - using localStorage only")
        
        // Save anonymous vote to localStorage
        setAnonymousVote(tokenId, newVoteState)
        
        // Update local vote adjustment for display
        if (newVoteState) {
          setLocalVoteAdjustment(1)
        } else {
          setLocalVoteAdjustment(0)
        }
        
        console.log("✅ [GOOD LORE DEBUG] Anonymous vote saved:", {
          tokenId,
          newVoteState,
          newCount: goodLoreCount + countChange
        })
      }
    } catch (error) {
      console.error("Error updating good lores:", error)
      setError("Something went wrong. Please try again.")
      // Revert optimistic update
      const countChange = hasVoted ? -1 : 1
      setGoodLoreCount((prev) => Math.max(0, prev - countChange))
      setHasVoted(!hasVoted)
    } finally {
      setIsLoading(false)
    }
  }

  // If not mounted yet, show a placeholder to prevent hydration mismatch
  if (!isMounted) {
    return (
      <div className="flex flex-col items-center space-y-2">
        <Button
          disabled={true}
          className="px-6 py-3 rounded-full bg-gradient-to-r from-blue-600 to-blue-400 dark:from-blue-500 dark:to-blue-400"
        >
          <ThumbsUp className="mr-2 h-5 w-5" />
          Good Lore?
        </Button>
        <p className="text-gray-400 text-sm">
          {initialCount + localVoteAdjustment} {(initialCount + localVoteAdjustment) === 1 ? "person thinks" : "people think"} this is good lore
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center space-y-2">
      <Button
        onClick={handleGoodLoreClick}
        disabled={isLoading}
        className={`px-6 py-3 rounded-full transition-all duration-200 ${
          hasVoted
            ? "bg-green-500 hover:bg-green-600 text-white"
            : "bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 dark:from-blue-500 dark:to-blue-400 dark:hover:from-blue-600 dark:hover:to-blue-500 text-white"
        }`}
      >
        <ThumbsUp className={`mr-2 h-5 w-5 ${hasVoted ? "fill-white" : ""}`} />
        {isLoading ? "Processing..." : hasVoted ? "Good Lore!" : "Good Lore?"}
      </Button>
      <p className="text-gray-400 text-sm text-center">
        {goodLoreCount + localVoteAdjustment} {(goodLoreCount + localVoteAdjustment) === 1 ? "person thinks" : "people think"} this is good lore
      </p>
      {error && <p className="text-amber-500 text-sm text-center">{error}</p>}
      {status === 'unauthenticated' && (
        <p className="text-gray-500 text-xs text-center">
          {hasVoted ? "Your vote is saved locally" : "Click to vote (no sign-in required)"}
        </p>
      )}
    </div>
  )
}
