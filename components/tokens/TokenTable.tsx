"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Heart, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"

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
  price_change_percentage_1h?: number
  price_change_percentage_24h?: number
  price_change_percentage_7d?: number
  total_volume?: number
}

interface TokenTableProps {
  tokens: Token[]
  showSorting?: boolean
  showPagination?: boolean
  currentPage?: number
  totalPages?: number
  onPageChange?: (page: number) => void
  onSort?: (field: string, direction: "asc" | "desc") => void
  sortField?: string
  sortDirection?: "asc" | "desc"
  startRank?: number
  showHeader?: boolean
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

function getRankBadgeColor(rank: number) {
  if (rank === 1) return "bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold"
  if (rank === 2) return "bg-gradient-to-r from-gray-300 to-gray-500 text-black font-bold"
  if (rank === 3) return "bg-gradient-to-r from-amber-600 to-amber-800 text-white font-bold"
  return "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
}

export default function TokenTable({
  tokens,
  showSorting = false,
  showPagination = false,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  onSort,
  sortField,
  sortDirection,
  startRank = 1,
  showHeader = true
}: TokenTableProps) {
  const getSortIcon = (field: string) => {
    if (!showSorting || sortField !== field) return <ArrowUpDown className="h-4 w-4 opacity-50" />
    return sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
  }

  const handleSort = (field: string) => {
    if (!showSorting || !onSort) return
    const newDirection = sortField === field && sortDirection === "asc" ? "desc" : "asc"
    onSort(field, newDirection)
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block">
        {/* Header */}
        {showHeader && (
          <div className="grid grid-cols-12 gap-4 p-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <div className="col-span-1 text-center">#</div>
            <div className="col-span-3">
              {showSorting ? (
                <button
                  onClick={() => handleSort("name")}
                  className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  Token {getSortIcon("name")}
                </button>
              ) : (
                "Token"
              )}
            </div>
            <div className="col-span-2 text-center">
              {showSorting ? (
                <button
                  onClick={() => handleSort("price_change_percentage_24h")}
                  className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 mx-auto"
                >
                  24h Change {getSortIcon("price_change_percentage_24h")}
                </button>
              ) : (
                "24h Change"
              )}
            </div>
            <div className="col-span-2 text-center">
              {showSorting ? (
                <button
                  onClick={() => handleSort("good_lores")}
                  className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 mx-auto"
                >
                  <Heart className="h-4 w-4" />
                  Lores {getSortIcon("good_lores")}
                </button>
              ) : (
                <div className="flex items-center gap-1 justify-center">
                  <Heart className="h-4 w-4" />
                  Lores
                </div>
              )}
            </div>
            <div className="col-span-2 text-center">
              {showSorting ? (
                <button
                  onClick={() => handleSort("created_at")}
                  className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 mx-auto"
                >
                  Age {getSortIcon("created_at")}
                </button>
              ) : (
                "Age"
              )}
            </div>
            <div className="col-span-2 text-center">Added By</div>
          </div>
        )}

        {/* Token Rows */}
        <div className="divide-y divide-slate-200 dark:divide-slate-700">
          {tokens.map((token, index) => {
            const globalRank = startRank + index
            return (
              <div key={token.id} className="grid grid-cols-12 gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                {/* Rank */}
                <div className="col-span-1 flex justify-center">
                  <Badge className={`text-sm px-2 py-1 ${getRankBadgeColor(globalRank)}`}>
                    {globalRank}
                  </Badge>
                </div>

                {/* Token Info */}
                <Link href={`/token/${encodeURIComponent(token.symbol)}`} className="col-span-3 flex items-center gap-3">
                  <img
                    src={token.image_url || "/placeholder.svg?height=40&width=40"}
                    alt={cleanTokenName(token.name)}
                    className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-600"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = "/placeholder.svg?height=40&width=40"
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {cleanTokenName(token.name)}
                      </h3>
                      {token.featured && <Badge className="bg-yellow-500 text-black text-xs">★</Badge>}
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{token.symbol}</p>
                  </div>
                </Link>

                {/* 24h Change */}
                <div className="col-span-2 flex items-center justify-center">
                  <span className={`font-semibold ${
                    (token.price_change_percentage_24h || 0) >= 0 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {formatPercentageChange(token.price_change_percentage_24h)}
                  </span>
                </div>

                {/* Good Lores - Display Only */}
                <div className="col-span-2 flex items-center justify-center">
                  <div className="flex items-center gap-1 text-red-500">
                    <Heart className="h-4 w-4 fill-current" />
                    <span className="font-semibold">{token.good_lores || 0}</span>
                  </div>
                </div>

                {/* Age */}
                <div className="col-span-2 flex items-center justify-center">
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {formatTimeAgo(token.created_at)}
                  </span>
                </div>

                {/* Added By */}
                <div className="col-span-2 flex items-center justify-center">
                  <Badge
                    variant="secondary"
                    className={`text-xs ${
                      getCreatorType(token) === "Owner"
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                        : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    }`}
                  >
                    {getCreatorType(token) === "Owner" ? "Token Owner" : "The Community"}
                  </Badge>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Mobile Table */}
      <div className="md:hidden">
        <div className="overflow-x-auto scrollbar-hide">
          <div className="min-w-max">
            {/* Header */}
            {showHeader && (
              <div className="flex bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <div className="sticky left-0 bg-slate-50 dark:bg-slate-800 z-10 border-r border-slate-200 dark:border-slate-700 min-w-[180px] p-3">
                  Token
                </div>
                <div className="min-w-[80px] p-3 text-center">24h %</div>
                <div className="min-w-[100px] p-3 text-center flex items-center justify-center gap-1">
                  <Heart className="h-3 w-3" />
                  Lores
                </div>
                <div className="min-w-[60px] p-3 text-center">Age</div>
                <div className="min-w-[100px] p-3 text-center">Added By</div>
              </div>
            )}

            {/* Token rows */}
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {tokens.map((token, index) => {
                const globalRank = startRank + index
                return (
                  <div key={token.id} className="flex hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <Link 
                      href={`/token/${encodeURIComponent(token.symbol)}`}
                      className="flex items-center gap-2 p-3 bg-white dark:bg-gray-800 sticky left-0 z-10 border-r border-slate-200 dark:border-slate-700 min-w-[180px]"
                    >
                      <Badge className={`badge-rank-${globalRank}`}>{globalRank}</Badge>
                      <img
                        src={token.image_url || "/placeholder.svg?height=28&width=28"}
                        alt={cleanTokenName(token.name)}
                        className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-600"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = "/placeholder.svg?height=28&width=28"
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">
                            {cleanTokenName(token.name)}
                          </h3>
                          {token.featured && <Badge className="bg-yellow-500 text-black text-xs">★</Badge>}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{token.symbol}</p>
                      </div>
                    </Link>

                    <div className="flex items-center">
                      {/* 24h Change */}
                      <div className="flex items-center justify-center min-w-[80px] p-3">
                        <span className={`font-semibold text-sm ${
                          (token.price_change_percentage_24h || 0) >= 0 
                            ? 'text-green-600 dark:text-green-400' 
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {formatPercentageChange(token.price_change_percentage_24h)}
                        </span>
                      </div>

                      {/* Good Lores - Display Only */}
                      <div className="flex items-center justify-center min-w-[100px] p-3">
                        <div className="flex items-center gap-1 text-red-500">
                          <Heart className="h-3 w-3 fill-current" />
                          <span className="font-semibold text-sm">{token.good_lores || 0}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-center min-w-[60px] p-3">
                        <span className="text-xs text-slate-600 dark:text-slate-400">
                          {formatTimeAgo(token.created_at)}
                        </span>
                      </div>
                      <div className="flex items-center justify-center min-w-[100px] p-3">
                        <Badge variant="secondary" className="text-xs">
                          {getCreatorType(token) === "Owner" ? "Owner" : "Community"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {tokens.length === 0 && (
        <div className="text-center py-12">
          <Heart className="h-16 w-16 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">No tokens found</p>
        </div>
      )}
    </>
  )
}