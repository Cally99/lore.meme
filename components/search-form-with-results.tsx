"use client"

import { useState, useEffect, type FormEvent } from "react"
import { Search } from "lucide-react"
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

interface SearchFormWithResultsProps {
  className?: string
  placeholder?: string
  buttonText?: string
  onResults?: (results: Token[], query: string) => void
}

export default function SearchFormWithResults({
  className = "",
  placeholder = "Search by token address or name...",
  buttonText = "Search",
  onResults,
}: SearchFormWithResultsProps) {
  const [query, setQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [allTokens, setAllTokens] = useState<Token[]>([])

  // Fetch all tokens on component mount for client-side searching
  useEffect(() => {
    async function fetchAllTokens() {
      try {
        const tokens = await getTokens({ status: "approved", limit: 1000 })
        setAllTokens(tokens || [])
      } catch (error) {
        console.error("Error fetching tokens for search:", error)
      }
    }
    fetchAllTokens()
  }, [])

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim() || !onResults) return

    setIsSearching(true)
    const searchTerm = searchQuery.toLowerCase().trim()

    try {
      // Check for exact address match first (case-insensitive)
      const exactAddressMatch = allTokens.find(
        (token) => token.address.toLowerCase() === searchTerm
      )

      if (exactAddressMatch) {
        // For exact address match, return just that token
        onResults([exactAddressMatch], searchQuery)
        setIsSearching(false)
        return
      }

      // Otherwise, search for partial matches in name, symbol, address, and description
      const filteredTokens = allTokens.filter((token) => {
        const name = token.name.toLowerCase()
        const symbol = token.symbol.toLowerCase()
        const address = token.address.toLowerCase()
        const description = token.description.toLowerCase()

        return (
          name.includes(searchTerm) ||
          symbol.includes(searchTerm) ||
          address.includes(searchTerm) ||
          description.includes(searchTerm)
        )
      })

      // Sort results by relevance (exact matches first, then partial matches)
      const sortedResults = filteredTokens.sort((a, b) => {
        const aName = a.name.toLowerCase()
        const aSymbol = a.symbol.toLowerCase()
        const bName = b.name.toLowerCase()
        const bSymbol = b.symbol.toLowerCase()

        // Exact name or symbol matches first
        if (aName === searchTerm || aSymbol === searchTerm) return -1
        if (bName === searchTerm || bSymbol === searchTerm) return 1

        // Then name/symbol starts with search term
        if (aName.startsWith(searchTerm) || aSymbol.startsWith(searchTerm)) return -1
        if (bName.startsWith(searchTerm) || bSymbol.startsWith(searchTerm)) return 1

        // Finally by good_lores count
        return b.good_lores - a.good_lores
      })

      onResults(sortedResults, searchQuery)
    } catch (error) {
      console.error("Error performing search:", error)
      onResults([], searchQuery)
    } finally {
      setIsSearching(false)
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      performSearch(query)
    }
  }

  // Real-time search as user types (debounced)
  useEffect(() => {
    if (!query.trim()) {
      if (onResults) onResults([], "")
      return
    }

    const timeoutId = setTimeout(() => {
      performSearch(query)
    }, 300) // 300ms debounce

    return () => clearTimeout(timeoutId)
  }, [query, allTokens])

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="flex">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full px-6 py-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-blue-100 dark:border-gray-700 rounded-l-xl focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 text-slate-800 dark:text-slate-200"
          aria-label="Search for a token"
        />
        <button
          type="submit"
          disabled={isSearching}
          className="bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 dark:from-blue-500 dark:to-blue-400 dark:hover:from-blue-600 dark:hover:to-blue-500 px-6 py-4 rounded-r-xl text-white font-medium disabled:opacity-50 flex items-center gap-2"
          aria-label="Search"
        >
          {isSearching ? (
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
          ) : (
            <Search className="h-4 w-4" />
          )}
          {buttonText}
        </button>
      </div>
    </form>
  )
}