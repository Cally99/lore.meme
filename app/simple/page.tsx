"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { BookOpen } from "lucide-react"

export default function SimplePage() {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [envCheck, setEnvCheck] = useState<Record<string, boolean>>({})

  useEffect(() => {
    // Check if we can access environment variables
    try {
      const envVars = {
        supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      }
      setEnvCheck(envVars)
      console.log("Environment variables check:", envVars)
    } catch (err) {
      console.error("Error checking environment variables:", err)
      setError(`Environment variables error: ${err instanceof Error ? err.message : String(err)}`)
    }

    // Simulate loading
    setTimeout(() => {
      setIsLoading(false)
    }, 1000)
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-slate-900 dark:text-slate-100">
      <header className="container mx-auto py-6 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">Lore.meme</span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Simple Test Page</h1>

          {error && (
            <div className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 p-4 rounded-md mb-6">
              <p className="font-bold">Error:</p>
              <p>{error}</p>
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Environment Check</h2>
            <ul className="space-y-2">
              {Object.entries(envCheck).map(([key, value]) => (
                <li key={key} className="flex items-center gap-2">
                  <span className={value ? "text-green-500" : "text-red-500"}>{value ? "✓" : "✗"}</span>
                  <span>
                    {key}: {value ? "Available" : "Missing"}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <Link href="/">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">Go to Main Homepage</Button>
            </Link>

            <Link href="/debug">
              <Button variant="outline" className="w-full">
                Go to Debug Page
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
