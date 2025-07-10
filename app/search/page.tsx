"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, BookOpen, Search } from "lucide-react"
import { useTheme } from "next-themes"
import SearchForm from "@/components/search-form"
import { getTokens } from "@/app/actions/token-actions"

interface TokenData {
  id: string
  name: string
  symbol: string
  address: string
  image_url?: string
  description: string
}

export default function SearchPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const query = searchParams.get("q") || ""
  const [results, setResults] = useState<TokenData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // After mounting, we can access the theme
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (query) {
      setIsLoading(true)

      // Fetch all tokens and filter client-side
      const fetchTokens = async () => {
        try {
          const allTokens = await getTokens({ status: "approved" })
          const searchQuery = query.toLowerCase()

          // First check for exact address match
          const exactMatch = allTokens.find(
            (token) => token.address.toLowerCase() === searchQuery || token.id.toLowerCase() === searchQuery,
          )

          if (exactMatch) {
            // Navigate to the token page
            router.push(`/token/${encodeURIComponent(exactMatch.symbol)}`)
            return
          }

          // Otherwise, search for partial matches
          const filteredTokens = allTokens.filter(
            (token) =>
              token.name.toLowerCase().includes(searchQuery) ||
              token.symbol.toLowerCase().includes(searchQuery) ||
              token.address.toLowerCase().includes(searchQuery) ||
              token.description.toLowerCase().includes(searchQuery),
          )

          setResults(filteredTokens)
        } catch (error) {
          console.error("Error searching tokens:", error)
          setResults([])
        } finally {
          setIsLoading(false)
        }
      }

      fetchTokens()
    } else {
      setResults([])
      setIsLoading(false)
    }
  }, [query, router])

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50 dark:from-gray-900 dark:to-black text-slate-900 dark:text-slate-100">

      {/* Search Section */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400 dark:from-blue-400 dark:to-blue-300">
            Search Results
          </h1>

          <div className="mb-10">
            <SearchForm />
            <p className="text-slate-600 dark:text-slate-400 mt-3 text-sm">
              Enter a token address (0x...) or search by name
            </p>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 dark:border-blue-400"></div>
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-4">
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Found {results.length} result{results.length !== 1 ? "s" : ""} for "{query}"
              </p>
              {results.map((token) => (
                <Link href={`/token/${encodeURIComponent(token.symbol)}`} key={token.id}>
                  <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-blue-100 dark:border-gray-700 rounded-xl p-4 hover:border-blue-500/50 dark:hover:border-blue-400/50 transition-all shadow-sm flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500/20 to-blue-300/20 dark:from-blue-500/10 dark:to-blue-300/10 flex items-center justify-center">
                      <img
                        src={token.image_url || "/placeholder.svg?height=64&width=64"}
                        alt={token.name}
                        className="w-12 h-12 rounded-full"
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{token.symbol}</h3>
                      <p className="text-slate-600 dark:text-slate-400 text-sm">{token.description}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-500 mt-1 font-mono">{token.address}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-blue-100 dark:border-gray-700 rounded-xl p-8 text-center">
              <Search className="h-16 w-16 mx-auto text-slate-400 dark:text-slate-500 mb-4" />
              <h2 className="text-2xl font-bold mb-2">No Token Lore Found</h2>
              <p className="text-slate-600 dark:text-slate-400 mb-8">
                We couldn't find any tokens matching "{query}". Would you like to add this token?
              </p>
              <div className="flex justify-center gap-4">
                <Link href="/">
                  <Button
                    variant="outline"
                    className="border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <ArrowLeft className="mr-2 h-5 w-5" />
                    Back to Home
                  </Button>
                </Link>
                <Link href="/submit-lore">
                  <Button className="bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 dark:from-blue-500 dark:to-blue-400 dark:hover:from-blue-600 dark:hover:to-blue-500">
                    Submit Lore
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
