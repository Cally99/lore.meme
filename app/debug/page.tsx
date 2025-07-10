"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, BookOpen } from "lucide-react"
import ThemeToggle from "@/components/theme-toggle"

export default function DebugPage() {
  const [envVars, setEnvVars] = useState<Record<string, string>>({})
  const [dbStatus, setDbStatus] = useState<string>("Checking...")
  const [browserInfo, setBrowserInfo] = useState<string>("")

  useEffect(() => {
    // Get browser info
    setBrowserInfo(`${navigator.userAgent}`)

    // Check environment variables (only public ones will be visible)
    const publicEnvVars: Record<string, string> = {}
    Object.keys(process.env).forEach((key) => {
      if (key.startsWith("NEXT_PUBLIC_")) {
        publicEnvVars[key] = process.env[key] || ""
      }
    })
    setEnvVars(publicEnvVars)

    // Check database connection
    const checkDb = async () => {
      try {
        const response = await fetch("/api/debug/db-check")
        const data = await response.json()
        setDbStatus(data.status)
      } catch (error) {
        setDbStatus(`Error checking DB: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    checkDb()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50 dark:from-gray-900 dark:to-black text-slate-900 dark:text-slate-100">
      {/* Header */}
      <header className="container mx-auto py-6 px-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <BookOpen className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400 dark:from-blue-400 dark:to-blue-300">
            Lore.meme
          </span>
        </Link>
        <ThemeToggle />
      </header>

      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8">Debug Information</h1>

        <div className="space-y-8">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-blue-100 dark:border-gray-700 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">Browser Information</h2>
            <pre className="bg-slate-100 dark:bg-slate-900 p-4 rounded-md overflow-auto text-sm">{browserInfo}</pre>
          </div>

          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-blue-100 dark:border-gray-700 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">Public Environment Variables</h2>
            <pre className="bg-slate-100 dark:bg-slate-900 p-4 rounded-md overflow-auto text-sm">
              {JSON.stringify(envVars, null, 2)}
            </pre>
          </div>

          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-blue-100 dark:border-gray-700 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">Database Status</h2>
            <div
              className={`p-4 rounded-md ${
                dbStatus.includes("Error")
                  ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
                  : dbStatus.includes("Connected")
                    ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                    : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300"
              }`}
            >
              {dbStatus}
            </div>
          </div>

          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-blue-100 dark:border-gray-700 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">Actions</h2>
            <div className="space-y-4">
              <div>
                <Button
                  onClick={() => {
                    localStorage.clear()
                    alert("Local storage cleared!")
                  }}
                  variant="outline"
                >
                  Clear Local Storage
                </Button>
              </div>
              <div>
                <Button
                  onClick={() => {
                    console.clear()
                    alert("Console cleared!")
                  }}
                  variant="outline"
                >
                  Clear Console
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <Link href="/">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-5 w-5" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
