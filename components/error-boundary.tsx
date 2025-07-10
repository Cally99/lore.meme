"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"
import Link from "next/link"

interface ErrorBoundaryProps {
  children: React.ReactNode
}

export default function ErrorBoundary({ children }: ErrorBoundaryProps) {
  const [hasError, setHasError] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [errorInfo, setErrorInfo] = useState<string>("")
  const [errorCount, setErrorCount] = useState(0)

  useEffect(() => {
    const errorHandler = (event: ErrorEvent) => {
      console.error("Error caught by error boundary:", event.error)

      // Increment error count
      setErrorCount((prev) => prev + 1)

      // Only set hasError if we've seen multiple errors
      // This helps avoid showing the error UI for transient errors
      if (errorCount > 2) {
        setHasError(true)
        setError(event.error)
        setErrorInfo(event.error?.stack || event.message || "Unknown error")
      }

      // Log additional details that might help diagnose the issue
      console.log("Error details:", {
        message: event.error?.message,
        name: event.error?.name,
        stack: event.error?.stack,
        source: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      })
    }

    // Handle regular errors
    window.addEventListener("error", errorHandler)

    // Handle unhandled promise rejections
    const rejectionHandler = (event: PromiseRejectionEvent) => {
      console.error("Unhandled promise rejection caught by error boundary:", event.reason)

      // Increment error count
      setErrorCount((prev) => prev + 1)

      // Only set hasError if we've seen multiple errors
      if (errorCount > 2) {
        setHasError(true)
        setError(event.reason instanceof Error ? event.reason : new Error(String(event.reason)))
        setErrorInfo(event.reason?.stack || String(event.reason) || "Unknown promise rejection")
      }

      // Log additional details
      console.log("Rejection details:", {
        reason: event.reason,
        message: event.reason?.message,
        stack: event.reason?.stack,
      })
    }

    window.addEventListener("unhandledrejection", rejectionHandler)

    return () => {
      window.removeEventListener("error", errorHandler)
      window.removeEventListener("unhandledrejection", rejectionHandler)
    }
  }, [errorCount])

  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-blue-50 dark:from-gray-900 dark:to-black text-slate-900 dark:text-slate-100">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-blue-100 dark:border-gray-700 rounded-xl p-8 max-w-md w-full text-center shadow-sm">
          <AlertTriangle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            We're sorry, but there was an error loading this page. Please try one of the options below.
          </p>
          {process.env.NODE_ENV === "development" && (
            <div className="mb-6 text-left bg-slate-100 dark:bg-slate-900 p-4 rounded-md overflow-auto max-h-40">
              <p className="text-red-500 font-mono text-xs">{errorInfo}</p>
            </div>
          )}
          <div className="space-y-4">
            <Button
              onClick={() => window.location.reload()}
              className="bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 dark:from-blue-500 dark:to-blue-400 dark:hover:from-blue-600 dark:hover:to-blue-500"
            >
              Reload Page
            </Button>
            <div className="flex flex-col space-y-2">
              <Link href="/simple">
                <Button
                  variant="outline"
                  className="w-full border-blue-500 text-blue-500 hover:bg-blue-500/10 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-400/10"
                >
                  Try Simple Page
                </Button>
              </Link>
              <Link href="/debug">
                <Button
                  variant="outline"
                  className="w-full border-blue-500 text-blue-500 hover:bg-blue-500/10 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-400/10"
                >
                  Go to Debug Page
                </Button>
              </Link>
              <Link href="/">
                <Button
                  variant="outline"
                  className="w-full border-blue-500 text-blue-500 hover:bg-blue-500/10 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-400/10"
                >
                  Go to Home Page
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
