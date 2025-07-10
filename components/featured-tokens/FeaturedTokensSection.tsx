"use client"

import { useState, useEffect } from "react"
import { Star, TrendingUp } from "lucide-react"
import FeaturedTokenCard from "./FeaturedTokenCard"
import { getTokens } from "@/app/actions/token-actions"

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
  total_volume?: number
  price_change_percentage_1h?: number
  price_change_percentage_24h?: number
  price_change_percentage_7d?: number
  current_price?: number
  market_cap?: number
}

// // Fallback featured tokens for when API fails
// const fallbackFeaturedTokens: Token[] = [
//   {
//     id: "1",
//     name: "Bitcoin X",
//     symbol: "$BTCX",
//     address: "0xf1e2d3c4b5a6789012345678901234567890abcd",
//     description: "The next evolution of Bitcoin with smart contracts.",
//     story: "Bitcoin X emerged as a revolutionary project in the cryptocurrency space, combining the security of Bitcoin with the flexibility of smart contracts. This innovative approach has attracted developers and investors alike, creating a vibrant ecosystem around decentralized finance.",
//     image_url: "/placeholder.svg?height=200&width=200",
//     created_at: new Date().toISOString(),
//     created_by: "dev@bitcoinx.io",
//     telegram: "@bitcoinx",
//     email: "dev@bitcoinx.io",
//     twitter: "https://twitter.com/bitcoinx",
//     dexscreener: "https://dexscreener.com/ethereum/0xf1e2d3c4",
//     featured: true,
//     status: "approved",
//     good_lores: 42,
//     creator_type: "Owner",
//     price_change_percentage_24h: 5.2,
//   },
//   {
//     id: "2",
//     name: "MOONDOG",
//     symbol: "$MOONDOG",
//     address: "0x9a8b7c6d5e4f3g2h1i0j9k8l7m6n5o4p3q2r1s0t",
//     description: "The canine companion for your lunar journey.",
//     story: "MOONDOG started as a community-driven meme token but quickly evolved into something more. With its loyal pack of holders and innovative tokenomics, MOONDOG has become the go-to token for those who believe in reaching for the stars while keeping their paws on the ground.",
//     image_url: "/placeholder.svg?height=200&width=200",
//     created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
//     created_by: "woof@moondog.io",
//     telegram: "@moondog",
//     email: "woof@moondog.io",
//     twitter: "https://twitter.com/moondog",
//     dexscreener: "https://dexscreener.com/ethereum/0x9a8b7c6d",
//     featured: true,
//     status: "approved",
//     good_lores: 38,
//     creator_type: "Community",
//     price_change_percentage_24h: 12.7,
//   },
//   {
//     id: "3",
//     name: "PEPE GOLD",
//     symbol: "$PEPEGOLD",
//     address: "0x1f2e3d4c5b6a7890123456789012345678901234",
//     description: "The golden evolution of the legendary meme.",
//     story: "PEPE GOLD represents the premium tier of meme culture, where classic internet humor meets serious tokenomics. Born from the community's desire to create lasting value while maintaining the playful spirit that made PEPE famous, this token bridges the gap between memes and meaningful investment.",
//     image_url: "/placeholder.svg?height=200&width=200",
//     created_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
//     created_by: "gold@pepegold.io",
//     telegram: "@pepegold",
//     email: "gold@pepegold.io",
//     twitter: "https://twitter.com/pepegold",
//     dexscreener: "https://dexscreener.com/ethereum/0x1f2e3d4c",
//     featured: true,
//     status: "approved",
//     good_lores: 56,
//     creator_type: "Owner",
//     price_change_percentage_24h: -3.1,
//   },
// ]

export default function FeaturedTokensSection() {
  const [featuredTokens, setFeaturedTokens] = useState<Token[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchFeaturedTokens() {
      try {
        console.log("Fetching featured tokens...")
        
        const tokens = await getTokens({
          featured: true,
          limit: 3,
        })

        if (tokens && tokens.length > 0) {
          console.log(`Found ${tokens.length} featured tokens`)
          setFeaturedTokens(tokens.slice(0, 3)) // Ensure max 3 tokens
        } else {
          console.log("No featured tokens found")
          setFeaturedTokens([])
        }
      } catch (error) {
        console.error("Error fetching featured tokens:", error)
        setFeaturedTokens([])
      } finally {
        setLoading(false)
      }
    }

    fetchFeaturedTokens()
  }, [])

  if (loading) {
    return (
      <section className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Star className="h-6 w-6 text-yellow-500 fill-current" />
            <h2 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400 dark:from-blue-400 dark:to-blue-300">
              Featured Tokens
            </h2>
          </div>
          <p className="text-slate-600 dark:text-slate-300">
            Discover handpicked tokens with exceptional lore and community engagement
          </p>
        </div>
        
        {/* Loading skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-blue-100 dark:border-gray-700 rounded-xl p-6 animate-pulse">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-16 h-16 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded mb-2"></div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-20 mb-2"></div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
                </div>
              </div>
              <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded mb-4"></div>
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded mb-4"></div>
              <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded"></div>
            </div>
          ))}
        </div>
      </section>
    )
  }

  if (featuredTokens.length === 0) {
    return null // Don't render section if no featured tokens
  }

  return (
    <section className="container mx-auto px-4 py-12">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Star className="h-6 w-6 text-yellow-500 fill-current" />
          <h2 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400 dark:from-blue-400 dark:to-blue-300">
            Featured Tokens
          </h2>
        </div>
        <p className="text-slate-600 dark:text-slate-300">
          Discover handpicked tokens with exceptional lore and community engagement
        </p>
      </div>
      
      {/* Responsive Grid: 1 column on mobile, 3 columns on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {featuredTokens.map((token) => (
          <FeaturedTokenCard key={token.id} token={token} />
        ))}
      </div>
    </section>
  )
}