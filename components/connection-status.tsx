"use client"

import { useState, useEffect } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle, Database } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface ConnectionStatusProps {
  showAlways?: boolean // Only show in admin or when explicitly requested
}

export default function ConnectionStatus({ showAlways = false }: ConnectionStatusProps) {
  const [status, setStatus] = useState<"loading" | "connected" | "error">("loading")
  const [message, setMessage] = useState<string>("")
  const [shouldShow, setShouldShow] = useState(false)
  const [details, setDetails] = useState<any>(null)

  useEffect(() => {
    // Only show in development mode or when explicitly requested
    const isDevMode = process.env.NODE_ENV === "development"
    const isAdminPage = window.location.pathname.includes("/admin")
    setShouldShow(showAlways || isDevMode || isAdminPage)

    if (!showAlways && !isDevMode && !isAdminPage) {
      return // Don't check connection if we're not going to show it
    }

    const checkConnection = async () => {
      try {
        // Try to fetch a token to check connection
        const response = await fetch("/api/debug/test-supabase", {
          method: "GET",
          headers: { "Cache-Control": "no-cache" },
        })

        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`)
        }

        const data = await response.json()

        if (data.message && data.message.includes("successful")) {
          setStatus("connected")
          setMessage(data.message)
          setDetails(data.details)
        } else {
          setStatus("error")
          setMessage(data.error || "Unable to connect to database")
          setDetails(data.details)
        }
      } catch (error) {
        console.error("Connection check error:", error)
        setStatus("error")
        setMessage("Using fallback data - database connection failed")
        setDetails({ error: error instanceof Error ? error.message : String(error) })
      }
    }

    checkConnection()
  }, [showAlways])

  if (!shouldShow || status === "loading") {
    return null
  }

  if (status === "connected") {
    return (
      <Alert className="mb-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
        <AlertTitle className="text-green-700 dark:text-green-300">Database Connected</AlertTitle>
        <AlertDescription className="text-green-600 dark:text-green-400">
          {message}
          {details && (
            <div className="mt-2 text-xs">
              Table exists: {details.tableExists ? "✅" : "❌"} | Records: {details.recordCount || 0}
            </div>
          )}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert className="mb-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <AlertTitle className="text-amber-700 dark:text-amber-300">Using Fallback Data</AlertTitle>
      <AlertDescription className="text-amber-600 dark:text-amber-400">
        {message}
        {details && (
          <div className="mt-2 text-xs">
            {details.error && <div>Error: {details.error}</div>}
            {details.urlAvailable !== undefined && (
              <div>
                URL: {details.urlAvailable ? "✅" : "❌"} | Service Key: {details.serviceKeyAvailable ? "✅" : "❌"} |
                Anon Key: {details.anonKeyAvailable ? "✅" : "❌"}
              </div>
            )}
          </div>
        )}
        <div className="mt-3">
          <Link href="/debug-supabase">
            <Button size="sm" variant="outline" className="text-amber-700 dark:text-amber-300 border-amber-300">
              <Database className="h-3 w-3 mr-1" />
              Test & Fix Connection
            </Button>
          </Link>
        </div>
      </AlertDescription>
    </Alert>
  )
}
