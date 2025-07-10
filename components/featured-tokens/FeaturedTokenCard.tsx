"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Heart, TrendingUp, ArrowRight } from "lucide-react"

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

interface FeaturedTokenCardProps {
  token: Token
}

// Helper function to clean token names
function cleanTokenName(name: string): string {
  return name
    .replace(/\s*if\s*\([^)]*\)\s*/gi, '')
    .replace(/\s*\(token\.featured\)\s*/gi, '')
    .trim()
}

// Helper function to format percentage change
function formatPercentageChange(percentage: number | undefined) {
  if (percentage === undefined || percentage === null) return "0.0%"
  const value = parseFloat(percentage.toString())
  if (isNaN(value)) return "0.0%"
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
}

// Helper function to get first sentence of lore
function getFirstSentence(text: string): string {
  if (!text) return ""
  const sentences = text.split(/[.!?]+/)
  const firstSentence = sentences[0]?.trim()
  return firstSentence ? firstSentence + "..." : ""
}

export default function FeaturedTokenCard({ token }: FeaturedTokenCardProps) {
  const firstSentence = getFirstSentence(token.story)
  const priceChange = token.price_change_percentage_24h || 0
  const isPositiveChange = priceChange >= 0

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-blue-100 dark:border-gray-700 rounded-xl p-6 hover:border-blue-500/50 dark:hover:border-blue-400/50 transition-all shadow-sm hover:shadow-md group">
      {/* Header with Image and Basic Info */}
      <div className="flex items-start gap-4 mb-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500/20 to-blue-300/20 dark:from-blue-500/10 dark:to-blue-300/10 p-1 flex items-center justify-center">
            <img
              src={token.image_url || "/placeholder.svg?height=64&width=64"}
              alt={cleanTokenName(token.name)}
              className="w-14 h-14 rounded-full object-cover"
              onError={(e) => {
                ;(e.target as HTMLImageElement).src = "/placeholder.svg?height=64&width=64"
              }}
            />
          </div>
          {/* Featured Star Badge */}
          <div className="absolute -top-1 -right-1">
            <Badge className="bg-yellow-500 text-black text-xs px-1.5 py-0.5">★</Badge>
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 truncate">
              {cleanTokenName(token.name)}
            </h3>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-2 truncate">
            {token.symbol}
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
            {token.description}
          </p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex items-center justify-between mb-4 py-3 px-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
        <div className="flex items-center gap-1">
          <Heart className="h-4 w-4 text-red-500 fill-current" />
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {token.good_lores || 0}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">lores</span>
        </div>
        
        <div className="flex items-center gap-1">
          <TrendingUp className={`h-4 w-4 ${isPositiveChange ? 'text-green-500' : 'text-red-500'}`} />
          <span className={`font-semibold ${
            isPositiveChange 
              ? 'text-green-600 dark:text-green-400' 
              : 'text-red-600 dark:text-red-400'
          }`}>
            {formatPercentageChange(priceChange)}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">24h</span>
        </div>
      </div>

      {/* Lore Preview */}
      <div className="mb-4">
        <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
          {firstSentence}
        </p>
      </div>

      {/* Read More Button */}
      <Link href={`/token/${encodeURIComponent(token.symbol)}`}>
        <Button 
          variant="outline" 
          className="w-full border-blue-500 text-blue-500 hover:bg-blue-500/10 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-400/10 group-hover:border-blue-600 group-hover:text-blue-600 dark:group-hover:border-blue-300 dark:group-hover:text-blue-300 transition-colors"
        >
          Read More
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </Link>
    </div>
  )
}