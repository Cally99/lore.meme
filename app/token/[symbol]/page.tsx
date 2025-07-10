"use client"

import React, { useState, useEffect, Suspense } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, BookOpen, Calendar, Edit, TrendingUp, Users, AlertTriangle } from "lucide-react"
import { getTokenBySymbol, getTokenByAddress } from "@/app/actions/token-actions"
import { notFound, useParams } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import GoodLoreButton from "./good-lore-button"

// Loading component
function TokenLoading() {
  return (
    <div className="container mx-auto px-4 py-12 animate-pulse">
      <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
        <div className="w-32 h-32 md:w-48 md:h-48 rounded-full bg-slate-200 dark:bg-slate-700"></div>
        <div className="flex-1 text-center md:text-left">
          <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg w-3/4 mb-4"></div>
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-lg w-full mb-6"></div>
          <div className="flex flex-wrap gap-3 justify-center md:justify-start mb-8">
            <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-full w-32"></div>
            <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-full w-32"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return {
          color: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
          label: 'Lore verified'
        }
      case 'pending':
        return {
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800',
          label: 'Pending Review'
        }
      case 'rejected':
        return {
          color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
          label: 'Rejected'
        }
      default:
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800',
          label: status
        }
    }
  }

  const config = getStatusConfig(status)
  
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${config.color}`}>
      {config.label}
    </span>
  )
}

// Fallback token data for when the database isn't available
const fallbackToken = {
  id: "1",
  name: "CATCOIN",
  symbol: "$CATCOIN",
  address: "0x4d3c2b1a5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t",
  description: "The feline response to canine dominance.",
  story: `$CATCOIN emerged as a playful counterpoint to the canine-themed tokens that had dominated the meme coin landscape. Created by a team of blockchain developers who were also devoted cat lovers, $CATCOIN aimed to bring feline charm and grace to the often chaotic world of cryptocurrency.

The origin story of $CATCOIN is as whimsical as the internet's love for cat content. Legend has it that the idea was born when one of the founders' cats walked across their keyboard during a brainstorming session for a new DeFi project. The resulting string of characters, when run through a hash function, produced a sequence that the team interpreted as a sign: the crypto world needed a feline champion.

$CATCOIN's technical architecture is designed with the same independence and agility that cats are known for. The protocol implements a unique consensus mechanism called "Proof of Purr" (PoP), which optimizes transaction validation based on network activity patterns that mimic a cat's sleep-wake cycle—intense bursts of activity followed by periods of rest, resulting in energy efficiency without sacrificing performance.`,
  image_url: "/placeholder.svg?height=200&width=200",
  created_at: new Date().toISOString(),
  created_by: "meow@catcoin.io",
  creator_type: "Owner",
  telegram: "@catcoin",
  email: "meow@catcoin.io",
  twitter: "https://twitter.com/catcoin",
  dexscreener: "https://dexscreener.com/ethereum/0x4d3c2b1a",
  featured: false,
  status: "approved",
  good_lores: 28,
}

// Helper function to determine if creator is Owner or Community
function getCreatorType(token: any) {
  if (token.creator_type) {
    return token.creator_type
  }
  // Default to "Community" if not specified
  return "Community"
}

// Token content component with error handling
function TokenContent() {
  const params = useParams()
  const symbol = decodeURIComponent(params.symbol as string)
  const [token, setToken] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchToken() {
      setIsLoading(true)
      setError(null)

      try {
        console.log("🔍 [TOKEN DEBUG] Fetching token data for symbol:", symbol)
        console.log("🔍 [TOKEN DEBUG] Fetch triggered at:", new Date().toISOString())
        console.log("🔍 [TOKEN DEBUG] Current URL:", window.location.href)
        
        // First try to get token by symbol (includes all statuses)
        let fetchedToken = await getTokenBySymbol(symbol, true)
        console.log("🔍 [TOKEN DEBUG] Token by symbol result:", fetchedToken ? "found" : "not found")
        
        // If not found by symbol, try by address as fallback
        if (!fetchedToken) {
          console.log("🔍 [TOKEN DEBUG] Trying fallback lookup by address:", symbol)
          fetchedToken = await getTokenByAddress(symbol, true)
          console.log("🔍 [TOKEN DEBUG] Token by address result:", fetchedToken ? "found" : "not found")
        }

        if (!fetchedToken) {
          console.log("❌ [TOKEN DEBUG] Token not found in database")
          setToken(null)
        } else {
          console.log("✅ [TOKEN DEBUG] Token found:", {
            id: fetchedToken.id,
            name: fetchedToken.name,
            symbol: fetchedToken.symbol,
            status: fetchedToken.status,
            good_lores: fetchedToken.good_lores,
            timestamp: new Date().toISOString()
          })
          setToken(fetchedToken)
        }
      } catch (err) {
        console.error("💥 [TOKEN DEBUG] Error fetching token:", err)
        setError(err instanceof Error ? err : new Error(String(err)))

        // Use fallback token if there's an error and symbol matches
        if (symbol.toLowerCase() === "$catcoin" || symbol.toLowerCase() === "catcoin") {
          console.log("🔄 [TOKEN DEBUG] Using fallback token for CATCOIN")
          setToken({
            ...fallbackToken,
            symbol: symbol,
          })
        } else {
          setToken(null)
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchToken()
  }, [symbol])

  // Helper function to increment view count using authenticated server action
  const incrementViewCount = async (tokenId: string) => {
    try {
      // Use authenticated server action pattern for view count increment
      const response = await fetch('/api/token/increment-views', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tokenId })
      }).catch(error => {
        console.log('View count update failed (non-critical):', error)
      })
    } catch (error) {
      console.log('Error incrementing view count (non-critical):', error)
    }
  }

  // Increment view count when token is loaded
  useEffect(() => {
    if (token && token.id) {
      incrementViewCount(token.id)
    }
  }, [token])

  if (isLoading) {
    return <TokenLoading />
  }

  // If token is null after loading, it means it wasn't found
  if (!token) {
    return notFound()
  }

  return (
    <>
      {/* Status Warning for non-approved tokens */}
      {token.status !== 'approved' && (
        <section className="container mx-auto px-4 py-4">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Token Status: {token.status}
                </h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  {token.status === 'pending' && "This token is currently under review. Information may be incomplete or unverified."}
                  {token.status === 'rejected' && "This token has been rejected. The information shown may not be accurate."}
                </p>
              </div>
              <StatusBadge status={token.status} />
            </div>
          </div>
        </section>
      )}

      {/* Token Hero Section */}
      <section className="container mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
          <div className="w-32 h-32 md:w-48 md:h-48 rounded-full bg-gradient-to-r from-blue-500/20 to-blue-300/20 dark:from-blue-500/10 dark:to-blue-300/10 p-1 flex items-center justify-center">
            <img
              src={token.image_url || "/placeholder.svg?height=200&width=200"}
              alt={token.name}
              className="w-full h-full rounded-full"
              onError={(e) => {
                // If image fails to load, use placeholder
                ;(e.target as HTMLImageElement).src = "/placeholder.svg?height=200&width=200"
              }}
            />
          </div>

          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-4">
              <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400 dark:from-blue-400 dark:to-blue-300">
                {token.name}
              </h1>
              <div className="flex items-center gap-2 justify-center md:justify-start">
                {token.featured && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/30 dark:border-blue-400/30">
                    Featured
                  </span>
                )}
                <StatusBadge status={token.status} />
              </div>
            </div>

            <p className="text-xl text-slate-700 dark:text-slate-300 mb-6">{token.description}</p>

            <div className="flex flex-wrap gap-3 justify-center md:justify-start mb-8">
              {token.twitter && (
                <a
                  href={token.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white/50 dark:bg-gray-800/50 hover:bg-white/80 dark:hover:bg-gray-700/80 rounded-full text-sm text-slate-700 dark:text-slate-300 transition-colors border border-blue-100 dark:border-gray-700"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                  >
                    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
                  </svg>
                  Twitter
                </a>
              )}
              {token.telegram && (
                <a
                  href={`https://t.me/${token.telegram.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white/50 dark:bg-gray-800/50 hover:bg-white/80 dark:hover:bg-gray-700/80 rounded-full text-sm text-slate-700 dark:text-slate-300 transition-colors border border-blue-100 dark:border-gray-700"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                  >
                    <path d="m22 2-7 20-4-9-9-4Z" />
                    <path d="M22 2 11 13" />
                  </svg>
                  Telegram
                </a>
              )}
              {token.dexscreener && (
                <a
                  href={token.dexscreener}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white/50 dark:bg-gray-800/50 hover:bg-white/80 dark:hover:bg-gray-700/80 rounded-full text-sm text-slate-700 dark:text-slate-300 transition-colors border border-blue-100 dark:border-gray-700"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                  >
                    <path d="M18 8c0-3.31-2.69-6-6-6S6 4.69 6 8c0 4 6 10 6 10s6-6 6-10" />
                    <circle cx="12" cy="8" r="2" />
                  </svg>
                  Dexscreener
                </a>
              )}
            </div>

            <div className="flex flex-wrap gap-6 text-sm text-slate-600 dark:text-slate-400 justify-center md:justify-start">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>Added {formatDistanceToNow(new Date(token.created_at), { addSuffix: true })}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>By {getCreatorType(token)}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Token Address Section */}
      <section className="container mx-auto px-4 py-6">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-blue-100 dark:border-gray-700 rounded-xl p-4 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Token Address</h3>
              <p className="font-mono text-slate-700 dark:text-slate-300 break-all">{token.address}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={() => {
                  try {
                    const url = `${window.location.origin}/token/${encodeURIComponent(token.symbol)}`
                    const text = `Check out ${token.symbol} on Lore.meme: ${token.description}`

                    // Create Twitter share URL
                    const twitterShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`

                    // Open Twitter share dialog
                    window.open(twitterShareUrl, "_blank", "width=550,height=420")
                  } catch (error) {
                    console.error("Failed to share:", error)
                    alert("Failed to share. Please try again.")
                  }
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4 mr-2"
                >
                  <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
                </svg>
                Share on Twitter
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={() => {
                  try {
                    navigator.clipboard.writeText(token.address)
                    alert("Address copied to clipboard!")
                  } catch (error) {
                    console.error("Failed to copy address:", error)
                    alert("Failed to copy address. Please try again.")
                  }
                }}
              >
                Copy Address
              </Button>
              <Link href={`/verify-token?token=${token.id}`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-blue-500 text-blue-500 hover:bg-blue-500/10 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-400/10"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Update Lore
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Token Story Section */}
      <section className="container mx-auto px-4 py-12">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-blue-100 dark:border-gray-700 rounded-xl p-6 md:p-8 shadow-sm">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400 dark:from-blue-400 dark:to-blue-300">
            The Lore
          </h2>

          <div className="prose prose-slate dark:prose-invert max-w-none">
            {token.story.split("\n\n").map((paragraph: string, index: number) => (
              <p key={index} className="mb-6 text-slate-700 dark:text-slate-300 leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>

          {/* Good Lore Button - Only show for approved tokens */}
          {token.status === 'approved' && (
            <div className="mt-10 flex flex-col items-center">
              <GoodLoreButton tokenId={token.id} initialCount={token.good_lores || 0} />
            </div>
          )}
          
          {/* Message for non-approved tokens */}
          {token.status !== 'approved' && (
            <div className="mt-10 flex flex-col items-center">
              <div className="text-center text-slate-500 dark:text-slate-400">
                <p className="text-sm">Voting is disabled for tokens that are not yet approved.</p>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  )
}

export default function TokenPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50 dark:from-gray-900 dark:to-black text-slate-900 dark:text-slate-100">

      {/* Token Content with Suspense */}
      <Suspense fallback={<TokenLoading />}>
        <TokenContent />
      </Suspense>

      {/* Back to Home */}
      <div className="container mx-auto px-4 py-12 text-center">
        <Link href="/">
          <Button
            variant="outline"
            className="border-blue-500 text-blue-500 hover:bg-blue-500/10 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-400/10"
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            Back to Home
          </Button>
        </Link>
      </div>
    </div>
  )
}
