// app/all-tokens/AllTokensClient.tsx

"use client"

import { useState, useEffect } from "react"
import { TrendingUp } from "lucide-react"
import TokenTable from "@/components/tokens/TokenTable"
import TokenPagination from "@/components/tokens/TokenPagination"
import { getTokensWithPagination } from "../actions/token-actions"

type SortField = "rank" | "name" | "good_lores" | "created_at" | "price_change_percentage_24h"
type SortDirection = "asc" | "desc"

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

interface PaginatedTokensResponse {
  tokens: Token[]
  totalCount: number
  currentPage: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export default function AllTokensClient() {
  const [tokenData, setTokenData] = useState<PaginatedTokensResponse>({
    tokens: [],
    totalCount: 0,
    currentPage: 1,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false
  })
  const [sortField, setSortField] = useState<SortField>("good_lores")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(20)

  useEffect(() => {
    async function fetchTokens() {
      try {
        setLoading(true)
        const fetchedData = await getTokensWithPagination({
          // Remove status filter to show all tokens
          page: currentPage,
          limit: pageSize,
          sortBy: sortField === "good_lores" ? "top" : sortField === "created_at" ? "newest" : undefined
        })
        setTokenData(fetchedData)
      } catch (err) {
        console.error("Error fetching tokens:", err)
        setError("Failed to load tokens")
      } finally {
        setLoading(false)
      }
    }

    fetchTokens()
  }, [currentPage, pageSize, sortField])

  const handleSort = (field: string, direction: SortDirection) => {
    setSortField(field as SortField)
    setSortDirection(direction)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
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
      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400 dark:from-blue-400 dark:to-blue-300">
            Token Rankings
          </h1>
          <p className="text-slate-600 dark:text-slate-300 mb-6">Top tokens ranked by community lore votes</p>
        </div>

        {error && (
          <div className="text-center py-12">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {!error && (
          <>
            <TokenTable
              tokens={tokenData.tokens}
              showSorting={true}
              onSort={handleSort}
              sortField={sortField}
              sortDirection={sortDirection}
              startRank={(currentPage - 1) * pageSize + 1}
            />

            <TokenPagination
              currentPage={tokenData.currentPage}
              totalPages={tokenData.totalPages}
              totalCount={tokenData.totalCount}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              hasNextPage={tokenData.hasNextPage}
              hasPreviousPage={tokenData.hasPreviousPage}
            />

            <div className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
              Page {tokenData.currentPage} of {tokenData.totalPages} • {tokenData.totalCount} total tokens • Updated in real-time
            </div>
          </>
        )}
      </div>
    </div>
  )
}