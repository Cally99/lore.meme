"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ArrowRight, Heart, TrendingUp, Clock, Calendar, Search, X } from "lucide-react"
import SearchForm from "@/components/search-form"
import SearchFormWithResults from "@/components/search-form-with-results"
import FeaturedTokensSection from "@/components/featured-tokens/FeaturedTokensSection"
import TokenTable from "@/components/tokens/TokenTable"
import { getTokens } from "./actions/token-actions"



interface Token {
  id: string
  name: string
  symbol: string
  address: string
  description: string
  story: string
  image_url: string
  created_at: string
  created_by: string
  creator_type?: string
  telegram?: string
  email: string
  twitter?: string
  dexscreener?: string
  featured: boolean
  status: string
  good_lores: number
  // Added Directus fields for volume sorting
  total_volume?: number
  price_change_percentage_1h?: number
  price_change_percentage_24h?: number
  price_change_percentage_7d?: number
  current_price?: number
  market_cap?: number
}

// Helper function to clean token names
function cleanTokenName(name: string): string {
  return name
    .replace(/\s*if\s*\([^)]*\)\s*/gi, '')
    .replace(/\s*\(token\.featured\)\s*/gi, '')
    .trim()
}

// Helper function to determine if creator is Owner or Community
function getCreatorType(token: Token) {
  if (token.creator_type) {
    return token.creator_type
  }
  return "Community"
}

// Helper function to format time ago
function formatTimeAgo(dateString: string) {
  const now = new Date()
  const date = new Date(dateString)
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

  if (diffInHours < 1) return "< 1h"
  if (diffInHours < 24) return `${diffInHours}h`
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) return `${diffInDays}d`
  return `${Math.floor(diffInDays / 7)}w`
}

// Helper function to format percentage change
function formatPercentageChange(percentage: number | undefined) {
  if (percentage === undefined || percentage === null) return "0.0%"
  const value = parseFloat(percentage.toString())
  if (isNaN(value)) return "0.0%"
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
}

// Enhanced sorting function with volume-based sorting
function sortTokens(tokens: Token[], sortBy: string) {
  let sortedTokens = [...tokens]

  switch (sortBy) {
    case "top-1h":
      return sortedTokens.sort((a, b) => {
        const aChange = a.price_change_percentage_1h || 0
        const bChange = b.price_change_percentage_1h || 0
        return bChange - aChange
      })
      
    case "top-24h":
      return sortedTokens.sort((a, b) => {
        const aChange = a.price_change_percentage_24h || 0
        const bChange = b.price_change_percentage_24h || 0
        return bChange - aChange
      })
      
    case "top-7d":
      return sortedTokens.sort((a, b) => {
        const aChange = a.price_change_percentage_7d || 0
        const bChange = b.price_change_percentage_7d || 0
        return bChange - aChange
      })
      
    case "newest":
      return sortedTokens.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      
    case "all":
    default:
      return sortedTokens.sort((a, b) => {
        if (a.featured && !b.featured) return -1
        if (!a.featured && b.featured) return 1
        return b.good_lores - a.good_lores
      })
  }
}

// Helper functions moved to TokenTable component

export default function Home() {
  const [allTokens, setAllTokens] = useState<Token[]>([])
  const [searchResults, setSearchResults] = useState<Token[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [showingSearchResults, setShowingSearchResults] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTokens() {
      try {
        console.log("Fetching tokens for homepage...")

        const [featuredTokens, recentTokens] = await Promise.all([
          getTokens({
            featured: true,
            limit: 50,
          }),
          getTokens({
            orderBy: "added_date",
            limit: 100,
          }),
        ])

        const combinedTokens = [...(featuredTokens || []), ...(recentTokens || [])]
        const uniqueTokens = combinedTokens.filter(
          (token, index, self) => index === self.findIndex((t) => t.id === token.id),
        )

        console.log("🔍 [HOMEPAGE DEBUG] Featured tokens:", featuredTokens?.length || 0)
        console.log("🔍 [HOMEPAGE DEBUG] Recent tokens:", recentTokens?.length || 0)
        console.log("🔍 [HOMEPAGE DEBUG] Combined tokens:", combinedTokens.length)
        console.log("🔍 [HOMEPAGE DEBUG] Unique tokens:", uniqueTokens.length)
        console.log("🔍 [HOMEPAGE DEBUG] Setting allTokens state...")
        
        setAllTokens(uniqueTokens)

      } finally {
        setLoading(false)
      }
    }

    fetchTokens()
  }, [])

  const handleSearchResults = (results: Token[], query: string) => {
    setSearchResults(results)
    setSearchQuery(query)
    setShowingSearchResults(query.trim().length > 0)
  }

  const clearSearch = () => {
    setSearchResults([])
    setSearchQuery("")
    setShowingSearchResults(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-blue-50 dark:from-gray-900 dark:to-black">
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 dark:border-blue-400"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50 dark:from-gray-900 dark:to-black text-slate-900 dark:text-slate-100">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 flex flex-col items-center text-center">
        <div
          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-lg rounded-2xl p-10 w-full max-w-3xl border-2 border-blue-300 dark:border-blue-500 relative overflow-hidden"
          style={{
            backgroundImage: "url(/images/membackground33344.png)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        >
          <div className="absolute inset-0 bg-white/85 dark:bg-gray-900/85 backdrop-blur-sm rounded-2xl"></div>
          <div className="relative z-10">
            <h1 className="text-5xl md:text-6xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400 dark:from-blue-400 dark:to-blue-300">
              What's The Lore?
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-300 mb-10">Every Memecoin Has Lore</p>
            <div className="w-full max-w-2xl mx-auto relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-blue-300/20 dark:from-blue-500/10 dark:to-blue-300/10 rounded-xl blur-md -z-10"></div>
              <SearchFormWithResults onResults={handleSearchResults} />
              <p className="text-slate-600 dark:text-slate-400 mt-3 text-sm">
                Enter a token address (0x...) or search by name
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Tokens Section */}
      <FeaturedTokensSection />

      {/* Token Rankings Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400 dark:from-blue-400 dark:to-blue-300">
                {showingSearchResults ? "Search Results" : "Token Rankings"}
              </h2>
              <p className="text-slate-600 dark:text-slate-300 mb-6">
                {showingSearchResults
                  ? `Found ${searchResults.length} results for "${searchQuery}"`
                  : "Discover trending tokens and newest additions to the platform"
                }
              </p>
            </div>
            {showingSearchResults && (
              <Button
                onClick={clearSearch}
                variant="outline"
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Clear Search
              </Button>
            )}
          </div>
        </div>

        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-blue-100 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
          {showingSearchResults ? (
            // Search Results - Use existing table components
            <>
              {/* Desktop Header */}
              <div className="hidden md:grid grid-cols-12 gap-4 p-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300">
                <div className="col-span-1 text-center">#</div>
                <div className="col-span-3">Token</div>
                <div className="col-span-2 text-center">24h Change</div>
                <div className="col-span-2 text-center">
                  <div className="flex items-center gap-1 justify-center">
                    <Heart className="h-4 w-4" />
                    Lores
                  </div>
                </div>
                <div className="col-span-2 text-center">Age</div>
                <div className="col-span-2 text-center">Added By</div>
              </div>

              {/* Use existing table components for search results */}
              <TokenTable tokens={searchResults} showHeader={false} />
              
              {searchResults.length === 0 && (
                <div className="text-center py-12">
                  <Search className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600 dark:text-slate-400">
                    No tokens found matching "{searchQuery}"
                  </p>
                  <p className="text-slate-500 dark:text-slate-500 text-sm mt-2">
                    Try searching with a different token name, symbol, or address
                  </p>
                </div>
              )}
            </>
          ) : (
            // Regular Tabs View
            <Tabs defaultValue="newest" className="w-full">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 gap-1">
                <TabsTrigger value="top-1h" className="flex items-center gap-1 text-xs md:text-sm">
                  <Clock className="h-3 w-3 md:h-4 md:w-4" />
                  <span className="hidden sm:inline">Top</span> 1h
                </TabsTrigger>
                <TabsTrigger value="top-24h" className="flex items-center gap-1 text-xs md:text-sm">
                  <TrendingUp className="h-3 w-3 md:h-4 md:w-4" />
                  <span className="hidden sm:inline">Top</span> 24h
                </TabsTrigger>
                <TabsTrigger value="top-7d" className="flex items-center gap-1 text-xs md:text-sm">
                  <Calendar className="h-3 w-3 md:h-4 md:w-4" />
                  <span className="hidden sm:inline">Top</span> 7d
                </TabsTrigger>
                <TabsTrigger value="newest" className="flex items-center gap-1 text-xs md:text-sm">
                  <Clock className="h-3 w-3 md:h-4 md:w-4" />
                  Newest
                </TabsTrigger>
                <TabsTrigger value="all" className="flex items-center gap-1 text-xs md:text-sm">
                  <TrendingUp className="h-3 w-3 md:h-4 md:w-4" />
                  All Time
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Desktop Header */}
            <div className="hidden md:grid grid-cols-12 gap-4 p-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300">
              <div className="col-span-1 text-center">#</div>
              <div className="col-span-3">Token</div>
              <div className="col-span-2 text-center">24h Change</div>
              <div className="col-span-2 text-center">
                <div className="flex items-center gap-1 justify-center">
                  <Heart className="h-4 w-4" />
                  Lores
                </div>
              </div>
              <div className="col-span-2 text-center">Age</div>
              <div className="col-span-2 text-center">Added By</div>
            </div>

            {/* Tab Contents - Using existing table components */}
            <TabsContent value="top-1h" className="mt-0">
              {(() => {
                const tokens = sortTokens(allTokens, "top-1h").slice(0, 30)
                return (
                  <>
                    <TokenTable tokens={tokens} showHeader={false} />
                  </>
                )
              })()}
            </TabsContent>

            <TabsContent value="top-24h" className="mt-0">
              {(() => {
                const tokens = sortTokens(allTokens, "top-24h").slice(0, 30)
                return (
                  <>
                    <TokenTable tokens={tokens} showHeader={false} />
                  </>
                )
              })()}
            </TabsContent>

            <TabsContent value="top-7d" className="mt-0">
              {(() => {
                const tokens = sortTokens(allTokens, "top-7d").slice(0, 30)
                return (
                  <>
                    <TokenTable tokens={tokens} showHeader={false} />
                  </>
                )
              })()}
            </TabsContent>

            <TabsContent value="newest" className="mt-0">
              {(() => {
                const tokens = sortTokens(allTokens, "newest").slice(0, 30)
                return (
                  <>
                    <TokenTable tokens={tokens} showHeader={false} />
                  </>
                )
              })()}
            </TabsContent>

            <TabsContent value="all" className="mt-0">
              {(() => {
                const tokens = sortTokens(allTokens, "all").slice(0, 30)
                return (
                  <>
                    <TokenTable tokens={tokens} showHeader={false} />
                  </>
                )
              })()}
            </TabsContent>
            </Tabs>
          )}

          {/* Empty State for regular view */}
          {!showingSearchResults && allTokens.length === 0 && (
            <div className="text-center py-12">
              <TrendingUp className="h-16 w-16 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600 dark:text-slate-400">No tokens found</p>
            </div>
          )}
        </div>

        {/* View More Button - only show when not in search mode */}
        {!showingSearchResults && (
          <div className="text-center mt-8">
            <Link href="/all-tokens">
              <Button
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 dark:from-blue-500 dark:to-blue-400 dark:hover:from-blue-600 dark:hover:to-blue-500"
              >
                <TrendingUp className="mr-2 h-5 w-5" />
                View All Tokens
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        )}
      </section>
    </div>
  )
}
